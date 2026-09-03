import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, CheckIcon } from '../../platform/design/icons';
import { Keyboard, PadTool } from '../../platform/components/ui';
import { buildArrowPuzzle, type ArrowPuzzleDef, type ClueSlot, type Dir } from './logic/engine';
import { pickPuzzle } from './logic/puzzles';

const LETTER_POINTS: Record<Difficulty, number> = { easy: 15, medium: 20, hard: 30, pro: 40, extreme: 50 };
const ERROR_PENALTY = 10;
const HINT_PENALTY = 25;
const PAR_SEC: Record<Difficulty, number> = { easy: 5 * 60, medium: 9 * 60, hard: 15 * 60, pro: 22 * 60, extreme: 30 * 60 };
const BONUS_PER_SEC: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };

interface ArrowSave {
  def: ArrowPuzzleDef;
  letters: string[];
  revealed: number[];
  wrong: number[];
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
}

/** the arrowhead printed in a clue cell — a puzzle glyph, drawn in CSS */
const Tri = ({ dir }: { dir: Dir }) => <i className={`ac-tri ${dir}`} aria-hidden />;

export function ArrowCrosswordGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  // shape-guard: a save from an older build may lack the fields we index
  const saved =
    savedState &&
    Array.isArray((savedState as ArrowSave).letters) &&
    Array.isArray((savedState as ArrowSave).def?.entries)
      ? (savedState as ArrowSave)
      : undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const def = useMemo(() => saved?.def ?? pickPuzzle(difficulty), [difficulty]);
  const built = useMemo(() => buildArrowPuzzle(def), [def]);
  const size = built.rows * built.cols;

  const [letters, setLetters] = useState<string[]>(() =>
    saved && saved.letters.length === size ? [...saved.letters] : new Array(size).fill('')
  );
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set(saved?.revealed ?? []));
  const [wrong, setWrong] = useState<Set<number>>(() => new Set(saved?.wrong ?? []));
  const [sel, setSel] = useState<number>(() => built.slots[0].cells[0]);
  const [dir, setDir] = useState<Dir>(() => built.slots[0].dir);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [toast, setToast] = useState<string | null>(null);

  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists.autoCheck ? ['autoCheck'] : [])])
  );
  const done = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const other = (d: Dir): Dir => (d === 'right' ? 'down' : 'right');

  const currentSlot: ClueSlot = useMemo(() => {
    const keys = built.slotAt[sel] ?? {};
    const key = keys[dir] ?? keys[other(dir)];
    return built.slots.find((s) => s.key === key) ?? built.slots[0];
  }, [built, sel, dir]);

  const computeScore = useCallback(
    (ls: string[], rev: Set<number>, errs: number, hints: number, withBonus: boolean) => {
      let pts = 0;
      for (const cell of built.grid) {
        if (cell.kind === 'letter' && ls[cell.idx] === cell.letter && !rev.has(cell.idx)) {
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

  useEffect(() => {
    // a passive assist toggled on mid-game still counts as help for this game
    if (assists.autoCheck) assistsUsed.current.add('autoCheck');
    report(letters, revealed, errors, hintsUsed);
  }, [letters, revealed, errors, hintsUsed, assists.autoCheck, report]);

  const maybeFinish = useCallback(
    (ls: string[], rev: Set<number>, errs: number, hints: number) => {
      if (done.current) return;
      const full = built.grid.every((c) => c.kind !== 'letter' || ls[c.idx] !== '');
      if (!full) return;
      const correct = built.grid.every((c) => c.kind !== 'letter' || ls[c.idx] === c.letter);
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
        // feedback, never a penalty: errors are charged only at a Check (or
        // per keystroke under the opt-in Auto-check) — see CLAUDE.md
        showToast("Every cell is filled, but something's not right…");
      }
    },
    [built, events, computeScore]
  );

  const advance = useCallback(
    (from: number, slot: ClueSlot, ls: string[]) => {
      const pos = slot.cells.indexOf(from);
      for (let k = pos + 1; k < slot.cells.length; k++) {
        const ci = slot.cells[k];
        if (!assists.skipFilled || ls[ci] === '') {
          setSel(ci);
          return;
        }
      }
      // end of the answer: jump to the next answer with an empty cell
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
      if (cell.kind !== 'letter') return;
      const ls = [...letters];
      ls[sel] = ch;
      setLetters(ls);
      const w = new Set(wrong);
      w.delete(sel);
      // typing is never an error on its own — a mis-tap on the compact
      // keyboard is not a wrong answer; only the opt-in Auto-check charges
      // a keystroke, otherwise errors are counted by the Check button
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

  const revealCells = useCallback(
    (targets: number[], assistId: string) => {
      if (paused || done.current) return;
      const ls = [...letters];
      const rev = new Set(revealed);
      let changed = false;
      for (const ci of targets) {
        const cell = built.grid[ci];
        if (cell.kind !== 'letter' || rev.has(ci)) continue;
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
      if (cell.kind !== 'letter') continue;
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

  const selectSlot = useCallback((slot: ClueSlot) => {
    setDir(slot.dir);
    setSel(slot.cells[0]);
  }, []);

  const cycleSlot = useCallback(
    (step: number) => {
      const idx = built.slots.findIndex((s) => s.key === currentSlot.key);
      selectSlot(built.slots[(idx + step + built.slots.length) % built.slots.length]);
      sfx.tap();
    },
    [built.slots, currentSlot, selectSlot]
  );

  const tapCell = (idx: number) => {
    const cell = built.grid[idx];
    if (cell.kind === 'empty') return;
    sfx.tap();
    if (cell.kind === 'clue') {
      // tapping a clue jumps to its answer; a cell with two clues alternates
      const slots = [cell.right, cell.down].filter((s): s is ClueSlot => !!s);
      const at = slots.findIndex((s) => s.key === currentSlot.key);
      selectSlot(slots[(at + 1) % slots.length]);
      return;
    }
    const keys = built.slotAt[idx] ?? {};
    if (idx === sel) {
      // a second tap on a crossing switches between its two answers
      if (keys[other(dir)]) setDir(other(dir));
    } else {
      setSel(idx);
      if (!keys[dir] && keys[other(dir)]) setDir(other(dir));
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
        const dr = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        const dc = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        let r = cell.row + dr;
        let c = cell.col + dc;
        while (r >= 0 && r < built.rows && c >= 0 && c < built.cols) {
          if (built.grid[r * built.cols + c].kind === 'letter') {
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

  useEffect(() => {
    registerSnapshot(() => ({
      def,
      letters,
      revealed: [...revealed],
      wrong: [...wrong],
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  // the silhouette: a cell whose neighbour is empty (or off the grid) draws
  // the dark contour on that side, so the notched outline reads as one shape
  const edgeClass = (row: number, col: number) => {
    const empty = (r: number, c: number) =>
      r < 0 || r >= built.rows || c < 0 || c >= built.cols || built.grid[r * built.cols + c].kind === 'empty';
    return [empty(row - 1, col) && 'et', empty(row, col + 1) && 'er', empty(row + 1, col) && 'eb', empty(row, col - 1) && 'el']
      .filter(Boolean)
      .join(' ');
  };

  return (
    <div className={`arrowword ${paused ? 'board-hidden' : ''}`}>
      <div className="ac-meta">
        <span className="ac-title">“{built.title}”</span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Errors: <b>{errors}</b>
        </span>
        {hintsUsed > 0 && (
          <span className="info-item">
            Hints: <b>{hintsUsed}</b>
          </span>
        )}
      </div>

      <div className="ac-scroll">
        <div
          className="ac-board"
          style={{
            gridTemplateColumns: `repeat(${built.cols}, minmax(0, 1fr))`,
            aspectRatio: `${built.cols} / ${built.rows}`,
            ['--cols' as string]: built.cols
          }}
        >
          {built.grid.map((cell) => {
            if (cell.kind === 'empty') return <div key={cell.idx} className="ac-cell empty" />;
            if (cell.kind === 'clue') {
              const slots = [cell.right, cell.down].filter((s): s is ClueSlot => !!s);
              return (
                <button
                  key={cell.idx}
                  className={`ac-cell clue ${slots.length === 2 ? 'double' : ''} ${edgeClass(cell.row, cell.col)}`}
                  onClick={() => tapCell(cell.idx)}
                  aria-label={slots.map((s) => `${s.dir === 'right' ? 'Right' : 'Down'}: ${s.clue}`).join('. ')}
                >
                  {slots.map((s) => (
                    <span key={s.key} className={`ac-clue ${s.dir} ${s.key === currentSlot.key ? 'active' : ''}`}>
                      <span className="ac-clue-text">{s.clue}</span>
                      <Tri dir={s.dir} />
                    </span>
                  ))}
                </button>
              );
            }
            return (
              <button
                key={cell.idx}
                className={[
                  'ac-cell letter',
                  sel === cell.idx ? 'sel' : wordCells.has(cell.idx) ? 'word' : '',
                  wrong.has(cell.idx) ? 'wrong' : '',
                  revealed.has(cell.idx) ? 'revealed' : '',
                  edgeClass(cell.row, cell.col)
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => tapCell(cell.idx)}
              >
                <span className="ac-letter">{letters[cell.idx]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {toast && <div className="ac-toast">{toast}</div>}

      <div className="game-tools fx-card">
        {/* the active clue, magnified: the grid stays the only clue list,
            this just re-reads the small print of the arrow you are on */}
        <div className="ac-cluebar">
          <button className="ac-arrow-btn" onClick={() => cycleSlot(-1)} aria-label="Previous answer">
            ‹
          </button>
          <div className="ac-clue-readout" onClick={() => tapCell(sel)} role="button" tabIndex={-1}>
            <span className="ac-readout-dir">
              <Tri dir={currentSlot.dir} />
              <b>{currentSlot.answer.length}</b>
            </span>
            <span className="ac-readout-text">{currentSlot.clue}</span>
          </div>
          <button className="ac-arrow-btn" onClick={() => cycleSlot(1)} aria-label="Next answer">
            ›
          </button>
        </div>

        {(assists.checkPuzzle || assists.reveal) && (
          <div className="ac-tools">
            {assists.checkPuzzle && (
              <PadTool silent onClick={checkPuzzle}>
                <CheckIcon />
                <span>Check</span>
              </PadTool>
            )}
            {assists.reveal && (
              <>
                <PadTool silent onClick={() => revealCells([sel], 'reveal')}>
                  <BulbIcon />
                  <span>Letter</span>
                </PadTool>
                <PadTool silent onClick={() => revealCells(currentSlot.cells, 'reveal')}>
                  <BulbIcon />
                  <span>Word</span>
                </PadTool>
              </>
            )}
          </div>
        )}

        <Keyboard
          onKey={typeLetter}
          bottomRight={{ node: '⌫', ariaLabel: 'Backspace', onPress: backspace }}
        />
      </div>
    </div>
  );
}
