import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { geometry } from './logic/geometry';
import { generateSlitherlink, validateLoop, type SlitherlinkPuzzle } from './logic/generator';

const CONFIG: Record<Difficulty, { rows: number; cols: number; removeFrac: number }> = {
  easy: { rows: 5, cols: 5, removeFrac: 0.35 },
  medium: { rows: 6, cols: 6, removeFrac: 0.5 },
  hard: { rows: 7, cols: 7, removeFrac: 0.6 },
  pro: { rows: 8, cols: 8, removeFrac: 0.7 },
  extreme: { rows: 10, cols: 10, removeFrac: 1 }
};
const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = {
  easy: 3 * 60,
  medium: 5 * 60,
  hard: 8 * 60,
  pro: 12 * 60,
  extreme: 18 * 60
};
const CLUE_PTS = 15;
const ERR_PENALTY = 10;
const HINT_PENALTY = 30;

/** player edge states */
const EMPTY = 0;
const LINE = 1;
const XMARK = 2;

/** board geometry in SVG user units */
const U = 56; // cell pitch
const M = 18; // margin around the dot lattice

interface SliSave {
  puzzle: SlitherlinkPuzzle;
  edges: number[];
  wrongEver: number[];
  hintsUsed: number;
  assistsUsed: string[];
}

export function SlitherlinkGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved =
    savedState &&
    Array.isArray((savedState as SliSave).edges) &&
    Array.isArray((savedState as SliSave).puzzle?.clues) &&
    Array.isArray((savedState as SliSave).puzzle?.solution)
      ? (savedState as SliSave)
      : undefined;

  const puzzle = useMemo(
    () => saved?.puzzle ?? generateSlitherlink(CONFIG[difficulty]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [difficulty]
  );
  const { rows, cols } = puzzle;
  const g = useMemo(() => geometry(rows, cols), [rows, cols]);
  const n = rows * cols;
  const nDots = (rows + 1) * (cols + 1);
  const W = cols * U + 2 * M;
  const H = rows * U + 2 * M;

  const [edges, setEdges] = useState<number[]>(
    () => saved?.edges.slice() ?? new Array(g.E).fill(EMPTY)
  );
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [errors, setErrors] = useState(saved?.wrongEver.length ?? 0);
  const [won, setWon] = useState(false);
  const [winPath, setWinPath] = useState<{ d: string; len: number } | null>(null);
  const [badDot, setBadDot] = useState<number | null>(null);
  const [hintFlash, setHintFlash] = useState<number | null>(null);

  const edgesRef = useRef(edges);
  /** every edge that ever held a line contradicting the unique solution */
  const wrongEver = useRef<Set<number>>(new Set(saved?.wrongEver ?? []));
  const hintsRef = useRef(saved?.hintsUsed ?? 0);
  const done = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const finishTimer = useRef<number | null>(null);
  const badTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...(assists['degree-guard'] ? ['degree-guard'] : []),
      ...(assists['auto-x'] ? ['auto-x'] : [])
    ])
  );
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  useEffect(
    () => () => {
      if (finishTimer.current) clearTimeout(finishTimer.current);
      if (badTimer.current) clearTimeout(badTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    []
  );

  /* ---------------- derived counts -------------------------------- */

  const cellLines = useMemo(() => {
    const out = new Array<number>(n).fill(0);
    for (let cell = 0; cell < n; cell++) {
      let l = 0;
      for (const e of g.cellEdges[cell]) if (edges[e] === LINE) l++;
      out[cell] = l;
    }
    return out;
  }, [edges, g, n]);

  const totalClues = useMemo(() => puzzle.clues.filter((k) => k != null).length, [puzzle]);
  const satisfied = useMemo(() => {
    let s = 0;
    for (let cell = 0; cell < n; cell++) {
      if (puzzle.clues[cell] != null && cellLines[cell] === puzzle.clues[cell]) s++;
    }
    return s;
  }, [puzzle, cellLines, n]);
  const lineCount = useMemo(() => edges.reduce((a, v) => a + (v === LINE ? 1 : 0), 0), [edges]);

  const liveScore = Math.max(
    0,
    satisfied * CLUE_PTS * MULT[difficulty] - errors * ERR_PENALTY - hintsUsed * HINT_PENALTY
  );

  /* ---------------- win / finish ----------------------------------- */

  const buildLoopPath = useCallback(
    (st: number[]): { d: string; len: number } => {
      let start = -1;
      for (let e = 0; e < g.E; e++) {
        if (st[e] === LINE) {
          start = e;
          break;
        }
      }
      const dotXY = (dot: number) => `${(dot % (cols + 1)) * U} ${Math.floor(dot / (cols + 1)) * U}`;
      let cur = start;
      let from = g.edgeDots[start][0];
      let d = `M ${dotXY(from)}`;
      let count = 0;
      do {
        count++;
        const [a, b] = g.edgeDots[cur];
        const to = a === from ? b : a;
        d += ` L ${dotXY(to)}`;
        let next = -1;
        for (const e2 of g.dotEdges[to]) {
          if (st[e2] === LINE && e2 !== cur) {
            next = e2;
            break;
          }
        }
        from = to;
        cur = next;
      } while (cur !== start && count <= g.E);
      return { d: `${d} Z`, len: count * U };
    },
    [g, cols]
  );

  const triggerWin = useCallback(
    (st: number[], loopLen: number) => {
      if (done.current) return;
      done.current = true;
      setWon(true);
      setWinPath(buildLoopPath(st));
      sfx.pop();
      const finalErrors = wrongEver.current.size;
      const finalHints = hintsRef.current;
      finishTimer.current = window.setTimeout(() => {
        const bonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * MULT[difficulty];
        const score = Math.max(
          0,
          totalClues * CLUE_PTS * MULT[difficulty] -
            finalErrors * ERR_PENALTY -
            finalHints * HINT_PENALTY +
            bonus
        );
        events.onFinish({
          outcome: 'won',
          score,
          errors: finalErrors,
          hintsUsed: finalHints,
          assistsUsed: [...assistsUsed.current],
          extra: { size: `${rows}×${cols}`, clues: totalClues, loop: loopLen }
        });
      }, 2400);
    },
    [buildLoopPath, difficulty, totalClues, rows, cols, events]
  );

  const checkWin = useCallback(
    (st: number[]) => {
      if (done.current) return;
      for (let cell = 0; cell < n; cell++) {
        const k = puzzle.clues[cell];
        if (k == null) continue;
        let l = 0;
        for (const e of g.cellEdges[cell]) if (st[e] === LINE) l++;
        if (l !== k) return;
      }
      const lines01 = st.map((v) => (v === LINE ? 1 : 0));
      const lv = validateLoop(rows, cols, lines01);
      if (lv.ok) triggerWin(st, lv.length);
    },
    [n, puzzle, g, rows, cols, triggerWin]
  );

  /* ---------------- assists ---------------------------------------- */

  /** auto-x: X the leftover edges of exactly-satisfied clues and full dots */
  const autoXPass = useCallback(
    (st: number[]) => {
      for (let cell = 0; cell < n; cell++) {
        const k = puzzle.clues[cell];
        if (k == null) continue;
        let l = 0;
        for (const e of g.cellEdges[cell]) if (st[e] === LINE) l++;
        if (l === k) {
          for (const e of g.cellEdges[cell]) if (st[e] === EMPTY) st[e] = XMARK;
        }
      }
      for (let dot = 0; dot < nDots; dot++) {
        let l = 0;
        for (const e of g.dotEdges[dot]) if (st[e] === LINE) l++;
        if (l === 2) {
          for (const e of g.dotEdges[dot]) if (st[e] === EMPTY) st[e] = XMARK;
        }
      }
    },
    [n, nDots, puzzle, g]
  );

  const commit = useCallback(
    (st: number[]) => {
      if (assists['auto-x']) autoXPass(st);
      edgesRef.current = st;
      setEdges(st);
      checkWin(st);
    },
    [assists, autoXPass, checkWin]
  );

  // passive assists count as help whenever enabled (incl. mid-game toggle-on)
  useEffect(() => {
    if (assists['degree-guard']) assistsUsed.current.add('degree-guard');
  }, [assists]);
  useEffect(() => {
    if (!assists['auto-x']) return;
    assistsUsed.current.add('auto-x');
    if (!done.current) commit(edgesRef.current.slice());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assists['auto-x']]);

  /* ---------------- interaction ------------------------------------ */

  /** nearest edge from a pointer position (rect math, fat implicit zones) */
  const edgeFromPoint = useCallback(
    (clientX: number, clientY: number): number | null => {
      const el = svgRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return null;
      const x = ((clientX - rect.left) / rect.width) * W - M;
      const y = ((clientY - rect.top) / rect.height) * H - M;
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      // too close to a dot is ambiguous — ignore the tap
      const ndr = clamp(Math.round(y / U), 0, rows);
      const ndc = clamp(Math.round(x / U), 0, cols);
      if (Math.hypot(x - ndc * U, y - ndr * U) < 0.22 * U) return null;
      // nearest horizontal edge
      const hr = clamp(Math.round(y / U), 0, rows);
      const hc = clamp(Math.floor(x / U), 0, cols - 1);
      const hdx = x < hc * U ? hc * U - x : x > (hc + 1) * U ? x - (hc + 1) * U : 0;
      const dH = Math.hypot(hdx, y - hr * U);
      // nearest vertical edge
      const vr = clamp(Math.floor(y / U), 0, rows - 1);
      const vc = clamp(Math.round(x / U), 0, cols);
      const vdy = y < vr * U ? vr * U - y : y > (vr + 1) * U ? y - (vr + 1) * U : 0;
      const dV = Math.hypot(x - vc * U, vdy);
      if (Math.min(dH, dV) > 0.4 * U) return null; // dead center of a cell
      return dH <= dV ? hr * cols + hc : g.HN + vr * (cols + 1) + vc;
    },
    [W, H, rows, cols, g]
  );

  const flashBadDot = useCallback((dot: number) => {
    setBadDot(dot);
    if (badTimer.current) clearTimeout(badTimer.current);
    badTimer.current = window.setTimeout(() => setBadDot(null), 500);
  }, []);

  const cycleEdge = useCallback(
    (e: number) => {
      if (paused || done.current) return;
      const st = edgesRef.current.slice();
      let next = (st[e] + 1) % 3;
      let guarded = false;
      if (next === LINE && assists['degree-guard']) {
        const bad = g.edgeDots[e].find((dot) => {
          let l = 0;
          for (const e2 of g.dotEdges[dot]) if (st[e2] === LINE) l++;
          return l >= 2;
        });
        if (bad !== undefined) {
          // a third line would branch the loop — block it, land on the X
          flashBadDot(bad);
          sfx.error();
          guarded = true;
          next = XMARK;
        }
      }
      if (next === LINE && puzzle.solution[e] === 0 && !wrongEver.current.has(e)) {
        wrongEver.current.add(e);
        setErrors(wrongEver.current.size);
      }
      if (!guarded) {
        if (next === LINE) sfx.place();
        else if (next === XMARK) sfx.tap();
        else sfx.drag();
      }
      st[e] = next;
      commit(st);
    },
    [paused, assists, g, puzzle, flashBadDot, commit]
  );

  const onPointerDown = (ev: React.PointerEvent) => {
    const e = edgeFromPoint(ev.clientX, ev.clientY);
    if (e !== null) cycleEdge(e);
  };

  /* ---------------- hint: set one correct edge --------------------- */

  const useHint = () => {
    if (paused || done.current || !assists.hint) return;
    const st = edgesRef.current;
    let best = -1;
    let bestScore = -Infinity;
    for (let e = 0; e < g.E; e++) {
      const want = puzzle.solution[e] === 1 ? LINE : XMARK;
      if (st[e] === want) continue;
      if (st[e] !== EMPTY && puzzle.solution[e] === 0 && st[e] === XMARK) continue; // X on off-edge is fine
      let s = puzzle.solution[e] === 1 ? 6 : 0; // prefer revealing lines
      if (st[e] !== EMPTY) s += 100; // fix an actively wrong mark first
      for (const dot of g.edgeDots[e]) {
        let l = 0;
        for (const e2 of g.dotEdges[dot]) if (st[e2] === LINE) l++;
        if (l === 1) s += 30; // extends a path end
      }
      for (const cell of g.edgeCells[e]) {
        const k = puzzle.clues[cell];
        if (k == null) continue;
        let l = 0;
        let empty = 0;
        for (const e2 of g.cellEdges[cell]) {
          if (st[e2] === LINE) l++;
          else if (st[e2] === EMPTY) empty++;
        }
        if (empty > 0 && (k - l === 0 || k - l === empty)) s += 40; // forced spot
        s += k + (4 - empty) * 3; // tighter cells first
      }
      if (s > bestScore) {
        bestScore = s;
        best = e;
      }
    }
    if (best === -1) return;
    assistsUsed.current.add('hint');
    hintsRef.current += 1;
    setHintsUsed(hintsRef.current);
    sfx.hint();
    setHintFlash(best);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setHintFlash(null), 750);
    const next = st.slice();
    next[best] = puzzle.solution[best] === 1 ? LINE : XMARK;
    commit(next);
  };

  /* ---------------- platform reporting ------------------------------ */

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { clues: `${satisfied}/${totalClues}`, lines: lineCount }
    });
  }, [liveScore, errors, hintsUsed, satisfied, totalClues, lineCount, events]);

  useEffect(() => {
    registerSnapshot(() => ({
      puzzle,
      edges: [...edgesRef.current],
      wrongEver: [...wrongEver.current],
      hintsUsed: hintsRef.current,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  /* ---------------- render ------------------------------------------ */

  const edgeCoords = (e: number) => {
    if (e < g.HN) {
      const r = Math.floor(e / cols);
      const c = e % cols;
      return { x1: c * U, y1: r * U, x2: (c + 1) * U, y2: r * U, h: true };
    }
    const i = e - g.HN;
    const r = Math.floor(i / (cols + 1));
    const c = i % (cols + 1);
    return { x1: c * U, y1: r * U, x2: c * U, y2: (r + 1) * U, h: false };
  };

  const insideSet = useMemo(() => new Set(puzzle.inside), [puzzle]);
  const glow = winPath ? Math.max(U, winPath.len * 0.2) : 0;

  return (
    <div className={`slitherlink ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Clues: <b>{satisfied} / {totalClues}</b>
        </span>
        <span className="info-item">
          <b>{liveScore.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Loop: <b>{lineCount}</b>
        </span>
      </div>

      <div className="sli-wrap" style={{ maxWidth: `${cols * 52 + 40}px` }}>
        <svg
          ref={svgRef}
          className={`sli-svg ${won ? 'won' : ''}`}
          viewBox={`0 0 ${W} ${H}`}
          onPointerDown={onPointerDown}
          onContextMenu={(e) => e.preventDefault()}
          role="application"
          aria-label={`Slitherlink board, ${rows} by ${cols}`}
        >
          <g transform={`translate(${M} ${M})`}>
            {won &&
              puzzle.inside.map((cell, i) => {
                const r = Math.floor(cell / cols);
                const c = cell % cols;
                return (
                  <rect
                    key={cell}
                    className="sli-cell in"
                    x={c * U + 3}
                    y={r * U + 3}
                    width={U - 6}
                    height={U - 6}
                    rx={8}
                    style={{ animationDelay: `${600 + (r + c) * 45 + (i % 3) * 12}ms` }}
                  />
                );
              })}

            {puzzle.clues.map((k, cell) => {
              if (k == null) return null;
              const r = Math.floor(cell / cols);
              const c = cell % cols;
              const cls =
                cellLines[cell] > k ? 'over' : cellLines[cell] === k ? 'done' : '';
              return (
                <text
                  key={cell}
                  className={`sli-num ${cls} ${won && insideSet.has(cell) ? 'won-in' : ''}`}
                  x={c * U + U / 2}
                  y={r * U + U / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={U * 0.42}
                >
                  {k}
                </text>
              );
            })}

            {edges.map((st, e) => {
              if (st === EMPTY) return null;
              const { x1, y1, x2, y2, h } = edgeCoords(e);
              if (st === LINE) {
                return (
                  <line
                    key={e}
                    className={`sli-line ${h ? 'h' : 'v'}`}
                    pathLength={1}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                  />
                );
              }
              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2;
              const s = 4.6;
              return (
                <path
                  key={e}
                  className="sli-x"
                  d={`M ${mx - s} ${my - s} L ${mx + s} ${my + s} M ${mx + s} ${my - s} L ${
                    mx - s
                  } ${my + s}`}
                />
              );
            })}

            {hintFlash !== null &&
              (() => {
                const { x1, y1, x2, y2 } = edgeCoords(hintFlash);
                return (
                  <circle
                    className="sli-ring"
                    cx={(x1 + x2) / 2}
                    cy={(y1 + y2) / 2}
                    r={U * 0.34}
                  />
                );
              })()}

            {Array.from({ length: nDots }, (_, dot) => {
              const r = Math.floor(dot / (cols + 1));
              const c = dot % (cols + 1);
              return (
                <circle
                  key={dot}
                  className={`sli-dot ${badDot === dot ? 'flash' : ''}`}
                  cx={c * U}
                  cy={r * U}
                  r={3.8}
                />
              );
            })}

            {won && winPath && (
              <path
                className="sli-loop-glow"
                d={winPath.d}
                style={
                  {
                    strokeDasharray: `${glow} ${winPath.len - glow}`,
                    '--sli-len': `${winPath.len}`
                  } as React.CSSProperties
                }
              />
            )}
          </g>
        </svg>
      </div>

      {assists.hint && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            <PadTool silent onClick={useHint} disabled={won}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          </div>
          <p className="sli-note">Tap between two dots to cycle: line → X → clear</p>
        </div>
      )}
    </div>
  );
}
