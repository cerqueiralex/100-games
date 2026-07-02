import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { generateFlowLevel } from './logic/generator';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
const PAR_SEC: Record<Difficulty, number> = { easy: 2 * 60, medium: 4 * 60, hard: 6 * 60 };
const HINT_PENALTY = 50;

export function ColorConnectGame({ difficulty, assists, paused, elapsedSec, events }: GameProps) {
  const level = useMemo(() => generateFlowLevel(difficulty), [difficulty]);
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

  const [paths, setPaths] = useState<number[][]>(() => level.paths.map(() => []));
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);

  const active = useRef<number | null>(null);
  const done = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const assistsUsed = useRef<Set<string>>(new Set(assists.progress ? ['progress'] : []));
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

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
    const cs = rect.width / size;
    const c = Math.floor((x - rect.left) / cs);
    const r = Math.floor((y - rect.top) / cs);
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
    setPaths((ps) => {
      const next = ps.map((p) => [...p]);
      let color: number | null = null;
      if (epColor !== undefined) {
        color = epColor;
        next[color] = [cell]; // restart from this endpoint
      } else {
        color = next.findIndex((p) => p.includes(cell));
        if (color === -1) return ps;
        next[color] = next[color].slice(0, next[color].indexOf(cell) + 1);
      }
      active.current = color;
      setMoves((m) => m + 1);
      sfx.tap();
      return next;
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (paused || done.current || active.current === null) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell === null) return;
    const color = active.current;
    setPaths((ps) => {
      const p = ps[color];
      if (p.length === 0) return ps;
      const last = p[p.length - 1];
      if (cell === last) return ps;
      // backtrack along own path
      const ownIdx = p.indexOf(cell);
      if (ownIdx !== -1) {
        const next = ps.map((q) => [...q]);
        next[color] = p.slice(0, ownIdx + 1);
        return next;
      }
      if (!orthAdjacent(last, cell)) return ps;
      // may not run through another color's endpoint
      const ep = endpointOwner.get(cell);
      if (ep !== undefined && ep !== color) return ps;
      // stop extending past our completed connection
      if (isComplete(ps, color)) return ps;
      const next = ps.map((q) => [...q]);
      // cut any other path occupying this cell
      for (let i = 0; i < next.length; i++) {
        if (i === color) continue;
        const at = next[i].indexOf(cell);
        if (at !== -1) next[i] = next[i].slice(0, at);
      }
      next[color] = [...p, cell];
      if (isComplete(next, color)) sfx.place();
      return next;
    });
  };

  const onPointerUp = () => {
    active.current = null;
    setPaths((ps) => {
      maybeFinish(ps, hintsUsed, moves);
      return ps;
    });
  };

  const useHint = () => {
    if (paused || done.current || !assists.solveColor) return;
    const idx = level.paths.findIndex((_, i) => !isComplete(paths, i));
    if (idx === -1) return;
    assistsUsed.current.add('solveColor');
    const hints = hintsUsed + 1;
    setHintsUsed(hints);
    sfx.hint();
    setPaths((ps) => {
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
      maybeFinish(next, hints, moves);
      return next;
    });
  };

  const cellColor = (cell: number): number => {
    for (let i = 0; i < paths.length; i++) if (paths[i].includes(cell)) return i;
    return endpointOwner.get(cell) ?? -1;
  };

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
          const color = cellColor(i);
          const isEp = endpointOwner.has(i);
          return (
            <div key={i} className={`fl-cell ${color >= 0 ? `fl-c${color % 9}` : ''} ${color >= 0 && !isEp ? 'path' : ''}`}>
              {isEp && <span className={`fl-dot fl-c${(endpointOwner.get(i)! % 9)}`} />}
            </div>
          );
        })}
      </div>

      {assists.solveColor && (
        <div className="sudoku-controls">
          <button className="pad-tool" onClick={useHint}>
            <BulbIcon />
            <span>Solve a color</span>
          </button>
        </div>
      )}
    </div>
  );
}
