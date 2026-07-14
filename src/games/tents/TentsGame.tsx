import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { generateTents, type TentsPuzzle } from './logic/generator';
import {
  autoGrassCells,
  hintMove,
  kingNeighbors,
  orthNeighbors,
  EMPTY,
  TENT,
  GRASS
} from './logic/solver';

const SIZE: Record<Difficulty, number> = { easy: 6, medium: 8, hard: 9, pro: 10, extreme: 12 };
const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = {
  easy: 3 * 60,
  medium: 5 * 60,
  hard: 7 * 60,
  pro: 9 * 60,
  extreme: 12 * 60
};
const TENT_PTS = 12;
const ERROR_PENALTY = 15;
const HINT_PENALTY = 40;
const LONG_PRESS_MS = 430;
const DRAG_SLOP_PX = 9;

interface TentsSave {
  puzzle: TentsPuzzle;
  marks: number[];
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
}

/* chunky inline SVG pieces — game content drawn with tokens via CSS classes */
function TreeArt() {
  return (
    <svg className="tnt-piece tnt-tree" viewBox="0 0 24 24" aria-hidden>
      <rect className="tnt-trunk" x="10.5" y="13.5" width="3" height="7" rx="1.3" />
      <path
        className="tnt-canopy"
        d="M12 2.4 C7.9 4.3 4.6 8 4.6 11.3 c0 3.6 3.3 6 7.4 6 s7.4 -2.4 7.4 -6 C19.4 8 16.1 4.3 12 2.4 Z"
      />
      <circle className="tnt-leaf-shine" cx="9" cy="7.6" r="1.5" />
    </svg>
  );
}

function TentArt() {
  return (
    <svg className="tnt-piece tnt-tentart" viewBox="0 0 24 24" aria-hidden>
      <path className="tnt-cloth" d="M12 3.2 L22.2 20.8 H1.8 Z" />
      <path className="tnt-door" d="M12 9.6 L16.6 20.8 H7.4 Z" />
      <path className="tnt-pole" d="M12 3.2 L12 9.6" />
    </svg>
  );
}

function GrassArt() {
  return (
    <svg className="tnt-piece tnt-grassart" viewBox="0 0 24 24" aria-hidden>
      <circle cx="7" cy="8.4" r="1.6" />
      <circle cx="16.6" cy="7" r="1.6" />
      <circle cx="12" cy="13.6" r="1.6" />
      <circle cx="6.6" cy="17.4" r="1.6" />
      <circle cx="17.4" cy="16.6" r="1.6" />
    </svg>
  );
}

export function TentsGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  // ignore saves that lack the expected shape (old versions / corruption)
  const saved =
    savedState &&
    Array.isArray((savedState as TentsSave).marks) &&
    Array.isArray((savedState as TentsSave).puzzle?.solution)
      ? (savedState as TentsSave)
      : undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const puzzle = useMemo(() => saved?.puzzle ?? generateTents({ size: SIZE[difficulty] }), [difficulty]);
  const { size } = puzzle;
  const n = size * size;
  const treeSet = useMemo(() => new Set(puzzle.trees), [puzzle]);
  const solSet = useMemo(() => new Set(puzzle.solution), [puzzle]);

  const [marks, setMarks] = useState<number[]>(() =>
    saved ? [...saved.marks] : new Array<number>(n).fill(EMPTY)
  );
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [won, setWon] = useState(false);

  const done = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  // synchronous mirrors so pointer handlers never read stale state
  const marksRef = useRef(marks);
  const errorsRef = useRef(errors);
  const hintsRef = useRef(hintsUsed);
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...(assists.pairCheck ? ['pairCheck'] : []),
      ...(assists.autoGrass ? ['autoGrass'] : [])
    ])
  );
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  // passive assists count as help whenever enabled, including mid-game
  useEffect(() => {
    if (assists.pairCheck) assistsUsed.current.add('pairCheck');
  }, [assists.pairCheck]);
  useEffect(() => {
    if (assists.autoGrass) assistsUsed.current.add('autoGrass');
  }, [assists.autoGrass]);

  const finish = useCallback(
    (placed: number, errs: number, hints: number) => {
      if (done.current) return;
      done.current = true;
      setWon(true);
      const score = Math.max(
        0,
        placed * TENT_PTS * MULT[difficulty] -
          errs * ERROR_PENALTY -
          hints * HINT_PENALTY +
          Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * MULT[difficulty]
      );
      events.onFinish({
        outcome: 'won',
        score,
        errors: errs,
        hintsUsed: hints,
        assistsUsed: [...assistsUsed.current],
        extra: { tents: placed, board: `${size}×${size}` }
      });
    },
    [difficulty, events, size]
  );

  /** Commit a fresh marks array, then check the win (all tents, none wrong). */
  const applyMarks = useCallback(
    (next: number[]) => {
      marksRef.current = next;
      setMarks(next);
      setErrors(errorsRef.current);
      let placed = 0;
      let wrong = false;
      for (let i = 0; i < next.length; i++) {
        if (next[i] !== TENT) continue;
        if (solSet.has(i)) placed++;
        else wrong = true;
      }
      if (!wrong && placed === puzzle.solution.length) finish(placed, errorsRef.current, hintsRef.current);
    },
    [solSet, puzzle, finish]
  );

  // auto-grass passive assist: sweep whenever marks change or it turns on.
  // Idempotent (marks only ever gain grass), so the effect settles in one
  // extra render; frozen after the win so the finished board stays as-is.
  useEffect(() => {
    if (!assists.autoGrass || done.current) return;
    const extra = autoGrassCells(puzzle, marksRef.current);
    if (extra.length === 0) return;
    const next = [...marksRef.current];
    for (const c of extra) next[c] = GRASS;
    marksRef.current = next;
    setMarks(next);
  }, [assists.autoGrass, marks, puzzle]);

  const cycleCell = useCallback(
    (i: number) => {
      if (paused || done.current || treeSet.has(i)) return;
      const cur = marksRef.current[i];
      const next = [...marksRef.current];
      if (cur === EMPTY) {
        next[i] = TENT;
        sfx.place();
        // a tent where the unique solution has none is a definitive mistake
        if (!solSet.has(i)) errorsRef.current += 1;
      } else if (cur === TENT) {
        next[i] = GRASS;
        sfx.tap();
      } else {
        next[i] = EMPTY;
        sfx.tap();
      }
      applyMarks(next);
    },
    [paused, treeSet, solSet, applyMarks]
  );

  /* ---- pointer handling: tap cycles, long-press/drag paints grass ---- */

  const drag = useRef<{
    start: number;
    x: number;
    y: number;
    painting: boolean;
    last: number;
    timer: number | null;
  } | null>(null);

  const cellFromPoint = (x: number, y: number): number | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    // measure the content box — the grid gap shifts a naive rect division
    const style = getComputedStyle(el);
    const padL = parseFloat(style.paddingLeft) || 0;
    const padT = parseFloat(style.paddingTop) || 0;
    const gap = parseFloat(style.columnGap) || 0;
    const inner = el.clientWidth - padL - (parseFloat(style.paddingRight) || 0);
    const pitch = (inner + gap) / size;
    const c = Math.floor((x - (rect.left + el.clientLeft + padL)) / pitch);
    const r = Math.floor((y - (rect.top + el.clientTop + padT)) / pitch);
    if (c < 0 || c >= size || r < 0 || r >= size) return null;
    return r * size + c;
  };

  const paintGrass = useCallback(
    (cells: number[]) => {
      // the long-press timer can outlive a finish (multi-touch edge case)
      if (done.current) return;
      let next: number[] | null = null;
      for (const c of cells) {
        if (treeSet.has(c) || (next ?? marksRef.current)[c] !== EMPTY) continue;
        next ??= [...marksRef.current];
        next[c] = GRASS;
      }
      if (!next) return;
      sfx.drag();
      applyMarks(next);
    },
    [treeSet, applyMarks]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell === null) return;
    boardRef.current?.setPointerCapture(e.pointerId);
    const timer = window.setTimeout(() => {
      const d = drag.current;
      if (d && !d.painting) {
        d.painting = true; // long-press: start painting grass in place
        paintGrass([d.start]);
      }
    }, LONG_PRESS_MS);
    drag.current = { start: cell, x: e.clientX, y: e.clientY, painting: false, last: cell, timer };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || paused || done.current) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y) > DRAG_SLOP_PX;
    if (!d.painting) {
      if (!moved || cell === null) return;
      d.painting = true; // drag: paint from the start cell onward
      if (d.timer) {
        clearTimeout(d.timer);
        d.timer = null;
      }
      paintGrass([d.start]);
    }
    if (cell === null || cell === d.last) return;
    // interpolate straight runs so fast swipes never skip cells
    const cells: number[] = [];
    const r1 = (d.last / size) | 0;
    const c1 = d.last % size;
    const r2 = (cell / size) | 0;
    const c2 = cell % size;
    if (r1 === r2) {
      const step = c2 > c1 ? 1 : -1;
      for (let c = c1 + step; step > 0 ? c <= c2 : c >= c2; c += step) cells.push(r1 * size + c);
    } else if (c1 === c2) {
      const step = r2 > r1 ? size : -size;
      for (let i = d.last + step; step > 0 ? i <= cell : i >= cell; i += step) cells.push(i);
    } else {
      cells.push(cell);
    }
    d.last = cell;
    paintGrass(cells);
  };

  const endPointer = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.timer) clearTimeout(d.timer);
    if (d.painting) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell !== null && cell === d.start) cycleCell(cell);
  };

  const cancelPointer = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.timer) clearTimeout(d.timer);
  };

  /* ---- hint (active assist) ---- */

  const useHintTool = () => {
    if (paused || done.current || !assists.hint) return;
    const move = hintMove(puzzle, marksRef.current);
    if (!move) return;
    assistsUsed.current.add('hint');
    hintsRef.current += 1;
    setHintsUsed(hintsRef.current);
    sfx.hint();
    const next = [...marksRef.current];
    next[move.cell] = move.place === 'tent' ? TENT : GRASS;
    applyMarks(next);
  };

  /* ---- derived board feedback ---- */

  // pair-check passive assist: rule violations in --bad (never peeks at the
  // solution — a tree is flagged only when NO orthogonal cell can hold a tent)
  const flagged = useMemo(() => {
    const bad = new Set<number>();
    if (!assists.pairCheck) return bad;
    for (let i = 0; i < n; i++) {
      if (marks[i] !== TENT) continue;
      for (const nb of kingNeighbors(i, size)) {
        if (marks[nb] === TENT) {
          bad.add(i);
          bad.add(nb);
        }
      }
    }
    for (const t of puzzle.trees) {
      const alive = orthNeighbors(t, size).some(
        (c) => !treeSet.has(c) && (marks[c] === TENT || marks[c] === EMPTY)
      );
      if (!alive) bad.add(t);
    }
    return bad;
  }, [assists.pairCheck, marks, puzzle, size, treeSet, n]);

  // count-chip states are core feedback (rules-level, not an assist)
  const rowStat = useMemo(
    () =>
      puzzle.rowCounts.map((target, r) => {
        let tents = 0;
        for (let c = 0; c < size; c++) if (marks[r * size + c] === TENT) tents++;
        return tents > target ? 'over' : tents === target ? 'done' : '';
      }),
    [marks, puzzle, size]
  );
  const colStat = useMemo(
    () =>
      puzzle.colCounts.map((target, c) => {
        let tents = 0;
        for (let r = 0; r < size; r++) if (marks[r * size + c] === TENT) tents++;
        return tents > target ? 'over' : tents === target ? 'done' : '';
      }),
    [marks, puzzle, size]
  );

  const placedTotal = useMemo(() => marks.reduce((k, m) => (m === TENT ? k + 1 : k), 0), [marks]);
  const placedCorrect = useMemo(() => {
    let k = 0;
    for (const t of puzzle.solution) if (marks[t] === TENT) k++;
    return k;
  }, [marks, puzzle]);

  const liveScore = Math.max(
    0,
    placedCorrect * TENT_PTS * MULT[difficulty] - errors * ERROR_PENALTY - hintsUsed * HINT_PENALTY
  );

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { tents: `${placedTotal}/${puzzle.solution.length}` }
    });
  }, [liveScore, errors, hintsUsed, placedTotal, puzzle, events]);

  useEffect(() => {
    registerSnapshot(() => ({
      puzzle,
      marks,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  const rowsDone = rowStat.filter((s) => s === 'done').length;
  const colsDone = colStat.filter((s) => s === 'done').length;

  return (
    <div className={`tents ${paused ? 'board-hidden' : ''} ${won ? 'tnt-won' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Tents: <b>{placedTotal} / {puzzle.solution.length}</b>
        </span>
        <span className="info-item">
          Rows: <b>{rowsDone}/{size}</b>
        </span>
        <span className="info-item">
          Cols: <b>{colsDone}/{size}</b>
        </span>
      </div>

      <div className="tnt-frame">
        <div className="tnt-corner" aria-hidden />
        <div
          className="tnt-gutter tnt-cols"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
          aria-hidden
        >
          {puzzle.colCounts.map((v, i) => (
            <span key={i} className={`tnt-chip ${colStat[i]}`}>
              {v}
            </span>
          ))}
        </div>
        <div
          className="tnt-gutter tnt-rows"
          style={{ gridTemplateRows: `repeat(${size}, 1fr)` }}
          aria-hidden
        >
          {puzzle.rowCounts.map((v, i) => (
            <span key={i} className={`tnt-chip ${rowStat[i]}`}>
              {v}
            </span>
          ))}
        </div>
        <div
          ref={boardRef}
          className="tnt-board"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={cancelPointer}
          onContextMenu={(e) => e.preventDefault()}
        >
          {Array.from({ length: n }, (_, i) => {
            const isTree = treeSet.has(i);
            const m = marks[i];
            const cls = [
              'tnt-cell',
              isTree ? 'tree' : m === TENT ? 'tent' : m === GRASS ? 'grass' : '',
              flagged.has(i) ? 'bad' : ''
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div
                key={i}
                className={cls}
                role="button"
                aria-label={`Row ${((i / size) | 0) + 1}, column ${(i % size) + 1}: ${
                  isTree ? 'tree' : m === TENT ? 'tent' : m === GRASS ? 'grass' : 'empty'
                }`}
              >
                {isTree ? <TreeArt /> : m === TENT ? <TentArt /> : m === GRASS ? <GrassArt /> : null}
              </div>
            );
          })}
        </div>
      </div>

      {assists.hint && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            <PadTool silent onClick={useHintTool}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          </div>
          <p className="tnt-help">Tap: tent → grass → clear · long-press or drag paints grass</p>
        </div>
      )}
    </div>
  );
}
