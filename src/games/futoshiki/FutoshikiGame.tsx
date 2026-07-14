import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, CheckIcon, EraseIcon, PencilIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  DIFFICULTY_CONFIG,
  findForcedCell,
  generateFutoshiki,
  type FutoshikiPuzzle,
  type Ineq
} from './logic/generator';
import { CELL_POINTS, ERROR_PENALTY, HINT_PENALTY, MULTIPLIER, timeBonus } from './logic/scoring';

/** Passive assists count as "help used" for the whole game while enabled. */
const PASSIVE_ASSISTS = ['ineq-check', 'notes-auto'];

interface FutSave {
  n: number;
  seed: number;
  solution: number[];
  givens: number[];
  ineqs: Ineq[];
  values: number[];
  notes: number[];
  awarded: number[];
  score: number;
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
}

/** Chevron whose apex points at the smaller cell of the inequality. */
function Chev({ dir }: { dir: 'left' | 'right' | 'up' | 'down' }) {
  return (
    <svg viewBox="0 0 20 20" className={`fut-chev ${dir}`} aria-hidden>
      <path
        d="M13.5 4 L6.5 10 L13.5 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FutoshikiGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  onToggleAssist,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved =
    savedState &&
    typeof (savedState as FutSave).n === 'number' &&
    Array.isArray((savedState as FutSave).solution) &&
    Array.isArray((savedState as FutSave).givens) &&
    Array.isArray((savedState as FutSave).ineqs) &&
    Array.isArray((savedState as FutSave).values) &&
    Array.isArray((savedState as FutSave).notes)
      ? (savedState as FutSave)
      : undefined;

  const puzzle = useMemo<FutoshikiPuzzle>(
    () =>
      saved
        ? { n: saved.n, seed: saved.seed, solution: saved.solution, givens: saved.givens, ineqs: saved.ineqs }
        : generateFutoshiki(DIFFICULTY_CONFIG[difficulty]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [difficulty]
  );
  const { n, solution, givens, ineqs } = puzzle;
  const N = n * n;
  const digits = useMemo(() => Array.from({ length: n }, (_, k) => k + 1), [n]);

  const [values, setValues] = useState<number[]>(() => (saved ? [...saved.values] : [...givens]));
  const [notes, setNotes] = useState<number[]>(() => (saved ? [...saved.notes] : new Array(N).fill(0)));
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [flash, setFlash] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const [shake, setShake] = useState(false);

  /** cells already paid out — a cell earns its points only once */
  const awarded = useRef<Set<number>>(new Set(saved?.awarded ?? []));
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...PASSIVE_ASSISTS.filter((a) => assists[a])])
  );
  const done = useRef(false);
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  /** per-cell inequality signs: which neighbor, and whether this cell is the smaller side */
  const cellIneqs = useMemo(() => {
    const m: { other: number; isSmall: boolean }[][] = Array.from({ length: N }, () => []);
    for (const { a, b } of ineqs) {
      m[a].push({ other: b, isSmall: true });
      m[b].push({ other: a, isSmall: false });
    }
    return m;
  }, [ineqs, N]);

  const reportStats = useCallback(
    (s: number, e: number, h: number) => {
      events.onStats({ score: s, errors: e, hintsUsed: h, assistsUsed: [...assistsUsed.current] });
    },
    [events]
  );

  useEffect(() => {
    // passive assists toggled on mid-game still count as help for this game
    for (const a of PASSIVE_ASSISTS) if (assists[a]) assistsUsed.current.add(a);
    reportStats(score, errors, hintsUsed);
  }, [score, errors, hintsUsed, assists, reportStats]);

  const finish = useCallback(
    (finalScore: number, e: number, h: number) => {
      if (done.current) return;
      done.current = true;
      events.onFinish({
        outcome: 'won',
        score: finalScore,
        errors: e,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { size: `${n}×${n}`, signs: ineqs.length }
      });
    },
    [events, n, ineqs.length]
  );

  /** does placing v at idx break a hard rule against digits already on the board? */
  const breaksRules = useCallback(
    (grid: number[], idx: number, v: number): boolean => {
      const r = (idx / n) | 0;
      const c = idx % n;
      for (let k = 0; k < n; k++) {
        const ri = r * n + k;
        const ci = k * n + c;
        if (ri !== idx && grid[ri] === v) return true;
        if (ci !== idx && grid[ci] === v) return true;
      }
      for (const { other, isSmall } of cellIneqs[idx]) {
        const ov = grid[other];
        if (ov === 0) continue;
        if (isSmall ? v >= ov : v <= ov) return true;
      }
      return false;
    },
    [n, cellIneqs]
  );

  const clearNotesFor = useCallback(
    (idx: number, d: number) => {
      setNotes((prev) => {
        const nn = [...prev];
        nn[idx] = 0;
        if (assists['notes-auto']) {
          const r = (idx / n) | 0;
          const c = idx % n;
          const bit = 1 << d;
          for (let k = 0; k < n; k++) {
            nn[r * n + k] &= ~bit;
            nn[k * n + c] &= ~bit;
          }
        }
        return nn;
      });
    },
    [assists, n]
  );

  const placeDigit = useCallback(
    (d: number) => {
      if (paused || done.current || selected === null) return;
      if (givens[selected] !== 0) return;

      if (notesMode) {
        sfx.tap();
        setNotes((prev) => {
          const nn = [...prev];
          nn[selected] ^= 1 << d;
          return nn;
        });
        return;
      }

      if (values[selected] === d) return;
      const next = [...values];
      next[selected] = d;
      setValues(next);
      clearNotesFor(selected, d);

      if (breaksRules(values, selected, d)) {
        const ne = errors + 1;
        setErrors(ne);
        setScore((s) => Math.max(0, s - ERROR_PENALTY));
        sfx.error();
        return;
      }

      let ns = score;
      if (d === solution[selected] && !awarded.current.has(selected)) {
        awarded.current.add(selected);
        ns = score + CELL_POINTS * MULTIPLIER[difficulty];
      }
      setFlash(selected);
      setTimeout(() => setFlash((f) => (f === selected ? null : f)), 400);

      if (next.every((v, i) => v === solution[i])) {
        const finalScore = ns + timeBonus(difficulty, elapsedRef.current);
        setScore(finalScore);
        setWon(true);
        finish(finalScore, errors, hintsUsed);
      } else {
        setScore(ns);
        sfx.place();
        if (next.every((v) => v !== 0)) {
          // full board that isn't the solution — nudge, don't punish
          sfx.error();
          setShake(true);
          setTimeout(() => setShake(false), 450);
        }
      }
    },
    [paused, selected, givens, notesMode, values, clearNotesFor, breaksRules, errors, score, solution, difficulty, hintsUsed, finish]
  );

  const erase = useCallback(() => {
    if (paused || done.current || selected === null || givens[selected] !== 0) return;
    if (values[selected] === 0 && notes[selected] === 0) return;
    sfx.tap();
    setValues((v) => {
      const nv = [...v];
      nv[selected] = 0;
      return nv;
    });
    setNotes((prev) => {
      const nn = [...prev];
      nn[selected] = 0;
      return nn;
    });
  }, [paused, selected, givens, values, notes]);

  const useHint = useCallback(() => {
    if (paused || done.current || !assists['hint']) return;
    // prefer the selected cell when it's empty or wrong; else a logically
    // forced cell; else the first unsolved cell
    let target: number | null = null;
    if (selected !== null && givens[selected] === 0 && values[selected] !== solution[selected]) {
      target = selected;
    }
    if (target === null) {
      const forced = findForcedCell(puzzle, values);
      if (forced) target = forced.idx;
    }
    if (target === null) {
      const i = values.findIndex((v, k) => v !== solution[k] && givens[k] === 0);
      if (i >= 0) target = i;
    }
    if (target === null) return;

    const d = solution[target];
    const next = [...values];
    next[target] = d;
    setValues(next);
    clearNotesFor(target, d);
    awarded.current.add(target); // hinted cells never pay out
    assistsUsed.current.add('hint');
    const nh = hintsUsed + 1;
    setHintsUsed(nh);
    setSelected(target);
    setFlash(target);
    setTimeout(() => setFlash((f) => (f === target ? null : f)), 400);
    sfx.hint();

    const ns = Math.max(0, score - HINT_PENALTY);
    if (next.every((v, i) => v === solution[i])) {
      const finalScore = ns + timeBonus(difficulty, elapsedRef.current);
      setScore(finalScore);
      setWon(true);
      finish(finalScore, errors, nh);
    } else {
      setScore(ns);
    }
  }, [paused, assists, selected, givens, values, solution, puzzle, clearNotesFor, hintsUsed, score, difficulty, errors, finish]);

  // physical keyboard support (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || done.current) return;
      if (e.key >= '1' && e.key <= String(n)) placeDigit(Number(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete') erase();
      else if (e.key.toLowerCase() === 'n') setNotesMode((m) => !m);
      else if (e.key.toLowerCase() === 'h') useHint();
      else if (e.key.startsWith('Arrow') && selected !== null) {
        e.preventDefault();
        const r = (selected / n) | 0;
        const c = selected % n;
        const next =
          e.key === 'ArrowUp' ? [Math.max(0, r - 1), c]
          : e.key === 'ArrowDown' ? [Math.min(n - 1, r + 1), c]
          : e.key === 'ArrowLeft' ? [r, Math.max(0, c - 1)]
          : [r, Math.min(n - 1, c + 1)];
        setSelected(next[0] * n + next[1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placeDigit, erase, useHint, paused, selected, n]);

  // --- rule-check assist: duplicate digits and violated signs paint --bad
  const dupCells = useMemo(() => {
    const set = new Set<number>();
    if (!assists['ineq-check']) return set;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const i = r * n + c;
        const v = values[i];
        if (v === 0) continue;
        for (let k = c + 1; k < n; k++) {
          const j = r * n + k;
          if (values[j] === v) {
            set.add(i);
            set.add(j);
          }
        }
        for (let k = r + 1; k < n; k++) {
          const j = k * n + c;
          if (values[j] === v) {
            set.add(i);
            set.add(j);
          }
        }
      }
    }
    return set;
  }, [values, assists, n]);

  const badSigns = useMemo(() => {
    const set = new Set<number>();
    if (!assists['ineq-check']) return set;
    ineqs.forEach((e, k) => {
      if (values[e.a] !== 0 && values[e.b] !== 0 && values[e.a] >= values[e.b]) set.add(k);
    });
    return set;
  }, [values, ineqs, assists]);

  const digitCounts = useMemo(() => {
    const counts = new Array<number>(n + 1).fill(0);
    for (const v of values) if (v !== 0) counts[v]++;
    return counts;
  }, [values, n]);

  const filled = useMemo(() => values.filter((v) => v !== 0).length, [values]);

  useEffect(() => {
    registerSnapshot(() => ({
      n,
      seed: puzzle.seed,
      solution,
      givens,
      ineqs,
      values,
      notes,
      awarded: [...awarded.current],
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  // --- board: odd tracks are cells, even tracks are thin sign gaps
  const tracks = useMemo(
    () => Array.from({ length: 2 * n - 1 }, (_, k) => (k % 2 === 0 ? '1fr' : 'var(--fut-gap)')).join(' '),
    [n]
  );

  const cells = [];
  for (let i = 0; i < N; i++) {
    const r = (i / n) | 0;
    const c = i % n;
    const v = values[i];
    const classes = ['fut-cell'];
    if (givens[i] !== 0) classes.push('given');
    else if (v !== 0) classes.push('user');
    if (dupCells.has(i)) classes.push('dup');
    if (selected === i) classes.push('selected');
    if (flash === i) classes.push('flash');
    if (won) classes.push('w');
    cells.push(
      <button
        key={i}
        className={classes.join(' ')}
        style={{
          gridRow: 2 * r + 1,
          gridColumn: 2 * c + 1,
          ...(won ? { animationDelay: `${(r + c) * 55}ms` } : null)
        }}
        onClick={() => {
          if (done.current) return;
          sfx.tap();
          setSelected(i);
        }}
        aria-label={`Cell row ${r + 1} column ${c + 1}`}
      >
        {v !== 0 ? (
          <span key={`v${v}`} className="fut-val">
            {v}
          </span>
        ) : notes[i] !== 0 ? (
          <span className="fut-notes">
            {digits.filter((d) => notes[i] & (1 << d)).map((d) => (
              <i key={d}>{d}</i>
            ))}
          </span>
        ) : null}
      </button>
    );
  }

  const signs = ineqs.map((e, k) => {
    const lo = Math.min(e.a, e.b);
    const horizontal = Math.max(e.a, e.b) === lo + 1;
    const r = (lo / n) | 0;
    const c = lo % n;
    const dir: 'left' | 'right' | 'up' | 'down' = horizontal
      ? e.a === lo ? 'left' : 'right'
      : e.a === lo ? 'up' : 'down';
    return (
      <span
        key={`s${k}`}
        className={`fut-sign ${badSigns.has(k) ? 'bad' : ''}`}
        style={{
          gridRow: horizontal ? 2 * r + 1 : 2 * r + 2,
          gridColumn: horizontal ? 2 * c + 2 : 2 * c + 1
        }}
      >
        <Chev dir={dir} />
      </span>
    );
  });

  return (
    <div className={`futoshiki ${paused ? 'board-hidden' : ''}`}>
      <div className="fut-info">
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Errors: <b>{errors}</b>
        </span>
        <span className="info-item">
          Filled: <b>{filled}/{N}</b>
        </span>
        {hintsUsed > 0 && (
          <span className="info-item">
            Hints: <b>{hintsUsed}</b>
          </span>
        )}
      </div>

      <div
        className={`fut-board fut-n${n} ${shake ? 'shake' : ''}`}
        role="grid"
        style={{ gridTemplateColumns: tracks, gridTemplateRows: tracks }}
      >
        {cells}
        {signs}
      </div>

      <div className="game-tools fx-card">
        <div className="fut-controls">
          <PadTool active={notesMode} onClick={() => setNotesMode((m) => !m)}>
            <PencilIcon />
            <span>Notes</span>
          </PadTool>
          <PadTool silent onClick={erase}>
            <EraseIcon />
            <span>Erase</span>
          </PadTool>
          {assists['hint'] && (
            <PadTool silent onClick={useHint}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
          <PadTool active={assists['ineq-check']} onClick={() => onToggleAssist('ineq-check', !assists['ineq-check'])}>
            <CheckIcon />
            <span>Check</span>
          </PadTool>
        </div>

        <div className="fut-pad" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {digits.map((d) => (
            <button
              key={d}
              className={`fut-key ${digitCounts[d] >= n ? 'exhausted' : ''}`}
              onClick={() => placeDigit(d)}
              aria-label={`Place ${d}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
