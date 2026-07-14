import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, CheckIcon, EraseIcon, PencilIcon, SameIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  generateKakuro,
  runCombinations,
  type KakuroPuzzle,
  type KakuroRun
} from './logic/generator';
import { CELL_POINTS, ERROR_PENALTY, hintPenalty, timeBonus } from './logic/scoring';

/** Passive assists count as "help used" for the whole game when enabled. */
const PASSIVE_ASSISTS = ['runCheck', 'combos'];

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

interface KakuroSave {
  puzzle: KakuroPuzzle;
  values: number[];
  notes: number[];
  hinted: number[];
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
}

interface RunState {
  filled: boolean;
  valid: boolean;
  cur: number;
}

function runState(run: KakuroRun, values: number[]): RunState {
  let cur = 0;
  let filled = true;
  let mask = 0;
  let repeat = false;
  for (const cell of run.cells) {
    const v = values[cell];
    if (v === 0) {
      filled = false;
      continue;
    }
    if (mask & (1 << v)) repeat = true;
    mask |= 1 << v;
    cur += v;
  }
  return { filled, valid: filled && !repeat && cur === run.sum, cur };
}

/** compact combos text for one run: lists up to 4 sets, else just the count */
function combosLabel(run: KakuroRun, values: number[]): string {
  const placed = run.cells.map((c) => values[c]).filter((v) => v !== 0);
  const combos = runCombinations(run.sum, run.cells.length, placed);
  if (combos.length === 0) return 'none fit';
  if (combos.length > 4) return `${combos.length} combos`;
  return combos.map((set) => set.join('')).join(' · ');
}

export function KakuroGame({
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
    typeof (savedState as KakuroSave).puzzle === 'object' &&
    Array.isArray((savedState as KakuroSave).puzzle?.blocks) &&
    Array.isArray((savedState as KakuroSave).puzzle?.runs) &&
    Array.isArray((savedState as KakuroSave).values) &&
    Array.isArray((savedState as KakuroSave).notes)
      ? (savedState as KakuroSave)
      : undefined;

  const puzzle = useMemo(
    () => (saved ? saved.puzzle : generateKakuro({ difficulty })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [difficulty]
  );
  const { rows, cols, blocks, solution, runs } = puzzle;

  const [values, setValues] = useState<number[]>(() =>
    saved ? [...saved.values] : new Array(rows * cols).fill(0)
  );
  const [notes, setNotes] = useState<number[]>(() =>
    saved ? [...saved.notes] : new Array(rows * cols).fill(0)
  );
  const [hinted, setHinted] = useState<number[]>(() => (saved ? [...saved.hinted] : []));
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);

  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...PASSIVE_ASSISTS.filter((a) => assists[a])])
  );
  const done = useRef(false);
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  /* ------------------------------------------------- derived structure */

  const entryCells = useMemo(() => {
    const list: number[] = [];
    for (let i = 0; i < rows * cols; i++) if (!blocks[i]) list.push(i);
    return list;
  }, [rows, cols, blocks]);

  // per entry cell: index of its across / down run
  const runOf = useMemo(() => {
    const a = new Map<number, number>();
    const d = new Map<number, number>();
    runs.forEach((run, ri) => {
      for (const cell of run.cells) (run.dir === 'a' ? a : d).set(cell, ri);
    });
    return { a, d };
  }, [runs]);

  // per clue block cell: the runs it clues
  const clueOf = useMemo(() => {
    const a = new Map<number, number>();
    const d = new Map<number, number>();
    runs.forEach((run, ri) => {
      (run.dir === 'a' ? a : d).set(run.clue, ri);
    });
    return { a, d };
  }, [runs]);

  const states = useMemo(() => runs.map((run) => runState(run, values)), [runs, values]);

  const filled = useMemo(
    () => entryCells.reduce((acc, c) => acc + (values[c] !== 0 ? 1 : 0), 0),
    [entryCells, values]
  );
  const correct = useMemo(
    () => entryCells.reduce((acc, c) => acc + (values[c] === solution[c] ? 1 : 0), 0),
    [entryCells, values, solution]
  );

  const score = Math.max(
    0,
    correct * CELL_POINTS[difficulty] - errors * ERROR_PENALTY - hintsUsed * hintPenalty(difficulty)
  );

  /* --------------------------------------------------- events upward */

  useEffect(() => {
    for (const a of PASSIVE_ASSISTS) if (assists[a]) assistsUsed.current.add(a);
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { filled, cells: entryCells.length }
    });
  }, [score, errors, hintsUsed, filled, entryCells.length, assists, events]);

  const finish = useCallback(
    (finalScore: number, e: number, h: number) => {
      if (done.current) return;
      done.current = true;
      events.onFinish({
        outcome: 'won',
        score: finalScore,
        errors: e,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current]
      });
    },
    [events]
  );

  const checkWin = useCallback(
    (nextValues: number[], nextErrors: number, nextHints: number) => {
      for (const c of entryCells) if (nextValues[c] === 0) return;
      for (const run of runs) if (!runState(run, nextValues).valid) return;
      // unique solution -> a fully valid grid IS the solution
      const base = Math.max(
        0,
        entryCells.length * CELL_POINTS[difficulty] -
          nextErrors * ERROR_PENALTY -
          nextHints * hintPenalty(difficulty)
      );
      finish(base + timeBonus(difficulty, elapsedRef.current), nextErrors, nextHints);
    },
    [entryCells, runs, difficulty, finish]
  );

  /* ------------------------------------------------------ interaction */

  const isLocked = useCallback((idx: number) => hinted.includes(idx), [hinted]);

  const applyValue = useCallback(
    (idx: number, d: number, viaHint: boolean) => {
      const next = [...values];
      next[idx] = d;
      setValues(next);
      // clear this digit from notes along both runs, and the cell's own notes
      setNotes((n) => {
        const nn = [...n];
        nn[idx] = 0;
        const bit = 1 << d;
        const ra = runOf.a.get(idx);
        const rd = runOf.d.get(idx);
        for (const ri of [ra, rd]) {
          if (ri === undefined) continue;
          for (const cell of runs[ri].cells) nn[cell] &= ~bit;
        }
        return nn;
      });

      let nextErrors = errors;
      let nextHints = hintsUsed;
      if (viaHint) {
        nextHints = hintsUsed + 1;
        setHintsUsed(nextHints);
        setHinted((h) => [...h, idx]);
        assistsUsed.current.add('hint');
        sfx.hint();
      } else {
        // an error = this placement completes a run that is broken
        let broke = false;
        for (const map of [runOf.a, runOf.d]) {
          const ri = map.get(idx);
          if (ri === undefined) continue;
          const st = runState(runs[ri], next);
          if (st.filled && !st.valid) broke = true;
        }
        if (broke) {
          nextErrors = errors + 1;
          setErrors(nextErrors);
          sfx.error();
        } else {
          sfx.place();
        }
      }
      checkWin(next, nextErrors, nextHints);
    },
    [values, errors, hintsUsed, runOf, runs, checkWin]
  );

  const placeDigit = useCallback(
    (d: number) => {
      if (paused || done.current || selected === null) return;
      if (blocks[selected] || isLocked(selected)) return;

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
      applyValue(selected, d, false);
    },
    [paused, selected, blocks, isLocked, notesMode, values, applyValue]
  );

  const erase = useCallback(() => {
    if (paused || done.current || selected === null) return;
    if (blocks[selected] || isLocked(selected)) return;
    if (values[selected] === 0 && notes[selected] === 0) return;
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
  }, [paused, selected, blocks, isLocked, values, notes]);

  const useHint = useCallback(() => {
    if (paused || done.current || !assists.hint) return;
    let target: number | null = null;
    if (selected !== null && !blocks[selected] && !isLocked(selected) && values[selected] !== solution[selected]) {
      target = selected;
    }
    if (target === null) {
      target = entryCells.find((c) => values[c] !== solution[c] && !isLocked(c)) ?? null;
    }
    if (target === null) return;
    setSelected(target);
    applyValue(target, solution[target], true);
  }, [paused, assists.hint, selected, blocks, isLocked, values, solution, entryCells, applyValue]);

  // physical keyboard support (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || done.current) return;
      if (e.key >= '1' && e.key <= '9') placeDigit(Number(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete') erase();
      else if (e.key.toLowerCase() === 'n') setNotesMode((m) => !m);
      else if (e.key.toLowerCase() === 'h') useHint();
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const cur = selected ?? entryCells[0];
        const dr = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        const dc = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        let r = Math.floor(cur / cols) + dr;
        let c = (cur % cols) + dc;
        // walk over blocks to the next entry cell in that direction
        while (r >= 0 && r < rows && c >= 0 && c < cols) {
          if (!blocks[r * cols + c]) {
            setSelected(r * cols + c);
            break;
          }
          r += dr;
          c += dc;
        }
        if (selected === null) setSelected(cur);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placeDigit, erase, useHint, paused, selected, entryCells, rows, cols, blocks]);

  useEffect(() => {
    registerSnapshot(() => ({
      puzzle,
      values,
      notes,
      hinted,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  /* --------------------------------------------------------- rendering */

  const selA = selected !== null ? runOf.a.get(selected) : undefined;
  const selD = selected !== null ? runOf.d.get(selected) : undefined;

  const peers = useMemo(() => {
    const set = new Set<number>();
    for (const ri of [selA, selD]) {
      if (ri === undefined) continue;
      for (const cell of runs[ri].cells) set.add(cell);
    }
    return set;
  }, [selA, selD, runs]);

  // run-check paint: bad wins over good; only completed runs speak
  const checkTone = useCallback(
    (idx: number): '' | 'good' | 'bad' => {
      if (!assists.runCheck) return '';
      let tone: '' | 'good' | 'bad' = '';
      for (const map of [runOf.a, runOf.d]) {
        const ri = map.get(idx);
        if (ri === undefined) continue;
        const st = states[ri];
        if (!st.filled) continue;
        if (!st.valid) return 'bad';
        tone = 'good';
      }
      return tone;
    },
    [assists.runCheck, runOf, states]
  );

  // candidates for the selected cell under the combos assist — a digit fits
  // only when it can still complete BOTH of the cell's runs
  const fits = useMemo(() => {
    if (!assists.combos || selected === null || blocks[selected]) return null;
    const per: number[][] = [];
    for (const ri of [selA, selD]) {
      if (ri === undefined) continue;
      const run = runs[ri];
      const others = run.cells.filter((c) => c !== selected).map((c) => values[c]).filter((v) => v !== 0);
      const combos = runCombinations(run.sum, run.cells.length, others);
      const set = new Set<number>();
      for (const combo of combos) for (const d of combo) set.add(d);
      for (const v of others) set.delete(v);
      per.push([...set]);
    }
    if (per.length === 0) return null;
    return DIGITS.filter((d) => per.every((s) => s.includes(d)));
  }, [assists.combos, selected, blocks, selA, selD, runs, values]);

  const cells = [];
  for (let i = 0; i < rows * cols; i++) {
    if (blocks[i]) {
      const ra = clueOf.a.get(i);
      const rd = clueOf.d.get(i);
      if (ra === undefined && rd === undefined) {
        cells.push(<div key={i} className="kak-cell kak-block" aria-hidden />);
        continue;
      }
      cells.push(
        <div key={i} className="kak-cell kak-block kak-cluecell">
          <svg className="kak-diag" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <line x1="0" y1="0" x2="100" y2="100" vectorEffect="non-scaling-stroke" />
          </svg>
          {ra !== undefined && (
            <span className={`kak-ca ${ra === selA ? 'hl' : ''}`}>
              {ra === selA ? `${states[ra].cur}/${runs[ra].sum}` : runs[ra].sum}
            </span>
          )}
          {rd !== undefined && (
            <span className={`kak-cd ${rd === selD ? 'hl' : ''}`}>
              {rd === selD ? `${states[rd].cur}/${runs[rd].sum}` : runs[rd].sum}
            </span>
          )}
        </div>
      );
      continue;
    }

    const v = values[i];
    const classes = ['kak-cell', 'kak-entry'];
    if (selected === i) classes.push('sel');
    else if (peers.has(i)) classes.push('peer');
    if (isLocked(i)) classes.push('hinted');
    const tone = v !== 0 ? checkTone(i) : '';
    if (tone) classes.push(tone);

    cells.push(
      <button
        key={i}
        className={classes.join(' ')}
        onClick={() => {
          sfx.tap();
          setSelected(i);
        }}
        aria-label={`Cell row ${Math.floor(i / cols)} column ${i % cols}`}
      >
        {v !== 0 ? (
          <span key={`v${v}`} className="kak-v">
            {v}
          </span>
        ) : notes[i] !== 0 ? (
          <span className="kak-notes">
            {DIGITS.map((d) => (
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
    <div className={`kakuro ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Filled <b>{filled} / {entryCells.length}</b>
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Errors: <b>{errors}</b>
        </span>
        {hintsUsed > 0 && (
          <span className="info-item">
            Hints: <b>{hintsUsed}</b>
          </span>
        )}
      </div>

      <div
        className="kak-board"
        role="grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, aspectRatio: `${cols} / ${rows}` }}
      >
        {cells}
      </div>

      <div className="game-tools fx-card">
        <div className="kak-controls">
          <PadTool active={notesMode} onClick={() => setNotesMode((m) => !m)}>
            <PencilIcon />
            <span>Notes</span>
          </PadTool>
          <PadTool silent onClick={erase}>
            <EraseIcon />
            <span>Erase</span>
          </PadTool>
          <PadTool active={assists.runCheck} onClick={() => onToggleAssist('runCheck', !assists.runCheck)}>
            <CheckIcon />
            <span>Check</span>
          </PadTool>
          <PadTool active={assists.combos} onClick={() => onToggleAssist('combos', !assists.combos)}>
            <SameIcon />
            <span>Combos</span>
          </PadTool>
          {assists.hint && (
            <PadTool silent onClick={useHint}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
        </div>

        {assists.combos && (
          <div className="kak-combos">
            {selected !== null && !blocks[selected] && (selA !== undefined || selD !== undefined) ? (
              <>
                {selA !== undefined && (
                  <span className="kak-combo-run">
                    <b>→ {runs[selA].sum} in {runs[selA].cells.length}</b> {combosLabel(runs[selA], values)}
                  </span>
                )}
                {selD !== undefined && (
                  <span className="kak-combo-run">
                    <b>↓ {runs[selD].sum} in {runs[selD].cells.length}</b> {combosLabel(runs[selD], values)}
                  </span>
                )}
                <span className="kak-combo-fits">
                  {fits && fits.length > 0 ? `fits ${fits.join(' ')}` : 'nothing fits'}
                </span>
              </>
            ) : (
              <span className="kak-combo-idle">Select a cell to see its sum combinations</span>
            )}
          </div>
        )}

        <div className="kak-controls kak-nums">
          {DIGITS.map((d) => (
            <PadTool key={d} silent className="kak-num" onClick={() => placeDigit(d)} aria-label={`Place ${d}`}>
              {d}
            </PadTool>
          ))}
        </div>
      </div>
    </div>
  );
}
