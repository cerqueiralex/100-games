import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, SameIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  MOON,
  SUN,
  findHint,
  findViolations,
  generateBinary,
  type BinaryPuzzle,
  type Hint
} from './logic/generator';

const CONFIG: Record<
  Difficulty,
  { size: number; uniqueLines: boolean; targetGivens: number; depth: 0 | 1 }
> = {
  easy: { size: 6, uniqueLines: false, targetGivens: 14, depth: 0 },
  medium: { size: 8, uniqueLines: false, targetGivens: 22, depth: 0 },
  hard: { size: 10, uniqueLines: true, targetGivens: 34, depth: 0 },
  pro: { size: 10, uniqueLines: true, targetGivens: 26, depth: 1 },
  extreme: { size: 12, uniqueLines: true, targetGivens: 46, depth: 1 }
};
const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = {
  easy: 3 * 60,
  medium: 5 * 60,
  hard: 8 * 60,
  pro: 10 * 60,
  extreme: 14 * 60
};
const CELL_PTS = 5;
const ERROR_PENALTY = 10;
const HINT_PENALTY = 25;

/** Sun/moon are game content — CSS colors them from the --play-* palette. */
function SunGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="bin-glyph" aria-hidden>
      <circle cx="12" cy="12" r="5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
        <path d="M12 2.4v2.8M12 18.8v2.8M2.4 12h2.8M18.8 12h2.8M5.2 5.2l2 2M16.8 16.8l2 2M18.8 5.2l-2 2M7.2 16.8l-2 2" />
      </g>
    </svg>
  );
}

function MoonGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="bin-glyph" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" />
    </svg>
  );
}

function hintText(h: Hint): string {
  const sym = h.value === SUN ? 'sun' : 'moon';
  const other = h.value === SUN ? 'moons' : 'suns';
  switch (h.rule) {
    case 'fix':
      return `That cell broke the rules — flipped it to the ${sym} that fits.`;
    case 'pair':
      return `Two ${other} sit together — a third in a row is banned, so this is a ${sym}.`;
    case 'gap':
      return `${h.value === SUN ? 'Moons' : 'Suns'} on both sides — the middle must be a ${sym}.`;
    case 'balance':
      return `That line already has all its ${other} — the rest are ${sym}s.`;
    case 'forced':
      return `Only a ${sym} here keeps the board on its single solution.`;
  }
}

interface BinSave {
  seed: number;
  size: number;
  uniqueLines: boolean;
  givens: number[];
  solution: number[];
  grid: number[];
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
}

export function BinaryGridGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  onToggleAssist,
  savedState,
  registerSnapshot
}: GameProps) {
  // ignore stale saves that lack the expected shape
  const saved =
    savedState &&
    Array.isArray((savedState as BinSave).givens) &&
    Array.isArray((savedState as BinSave).solution)
      ? (savedState as BinSave)
      : undefined;
  const cfg = CONFIG[difficulty];

  const puzzle = useMemo<BinaryPuzzle>(() => {
    if (saved) {
      return {
        seed: saved.seed,
        size: saved.size,
        uniqueLines: saved.uniqueLines,
        givens: saved.givens,
        solution: saved.solution
      };
    }
    return generateBinary(cfg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { size, givens, solution, uniqueLines } = puzzle;
  const n = size * size;
  const half = size / 2;
  const givensCount = useMemo(() => givens.filter((v) => v !== 0).length, [givens]);

  const [grid, setGrid] = useState<number[]>(() => saved?.grid ?? givens.slice());
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [won, setWon] = useState(false);

  const done = useRef(false);
  const finishTimer = useRef<number | null>(null);
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...(assists.violations ? ['violations'] : []),
      ...(assists.counts ? ['counts'] : [])
    ])
  );
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  // passive assists count as help whenever enabled, including mid-game
  useEffect(() => {
    if (assists.violations && !done.current) assistsUsed.current.add('violations');
  }, [assists.violations]);
  useEffect(() => {
    if (assists.counts && !done.current) assistsUsed.current.add('counts');
  }, [assists.counts]);

  const violations = useMemo(() => findViolations(grid, size, uniqueLines), [grid, size, uniqueLines]);

  const lineCounts = useMemo(() => {
    const rows = Array.from({ length: size }, () => ({ suns: half, moons: half }));
    const cols = Array.from({ length: size }, () => ({ suns: half, moons: half }));
    for (let i = 0; i < n; i++) {
      const v = grid[i];
      if (v === 0) continue;
      const r = Math.floor(i / size);
      const c = i % size;
      if (v === SUN) {
        rows[r].suns--;
        cols[c].suns--;
      } else {
        rows[r].moons--;
        cols[c].moons--;
      }
    }
    return { rows, cols };
  }, [grid, size, half, n]);

  const filled = useMemo(
    () => grid.reduce((acc, v, i) => acc + (v !== 0 && givens[i] === 0 ? 1 : 0), 0),
    [grid, givens]
  );
  const placedCorrect = useMemo(
    () => grid.reduce((acc, v, i) => acc + (v !== 0 && givens[i] === 0 && v === solution[i] ? 1 : 0), 0),
    [grid, givens, solution]
  );
  const liveScore = Math.max(
    0,
    placedCorrect * CELL_PTS * MULT[difficulty] - errors * ERROR_PENALTY - hintsUsed * HINT_PENALTY
  );

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { filled, cells: n - givensCount, board: `${size}×${size}` }
    });
  }, [liveScore, errors, hintsUsed, filled, n, givensCount, size, events]);

  useEffect(
    () => () => {
      if (finishTimer.current) window.clearTimeout(finishTimer.current);
    },
    []
  );

  const finish = useCallback(
    (errs: number, h: number) => {
      if (done.current) return;
      done.current = true;
      setWon(true);
      const base = (n - givensCount) * CELL_PTS * MULT[difficulty] - errs * ERROR_PENALTY - h * HINT_PENALTY;
      const bonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * MULT[difficulty];
      const score = Math.max(0, base + bonus);
      // let the win wave play before the completion card pops
      finishTimer.current = window.setTimeout(() => {
        events.onFinish({
          outcome: 'won',
          score,
          errors: errs,
          hintsUsed: h,
          assistsUsed: [...assistsUsed.current],
          extra: { board: `${size}×${size}` }
        });
      }, 900);
    },
    [n, givensCount, difficulty, size, events]
  );

  const tap = (idx: number) => {
    if (paused || done.current || givens[idx] !== 0) return;
    const cur = grid[idx];
    const nextVal = cur === 0 ? SUN : cur === SUN ? MOON : 0;
    const next = grid.slice();
    next[idx] = nextVal;
    setGrid(next);
    if (nextVal === 0) {
      sfx.tap();
      return;
    }
    const viol = findViolations(next, size, uniqueLines);
    if (viol.has(idx)) {
      sfx.error();
      setErrors((e) => e + 1);
      return;
    }
    sfx.place();
    if (!next.includes(0) && viol.size === 0) finish(errors, hintsUsed);
  };

  const hint = useCallback(() => {
    if (paused || done.current || !assists.hint) return;
    const h = findHint(grid, size, solution);
    if (!h) return;
    assistsUsed.current.add('hint');
    const nh = hintsUsed + 1;
    setHintsUsed(nh);
    sfx.hint();
    const next = grid.slice();
    next[h.idx] = h.value;
    setGrid(next);
    setHintCell(h.idx);
    setToast({ msg: hintText(h), key: Date.now() });
    if (!next.includes(0) && findViolations(next, size, uniqueLines).size === 0) finish(errors, nh);
  }, [paused, assists.hint, grid, size, solution, uniqueLines, hintsUsed, errors, finish]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (hintCell === null) return;
    const t = window.setTimeout(() => setHintCell(null), 2200);
    return () => window.clearTimeout(t);
  }, [hintCell]);

  useEffect(() => {
    registerSnapshot(() => ({
      seed: puzzle.seed,
      size,
      uniqueLines,
      givens,
      solution,
      grid,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  const showCounts = !!assists.counts;
  const showViol = !!assists.violations;

  const cellEls = [];
  for (let r = 0; r < size; r++) {
    if (showCounts) {
      const rc = lineCounts.rows[r];
      cellEls.push(
        <div
          key={`r${r}`}
          className="bin-count"
          title={`Row ${r + 1}: ${rc.suns} suns, ${rc.moons} moons left`}
        >
          <span className={`bin-cnt sun ${rc.suns < 0 ? 'over' : rc.suns === 0 ? 'done' : ''}`}>
            {rc.suns}
          </span>
          <span className={`bin-cnt moon ${rc.moons < 0 ? 'over' : rc.moons === 0 ? 'done' : ''}`}>
            {rc.moons}
          </span>
        </div>
      );
    }
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      const v = grid[idx];
      const isGiven = givens[idx] !== 0;
      cellEls.push(
        <button
          key={idx}
          className={[
            'bin-cell',
            isGiven ? 'given' : '',
            v === SUN ? 'sun' : v === MOON ? 'moon' : '',
            showViol && violations.has(idx) ? 'viol' : '',
            hintCell === idx ? 'hinted' : ''
          ]
            .filter(Boolean)
            .join(' ')}
          style={won ? { animationDelay: `${(r + c) * 40}ms` } : undefined}
          onClick={() => tap(idx)}
          aria-label={`Row ${r + 1} column ${c + 1}: ${
            v === SUN ? 'sun' : v === MOON ? 'moon' : 'empty'
          }${isGiven ? ', locked' : ''}`}
        >
          {v !== 0 && (
            <span key={`${idx}-${v}`} className="bin-sym">
              {v === SUN ? <SunGlyph /> : <MoonGlyph />}
            </span>
          )}
        </button>
      );
    }
  }

  return (
    <div className={`binary-grid ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Filled: <b>{filled} / {n - givensCount}</b>
        </span>
        <span className="info-item">
          <b>{liveScore.toLocaleString()}</b> pts
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Breaks: <b>{errors}</b>
        </span>
      </div>

      <div
        className={`bin-board ${won ? 'bin-won' : ''} ${size >= 12 ? 'bin-dense' : ''}`}
        style={{
          gridTemplateColumns: showCounts ? `auto repeat(${size}, 1fr)` : `repeat(${size}, 1fr)`
        }}
      >
        {showCounts && <div className="bin-corner" aria-hidden />}
        {showCounts &&
          lineCounts.cols.map((cc, c) => (
            <div
              key={`c${c}`}
              className="bin-count top"
              title={`Column ${c + 1}: ${cc.suns} suns, ${cc.moons} moons left`}
            >
              <span className={`bin-cnt sun ${cc.suns < 0 ? 'over' : cc.suns === 0 ? 'done' : ''}`}>
                {cc.suns}
              </span>
              <span className={`bin-cnt moon ${cc.moons < 0 ? 'over' : cc.moons === 0 ? 'done' : ''}`}>
                {cc.moons}
              </span>
            </div>
          ))}
        {cellEls}
      </div>

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          <PadTool
            active={showCounts}
            onClick={() => onToggleAssist('counts', !showCounts)}
            aria-label="Toggle row and column counters"
          >
            <SameIcon />
            <span>Counters</span>
          </PadTool>
          {assists.hint && (
            <PadTool silent onClick={hint} aria-label="Get a hint">
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
        </div>
        {toast && (
          <p key={toast.key} className="bin-toast">
            {toast.msg}
          </p>
        )}
        <p className="bin-help">Tap a cell to cycle sun → moon → empty · locked tiles are givens</p>
      </div>
    </div>
  );
}
