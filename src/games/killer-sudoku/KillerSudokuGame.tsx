import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, CheckIcon, EraseIcon, PencilIcon, SameIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  boxOf,
  colOf,
  findEasiestCell,
  generateKiller,
  rowOf,
  type Grid,
  type KillerPuzzle
} from './logic/generator';
import { ERROR_PENALTY, HINT_PENALTY, PLACEMENT_POINTS, timeBonus } from './logic/scoring';

/** Passive assists count as "help used" for the whole game when enabled. */
const PASSIVE_ASSISTS = ['cage-check', 'dupes', 'auto-notes'];

const popcount = (m: number): number => {
  let n = 0;
  while (m) {
    m &= m - 1;
    n++;
  }
  return n;
};

interface KillerSave {
  puzzle: KillerPuzzle;
  values: number[];
  notes: number[];
  score: number;
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
}

/** cage state under the cage-check assist */
type CageState = '' | 'ok' | 'err';

export function KillerSudokuGame({
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
    (savedState as KillerSave).puzzle &&
    Array.isArray((savedState as KillerSave).puzzle.solution) &&
    Array.isArray((savedState as KillerSave).puzzle.cages) &&
    Array.isArray((savedState as KillerSave).values) &&
    Array.isArray((savedState as KillerSave).notes)
      ? (savedState as KillerSave)
      : undefined;

  const puzzle = useMemo(
    () => (saved ? saved.puzzle : generateKiller({ difficulty })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [difficulty]
  );
  const { solution, givens, cages, cageOf } = puzzle;

  const [values, setValues] = useState<Grid>(() => (saved ? [...saved.values] : [...givens]));
  const [notes, setNotes] = useState<number[]>(() =>
    saved ? [...saved.notes] : new Array(81).fill(0)
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [flash, setFlash] = useState<number | null>(null);
  const [won, setWon] = useState(false);

  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...PASSIVE_ASSISTS.filter((a) => assists[a])])
  );
  const done = useRef(false);

  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

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
      setWon(true);
      events.onFinish({
        outcome: 'won',
        score: finalScore,
        errors: e,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { game: 'killer-sudoku' }
      });
    },
    [events]
  );

  const isLocked = useCallback(
    (idx: number) => givens[idx] !== 0 || (values[idx] !== 0 && values[idx] === solution[idx]),
    [givens, values, solution]
  );

  const applyCorrect = useCallback(
    (idx: number, val: number, prev: Grid, viaHint: boolean) => {
      const next = [...prev];
      next[idx] = val;
      setValues(next);
      setNotes((n) => {
        const nn = [...n];
        nn[idx] = 0;
        if (assists['auto-notes']) {
          // strip the placed digit from pencil marks in row/col/box/cage
          const bit = 1 << val;
          const cage = cages[cageOf[idx]].cells;
          for (let i = 0; i < 81; i++) {
            if (
              rowOf(i) === rowOf(idx) ||
              colOf(i) === colOf(idx) ||
              boxOf(i) === boxOf(idx) ||
              cage.includes(i)
            ) {
              nn[i] &= ~bit;
            }
          }
        }
        return nn;
      });
      setFlash(idx);
      setTimeout(() => setFlash((f) => (f === idx ? null : f)), 400);

      const isWin = next.every((v, i) => v === solution[i]);
      let nextScore = score;
      if (viaHint) {
        nextScore = Math.max(0, score - HINT_PENALTY);
      } else {
        nextScore = score + PLACEMENT_POINTS[difficulty];
      }
      const nextHints = viaHint ? hintsUsed + 1 : hintsUsed;
      if (viaHint) {
        assistsUsed.current.add('hint');
        setHintsUsed(nextHints);
        sfx.hint();
      } else {
        sfx.place();
      }
      if (isWin) {
        const finalScore = nextScore + timeBonus(difficulty, elapsedRef.current);
        setScore(finalScore);
        finish(finalScore, errors, nextHints);
      } else {
        setScore(nextScore);
      }
    },
    [assists, cages, cageOf, score, errors, hintsUsed, difficulty, solution, finish]
  );

  const placeDigit = useCallback(
    (d: number) => {
      if (paused || done.current || selected === null) return;
      if (isLocked(selected)) return;

      if (notesMode) {
        sfx.tap();
        setNotes((n) => {
          const nn = [...n];
          nn[selected] ^= 1 << d;
          return nn;
        });
        return;
      }

      if (values[selected] === d) return;

      if (d === solution[selected]) {
        applyCorrect(selected, d, values, false);
      } else {
        const next = [...values];
        next[selected] = d;
        setValues(next);
        setErrors((e) => e + 1);
        setScore((s) => Math.max(0, s - ERROR_PENALTY));
        sfx.error();
      }
    },
    [paused, selected, isLocked, notesMode, values, solution, applyCorrect]
  );

  const erase = useCallback(() => {
    if (paused || done.current || selected === null || isLocked(selected)) return;
    sfx.tap();
    setValues((v) => {
      const next = [...v];
      next[selected] = 0;
      return next;
    });
    setNotes((n) => {
      const nn = [...n];
      nn[selected] = 0;
      return nn;
    });
  }, [paused, selected, isLocked]);

  const useHint = useCallback(() => {
    if (paused || done.current || !assists.hint) return;
    // prefer the selected cell if it is empty or wrong; otherwise aim at the
    // most constrained cell (cage sums included); otherwise any wrong cell
    let target: number | null = null;
    if (selected !== null && !isLocked(selected)) target = selected;
    if (target === null) target = findEasiestCell(puzzle, values);
    if (target === null) {
      const i = values.findIndex((v, k) => v !== solution[k]);
      target = i === -1 ? null : i;
    }
    if (target === null) return;
    setSelected(target);
    applyCorrect(target, solution[target], values, true);
  }, [paused, assists.hint, selected, isLocked, puzzle, values, solution, applyCorrect]);

  // physical keyboard support (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || done.current) return;
      if (e.key >= '1' && e.key <= '9') placeDigit(Number(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete') erase();
      else if (e.key.toLowerCase() === 'n') setNotesMode((m) => !m);
      else if (e.key.toLowerCase() === 'h') useHint();
      else if (e.key.startsWith('Arrow') && selected !== null) {
        e.preventDefault();
        const r = rowOf(selected);
        const c = colOf(selected);
        const next =
          e.key === 'ArrowUp' ? [Math.max(0, r - 1), c]
          : e.key === 'ArrowDown' ? [Math.min(8, r + 1), c]
          : e.key === 'ArrowLeft' ? [r, Math.max(0, c - 1)]
          : [r, Math.min(8, c + 1)];
        setSelected(next[0] * 9 + next[1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placeDigit, erase, useHint, paused, selected]);

  useEffect(() => {
    registerSnapshot(() => ({
      puzzle,
      values,
      notes,
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  // ---------------------------------------------------------- derived view

  const selRow = selected !== null ? rowOf(selected) : -1;
  const selCol = selected !== null ? colOf(selected) : -1;
  const selBox = selected !== null ? boxOf(selected) : -1;
  const selCage = selected !== null ? cageOf[selected] : -1;

  /** cage-check assist: completed cages flag good/bad */
  const cageStates = useMemo<CageState[]>(() => {
    if (!assists['cage-check']) return cages.map(() => '');
    return cages.map((cage) => {
      let sum = 0;
      let mask = 0;
      let count = 0;
      for (const c of cage.cells) {
        const v = values[c];
        if (v === 0) return '';
        sum += v;
        mask |= 1 << v;
        count++;
      }
      // a repeated digit collapses the mask — completed cages must be a
      // distinct set AND hit the printed sum
      const distinct = popcount(mask) === count;
      return sum === cage.sum && distinct ? 'ok' : 'err';
    });
  }, [assists, cages, values]);

  /** dupes assist: cells whose digit repeats in a row/col/box/cage */
  const dupCells = useMemo(() => {
    const set = new Set<number>();
    if (!assists.dupes) return set;
    for (let i = 0; i < 81; i++) {
      const v = values[i];
      if (v === 0) continue;
      for (let j = 0; j < 81; j++) {
        if (j === i || values[j] !== v) continue;
        if (
          rowOf(i) === rowOf(j) ||
          colOf(i) === colOf(j) ||
          boxOf(i) === boxOf(j) ||
          cageOf[i] === cageOf[j]
        ) {
          set.add(i);
          set.add(j);
        }
      }
    }
    return set;
  }, [assists.dupes, values, cageOf]);

  const remaining = useMemo(() => {
    const counts = new Array(10).fill(9);
    for (let i = 0; i < 81; i++) {
      if (values[i] !== 0 && values[i] === solution[i]) counts[values[i]]--;
    }
    return counts;
  }, [values, solution]);

  const solvedCells = useMemo(
    () => values.reduce((n, v, i) => n + (v !== 0 && v === solution[i] ? 1 : 0), 0),
    [values, solution]
  );

  // selected cage running total for the strip near the pad
  const cageStatus = useMemo(() => {
    if (selCage === -1) return null;
    const cage = cages[selCage];
    let placed = 0;
    let filled = 0;
    for (const c of cage.cells) {
      if (values[c] !== 0) {
        placed += values[c];
        filled++;
      }
    }
    return { placed, sum: cage.sum, left: cage.cells.length - filled };
  }, [selCage, cages, values]);

  const cells = [];
  for (let i = 0; i < 81; i++) {
    const v = values[i];
    const wrong = v !== 0 && v !== solution[i];
    const cg = cageOf[i];
    const classes = ['ks-cell'];
    if (givens[i] !== 0) classes.push('given');
    else if (v !== 0) classes.push(wrong ? 'wrong' : 'user');
    if (selected === i) classes.push('selected');
    else if (selected !== null) {
      if (cg === selCage) classes.push('cage-sel');
      else if (rowOf(i) === selRow || colOf(i) === selCol || boxOf(i) === selBox) {
        classes.push('peer');
      }
    }
    if (dupCells.has(i)) classes.push('dup');
    if (flash === i) classes.push('flash');
    if (colOf(i) % 3 === 2 && colOf(i) !== 8) classes.push('bx-r');
    if (rowOf(i) % 3 === 2 && rowOf(i) !== 8) classes.push('bx-b');

    // dashed cage outline: draw a side wherever the neighbor is another cage
    const bt = rowOf(i) === 0 || cageOf[i - 9] !== cg;
    const bb = rowOf(i) === 8 || cageOf[i + 9] !== cg;
    const bl = colOf(i) === 0 || cageOf[i - 1] !== cg;
    const br = colOf(i) === 8 || cageOf[i + 1] !== cg;
    const cageClasses = ['ks-cage'];
    if (bt) cageClasses.push('bt');
    if (bb) cageClasses.push('bb');
    if (bl) cageClasses.push('bl');
    if (br) cageClasses.push('br');
    if (cageStates[cg]) cageClasses.push(cageStates[cg]);

    const isAnchor = cages[cg].cells[0] === i;

    cells.push(
      <button
        key={i}
        className={classes.join(' ')}
        style={won ? ({ '--d': rowOf(i) + colOf(i) } as CSSProperties) : undefined}
        onClick={() => {
          sfx.tap();
          setSelected(i);
        }}
        aria-label={`Cell row ${rowOf(i) + 1} column ${colOf(i) + 1}, cage sum ${cages[cg].sum}`}
      >
        <span className={cageClasses.join(' ')} aria-hidden />
        {isAnchor && (
          <span className={`ks-sum ${cageStates[cg]}`} aria-hidden>
            {cages[cg].sum}
          </span>
        )}
        {v !== 0 ? (
          v
        ) : notes[i] !== 0 ? (
          <span className={`ks-notes ${isAnchor ? 'shifted' : ''}`}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <i key={d}>{notes[i] & (1 << d) ? d : ''}</i>
            ))}
          </span>
        ) : (
          ''
        )}
      </button>
    );
  }

  return (
    <div className={`ks ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Errors: <b>{errors}</b>
        </span>
        <span className="info-item">
          Left: <b>{81 - solvedCells}</b>
        </span>
        {hintsUsed > 0 && (
          <span className="info-item">
            Hints: <b>{hintsUsed}</b>
          </span>
        )}
      </div>

      <div className={`ks-board ${won ? 'won' : ''}`} role="grid">
        {cells}
      </div>

      <div className="game-tools fx-card">
        <div className="ks-controls">
          <PadTool active={notesMode} onClick={() => setNotesMode((m) => !m)}>
            <PencilIcon />
            <span>Notes</span>
          </PadTool>
          <PadTool silent onClick={erase}>
            <EraseIcon />
            <span>Erase</span>
          </PadTool>
          {assists.hint && (
            <PadTool silent onClick={useHint}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
        </div>

        <div className="ks-controls">
          {(
            [
              ['cage-check', 'Cages', CheckIcon],
              ['dupes', 'Dupes', SameIcon],
              ['auto-notes', 'Tidy', PencilIcon]
            ] as const
          ).map(([id, label, Icon]) => (
            <PadTool key={id} active={assists[id]} onClick={() => onToggleAssist(id, !assists[id])}>
              <Icon />
              <span>{label}</span>
            </PadTool>
          ))}
        </div>

        <div className="ks-cage-status" aria-live="polite">
          {cageStatus ? (
            <>
              Cage&nbsp;
              <b className={cageStatus.placed > cageStatus.sum ? 'over' : ''}>
                {cageStatus.placed}
              </b>
              &thinsp;/&thinsp;<b>{cageStatus.sum}</b>
              <span className="ks-cage-left">
                {cageStatus.left === 0
                  ? ' · full'
                  : ` · ${cageStatus.left} cell${cageStatus.left === 1 ? '' : 's'} left`}
              </span>
            </>
          ) : (
            <span className="ks-cage-left">Tap a cell to see its cage total</span>
          )}
        </div>

        <div className="ks-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
            <button
              key={d}
              className={`ks-key ${remaining[d] === 0 ? 'exhausted' : ''}`}
              onClick={() => placeDigit(d)}
              disabled={remaining[d] === 0 && !notesMode}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
