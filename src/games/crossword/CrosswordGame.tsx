import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, CheckIcon } from '../../platform/design/icons';
import { buildPuzzle, type Dir, type Slot } from './logic/engine';
import { pickPuzzle } from './logic/puzzles';

const LETTER_POINTS: Record<Difficulty, number> = { easy: 15, medium: 20, hard: 30 };
const ERROR_PENALTY = 10;
const HINT_PENALTY = 25;
const PAR_SEC: Record<Difficulty, number> = { easy: 6 * 60, medium: 12 * 60, hard: 20 * 60 };
const BONUS_PER_SEC: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export function CrosswordGame({ difficulty, assists, paused, elapsedSec, events }: GameProps) {
  const built = useMemo(() => buildPuzzle(pickPuzzle(difficulty)), [difficulty]);
  const size = built.rows * built.cols;

  const [letters, setLetters] = useState<string[]>(() => new Array(size).fill(''));
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const [wrong, setWrong] = useState<Set<number>>(() => new Set());
  const [sel, setSel] = useState<number>(() => built.slots[0].cells[0]);
  const [dir, setDir] = useState<Dir>('across');
  const [errors, setErrors] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const assistsUsed = useRef<Set<string>>(new Set(assists.autoCheck ? ['autoCheck'] : []));
  const done = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const currentSlot: Slot = useMemo(() => {
    const keys = built.slotAt[sel] ?? {};
    const key = keys[dir] ?? keys[dir === 'across' ? 'down' : 'across'];
    return built.slots.find((s) => s.key === key) ?? built.slots[0];
  }, [built, sel, dir]);

  const computeScore = useCallback(
    (ls: string[], rev: Set<number>, errs: number, hints: number, withBonus: boolean) => {
      let pts = 0;
      for (const cell of built.grid) {
        if (cell && ls[cell.idx] === cell.letter && !rev.has(cell.idx)) {
          pts += LETTER_POINTS[difficulty];
        }
      }
      pts -= errs * ERROR_PENALTY + hints * HINT_PENALTY;
      if (withBonus) {
        pts += Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * BONUS_PER_SEC[difficulty];
      }
      return Math.max(0, pts);
    },
    [built, difficulty]
  );

  const report = useCallback(
    (ls: string[], rev: Set<number>, errs: number, hints: number) => {
      events.onStats({
        score: computeScore(ls, rev, errs, hints, false),
        errors: errs,
        hintsUsed: hints,
        assistsUsed: [...assistsUsed.current],
        extra: { puzzle: built.title }
      });
    },
    [events, computeScore, built.title]
  );

  const maybeFinish = useCallback(
    (ls: string[], rev: Set<number>, errs: number, hints: number) => {
      if (done.current) return;
      const full = built.grid.every((c) => c === null || ls[c.idx] !== '');
      if (!full) return;
      const correct = built.grid.every((c) => c === null || ls[c.idx] === c.letter);
      if (correct) {
        done.current = true;
        events.onFinish({
          outcome: 'won',
          score: computeScore(ls, rev, errs, hints, true),
          errors: errs,
          hintsUsed: hints,
          assistsUsed: [...assistsUsed.current],
          extra: { puzzle: built.title }
        });
      } else {
        const nextErrs = errs + 1;
        setErrors(nextErrs);
        report(ls, rev, nextErrs, hints);
        sfx.error();
        showToast("The grid is full, but something's not right…");
      }
    },
    [built, events, computeScore, report]
  );

  const advance = useCallback(
    (from: number, slot: Slot, ls: string[]) => {
      const pos = slot.cells.indexOf(from);
      for (let k = pos + 1; k < slot.cells.length; k++) {
        const ci = slot.cells[k];
        if (!assists.skipFilled || ls[ci] === '') {
          setSel(ci);
          return;
        }
      }
      // end of word: jump to next slot with an empty cell
      const idx = built.slots.findIndex((s) => s.key === slot.key);
      for (let off = 1; off <= built.slots.length; off++) {
        const s = built.slots[(idx + off) % built.slots.length];
        const target = s.cells.find((ci) => ls[ci] === '');
        if (target !== undefined) {
          setDir(s.dir);
          setSel(target);
          return;
        }
      }
    },
    [assists.skipFilled, built.slots]
  );

  const typeLetter = useCallback(
    (ch: string) => {
      if (paused || done.current || revealed.has(sel)) return;
      const cell = built.grid[sel];
      if (!cell) return;
      const ls = [...letters];
      ls[sel] = ch;
      setLetters(ls);
      const w = new Set(wrong);
      w.delete(sel);
      let errs = errors;
      if (assists.autoCheck && ch !== cell.letter) {
        w.add(sel);
        errs = errors + 1;
        setErrors(errs);
        sfx.error();
      } else {
        sfx.tap();
      }
      setWrong(w);
      report(ls, revealed, errs, hintsUsed);
      maybeFinish(ls, revealed, errs, hintsUsed);
      advance(sel, currentSlot, ls);
    },
    [paused, revealed, sel, built.grid, letters, wrong, errors, assists.autoCheck, report, hintsUsed, maybeFinish, advance, currentSlot]
  );

  const backspace = useCallback(() => {
    if (paused || done.current) return;
    const ls = [...letters];
    if (ls[sel] !== '' && !revealed.has(sel)) {
      ls[sel] = '';
      setLetters(ls);
      setWrong((w) => {
        const nw = new Set(w);
        nw.delete(sel);
        return nw;
      });
    } else {
      const pos = currentSlot.cells.indexOf(sel);
      if (pos > 0) {
        const prev = currentSlot.cells[pos - 1];
        setSel(prev);
        if (!revealed.has(prev)) {
          ls[prev] = '';
          setLetters(ls);
          setWrong((w) => {
            const nw = new Set(w);
            nw.delete(prev);
            return nw;
          });
        }
      }
    }
    sfx.tap();
  }, [paused, letters, sel, revealed, currentSlot]);

  const revealCell = useCallback(
    (targets: number[], assistId: string) => {
      if (paused || done.current) return;
      const ls = [...letters];
      const rev = new Set(revealed);
      let changed = false;
      for (const ci of targets) {
        const cell = built.grid[ci];
        if (!cell || rev.has(ci)) continue;
        if (ls[ci] === cell.letter) continue;
        ls[ci] = cell.letter;
        rev.add(ci);
        changed = true;
      }
      if (!changed) return;
      assistsUsed.current.add(assistId);
      const hints = hintsUsed + 1;
      setHintsUsed(hints);
      setLetters(ls);
      setRevealed(rev);
      setWrong((w) => {
        const nw = new Set(w);
        targets.forEach((t) => nw.delete(t));
        return nw;
      });
      sfx.hint();
      report(ls, rev, errors, hints);
      maybeFinish(ls, rev, errors, hints);
    },
    [paused, letters, revealed, built.grid, hintsUsed, errors, report, maybeFinish]
  );

  const checkPuzzle = useCallback(() => {
    if (paused || done.current) return;
    assistsUsed.current.add('checkPuzzle');
    const w = new Set(wrong);
    let newlyWrong = 0;
    for (const cell of built.grid) {
      if (!cell) continue;
      const ci = cell.idx;
      if (letters[ci] !== '' && letters[ci] !== cell.letter && !w.has(ci)) {
        w.add(ci);
        newlyWrong++;
      }
    }
    setWrong(w);
    const errs = errors + newlyWrong;
    if (newlyWrong > 0) {
      setErrors(errs);
      sfx.error();
      showToast(`${newlyWrong} wrong letter${newlyWrong > 1 ? 's' : ''} found`);
    } else {
      sfx.place();
      showToast('No mistakes so far');
    }
    report(letters, revealed, errs, hintsUsed);
  }, [paused, wrong, built.grid, letters, errors, revealed, hintsUsed, report]);

  const cycleSlot = useCallback(
    (step: number) => {
      const idx = built.slots.findIndex((s) => s.key === currentSlot.key);
      const next = built.slots[(idx + step + built.slots.length) % built.slots.length];
      setDir(next.dir);
      setSel(next.cells[0]);
      sfx.tap();
    },
    [built.slots, currentSlot]
  );

  const tapCell = (idx: number) => {
    if (built.grid[idx] === null) return;
    sfx.tap();
    if (idx === sel) {
      // toggle direction if the cell belongs to both a row and a column word
      const keys = built.slotAt[idx] ?? {};
      const other: Dir = dir === 'across' ? 'down' : 'across';
      if (keys[other]) setDir(other);
    } else {
      setSel(idx);
      const keys = built.slotAt[idx] ?? {};
      if (!keys[dir] && keys[dir === 'across' ? 'down' : 'across']) {
        setDir(dir === 'across' ? 'down' : 'across');
      }
    }
  };

  // physical keyboard support (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || done.current) return;
      if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key.toUpperCase());
      else if (e.key === 'Backspace' || e.key === 'Delete') backspace();
      else if (e.key === ' ') {
        e.preventDefault();
        tapCell(sel);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        cycleSlot(e.shiftKey ? -1 : 1);
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const cell = built.grid[sel];
        if (!cell) return;
        const dr = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        const dc = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        let r = cell.row + dr;
        let c = cell.col + dc;
        while (r >= 0 && r < built.rows && c >= 0 && c < built.cols) {
          if (built.grid[r * built.cols + c]) {
            setSel(r * built.cols + c);
            break;
          }
          r += dr;
          c += dc;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeLetter, backspace, cycleSlot, paused, sel, built]);

  const wordCells = useMemo(() => new Set(currentSlot.cells), [currentSlot]);

  return (
    <div className={`crossword ${paused ? 'board-hidden' : ''}`}>
      <div className="cw-meta">
        <span className="cw-title">“{built.title}”</span>
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
        className="cw-board"
        style={{ gridTemplateColumns: `repeat(${built.cols}, 1fr)`, maxWidth: `${built.cols * 44}px` }}
      >
        {built.grid.map((cell, i) =>
          cell === null ? (
            <div key={i} className="cw-block" />
          ) : (
            <button
              key={i}
              className={[
                'cw-cell',
                sel === i ? 'sel' : wordCells.has(i) ? 'word' : '',
                wrong.has(i) ? 'wrong' : '',
                revealed.has(i) ? 'revealed' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => tapCell(i)}
            >
              {cell.number !== null && <span className="cw-num">{cell.number}</span>}
              <span className="cw-letter">{letters[i]}</span>
            </button>
          )
        )}
      </div>

      {toast && <div className="cw-toast">{toast}</div>}

      <div className="cw-cluebar">
        <button className="cw-arrow" onClick={() => cycleSlot(-1)} aria-label="Previous clue">
          ‹
        </button>
        <div className="cw-clue" onClick={() => tapCell(sel)}>
          <b>
            {currentSlot.number} {currentSlot.dir === 'across' ? 'Across' : 'Down'}
          </b>
          <span>{currentSlot.clue}</span>
        </div>
        <button className="cw-arrow" onClick={() => cycleSlot(1)} aria-label="Next clue">
          ›
        </button>
      </div>

      {(assists.checkPuzzle || assists.reveal) && (
        <div className="cw-tools">
          {assists.checkPuzzle && (
            <button className="pad-tool" onClick={checkPuzzle}>
              <CheckIcon />
              <span>Check</span>
            </button>
          )}
          {assists.reveal && (
            <>
              <button className="pad-tool" onClick={() => revealCell([sel], 'reveal')}>
                <BulbIcon />
                <span>Letter</span>
              </button>
              <button className="pad-tool" onClick={() => revealCell(currentSlot.cells, 'reveal')}>
                <BulbIcon />
                <span>Word</span>
              </button>
            </>
          )}
        </div>
      )}

      <div className="cw-keyboard">
        {KEY_ROWS.map((row, ri) => (
          <div key={ri} className="cw-krow">
            {row.split('').map((k) => (
              <button key={k} className="cw-key" onClick={() => typeLetter(k)}>
                {k}
              </button>
            ))}
            {ri === 2 && (
              <button className="cw-key cw-key-wide" onClick={backspace} aria-label="Backspace">
                ⌫
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
