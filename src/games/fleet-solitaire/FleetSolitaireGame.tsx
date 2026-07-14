import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  SHIP,
  UNKNOWN,
  WATER,
  applyAutoWater,
  runSizes,
  shapeFrom,
  solutionShape,
  type FleetPuzzle,
  type SegShape
} from './logic/board';
import { generateFleet } from './logic/generator';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = {
  easy: 3 * 60,
  medium: 5 * 60,
  hard: 8 * 60,
  pro: 11 * 60,
  extreme: 14 * 60
};
const CELL_PTS = 6;
const ERR_PENALTY = 18;
const HINT_PENALTY = 30;

/** unique ship names by size, for the fleet inventory labels */
const SHIP_NAME: Record<number, string> = { 1: 'Sub', 2: 'Destroyer', 3: 'Cruiser', 4: 'Battleship', 5: 'Carrier' };

interface FlsSave {
  puzzle: FleetPuzzle;
  grid: number[];
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
}

function isSave(s: unknown): s is FlsSave {
  return (
    !!s &&
    Array.isArray((s as FlsSave).grid) &&
    Array.isArray((s as FlsSave).puzzle?.solution) &&
    Array.isArray((s as FlsSave).puzzle?.reveals)
  );
}

/** the extruded ship silhouette drawn inside a SHIP cell (paint only) */
function ShipGlyph({ shape }: { shape: SegShape }) {
  return <span className={`fls-hull fls-${shape}`} aria-hidden />;
}

/** small inventory silhouette for the fleet panel (k cells wide) */
function FleetSilhouette({ size, done }: { size: number; done: boolean }) {
  return (
    <span className={`fls-silhouette ${done ? 'done' : ''}`} aria-hidden>
      {Array.from({ length: size }, (_, k) => {
        const shape: SegShape = size === 1 ? 'single' : k === 0 ? 'left' : k === size - 1 ? 'right' : 'hmid';
        return (
          <span key={k} className="fls-sil-cell">
            <span className={`fls-hull fls-${shape}`} />
          </span>
        );
      })}
    </span>
  );
}

export function FleetSolitaireGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot,
  onToggleAssist
}: GameProps) {
  const saved = isSave(savedState) ? savedState : undefined;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const puzzle = useMemo(() => saved?.puzzle ?? generateFleet({ difficulty }), [difficulty]);
  const { size, fleet, solution, rowCounts, colCounts } = puzzle;
  const n = size * size;
  const totalShipCells = useMemo(() => solution.reduce((a, v) => a + v, 0), [solution]);

  const revealSet = useMemo(() => new Set(puzzle.reveals.map((r) => r.cell)), [puzzle]);

  const initGrid = useCallback((): number[] => {
    const g = new Array<number>(n).fill(UNKNOWN);
    for (const rv of puzzle.reveals) g[rv.cell] = rv.ship ? SHIP : WATER;
    return g;
  }, [n, puzzle]);

  const [grid, setGrid] = useState<number[]>(() => saved?.grid.slice() ?? initGrid());
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [won, setWon] = useState(false);
  const [flash, setFlash] = useState<{ cell: number; kind: 'err' | 'hint' } | null>(null);

  const gridRef = useRef(grid);
  gridRef.current = grid;
  const errorsRef = useRef(saved?.errors ?? 0);
  const hintsRef = useRef(saved?.hintsUsed ?? 0);
  const done = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const flashTimer = useRef<number | null>(null);
  // last state a drag painted, so a swipe repeats the same action
  const paintRef = useRef<{ target: number; last: number } | null>(null);
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...(assists.autoWater ? ['autoWater'] : []),
      ...(assists.satCheck ? ['satCheck'] : [])
    ])
  );
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    []
  );

  // passive assists count as help whenever enabled (incl. mid-game toggle)
  useEffect(() => {
    if (assists.satCheck) assistsUsed.current.add('satCheck');
  }, [assists.satCheck]);

  /* ---------------- win detection ---------------- */

  const triggerWin = useCallback(
    (finalErrors: number, finalHints: number) => {
      if (done.current) return;
      done.current = true;
      setWon(true);
      sfx.pop();
      const bonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * MULT[difficulty];
      const score = Math.max(
        0,
        totalShipCells * CELL_PTS * MULT[difficulty] - finalErrors * ERR_PENALTY - finalHints * HINT_PENALTY + bonus
      );
      events.onFinish({
        outcome: 'won',
        score,
        errors: finalErrors,
        hintsUsed: finalHints,
        assistsUsed: [...assistsUsed.current],
        extra: { fleet: fleet.join('·'), size: `${size}×${size}` }
      });
    },
    [difficulty, totalShipCells, fleet, size, events]
  );

  const commit = useCallback(
    (next: number[]) => {
      if (assists.autoWater) applyAutoWater(next, puzzle);
      gridRef.current = next;
      setGrid(next);
      // solved once the whole fleet is correctly placed: every ship cell of
      // the unique solution is marked SHIP and no sea cell is (unknown sea
      // cells count as water). By uniqueness that pins the entire board.
      let solved = true;
      for (let i = 0; i < n && solved; i++) {
        if (solution[i] === 1) {
          if (next[i] !== SHIP) solved = false;
        } else if (next[i] === SHIP) solved = false;
      }
      if (solved) {
        // complete the sea for a clean review board
        const finished = next.slice();
        for (let i = 0; i < n; i++) if (finished[i] !== SHIP) finished[i] = WATER;
        gridRef.current = finished;
        setGrid(finished);
        triggerWin(errorsRef.current, hintsRef.current);
      }
    },
    [assists.autoWater, puzzle, n, solution, triggerWin]
  );

  // auto-water counts as help and acts immediately on mid-game toggle-on
  useEffect(() => {
    if (!assists.autoWater) return;
    assistsUsed.current.add('autoWater');
    commit(gridRef.current.slice());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assists.autoWater]);

  /* ---------------- pointer interaction ---------------- */

  const cellFromPoint = (x: number, y: number): number | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const c = Math.floor((x - (rect.left + el.clientLeft)) / (el.clientWidth / size));
    const r = Math.floor((y - (rect.top + el.clientTop)) / (el.clientHeight / size));
    if (c < 0 || c >= size || r < 0 || r >= size) return null;
    return r * size + c;
  };

  const flashCell = (cell: number, kind: 'err' | 'hint') => {
    setFlash({ cell, kind });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 480);
  };

  /** paint one cell to `target`; returns true if it changed */
  const paintCell = (next: number[], i: number, target: number): boolean => {
    if (revealSet.has(i) || next[i] === target) return false;
    next[i] = target;
    if (target === SHIP) {
      if (solution[i] === 1) sfx.place();
      else {
        errorsRef.current += 1;
        setErrors(errorsRef.current);
        sfx.error();
        flashCell(i, 'err');
      }
    } else if (target === WATER) {
      sfx.splash();
    } else {
      sfx.drag();
    }
    return true;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell === null || revealSet.has(cell)) return;
    boardRef.current?.setPointerCapture(e.pointerId);
    // tap cycles unknown → water → ship → unknown
    const cur = gridRef.current[cell];
    const target = cur === UNKNOWN ? WATER : cur === WATER ? SHIP : UNKNOWN;
    paintRef.current = { target, last: cell };
    const next = gridRef.current.slice();
    if (paintCell(next, cell, target)) commit(next);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const paint = paintRef.current;
    if (!paint || paused || done.current) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell === null || cell === paint.last) return;
    paint.last = cell;
    const next = gridRef.current.slice();
    // drag paints the last-used state onto cells (never erases another
    // state — only untouched/unknown cells, classic solitaire painting)
    if (gridRef.current[cell] === UNKNOWN && paintCell(next, cell, paint.target)) commit(next);
  };

  const onPointerUp = () => {
    paintRef.current = null;
  };

  /* ---------------- hint ---------------- */

  const useHint = () => {
    if (paused || done.current || !assists.hint) return;
    const g = gridRef.current;
    const wrong: number[] = [];
    const empty: number[] = [];
    for (let i = 0; i < n; i++) {
      if (revealSet.has(i)) continue;
      const want = solution[i] === 1 ? SHIP : WATER;
      if (g[i] === want) continue;
      if (g[i] === UNKNOWN) empty.push(i);
      else wrong.push(i);
    }
    // fix a wrong mark first, else reveal an empty cell (ship cells first)
    const pool = wrong.length > 0 ? wrong : empty;
    if (pool.length === 0) return;
    const ships = pool.filter((i) => solution[i] === 1);
    const cell = (ships.length > 0 ? ships : pool)[0];
    assistsUsed.current.add('hint');
    hintsRef.current += 1;
    setHintsUsed(hintsRef.current);
    sfx.hint();
    const next = g.slice();
    next[cell] = solution[cell] === 1 ? SHIP : WATER;
    flashCell(cell, 'hint');
    commit(next);
  };

  /* ---------------- snapshot ---------------- */

  useEffect(() => {
    registerSnapshot(() => ({
      puzzle,
      grid: [...gridRef.current],
      errors: errorsRef.current,
      hintsUsed: hintsRef.current,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  /* ---------------- derived view state ---------------- */

  const isShip = useCallback((i: number) => grid[i] === SHIP, [grid]);

  // per-line ship tallies → satisfied / over flags for the count chips
  const rowShips = useMemo(() => {
    const out = new Array(size).fill(0);
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (grid[r * size + c] === SHIP) out[r]++;
    return out;
  }, [grid, size]);
  const colShips = useMemo(() => {
    const out = new Array(size).fill(0);
    for (let c = 0; c < size; c++) for (let r = 0; r < size; r++) if (grid[r * size + c] === SHIP) out[c]++;
    return out;
  }, [grid, size]);

  // touching-ship violations (flagged --bad when sat-check is on): any two
  // ship marks in diagonal contact, or a T/L junction
  const touching = useMemo(() => {
    if (!assists.satCheck) return new Set<number>();
    const bad = new Set<number>();
    for (let i = 0; i < n; i++) {
      if (grid[i] !== SHIP) continue;
      const r = (i / size) | 0;
      const c = i % size;
      for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr * size + nc] === SHIP) {
          bad.add(i);
          bad.add(nr * size + nc);
        }
      }
      // perpendicular junction (a ship must be a straight segment)
      const h = (c > 0 && grid[i - 1] === SHIP) || (c < size - 1 && grid[i + 1] === SHIP);
      const v = (r > 0 && grid[i - size] === SHIP) || (r < size - 1 && grid[i + size] === SHIP);
      if (h && v) bad.add(i);
    }
    return bad;
  }, [assists.satCheck, grid, size, n]);

  // which fleet silhouettes are checked off: each maximal ship run the
  // player has marked consumes one matching, still-unchecked fleet entry
  // (live — no need to seal water first). Runs longer than any fleet ship
  // (an over-built ship) simply don't match, so they check nothing off.
  const fleetDone = useMemo(() => {
    const runs = runSizes((i) => grid[i] === SHIP, size);
    const runCounts = runs.reduce<Record<number, number>>((m, s) => ((m[s] = (m[s] ?? 0) + 1), m), {});
    return fleet.map((s) => {
      if ((runCounts[s] ?? 0) > 0) {
        runCounts[s]--;
        return true;
      }
      return false;
    });
  }, [grid, size, fleet]);

  const shipCellsPlaced = useMemo(() => grid.reduce((a, v) => a + (v === SHIP ? 1 : 0), 0), [grid]);
  const correctShipCells = useMemo(() => {
    let k = 0;
    for (let i = 0; i < n; i++) if (grid[i] === SHIP && solution[i] === 1) k++;
    return k;
  }, [grid, solution, n]);

  const liveScore = Math.max(
    0,
    correctShipCells * CELL_PTS * MULT[difficulty] - errors * ERR_PENALTY - hintsUsed * HINT_PENALTY
  );

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { ships: `${shipCellsPlaced}/${totalShipCells}` }
    });
  }, [liveScore, errors, hintsUsed, shipCellsPlaced, totalShipCells, events]);

  /* ---------------- render ---------------- */

  const boardStyle = { maxWidth: `${size * 46 + 34}px` };

  return (
    <div className={`fleet-solitaire ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Ships: <b>{shipCellsPlaced} / {totalShipCells}</b>
        </span>
        {assists.satCheck && (
          <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
            Errors: <b>{errors}</b>
          </span>
        )}
        <span className="info-item">
          <b>{liveScore.toLocaleString()}</b> pts
        </span>
      </div>

      {/* fleet inventory: silhouettes dim/check off as ships are sealed */}
      <div className="fls-fleet fx-card">
        <span className="fls-fleet-title">Fleet</span>
        <div className="fls-fleet-list">
          {fleet.map((s, k) => (
            <span key={k} className={`fls-fleet-item ${fleetDone[k] ? 'done' : ''}`}>
              <FleetSilhouette size={s} done={fleetDone[k]} />
              <span className="fls-fleet-name">{SHIP_NAME[s]}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="fls-board-wrap" style={boardStyle}>
        <div className="fls-corner" aria-hidden />
        {/* column count chips */}
        <div className="fls-colcounts" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
          {colCounts.map((v, c) => {
            const sat = assists.satCheck && colShips[c] === v;
            const over = assists.satCheck && colShips[c] > v;
            return (
              <span key={c} className={`fls-count ${sat ? 'sat' : ''} ${over ? 'over' : ''}`}>
                {v}
              </span>
            );
          })}
        </div>
        {/* row count chips */}
        <div className="fls-rowcounts" style={{ gridTemplateRows: `repeat(${size}, 1fr)` }}>
          {rowCounts.map((v, r) => {
            const sat = assists.satCheck && rowShips[r] === v;
            const over = assists.satCheck && rowShips[r] > v;
            return (
              <span key={r} className={`fls-count ${sat ? 'sat' : ''} ${over ? 'over' : ''}`}>
                {v}
              </span>
            );
          })}
        </div>
        <div
          ref={boardRef}
          className={`fls-board ${won ? 'won' : ''}`}
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          role="group"
          aria-label={`Fleet grid, ${size} by ${size}`}
        >
          {grid.map((s, i) => {
            const r = (i / size) | 0;
            const c = i % size;
            // revealed ship givens always show their TRUE shape from the
            // solution (their real neighbours may not be marked yet);
            // player-placed ships take the shape their marks currently form
            const shape: SegShape =
              s !== SHIP ? 'single' : revealSet.has(i) ? solutionShape(solution, size, i) : shapeFrom(isShip, size, i);
            return (
              <div
                key={i}
                className={[
                  'fls-cell',
                  s === WATER ? 'water' : '',
                  s === SHIP ? 'ship' : '',
                  revealSet.has(i) ? 'given' : '',
                  touching.has(i) ? 'touch' : '',
                  flash?.cell === i ? (flash.kind === 'err' ? 'err-flash' : 'hint-flash') : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={won && s === SHIP ? { animationDelay: `${(r + c) * 34}ms` } : undefined}
                aria-label={`${String.fromCharCode(65 + c)}${r + 1}`}
              >
                {s === SHIP && <ShipGlyph shape={shape} />}
                {s === WATER && <span className="fls-wave" aria-hidden />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          <PadTool active={assists.autoWater} onClick={() => onToggleAssist('autoWater', !assists.autoWater)}>
            <DropIcon />
            <span>Auto-water</span>
          </PadTool>
          {assists.hint && (
            <PadTool silent onClick={useHint}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
        </div>
        <p className="fls-note">Tap a cell: empty → water → ship. Drag to paint. Ships never touch, even at corners.</p>
      </div>
    </div>
  );
}

/** inline water-drop tool icon (currentColor) */
function DropIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3.5c3.2 3.8 5.5 6.9 5.5 9.8a5.5 5.5 0 0 1-11 0c0-2.9 2.3-6 5.5-9.8Z" />
    </svg>
  );
}
