import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  clueDims,
  generateNonogram,
  lineSatisfied,
  type NonogramPuzzle
} from './logic/generator';

const SIZE: Record<Difficulty, number> = { easy: 5, medium: 8, hard: 10, pro: 12, extreme: 15 };
const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = {
  easy: 2 * 60,
  medium: 4 * 60,
  hard: 6 * 60,
  pro: 9 * 60,
  extreme: 13 * 60
};
const CELL_PTS = 4;
const ERR_PENALTY = 20;
const HINT_PENALTY = 30;
/** per-diagonal stagger of the win reveal wave */
const WAVE_STEP_MS = 28;

/** player cell states */
const UNKNOWN = 0;
const FILLED = 1;
const MARKED = 2;

type Mode = 'fill' | 'mark';

interface NonSave {
  puzzle: NonogramPuzzle;
  grid: number[];
  errors: number;
  hintsUsed: number;
  mode: Mode;
  assistsUsed: string[];
}

/** inline monochrome tool icons (no perfect match in icons.tsx) */
function FillSquareIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor" />
    </svg>
  );
}
function MarkXIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M7 7l10 10M17 7L7 17" />
    </svg>
  );
}

export function NonogramGame({
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
    Array.isArray((savedState as NonSave).grid) &&
    Array.isArray((savedState as NonSave).puzzle?.cells)
      ? (savedState as NonSave)
      : undefined;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const puzzle = useMemo(() => saved?.puzzle ?? generateNonogram({ size: SIZE[difficulty] }), [difficulty]);
  const size = puzzle.size;
  const n = size * size;
  const { rowClues, colClues } = puzzle;
  const totalFill = useMemo(() => puzzle.cells.reduce((a, v) => a + v, 0), [puzzle]);

  const [grid, setGrid] = useState<number[]>(() => saved?.grid.slice() ?? new Array(n).fill(UNKNOWN));
  const [mode, setMode] = useState<Mode>(saved?.mode ?? 'fill');
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [won, setWon] = useState(false);
  const [hintFlash, setHintFlash] = useState<number | null>(null);

  const gridRef = useRef(grid);
  // synchronous mirrors — pointer handlers can fire several times between
  // renders, so counters must not read stale closed-over state
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
      ...(assists.mistakes ? ['mistakes'] : []),
      ...(assists.autocross ? ['autocross'] : [])
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

  // passive assist: error check counts as help whenever enabled
  useEffect(() => {
    if (assists.mistakes) assistsUsed.current.add('mistakes');
  }, [assists.mistakes]);

  const rowLine = useCallback(
    (g: number[], r: number) => g.slice(r * size, (r + 1) * size),
    [size]
  );
  const colLine = useCallback(
    (g: number[], c: number) => {
      const line: number[] = [];
      for (let r = 0; r < size; r++) line.push(g[r * size + c]);
      return line;
    },
    [size]
  );

  const applyAutocross = useCallback(
    (g: number[]): number[] => {
      for (let r = 0; r < size; r++) {
        if (lineSatisfied(rowClues[r], rowLine(g, r))) {
          for (let c = 0; c < size; c++) if (g[r * size + c] === UNKNOWN) g[r * size + c] = MARKED;
        }
      }
      for (let c = 0; c < size; c++) {
        if (lineSatisfied(colClues[c], colLine(g, c))) {
          for (let r = 0; r < size; r++) if (g[r * size + c] === UNKNOWN) g[r * size + c] = MARKED;
        }
      }
      return g;
    },
    [size, rowClues, colClues, rowLine, colLine]
  );

  const triggerWin = useCallback(
    (finalErrors: number, finalHints: number) => {
      if (done.current) return;
      done.current = true;
      setWon(true);
      sfx.pop();
      // let the X marks fade and the picture pop in a wave, then celebrate
      const waveMs = (2 * size - 2) * WAVE_STEP_MS + 550;
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
          extra: { picture: `${size}×${size}`, cells: totalFill }
        });
      }, waveMs);
    },
    [size, n, difficulty, events, totalFill]
  );

  const commit = useCallback(
    (next: number[], freshErrors: number, freshHints: number) => {
      if (assists.autocross) applyAutocross(next);
      gridRef.current = next;
      setGrid(next);
      let all = true;
      for (let r = 0; r < size && all; r++) if (!lineSatisfied(rowClues[r], rowLine(next, r))) all = false;
      for (let c = 0; c < size && all; c++) if (!lineSatisfied(colClues[c], colLine(next, c))) all = false;
      if (all) triggerWin(freshErrors, freshHints);
    },
    [assists.autocross, applyAutocross, size, rowClues, colClues, rowLine, colLine, triggerWin]
  );

  // passive assist: auto-cross counts as help and acts immediately when enabled
  useEffect(() => {
    if (!assists.autocross) return;
    assistsUsed.current.add('autocross');
    commit(gridRef.current.slice(), errorsRef.current, hintsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assists.autocross]);

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

  /** apply the drag action to one cell; returns 0 no-op, 1 changed, 2 changed-and-wrong */
  const applyCell = (g: number[], i: number, drag: { from: number; target: number }): number => {
    if (g[i] !== drag.from || drag.from === drag.target) return 0;
    g[i] = drag.target;
    if (drag.target === FILLED && puzzle.cells[i] === 0 && assists.mistakes) return 2;
    return 1;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell === null) return;
    cellsRef.current?.setPointerCapture(e.pointerId);
    const st = gridRef.current[cell];
    const primary = mode === 'fill' ? FILLED : MARKED;
    // starting on any placed cell erases that state; empty cells paint
    const target = st === UNKNOWN ? primary : UNKNOWN;
    const drag = { from: st, target, axis: null, start: cell, last: cell };
    dragRef.current = drag;
    const next = gridRef.current.slice();
    const res = applyCell(next, cell, drag);
    if (res === 0) return;
    if (res === 2) {
      errorsRef.current += 1;
      setErrors(errorsRef.current);
      sfx.error();
    } else if (target === FILLED) sfx.place();
    else if (target === MARKED) sfx.tap();
    else sfx.drag();
    commit(next, errorsRef.current, hintsRef.current);
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
    // lock the drag to the dominant row/col axis, classic picross style
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
    commit(next, errorsRef.current, hintsRef.current);
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  /* ---------------- hint: reveal one cell of the tightest line ------ */

  const useHint = () => {
    if (paused || done.current || !assists.hint) return;
    const g = gridRef.current;
    const lines: { clue: number[]; indices: number[] }[] = [];
    for (let r = 0; r < size; r++) {
      lines.push({ clue: rowClues[r], indices: Array.from({ length: size }, (_, c) => r * size + c) });
    }
    for (let c = 0; c < size; c++) {
      lines.push({ clue: colClues[c], indices: Array.from({ length: size }, (_, r) => r * size + c) });
    }
    // most-constrained line = fewest cells still differing from the solution
    let best: number[] | null = null;
    for (const { clue, indices } of lines) {
      if (lineSatisfied(clue, indices.map((i) => g[i]))) continue;
      const unresolved = indices.filter((i) =>
        puzzle.cells[i] === 1 ? g[i] !== FILLED : g[i] !== MARKED
      );
      if (unresolved.length === 0) continue;
      if (!best || unresolved.length < best.length) best = unresolved;
    }
    if (!best) return;
    // prefer revealing a picture cell over an X
    const cell = best.find((i) => puzzle.cells[i] === 1) ?? best[0];
    assistsUsed.current.add('hint');
    hintsRef.current += 1;
    setHintsUsed(hintsRef.current);
    sfx.hint();
    const next = g.slice();
    next[cell] = puzzle.cells[cell] === 1 ? FILLED : MARKED;
    setHintFlash(cell);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setHintFlash(null), 700);
    commit(next, errorsRef.current, hintsRef.current);
  };

  /* ---------------- derived view state ------------------------------ */

  const rowMeta = useMemo(
    () =>
      rowClues.map((clue, r) => {
        const line = rowLine(grid, r);
        return { sat: lineSatisfied(clue, line), dims: clueDims(clue, line) };
      }),
    [rowClues, grid, rowLine]
  );
  const colMeta = useMemo(
    () =>
      colClues.map((clue, c) => {
        const line = colLine(grid, c);
        return { sat: lineSatisfied(clue, line), dims: clueDims(clue, line) };
      }),
    [colClues, grid, colLine]
  );

  const fillCount = useMemo(() => grid.reduce((a, v) => a + (v === FILLED ? 1 : 0), 0), [grid]);
  const resolvedCorrect = useMemo(() => {
    let k = 0;
    for (let i = 0; i < n; i++) {
      if (puzzle.cells[i] === 1 ? grid[i] === FILLED : grid[i] === MARKED) k++;
    }
    return k;
  }, [grid, puzzle, n]);

  const liveScore = won
    ? Math.max(0, n * CELL_PTS * MULT[difficulty] - errors * ERR_PENALTY - hintsUsed * HINT_PENALTY)
    : Math.max(0, resolvedCorrect * CELL_PTS * MULT[difficulty] - errors * ERR_PENALTY - hintsUsed * HINT_PENALTY);

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { filled: `${fillCount}/${totalFill}` }
    });
  }, [liveScore, errors, hintsUsed, fillCount, totalFill, events]);

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
    <div className={`nonogram ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Picture: <b>{fillCount} / {totalFill}</b>
        </span>
        {assists.mistakes && (
          <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
            Errors: <b>{errors}</b>
          </span>
        )}
        <span className="info-item">
          <b>{liveScore.toLocaleString()}</b> pts
        </span>
      </div>

      <div className="non-board" style={{ maxWidth: `${size * 46 + 96}px` }}>
        <div className="non-corner" aria-hidden />
        <div className="non-colclues" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
          {colClues.map((clue, c) => (
            <div key={c} className={`non-colclue ${colMeta[c].sat ? 'done' : ''}`}>
              {clue.length === 0 ? (
                <span className="dim">0</span>
              ) : (
                clue.map((v, i) => (
                  <span key={i} className={colMeta[c].dims[i] ? 'dim' : ''}>
                    {v}
                  </span>
                ))
              )}
            </div>
          ))}
        </div>
        <div className="non-rowclues" style={{ gridTemplateRows: `repeat(${size}, 1fr)` }}>
          {rowClues.map((clue, r) => (
            <div key={r} className={`non-rowclue ${rowMeta[r].sat ? 'done' : ''}`}>
              {clue.length === 0 ? (
                <span className="dim">0</span>
              ) : (
                clue.map((v, i) => (
                  <span key={i} className={rowMeta[r].dims[i] ? 'dim' : ''}>
                    {v}
                  </span>
                ))
              )}
            </div>
          ))}
        </div>
        <div
          ref={cellsRef}
          className={`non-cells ${won ? 'won' : ''}`}
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          role="group"
          aria-label={`Nonogram board, ${size} by ${size}`}
        >
          {grid.map((s, i) => {
            const r = Math.floor(i / size);
            const c = i % size;
            const err = assists.mistakes && s === FILLED && puzzle.cells[i] === 0;
            return (
              <div
                key={i}
                className={[
                  'non-cell',
                  s === FILLED ? 'fill' : '',
                  err ? 'err' : '',
                  (c + 1) % 5 === 0 && c !== size - 1 ? 'g5r' : '',
                  (r + 1) % 5 === 0 && r !== size - 1 ? 'g5b' : '',
                  hintFlash === i ? 'hintflash' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={won && s === FILLED ? { animationDelay: `${(r + c) * WAVE_STEP_MS + 180}ms` } : undefined}
              >
                {s === MARKED && (
                  <svg className="non-x" viewBox="0 0 12 12" aria-hidden>
                    <path d="M3.2 3.2l5.6 5.6M8.8 3.2L3.2 8.8" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          <PadTool active={mode === 'fill'} onClick={() => setMode('fill')}>
            <FillSquareIcon />
            <span>Fill</span>
          </PadTool>
          <PadTool active={mode === 'mark'} onClick={() => setMode('mark')}>
            <MarkXIcon />
            <span>Mark</span>
          </PadTool>
          {assists.hint && (
            <PadTool silent onClick={useHint}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
        </div>
        <p className="non-note">Tap or drag to paint a line · start on a placed cell to erase it</p>
      </div>
    </div>
  );
}
