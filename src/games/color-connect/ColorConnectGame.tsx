import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { generateFlowLevel, type FlowLevel } from './logic/generator';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = { easy: 2 * 60, medium: 4 * 60, hard: 6 * 60, pro: 8 * 60, extreme: 10 * 60 };
const HINT_PENALTY = 50;

interface FlowSave {
  level: FlowLevel;
  paths: number[][];
  moves: number;
  hintsUsed: number;
  assistsUsed: string[];
}

export function ColorConnectGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  // ignore old-format saves that lack the expected shape
  const saved =
    savedState &&
    Array.isArray((savedState as FlowSave).paths) &&
    Array.isArray((savedState as FlowSave).level?.paths)
      ? (savedState as FlowSave)
      : undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const level = useMemo(() => saved?.level ?? generateFlowLevel(difficulty), [difficulty]);
  const size = level.size;
  const n = size * size;

  const endpoints = useMemo(
    () => level.paths.map((p) => [p[0], p[p.length - 1]] as const),
    [level]
  );
  const endpointOwner = useMemo(() => {
    const map = new Map<number, number>();
    endpoints.forEach(([a, b], color) => {
      map.set(a, color);
      map.set(b, color);
    });
    return map;
  }, [endpoints]);

  const [paths, setPaths] = useState<number[][]>(() =>
    saved ? saved.paths.map((p) => [...p]) : level.paths.map(() => [])
  );
  const [moves, setMoves] = useState(saved?.moves ?? 0);
  // synchronous mirrors so pointer handlers can compute OUTSIDE setState
  // updaters (side effects in updaters run during render — React warns and
  // StrictMode would double them) without racing batched events
  const pathsRef = useRef(paths);
  const movesRef = useRef(moves);
  const commitPaths = (next: number[][]) => {
    pathsRef.current = next;
    setPaths(next);
  };
  const [score, setScore] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);

  const active = useRef<number | null>(null);
  const done = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists.progress ? ['progress'] : [])])
  );
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  // passive assist: counts as help whenever enabled, including mid-game
  useEffect(() => {
    if (assists.progress) assistsUsed.current.add('progress');
  }, [assists.progress]);

  const isComplete = useCallback(
    (ps: number[][], color: number) => {
      const p = ps[color];
      if (p.length < 2) return false;
      const [a, b] = endpoints[color];
      const first = p[0];
      const last = p[p.length - 1];
      return (first === a && last === b) || (first === b && last === a);
    },
    [endpoints]
  );

  const covered = useMemo(() => {
    const set = new Set<number>();
    paths.forEach((p) => p.forEach((c) => set.add(c)));
    endpointOwner.forEach((_, cell) => set.add(cell));
    return set.size;
  }, [paths, endpointOwner]);

  useEffect(() => {
    events.onStats({
      score,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { moves, coverage: `${Math.round((covered / n) * 100)}%` }
    });
  }, [score, hintsUsed, moves, covered, n, events]);

  const maybeFinish = useCallback(
    (ps: number[][], hints: number, mv: number) => {
      if (done.current) return;
      const allComplete = ps.every((_, i) => isComplete(ps, i));
      const set = new Set<number>();
      ps.forEach((p) => p.forEach((c) => set.add(c)));
      if (!allComplete || set.size !== n) return;
      done.current = true;
      const bonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * MULT[difficulty];
      const final = Math.max(0, 500 * MULT[difficulty] - mv * 2 + bonus - hints * HINT_PENALTY);
      setScore(final);
      events.onFinish({
        outcome: 'won',
        score: final,
        errors: 0,
        hintsUsed: hints,
        assistsUsed: [...assistsUsed.current],
        extra: { moves: mv, colors: ps.length }
      });
    },
    [isComplete, n, difficulty, events]
  );

  const cellFromPoint = (x: number, y: number): number | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    // measure the content box: the board has a border, padding and a grid
    // gap, so dividing the raw rect by size drifts the lattice off the cells
    const style = getComputedStyle(el);
    const padL = parseFloat(style.paddingLeft);
    const padT = parseFloat(style.paddingTop);
    const gap = parseFloat(style.columnGap) || 0;
    const inner = el.clientWidth - padL - parseFloat(style.paddingRight);
    const pitch = (inner + gap) / size;
    const c = Math.floor((x - (rect.left + el.clientLeft + padL)) / pitch);
    const r = Math.floor((y - (rect.top + el.clientTop + padT)) / pitch);
    if (c < 0 || c >= size || r < 0 || r >= size) return null;
    return r * size + c;
  };

  const orthAdjacent = (a: number, b: number) => {
    const dr = Math.abs(Math.floor(a / size) - Math.floor(b / size));
    const dc = Math.abs((a % size) - (b % size));
    return dr + dc === 1;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell === null) return;
    boardRef.current?.setPointerCapture(e.pointerId);
    const epColor = endpointOwner.get(cell);
    const ps = pathsRef.current;
    const next = ps.map((p) => [...p]);
    let color: number;
    if (epColor !== undefined) {
      color = epColor;
      next[color] = [cell]; // restart from this endpoint
    } else {
      color = next.findIndex((p) => p.includes(cell));
      if (color === -1) return;
      next[color] = next[color].slice(0, next[color].indexOf(cell) + 1);
    }
    active.current = color;
    movesRef.current += 1;
    setMoves(movesRef.current);
    sfx.tap();
    commitPaths(next);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (paused || done.current || active.current === null) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell === null) return;
    const color = active.current;
    {
      const ps = pathsRef.current;
      const p0 = ps[color];
      if (p0.length === 0) return;
      const last = p0[p0.length - 1];
      if (cell === last) return;

      // interpolate a straight run of cells so fast drags never skip tiles
      const steps: number[] = [];
      const r1 = Math.floor(last / size);
      const c1 = last % size;
      const r2 = Math.floor(cell / size);
      const c2 = cell % size;
      if (r1 === r2) {
        const d = c2 > c1 ? 1 : -1;
        for (let c = c1 + d; d > 0 ? c <= c2 : c >= c2; c += d) steps.push(r1 * size + c);
      } else if (c1 === c2) {
        const d = r2 > r1 ? size : -size;
        for (let i = last + d; d > 0 ? i <= cell : i >= cell; i += d) steps.push(i);
      } else if (orthAdjacent(last, cell)) {
        steps.push(cell);
      } else {
        return;
      }

      let next = ps;
      let changed = false;
      let connected = false;
      for (const target of steps) {
        const p = next[color];
        const lastCell = p[p.length - 1];
        // backtrack along own path
        const ownIdx = p.indexOf(target);
        if (ownIdx !== -1) {
          next = next.map((q, i) => (i === color ? p.slice(0, ownIdx + 1) : q));
          changed = true;
          continue;
        }
        if (!orthAdjacent(lastCell, target)) break;
        // may not run through another color's endpoint
        const ep = endpointOwner.get(target);
        if (ep !== undefined && ep !== color) break;
        // stop extending past our completed connection
        if (isComplete(next, color)) break;
        next = next.map((q, i) => {
          if (i === color) return [...q, target];
          // cut any other path occupying this cell
          const at = q.indexOf(target);
          return at !== -1 ? q.slice(0, at) : q;
        });
        changed = true;
        if (isComplete(next, color)) {
          connected = true;
          break;
        }
      }
      if (!changed) return;
      if (connected) sfx.pop();
      else sfx.drag();
      commitPaths(next);
    }
  };

  const onPointerUp = () => {
    active.current = null;
    maybeFinish(pathsRef.current, hintsUsed, movesRef.current);
  };

  const useHint = () => {
    if (paused || done.current || !assists.solveColor) return;
    const ps = pathsRef.current;
    const idx = level.paths.findIndex((_, i) => !isComplete(ps, i));
    if (idx === -1) return;
    assistsUsed.current.add('solveColor');
    const hints = hintsUsed + 1;
    setHintsUsed(hints);
    sfx.hint();
    const next = ps.map((q) => [...q]);
    const solution = level.paths[idx];
    // clear other paths that overlap the solution
    for (let i = 0; i < next.length; i++) {
      if (i === idx) continue;
      next[i] = next[i].filter((c) => !solution.includes(c) || endpointOwner.get(c) === i);
      // keep only the contiguous prefix
      const cut = next[i].findIndex((c, k) => k > 0 && !orthAdjacent(next[i][k - 1], c));
      if (cut !== -1) next[i] = next[i].slice(0, cut);
    }
    next[idx] = [...solution];
    commitPaths(next);
    maybeFinish(next, hints, movesRef.current);
  };

  /** cell -> which color's pipe passes through and towards which edges */
  const pipes = useMemo(() => {
    const map = new Map<number, { color: number; dirs: string[] }>();
    paths.forEach((p, color) => {
      p.forEach((cell, k) => {
        const dirs: string[] = [];
        for (const nb of [p[k - 1], p[k + 1]]) {
          if (nb === undefined) continue;
          if (nb === cell - size) dirs.push('n');
          else if (nb === cell + size) dirs.push('s');
          else if (nb === cell - 1) dirs.push('w');
          else if (nb === cell + 1) dirs.push('e');
        }
        map.set(cell, { color, dirs });
      });
    });
    return map;
  }, [paths, size]);

  useEffect(() => {
    registerSnapshot(() => ({
      level,
      paths,
      moves,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  return (
    <div className={`colorconnect ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Colors:{' '}
          <b>
            {paths.filter((_, i) => isComplete(paths, i)).length} / {paths.length}
          </b>
        </span>
        {assists.progress && (
          <span className="info-item">
            Filled: <b>{Math.round((covered / n) * 100)}%</b>
          </span>
        )}
        <span className="info-item">
          Moves: <b>{moves}</b>
        </span>
      </div>

      <div
        ref={boardRef}
        className="fl-board"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {Array.from({ length: n }, (_, i) => {
          const pipe = pipes.get(i);
          const ep = endpointOwner.get(i);
          return (
            <div key={i} className={`fl-cell ${pipe ? `tint fl-c${pipe.color % 9}` : ''}`}>
              {pipe?.dirs.map((d) => (
                <span key={d} className={`fl-seg ${d} fl-c${pipe.color % 9}`} />
              ))}
              {pipe && <span className={`fl-seg c fl-c${pipe.color % 9}`} />}
              {ep !== undefined && <span className={`fl-dot ep fl-c${ep % 9}`} />}
            </div>
          );
        })}
      </div>

      {assists.solveColor && (
        <div className="game-tools fx-card">
        <div className="sudoku-controls">
          <PadTool silent onClick={useHint}>
            <BulbIcon />
            <span>Solve a color</span>
          </PadTool>
        </div>
        </div>
      )}
    </div>
  );
}
