import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, CheckIcon, EraseIcon, PencilIcon, SameIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  cageClue,
  cageSatisfied,
  DIFF_CONFIG,
  generateMathdoku,
  labelCellOf,
  type MathdokuPuzzle
} from './logic/generator';
import { cellPoints, ERROR_PENALTY, HINT_PENALTY, timeBonus, winBonus } from './logic/scoring';

/** Passive assists count as "help used" for the whole game when enabled. */
const PASSIVE_ASSISTS = ['cage-check', 'dupes'];

interface MdkSave {
  puzzle: MathdokuPuzzle;
  values: number[];
  notes: number[];
  /** cells already awarded placement points (never re-awarded) */
  scored: number[];
  /** hint-filled cells — locked like givens */
  locked: number[];
  score: number;
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
}

export function MathdokuGame({
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
    Array.isArray((savedState as MdkSave).values) &&
    Array.isArray((savedState as MdkSave).notes) &&
    (savedState as MdkSave).puzzle &&
    Array.isArray((savedState as MdkSave).puzzle.solution) &&
    Array.isArray((savedState as MdkSave).puzzle.cages)
      ? (savedState as MdkSave)
      : undefined;

  const puzzle = useMemo<MathdokuPuzzle>(
    () => (saved ? saved.puzzle : generateMathdoku(DIFF_CONFIG[difficulty])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [difficulty]
  );
  const { n, solution, noOps } = puzzle;
  const N = n * n;

  /** single-cell cages are givens, pre-filled and locked */
  const given = useMemo(() => {
    const g = new Array<boolean>(N).fill(false);
    for (const cage of puzzle.cages) if (cage.cells.length === 1) g[cage.cells[0]] = true;
    return g;
  }, [puzzle, N]);

  const [values, setValues] = useState<number[]>(() =>
    saved ? [...saved.values] : solution.map((v, i) => (given[i] ? v : 0))
  );
  const [notes, setNotes] = useState<number[]>(() =>
    saved ? [...saved.notes] : new Array(N).fill(0)
  );
  const [locked, setLocked] = useState<number[]>(() => (saved ? [...saved.locked] : []));
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);

  const scored = useRef<Set<number>>(new Set(saved?.scored ?? []));
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...PASSIVE_ASSISTS.filter((a) => assists[a])])
  );
  const done = useRef(false);
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  const rowOf = useCallback((i: number) => Math.floor(i / n), [n]);
  const colOf = useCallback((i: number) => i % n, [n]);

  const reportStats = useCallback(
    (s: number, e: number, h: number) => {
      events.onStats({
        score: s,
        errors: e,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current]
      });
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
        extra: { size: `${n}×${n}` }
      });
    },
    [events, n]
  );

  const isLocked = useCallback(
    (idx: number) => given[idx] || locked.includes(idx),
    [given, locked]
  );

  /** clear notes in the cell + remove digit d from row/col peers' notes */
  const clearNotesFor = useCallback(
    (idx: number, d: number) => {
      setNotes((prev) => {
        const nn = [...prev];
        nn[idx] = 0;
        const bit = 1 << d;
        for (let i = 0; i < N; i++) {
          if (rowOf(i) === rowOf(idx) || colOf(i) === colOf(idx)) nn[i] &= ~bit;
        }
        return nn;
      });
    },
    [N, rowOf, colOf]
  );

  const applyValue = useCallback(
    (idx: number, d: number, viaHint: boolean) => {
      const next = [...values];
      next[idx] = d;
      setValues(next);
      clearNotesFor(idx, d);

      // rule violations: a duplicate in the row/column, or completing a
      // cage whose arithmetic fails — objective errors, no solution-peeking
      let dup = false;
      for (let k = 0; k < n; k++) {
        const ri = rowOf(idx) * n + k;
        const ci = k * n + colOf(idx);
        if (ri !== idx && next[ri] === d) dup = true;
        if (ci !== idx && next[ci] === d) dup = true;
      }
      const cage = puzzle.cages[puzzle.cageOf[idx]];
      const cageFull = cage.cells.every((c) => next[c] !== 0);
      const cageWrong = cageFull && !cageSatisfied(cage, next, noOps);

      let s = score;
      let e = errors;
      let h = hintsUsed;
      if (viaHint) {
        s = Math.max(0, s - HINT_PENALTY);
        h += 1;
        setHintsUsed(h);
        assistsUsed.current.add('hint');
        scored.current.add(idx); // hint cells never earn points
        sfx.hint();
      } else if (dup || cageWrong) {
        e += 1;
        setErrors(e);
        s = Math.max(0, s - ERROR_PENALTY);
        sfx.error();
      } else {
        sfx.place();
      }
      if (!viaHint && d === solution[idx] && !scored.current.has(idx)) {
        scored.current.add(idx);
        s += cellPoints(difficulty);
      }

      const won = next.every((v, i) => v === solution[i]);
      if (won) {
        const finalScore = s + winBonus(difficulty) + timeBonus(difficulty, elapsedRef.current);
        setScore(finalScore);
        finish(finalScore, e, h);
      } else {
        setScore(s);
      }
    },
    [values, clearNotesFor, n, rowOf, colOf, puzzle, noOps, score, errors, hintsUsed, solution, difficulty, finish]
  );

  const placeDigit = useCallback(
    (d: number) => {
      if (paused || done.current || selected === null) return;
      if (isLocked(selected)) return;

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
      applyValue(selected, d, false);
    },
    [paused, selected, isLocked, notesMode, values, applyValue]
  );

  const erase = useCallback(() => {
    if (paused || done.current || selected === null || isLocked(selected)) return;
    sfx.tap();
    setValues((v) => {
      const next = [...v];
      next[selected] = 0;
      return next;
    });
    setNotes((prev) => {
      const nn = [...prev];
      nn[selected] = 0;
      return nn;
    });
  }, [paused, selected, isLocked]);

  const useHint = useCallback(() => {
    if (paused || done.current || !assists['hint']) return;
    // prefer the selected cell if it's empty or wrong; else the first
    // cell that doesn't hold its solution digit
    let target: number | null = null;
    if (selected !== null && !isLocked(selected) && values[selected] !== solution[selected]) {
      target = selected;
    }
    if (target === null) {
      const idx = values.findIndex((v, i) => v !== solution[i] && !isLocked(i));
      if (idx !== -1) target = idx;
    }
    if (target === null) return;
    const t = target;
    setSelected(t);
    setLocked((l) => [...l, t]);
    applyValue(t, solution[t], true);
  }, [paused, assists, selected, isLocked, values, solution, applyValue]);

  // physical keyboard support (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || done.current) return;
      const d = Number(e.key);
      if (d >= 1 && d <= n) placeDigit(d);
      else if (e.key === 'Backspace' || e.key === 'Delete') erase();
      else if (e.key.toLowerCase() === 'n') setNotesMode((m) => !m);
      else if (e.key.toLowerCase() === 'h') useHint();
      else if (e.key.startsWith('Arrow') && selected !== null) {
        e.preventDefault();
        const r = rowOf(selected);
        const c = colOf(selected);
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
  }, [placeDigit, erase, useHint, paused, selected, n, rowOf, colOf]);

  /* ---------- derived rendering state ---------- */

  const clueAt = useMemo(() => {
    const m = new Map<number, string>();
    for (const cage of puzzle.cages) m.set(labelCellOf(cage), cageClue(cage, noOps));
    return m;
  }, [puzzle, noOps]);

  /** thick inner cage borders — inset shadows on top/left boundary edges */
  const cageShadow = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < N; i++) {
      const parts: string[] = [];
      const ci = puzzle.cageOf[i];
      if (rowOf(i) > 0 && puzzle.cageOf[i - n] !== ci) parts.push('inset 0 2px 0 var(--text-dim)');
      if (colOf(i) > 0 && puzzle.cageOf[i - 1] !== ci) parts.push('inset 2px 0 0 var(--text-dim)');
      arr.push(parts.join(', '));
    }
    return arr;
  }, [puzzle, N, n, rowOf, colOf]);

  /** cage-check assist: fully-filled multi-cell cages turn good/bad */
  const cageState = useMemo(() => {
    return puzzle.cages.map((cage) => {
      if (!assists['cage-check'] || cage.cells.length === 1) return null;
      if (cage.cells.some((c) => values[c] === 0)) return null;
      return cageSatisfied(cage, values, noOps) ? 'good' : 'bad';
    });
  }, [puzzle, assists, values, noOps]);

  /** dupes assist: cells whose digit repeats in their row or column */
  const dupCells = useMemo(() => {
    const set = new Set<number>();
    if (!assists['dupes']) return set;
    for (let a = 0; a < n; a++) {
      const rowSeen = new Map<number, number[]>();
      const colSeen = new Map<number, number[]>();
      for (let b = 0; b < n; b++) {
        const ri = a * n + b;
        const ci = b * n + a;
        if (values[ri] !== 0) rowSeen.set(values[ri], [...(rowSeen.get(values[ri]) ?? []), ri]);
        if (values[ci] !== 0) colSeen.set(values[ci], [...(colSeen.get(values[ci]) ?? []), ci]);
      }
      for (const cells of rowSeen.values()) if (cells.length > 1) cells.forEach((c) => set.add(c));
      for (const cells of colSeen.values()) if (cells.length > 1) cells.forEach((c) => set.add(c));
    }
    return set;
  }, [assists, values, n]);

  const digitCounts = useMemo(() => {
    const counts = new Array(n + 1).fill(0);
    for (const v of values) if (v !== 0) counts[v]++;
    return counts;
  }, [values, n]);

  const selectedCage = selected !== null ? puzzle.cageOf[selected] : -1;

  useEffect(() => {
    registerSnapshot(() => ({
      puzzle,
      values,
      notes,
      scored: [...scored.current],
      locked,
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  /* ---------- render ---------- */

  const cells = [];
  for (let i = 0; i < N; i++) {
    const v = values[i];
    const state = cageState[puzzle.cageOf[i]];
    const classes = ['mdk-cell'];
    if (given[i] || locked.includes(i)) classes.push('mdk-given');
    else if (v !== 0) classes.push('mdk-user');
    if (state === 'good') classes.push('mdk-cg-good');
    if (state === 'bad') classes.push('mdk-cg-bad');
    if (selected === i) classes.push('mdk-sel');
    else if (selectedCage !== -1 && puzzle.cageOf[i] === selectedCage) classes.push('mdk-cage-sel');
    if (dupCells.has(i)) classes.push('mdk-dup');

    const shadow = cageShadow[i];
    const boxShadow =
      selected === i
        ? `inset 0 0 0 2px var(--accent)${shadow ? `, ${shadow}` : ''}`
        : shadow || undefined;

    cells.push(
      <button
        key={i}
        className={classes.join(' ')}
        style={boxShadow ? { boxShadow } : undefined}
        onClick={() => {
          sfx.tap();
          setSelected(i);
        }}
        aria-label={`Cell row ${rowOf(i) + 1} column ${colOf(i) + 1}`}
      >
        {clueAt.has(i) && <span className="mdk-clue">{clueAt.get(i)}</span>}
        {v !== 0 ? (
          <span key={v} className="mdk-digit">
            {v}
          </span>
        ) : notes[i] !== 0 ? (
          <span className="mdk-notes">
            {Array.from({ length: 9 }, (_, k) => k + 1).map((d) => (
              <i key={d}>{d <= n && notes[i] & (1 << d) ? d : ''}</i>
            ))}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div className={`mdk-root ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Errors: <b>{errors}</b>
        </span>
        {hintsUsed > 0 && (
          <span className="info-item">
            Hints: <b>{hintsUsed}</b>
          </span>
        )}
        <span className="info-item">
          {n}×{n}
          {noOps ? ' · ops hidden' : ''}
        </span>
      </div>

      <div className="mdk-board" data-n={n} role="grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {cells}
      </div>

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
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
        </div>

        <div className="sudoku-controls">
          {(
            [
              ['cage-check', 'Cages', CheckIcon],
              ['dupes', 'Dupes', SameIcon]
            ] as const
          ).map(([id, label, Icon]) => (
            <PadTool key={id} active={assists[id]} onClick={() => onToggleAssist(id, !assists[id])}>
              <Icon />
              <span>{label}</span>
            </PadTool>
          ))}
        </div>

        <div className="mdk-pad" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {Array.from({ length: n }, (_, k) => k + 1).map((d) => (
            <PadTool
              key={d}
              silent
              className={`mdk-key ${digitCounts[d] >= n ? 'mdk-spent' : ''}`}
              onClick={() => placeDigit(d)}
              aria-label={`Place ${d}`}
            >
              {d}
            </PadTool>
          ))}
        </div>
      </div>
    </div>
  );
}
