import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, RestartIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  generateGraph,
  countCrossings,
  crossingEdges,
  relax,
  scramble,
  CONFIG,
  type Graph,
  type Pt
} from './logic/generator';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = { easy: 60, medium: 120, hard: 210, pro: 330, extreme: 540 };
const WIN_BONUS = 400;
const MOVE_POOL = 150;
const HINT_PENALTY = 60;
/** visual node diameter as a share of the (square) board, per node count */
const NODE_PCT: Record<Difficulty, string> = {
  easy: '10%',
  medium: '8.4%',
  hard: '7.4%',
  pro: '6.4%',
  extreme: '5.4%'
};

interface UntangleSave {
  graph: Graph;
  positions: Pt[];
  moves: number;
  hintsUsed: number;
  assistsUsed: string[];
}

function isSave(s: unknown, difficulty: Difficulty): s is UntangleSave {
  const v = s as UntangleSave | undefined;
  return (
    !!v &&
    Array.isArray(v.positions) &&
    Array.isArray(v.graph?.nodes) &&
    Array.isArray(v.graph?.edges) &&
    v.graph.nodes.length === CONFIG[difficulty].nodes &&
    v.positions.length === v.graph.nodes.length
  );
}

export function UntangleGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved = isSave(savedState, difficulty) ? savedState : undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const graph = useMemo<Graph>(() => saved?.graph ?? generateGraph({ difficulty }), [difficulty]);
  const edges = graph.edges;
  const n = graph.nodes.length;

  const [positions, setPositions] = useState<Pt[]>(() =>
    saved ? saved.positions.map((p) => ({ ...p })) : graph.nodes.map((nd) => ({ ...nd.start }))
  );
  const [moves, setMoves] = useState(saved?.moves ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [score, setScore] = useState(0);
  const [dragId, setDragId] = useState<number | null>(null);
  const [won, setWon] = useState(false);

  // synchronous mirrors so pointer handlers never read stale state
  const posRef = useRef(positions);
  const movesRef = useRef(moves);
  const hintsRef = useRef(hintsUsed);
  const done = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const drag = useRef<{ id: number | null; moved: boolean; lastTick: number }>({
    id: null,
    moved: false,
    lastTick: 0
  });
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  const highlightOn = !!assists['highlight-crossings'];
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(highlightOn ? ['highlight-crossings'] : [])])
  );
  // passive assist: counts as help whenever enabled, including mid-game
  useEffect(() => {
    if (highlightOn) assistsUsed.current.add('highlight-crossings');
  }, [highlightOn]);

  const commit = (next: Pt[]) => {
    posRef.current = next;
    setPositions(next);
  };

  const crossCount = useMemo(() => countCrossings(positions, edges), [positions, edges]);
  const crossSet = useMemo(
    () => (highlightOn && !won ? crossingEdges(positions, edges) : null),
    [positions, edges, highlightOn, won]
  );

  useEffect(() => {
    events.onStats({
      score,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { crossings: crossCount, moves, nodes: n }
    });
  }, [score, hintsUsed, crossCount, moves, n, events]);

  const finish = useCallback(
    (mv: number, hints: number) => {
      if (done.current) return;
      done.current = true;
      const mult = MULT[difficulty];
      const timeBonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * mult;
      const moveBonus = Math.round((MOVE_POOL * mult * n) / (n + mv));
      const final = Math.max(0, WIN_BONUS * mult + timeBonus + moveBonus - hints * HINT_PENALTY);
      setScore(final);
      setWon(true);
      setDragId(null);
      sfx.pop();
      events.onFinish({
        outcome: 'won',
        score: final,
        errors: 0,
        hintsUsed: hints,
        assistsUsed: [...assistsUsed.current],
        extra: { nodes: n, moves: mv, timeMs: Math.round(elapsedRef.current * 1000) }
      });
    },
    [difficulty, n, events]
  );

  const maybeWin = useCallback(
    (pos: Pt[]) => {
      if (done.current || edges.length === 0) return;
      if (countCrossings(pos, edges) === 0) finish(movesRef.current, hintsRef.current);
    },
    [edges, finish]
  );

  /* -------------------------- animated transitions -------------------------- */

  const cancelAnim = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const animateTo = useCallback(
    (target: Pt[], ms: number) => {
      cancelAnim();
      const from = posRef.current.map((p) => ({ ...p }));
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const cur = target.map((tp, i) => ({
          x: from[i].x + (tp.x - from[i].x) * e,
          y: from[i].y + (tp.y - from[i].y) * e
        }));
        commit(cur);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
          maybeWin(target);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [maybeWin]
  );

  useEffect(() => cancelAnim, []);

  /* --------------------- pointer drag: rect math, no elementFromPoint --------------------- */

  const nodeAt = (x: number, y: number): number | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const nx = (x - rect.left) / rect.width;
    const ny = (y - rect.top) / rect.height;
    let best = -1;
    let bd = Infinity;
    posRef.current.forEach((p, i) => {
      const d = Math.hypot((nx - p.x) * rect.width, (ny - p.y) * rect.height);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    // generous pick radius so small nodes stay tappable on phones
    const thresh = Math.max(rect.width * 0.09, 26);
    return bd <= thresh ? best : null;
  };

  const pointToNorm = (x: number, y: number): Pt => {
    const el = boardRef.current!;
    const rect = el.getBoundingClientRect();
    const M = 0.045;
    return {
      x: Math.max(M, Math.min(1 - M, (x - rect.left) / rect.width)),
      y: Math.max(M, Math.min(1 - M, (y - rect.top) / rect.height))
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    const id = nodeAt(e.clientX, e.clientY);
    if (id === null) return;
    cancelAnim();
    boardRef.current?.setPointerCapture(e.pointerId);
    drag.current = { id, moved: false, lastTick: 0 };
    setDragId(id);
    sfx.tap();
  };

  // pointer moves coalesce to one React commit per frame — a 120 Hz
  // pointer otherwise floods renders of the whole edge graph (QA-LEDGER
  // drag rule)
  const pendingPt = useRef<Pt | null>(null);
  const moveRaf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(moveRaf.current), []);

  const onPointerMove = (e: React.PointerEvent) => {
    const g = drag.current;
    if (g.id === null || paused || done.current) return;
    const p = pointToNorm(e.clientX, e.clientY);
    const cur = posRef.current[g.id];
    if (Math.abs(cur.x - p.x) < 1e-4 && Math.abs(cur.y - p.y) < 1e-4) return;
    g.moved = true; // synchronous — a fast flick may release before the rAF
    pendingPt.current = p;
    if (moveRaf.current) return;
    moveRaf.current = requestAnimationFrame(() => {
      moveRaf.current = 0;
      const gg = drag.current;
      const pp = pendingPt.current;
      if (gg.id === null || !pp) return;
      commit(posRef.current.map((q, i) => (i === gg.id ? pp : q)));
      const now = performance.now();
      if (now - gg.lastTick > 90) {
        gg.lastTick = now;
        sfx.drag();
      }
    });
  };

  const onPointerUp = () => {
    const g = drag.current;
    // flush the last coalesced position so the drop lands where the finger was
    if (g.id !== null && pendingPt.current && g.moved) {
      const p = pendingPt.current;
      commit(posRef.current.map((q, i) => (i === g.id ? p : q)));
    }
    pendingPt.current = null;
    drag.current = { id: null, moved: false, lastTick: 0 };
    setDragId(null);
    if (g.id === null) return;
    if (g.moved) {
      movesRef.current += 1;
      setMoves(movesRef.current);
      sfx.tap();
      maybeWin(posRef.current);
    }
  };

  /* ------------------------------- tools ------------------------------- */

  const shuffleNodes = () => {
    if (paused || done.current) return;
    const next = scramble(Math.random, n, edges);
    animateTo(next, 320);
  };

  const autoSpread = () => {
    if (paused || done.current || !assists['auto-spread']) return;
    assistsUsed.current.add('auto-spread');
    sfx.pop();
    const next = relax(posRef.current, edges, 4);
    animateTo(next, 300);
  };

  const useHint = () => {
    if (paused || done.current || !assists.hint) return;
    const pos = posRef.current;
    const solved = graph.nodes.map((nd) => nd.solved);
    // pick the node whose move to its solved spot lowers crossings the most,
    // tie-broken by how many crossings it currently sits in
    const cs = crossingEdges(pos, edges);
    const inCross = new Array<number>(n).fill(0);
    edges.forEach((ed, i) => {
      if (cs.has(i)) {
        inCross[ed.a]++;
        inCross[ed.b]++;
      }
    });
    let best = -1;
    let bestCount = Infinity;
    let bestTie = -1;
    for (let k = 0; k < n; k++) {
      if (Math.hypot(pos[k].x - solved[k].x, pos[k].y - solved[k].y) < 0.02) continue;
      const trial = pos.map((q, i) => (i === k ? solved[k] : q));
      const c = countCrossings(trial, edges);
      if (c < bestCount || (c === bestCount && inCross[k] > bestTie)) {
        best = k;
        bestCount = c;
        bestTie = inCross[k];
      }
    }
    if (best === -1) return;
    assistsUsed.current.add('hint');
    hintsRef.current += 1;
    setHintsUsed(hintsRef.current);
    movesRef.current += 1;
    setMoves(movesRef.current);
    sfx.hint();
    const target = pos.map((q, i) => (i === best ? { ...solved[best] } : q));
    animateTo(target, 320);
  };

  useEffect(() => {
    registerSnapshot(() => ({
      graph,
      positions: posRef.current,
      moves: movesRef.current,
      hintsUsed: hintsRef.current,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  /* ------------------------------- render ------------------------------- */

  const showTools = true; // shuffle is always available
  const nodeSize = NODE_PCT[difficulty];

  return (
    <div className={`untangle ${paused ? 'board-hidden' : ''}`}>
      <div className="utg-hud">
        {highlightOn ? (
          <span className={`utg-crossings ${crossCount === 0 ? 'solved' : ''}`}>
            <span className="utg-cross-dot" aria-hidden />
            Crossings <b>{crossCount}</b>
          </span>
        ) : (
          <span className="utg-crossings hidden">Crossings hidden</span>
        )}
        <span className="info-item">
          Moves <b>{moves}</b>
        </span>
      </div>

      <div
        ref={boardRef}
        className={`utg-board ${won ? 'won' : ''} ${dragId !== null ? 'dragging-any' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg className="utg-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {edges.map((e, i) => {
            const a = positions[e.a];
            const b = positions[e.b];
            const state = won
              ? 'good'
              : crossSet
                ? crossSet.has(i)
                  ? 'bad'
                  : 'good'
                : 'idle';
            return (
              <line
                key={i}
                className={`utg-edge ${state}`}
                x1={a.x * 100}
                y1={a.y * 100}
                x2={b.x * 100}
                y2={b.y * 100}
                style={won ? ({ '--wd': `${(i % 8) * 0.05}s` } as CSSProperties) : undefined}
              />
            );
          })}
        </svg>

        {positions.map((p, i) => (
          <div
            key={i}
            className={`utg-node ${dragId === i ? 'grab' : ''} ${won ? 'won' : ''}`}
            style={
              {
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                width: `max(24px, ${nodeSize})`,
                '--wd': won ? `${(i % 10) * 0.04}s` : undefined
              } as CSSProperties
            }
          />
        ))}
      </div>

      {showTools && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            <PadTool silent onClick={shuffleNodes} disabled={won}>
              <RestartIcon />
              <span>Shuffle</span>
            </PadTool>
            {assists['auto-spread'] && (
              <PadTool onClick={autoSpread} disabled={won}>
                <SpreadIcon />
                <span>Spread</span>
              </PadTool>
            )}
            {assists.hint && (
              <PadTool silent onClick={useHint} disabled={won}>
                <BulbIcon />
                <span>Hint</span>
              </PadTool>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** monochrome "spread apart" glyph — arrows pushing out from a centre */
function SpreadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 8V4m0 0 2 2m-2-2-2 2M12 16v4m0 0 2-2m-2 2-2-2M8 12H4m0 0 2 2m-2-2 2-2M16 12h4m0 0-2 2m2-2-2-2" />
    </svg>
  );
}
