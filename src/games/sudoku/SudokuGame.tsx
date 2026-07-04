import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import {
  BulbIcon,
  GridIcon,
  EraseIcon,
  PencilIcon,
  SameIcon,
  TargetIcon
} from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  boxOf,
  colOf,
  findNakedSingle,
  generatePuzzle,
  rowOf,
  type Grid
} from './logic/generator';
import { ERROR_PENALTY, HINT_PENALTY, PLACEMENT_POINTS, timeBonus } from './logic/scoring';

const ERROR_LIMIT = 3;

/** Passive assists count as "help used" for the whole game when enabled. */
const PASSIVE_ASSISTS = ['colorAssist', 'regionHighlight', 'highlightSame'];

interface SudokuSave {
  puzzle: number[];
  solution: number[];
  values: number[];
  notes: number[];
  score: number;
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
}

export function SudokuGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  onToggleAssist,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved = savedState as SudokuSave | undefined;
  const { puzzle, solution } = useMemo(
    () => (saved ? { puzzle: saved.puzzle, solution: saved.solution } : generatePuzzle(difficulty)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [difficulty]
  );

  const [values, setValues] = useState<Grid>(() => (saved ? [...saved.values] : [...puzzle]));
  const [notes, setNotes] = useState<number[]>(() =>
    saved ? [...saved.notes] : new Array(81).fill(0)
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [flash, setFlash] = useState<number | null>(null);

  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...PASSIVE_ASSISTS.filter((a) => assists[a])])
  );
  const done = useRef(false);

  const given = useMemo(() => puzzle.map((v) => v !== 0), [puzzle]);
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
    (outcome: 'won' | 'lost', finalScore: number, e: number, h: number) => {
      if (done.current) return;
      done.current = true;
      events.onFinish({
        outcome,
        score: finalScore,
        errors: e,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { game: 'sudoku' }
      });
    },
    [events]
  );

  const isLocked = useCallback(
    (idx: number) => given[idx] || (values[idx] !== 0 && values[idx] === solution[idx]),
    [given, values, solution]
  );

  const applyCorrect = useCallback(
    (idx: number, val: number, prev: Grid, viaHint: boolean) => {
      const next = [...prev];
      next[idx] = val;
      setValues(next);
      // clear this digit from notes in the same row/col/box and clear the cell's notes
      setNotes((n) => {
        const nn = [...n];
        nn[idx] = 0;
        const bit = 1 << val;
        for (let i = 0; i < 81; i++) {
          if (rowOf(i) === rowOf(idx) || colOf(i) === colOf(idx) || boxOf(i) === boxOf(idx)) {
            nn[i] &= ~bit;
          }
        }
        return nn;
      });
      setFlash(idx);
      setTimeout(() => setFlash((f) => (f === idx ? null : f)), 400);

      const won = next.every((v, i) => v === solution[i]);
      let nextScore = score;
      if (viaHint) {
        nextScore = Math.max(0, score - HINT_PENALTY);
      } else {
        nextScore = score + PLACEMENT_POINTS[difficulty];
      }
      const nextHints = viaHint ? hintsUsed + 1 : hintsUsed;
      if (viaHint) {
        assistsUsed.current.add('smartHints');
        setHintsUsed(nextHints);
        sfx.hint();
      } else {
        sfx.place();
      }
      if (won) {
        const finalScore = nextScore + timeBonus(difficulty, elapsedRef.current);
        setScore(finalScore);
        finish('won', finalScore, errors, nextHints);
      } else {
        setScore(nextScore);
      }
    },
    [score, errors, hintsUsed, difficulty, solution, finish]
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
        const nextErrors = errors + 1;
        setErrors(nextErrors);
        setScore((s) => Math.max(0, s - ERROR_PENALTY));
        sfx.error();
        if (assists.errorLimit && nextErrors >= ERROR_LIMIT) {
          finish('lost', Math.max(0, score - ERROR_PENALTY), nextErrors, hintsUsed);
        }
      }
    },
    [paused, selected, isLocked, notesMode, values, solution, errors, score, hintsUsed, assists.errorLimit, applyCorrect, finish]
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
    if (paused || done.current || !assists.smartHints) return;
    // Prefer the selected cell if it is empty or wrong; otherwise find a naked
    // single (a cell only one number can go into); otherwise any empty cell.
    let target: number | null = null;
    if (selected !== null && !isLocked(selected)) target = selected;
    if (target === null) {
      const effective = values.map((v, i) => (v === solution[i] ? v : 0));
      const single = findNakedSingle(effective);
      if (single) target = single.idx;
    }
    if (target === null) target = values.findIndex((v, i) => v !== solution[i]);
    if (target === -1 || target === null) return;
    setSelected(target);
    applyCorrect(target, solution[target], values, true);
  }, [paused, assists.smartHints, selected, isLocked, values, solution, applyCorrect]);

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

  // derived helpers for assist rendering
  const selRow = selected !== null ? rowOf(selected) : -1;
  const selCol = selected !== null ? colOf(selected) : -1;
  const selBox = selected !== null ? boxOf(selected) : -1;
  const activeDigit = selected !== null && values[selected] !== 0 ? values[selected] : 0;

  const dimmedBoxes = useMemo(() => {
    if (!assists.colorAssist || activeDigit === 0) return new Set<number>();
    const set = new Set<number>();
    for (let i = 0; i < 81; i++) {
      if (values[i] === activeDigit) set.add(boxOf(i));
    }
    return set;
  }, [assists.colorAssist, activeDigit, values]);

  const remaining = useMemo(() => {
    const counts = new Array(10).fill(9);
    for (let i = 0; i < 81; i++) {
      if (values[i] !== 0 && values[i] === solution[i]) counts[values[i]]--;
    }
    return counts;
  }, [values, solution]);

  const cells = [];
  for (let i = 0; i < 81; i++) {
    const v = values[i];
    const wrong = v !== 0 && v !== solution[i];
    const holdsActive = activeDigit !== 0 && v === activeDigit && !wrong;
    const classes = ['cell'];
    if (given[i]) classes.push('given');
    else if (v !== 0) classes.push(wrong ? 'wrong' : 'user');
    if (selected === i) classes.push('selected');
    else {
      if (assists.regionHighlight && selected !== null &&
          (rowOf(i) === selRow || colOf(i) === selCol || boxOf(i) === selBox)) {
        classes.push('peer');
      }
      if (assists.highlightSame && holdsActive) {
        classes.push('same');
      }
    }
    // never fade the digits that CAUSE a block to be ruled out — they (and
    // the same-number highlight) must stay the loudest thing on the board
    if (dimmedBoxes.has(boxOf(i)) && selected !== i && !holdsActive) classes.push('dimmed');
    if (flash === i) classes.push('flash');
    if (colOf(i) % 3 === 2 && colOf(i) !== 8) classes.push('box-right');
    if (rowOf(i) % 3 === 2 && rowOf(i) !== 8) classes.push('box-bottom');

    cells.push(
      <button
        key={i}
        className={classes.join(' ')}
        onClick={() => {
          sfx.tap();
          setSelected(i);
        }}
        aria-label={`Cell row ${rowOf(i) + 1} column ${colOf(i) + 1}`}
      >
        {v !== 0 ? (
          v
        ) : notes[i] !== 0 ? (
          <span className="notes">
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

  useEffect(() => {
    registerSnapshot(() => ({
      puzzle,
      solution,
      values,
      notes,
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  return (
    <div className={`sudoku ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        {assists.showPoints && (
          <span className="info-item">
            <b>{score.toLocaleString()}</b> pts
          </span>
        )}
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Errors: <b>{errors}{assists.errorLimit ? ` / ${ERROR_LIMIT}` : ''}</b>
        </span>
        {hintsUsed > 0 && (
          <span className="info-item">
            Hints: <b>{hintsUsed}</b>
          </span>
        )}
      </div>

      <div className="sudoku-board" role="grid">
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
        {assists.smartHints && (
          <PadTool silent onClick={useHint}>
            <BulbIcon />
            <span>Hint</span>
          </PadTool>
        )}
      </div>

      <div className="sudoku-controls">
        {(
          [
            ['colorAssist', 'Rule out', GridIcon],
            ['regionHighlight', 'Region', TargetIcon],
            ['highlightSame', 'Same', SameIcon]
          ] as const
        ).map(([id, label, Icon]) => (
          <PadTool key={id} active={assists[id]} onClick={() => onToggleAssist(id, !assists[id])}>
            <Icon />
            <span>{label}</span>
          </PadTool>
        ))}
      </div>

      <div className="sudoku-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button
            key={d}
            className={`pad-btn ${remaining[d] === 0 ? 'exhausted' : ''}`}
            onClick={() => placeDigit(d)}
            disabled={remaining[d] === 0 && !notesMode}
          >
            <span className="pad-digit">{d}</span>
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}
