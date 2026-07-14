import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  completeIslands,
  findViolations,
  generateNurikabe,
  hintCell,
  SEA,
  ISLAND,
  UNKNOWN,
  type NurikabePuzzle
} from './logic/generator';

const SIZE: Record<Difficulty, number> = { easy: 5, medium: 6, hard: 7, pro: 8, extreme: 10 };
const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = {
  easy: 2 * 60,
  medium: 4 * 60,
  hard: 6 * 60,
  pro: 9 * 60,
  extreme: 14 * 60
};
const CELL_PTS = 5;
const ERR_PENALTY = 20;
const HINT_PENALTY = 30;
/** per-diagonal stagger of the win shimmer sweep */
const WAVE_STEP_MS = 26;

type Mode = 'sea' | 'island';

interface NurSave {
  puzzle: NurikabePuzzle;
  grid: number[];
  errors: number;
  hintsUsed: number;
  mode: Mode;
  assistsUsed: string[];
}

/** inline monochrome tool icons (no perfect match in icons.tsx) */
function SeaIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8c1.6 1.4 3.4 1.4 5 0s3.4-1.4 5 0 3.4 1.4 5 0 2.4-1.1 3-1.3" />
      <path d="M3 13c1.6 1.4 3.4 1.4 5 0s3.4-1.4 5 0 3.4 1.4 5 0 2.4-1.1 3-1.3" />
      <path d="M3 18c1.6 1.4 3.4 1.4 5 0s3.4-1.4 5 0 3.4 1.4 5 0 2.4-1.1 3-1.3" />
    </svg>
  );
}
function IslandIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" />
    </svg>
  );
}

export function NurikabeGame({
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
    Array.isArray((savedState as NurSave).grid) &&
    Array.isArray((savedState as NurSave).puzzle?.solution)
      ? (savedState as NurSave)
      : undefined;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const puzzle = useMemo(() => saved?.puzzle ?? generateNurikabe({ size: SIZE[difficulty] }), [difficulty]);
  const size = puzzle.size;
  const n = size * size;
  const { solution, clues } = puzzle;

  const clueMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of clues) m.set(c.cell, c.value);
    return m;
  }, [clues]);
  const islandTotal = useMemo(() => solution.reduce((a, v) => a + (v === 0 ? 1 : 0), 0), [solution]);

  // player grid: UNKNOWN / SEA / ISLAND. clue cells stay ISLAND forever.
  const initGrid = useCallback(() => {
    if (saved?.grid) return saved.grid.slice();
    const g = new Array<number>(n).fill(UNKNOWN);
    for (const c of clues) g[c.cell] = ISLAND;
    return g;
  }, [saved, n, clues]);

  const [grid, setGrid] = useState<number[]>(initGrid);
  const [mode, setMode] = useState<Mode>(saved?.mode ?? 'sea');
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [won, setWon] = useState(false);
  const [hintFlash, setHintFlash] = useState<number | null>(null);

  const gridRef = useRef(grid);
  // synchronous mirrors — a drag can fire several times between renders,
  // so counters must never read stale closed-over state
  const errorsRef = useRef(saved?.errors ?? 0);
  const hintsRef = useRef(saved?.hintsUsed ?? 0);
  const done = useRef(false);
  const cellsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<null | { from: number; target: number; axis: 'h' | 'v' | null; start: number; last: number }>(null);
  const finishTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...(assists.ruleCheck ? ['ruleCheck'] : []),
      ...(assists.completeIslands ? ['completeIslands'] : [])
    ])
  );
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  useEffect(
    () => () => {
      if (finishTimer.current) clearTimeout(finishTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    []
  );

  // passive assists count as help whenever enabled (including mid-game)
  useEffect(() => {
    if (assists.ruleCheck) assistsUsed.current.add('ruleCheck');
  }, [assists.ruleCheck]);
  useEffect(() => {
    if (assists.completeIslands) assistsUsed.current.add('completeIslands');
  }, [assists.completeIslands]);

  /* ---------------- win detection ---------------------------------- */

  const matchesSolution = useCallback(
    (g: number[]) => {
      // by uniqueness, matching the solution ⟺ satisfying every rule
      for (let i = 0; i < n; i++) {
        const want = solution[i] === 1 ? SEA : ISLAND;
        if (g[i] !== want) return false;
      }
      return true;
    },
    [n, solution]
  );

  const triggerWin = useCallback(
    (finalErrors: number, finalHints: number) => {
      if (done.current) return;
      done.current = true;
      setWon(true);
      sfx.pop();
      const waveMs = (2 * size - 2) * WAVE_STEP_MS + 620;
      finishTimer.current = window.setTimeout(() => {
        const bonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * MULT[difficulty];
        const score = Math.max(
          0,
          n * CELL_PTS * MULT[difficulty] - finalErrors * ERR_PENALTY - finalHints * HINT_PENALTY + bonus
        );
        events.onFinish({
          outcome: 'won',
          score,
          errors: finalErrors,
          hintsUsed: finalHints,
          assistsUsed: [...assistsUsed.current],
          extra: { board: `${size}×${size}`, islands: clues.length }
        });
      }, waveMs);
    },
    [size, n, difficulty, events, clues.length]
  );

  const commit = useCallback(
    (next: number[]) => {
      gridRef.current = next;
      setGrid(next);
      if (matchesSolution(next)) triggerWin(errorsRef.current, hintsRef.current);
    },
    [matchesSolution, triggerWin]
  );

  /* ---------------- pointer interaction (tap + axis-locked drag) ---- */

  const cellFromPoint = (x: number, y: number): number | null => {
    const el = cellsRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const c = Math.floor((x - (rect.left + el.clientLeft)) / (el.clientWidth / size));
    const r = Math.floor((y - (rect.top + el.clientTop)) / (el.clientHeight / size));
    if (c < 0 || c >= size || r < 0 || r >= size) return null;
    return r * size + c;
  };

  /** apply the drag action to one cell; 0 no-op, 1 changed, 2 changed-and-wrong */
  const applyCell = (g: number[], i: number, drag: { from: number; target: number }): number => {
    if (clueMap.has(i) || g[i] !== drag.from || drag.from === drag.target) return 0;
    g[i] = drag.target;
    const wrong =
      (drag.target === SEA && solution[i] === 0) || (drag.target === ISLAND && solution[i] === 1);
    return wrong && assists.ruleCheck ? 2 : 1;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell === null || clueMap.has(cell)) return;
    cellsRef.current?.setPointerCapture(e.pointerId);
    const st = gridRef.current[cell];
    const primary = mode === 'sea' ? SEA : ISLAND;
    // start on empty → paint primary; start on a placed cell → erase it
    const target = st === UNKNOWN ? primary : UNKNOWN;
    const drag = { from: st, target, axis: null as 'h' | 'v' | null, start: cell, last: cell };
    dragRef.current = drag;
    const next = gridRef.current.slice();
    const res = applyCell(next, cell, drag);
    if (res === 0) return;
    if (res === 2) {
      errorsRef.current += 1;
      setErrors(errorsRef.current);
      sfx.error();
    } else if (target === SEA) sfx.place();
    else if (target === ISLAND) sfx.tap();
    else sfx.drag();
    commit(next);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || paused || done.current) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell === null || cell === drag.last) return;
    const r0 = Math.floor(drag.start / size);
    const c0 = drag.start % size;
    const r = Math.floor(cell / size);
    const c = cell % size;
    // lock the stroke to the dominant row/col axis so fast drags never skip
    if (drag.axis === null) {
      if (r === r0 && c !== c0) drag.axis = 'h';
      else if (c === c0 && r !== r0) drag.axis = 'v';
      else drag.axis = Math.abs(c - c0) >= Math.abs(r - r0) ? 'h' : 'v';
    }
    const t = drag.axis === 'h' ? r0 * size + c : r * size + c0;
    if (t === drag.last) return;
    const step = drag.axis === 'h' ? (t > drag.last ? 1 : -1) : t > drag.last ? size : -size;
    const next = gridRef.current.slice();
    let changed = 0;
    let wrong = 0;
    for (let i = drag.last + step; ; i += step) {
      const res = applyCell(next, i, drag);
      if (res === 2) wrong++;
      if (res > 0) changed++;
      if (i === t) break;
    }
    drag.last = t;
    if (!changed) return;
    if (wrong > 0) {
      errorsRef.current += wrong;
      setErrors(errorsRef.current);
      sfx.error();
    } else sfx.drag();
    commit(next);
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  /* ---------------- hint: reveal the next forced cell -------------- */

  const useHint = () => {
    if (paused || done.current || !assists.hint) return;
    const found = hintCell(size, clues, gridRef.current, solution);
    if (!found) return;
    assistsUsed.current.add('hint');
    hintsRef.current += 1;
    setHintsUsed(hintsRef.current);
    sfx.hint();
    const next = gridRef.current.slice();
    next[found.cell] = found.state;
    setHintFlash(found.cell);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setHintFlash(null), 700);
    commit(next);
  };

  /* ---------------- derived view state ------------------------------ */

  const violations = useMemo(
    () => (assists.ruleCheck ? new Set(findViolations(size, grid, clues)) : new Set<number>()),
    [assists.ruleCheck, size, grid, clues]
  );
  const complete = useMemo(
    () => (assists.completeIslands ? new Set(completeIslands(size, grid, clues)) : new Set<number>()),
    [assists.completeIslands, size, grid, clues]
  );

  const seaCount = useMemo(() => grid.reduce((a, v) => a + (v === SEA ? 1 : 0), 0), [grid]);
  const islandMarks = useMemo(
    () => grid.reduce((a, v, i) => a + (v === ISLAND && !clueMap.has(i) ? 1 : 0), 0),
    [grid, clueMap]
  );
  const resolvedCorrect = useMemo(() => {
    let k = 0;
    for (let i = 0; i < n; i++) {
      const want = solution[i] === 1 ? SEA : ISLAND;
      if (grid[i] === want) k++;
    }
    return k;
  }, [grid, solution, n]);

  const liveScore = Math.max(
    0,
    (won ? n : resolvedCorrect) * CELL_PTS * MULT[difficulty] - errors * ERR_PENALTY - hintsUsed * HINT_PENALTY
  );

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { islandCells: `${islandMarks + clues.length}/${islandTotal}`, sea: seaCount }
    });
  }, [liveScore, errors, hintsUsed, islandMarks, clues.length, islandTotal, seaCount, events]);

  useEffect(() => {
    registerSnapshot(() => ({
      puzzle,
      grid: [...grid],
      errors,
      hintsUsed,
      mode,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  /* ---------------- render ------------------------------------------ */

  return (
    <div className={`nurikabe ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Islands: <b>{clues.length}</b>
        </span>
        {assists.ruleCheck && (
          <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
            Errors: <b>{errors}</b>
          </span>
        )}
        <span className="info-item">
          <b>{liveScore.toLocaleString()}</b> pts
        </span>
      </div>

      <div className="nur-board-wrap" style={{ maxWidth: `${size * 52}px` }}>
        <div
          ref={cellsRef}
          className={`nur-board ${won ? 'won' : ''}`}
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          role="group"
          aria-label={`Nurikabe board, ${size} by ${size}`}
        >
          {grid.map((s, i) => {
            const r = Math.floor(i / size);
            const c = i % size;
            const clue = clueMap.get(i);
            const isClue = clue !== undefined;
            return (
              <div
                key={i}
                className={[
                  'nur-cell',
                  s === SEA ? 'sea' : '',
                  s === ISLAND ? 'island' : '',
                  isClue ? 'clue' : '',
                  complete.has(i) ? 'complete' : '',
                  violations.has(i) ? 'violation' : '',
                  hintFlash === i ? 'hintflash' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={won ? { animationDelay: `${(r + c) * WAVE_STEP_MS}ms` } : undefined}
                aria-label={isClue ? `Island of ${clue}` : `Cell ${r + 1},${c + 1}`}
              >
                {isClue ? <span className="nur-num">{clue}</span> : s === ISLAND ? <span className="nur-dot" /> : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          <PadTool active={mode === 'sea'} onClick={() => setMode('sea')}>
            <SeaIcon />
            <span>Sea</span>
          </PadTool>
          <PadTool active={mode === 'island'} onClick={() => setMode('island')}>
            <IslandIcon />
            <span>Island</span>
          </PadTool>
          {assists.hint && (
            <PadTool silent onClick={useHint}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
        </div>
        <p className="nur-note">Tap or drag to paint · start on a painted cell to erase it</p>
      </div>
    </div>
  );
}
