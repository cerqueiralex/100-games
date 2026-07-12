import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, CheckIcon, CipherGlyph, EraseIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { generateCryptoPuzzle, type CryptoPuzzle } from './logic/words';

const ROW_PTS: Record<Difficulty, number> = { easy: 60, medium: 80, hard: 100, pro: 120, extreme: 140 };
const PAR_SEC: Record<Difficulty, number> = { easy: 6 * 60, medium: 9 * 60, hard: 12 * 60, pro: 15 * 60, extreme: 18 * 60 };
const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const ERROR_PENALTY = 15;
const HINT_PENALTY = 30;
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

type RowStatus = 'open' | 'good' | 'bad';

interface CryptoSave {
  puzzle: CryptoPuzzle;
  entries: string[][];
  status: RowStatus[];
  hinted: string[]; // "row:index" cells revealed by hints (locked)
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
}

export function CryptogramGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  // Ignore saves from the old phrase-cipher version of this game.
  const saved =
    savedState && Array.isArray((savedState as CryptoSave).puzzle?.rows)
      ? (savedState as CryptoSave)
      : undefined;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const puzzle = useMemo(() => saved?.puzzle ?? generateCryptoPuzzle(difficulty), [difficulty]);

  const [entries, setEntries] = useState<string[][]>(() =>
    saved ? saved.entries.map((r) => [...r]) : puzzle.rows.map((r) => r.word.split('').map(() => ''))
  );
  const [status, setStatus] = useState<RowStatus[]>(() =>
    saved ? [...saved.status] : puzzle.rows.map(() => 'open')
  );
  const [hinted, setHinted] = useState<Set<string>>(() => new Set(saved?.hinted ?? []));
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [won, setWon] = useState(false);
  const [sel, setSel] = useState<{ r: number; i: number } | null>(() => {
    const r = (saved ? saved.status : []).findIndex((s) => s !== 'good');
    return { r: r === -1 ? 0 : r, i: 0 };
  });

  const done = useRef(false);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  // Passive assist: counts as help whenever it is on, including mid-game.
  useEffect(() => {
    if (assists.echo) assistsUsed.current.add('echo');
  }, [assists.echo]);

  const solvedRows = useMemo(() => status.filter((s) => s === 'good').length, [status]);
  const liveScore = Math.max(
    0,
    solvedRows * ROW_PTS[difficulty] - errors * ERROR_PENALTY - hintsUsed * HINT_PENALTY
  );

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { wordsSolved: `${solvedRows}/${puzzle.rows.length}` }
    });
  }, [liveScore, errors, hintsUsed, solvedRows, puzzle.rows.length, events]);

  useEffect(() => {
    registerSnapshot(() => ({
      puzzle,
      entries,
      status,
      hinted: [...hinted],
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  const glyphAt = useCallback(
    (r: number, i: number) => puzzle.glyphOf[puzzle.rows[r].word[i]],
    [puzzle]
  );

  const finish = useCallback(
    (e: number, h: number) => {
      if (done.current) return;
      done.current = true;
      setWon(true);
      const bonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * MULT[difficulty];
      events.onFinish({
        outcome: 'won',
        score: Math.max(
          0,
          puzzle.rows.length * ROW_PTS[difficulty] - e * ERROR_PENALTY - h * HINT_PENALTY + bonus
        ),
        errors: e,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { words: puzzle.rows.length, hidden: puzzle.answer }
      });
    },
    [difficulty, puzzle, events]
  );

  /** First open cell of the next unsolved row (wrapping), or null. */
  const nextSpot = useCallback(
    (fromRow: number, st: RowStatus[], ent: string[][]) => {
      const n = puzzle.rows.length;
      for (let k = 0; k < n; k++) {
        const r = (fromRow + 1 + k) % n;
        if (st[r] === 'good') continue;
        const i = ent[r].findIndex((v, idx) => v === '' && !hinted.has(`${r}:${idx}`));
        return { r, i: i === -1 ? 0 : i };
      }
      return null;
    },
    [puzzle.rows.length, hinted]
  );

  const setLetter = useCallback(
    (letter: string) => {
      if (paused || done.current || !sel) return;
      const { r, i } = sel;
      if (status[r] === 'good' || hinted.has(`${r}:${i}`)) return;

      const ent = entries.map((row) => [...row]);
      const st = [...status];
      ent[r][i] = letter;
      if (st[r] === 'bad') st[r] = 'open';

      if (assists.echo) {
        const g = glyphAt(r, i);
        for (let r2 = 0; r2 < puzzle.rows.length; r2++) {
          if (st[r2] === 'good') continue;
          for (let i2 = 0; i2 < ent[r2].length; i2++) {
            if (glyphAt(r2, i2) === g && ent[r2][i2] === '' && !hinted.has(`${r2}:${i2}`)) {
              ent[r2][i2] = letter;
            }
          }
        }
      }

      setEntries(ent);
      setStatus(st);
      sfx.place();

      // Advance to the next open cell in this row.
      for (let k = i + 1; k < ent[r].length; k++) {
        if (ent[r][k] === '' && !hinted.has(`${r}:${k}`)) {
          setSel({ r, i: k });
          return;
        }
      }
    },
    [paused, sel, status, entries, assists.echo, glyphAt, puzzle.rows.length, hinted]
  );

  const erase = useCallback(() => {
    if (paused || done.current || !sel) return;
    const { r, i } = sel;
    if (status[r] === 'good') return;
    sfx.tap();
    if (entries[r][i] !== '' && !hinted.has(`${r}:${i}`)) {
      const ent = entries.map((row) => [...row]);
      ent[r][i] = '';
      setEntries(ent);
      if (status[r] === 'bad') {
        const st = [...status];
        st[r] = 'open';
        setStatus(st);
      }
    } else if (i > 0) {
      setSel({ r, i: i - 1 });
    }
  }, [paused, sel, status, entries, hinted]);

  const rowFull = sel !== null && entries[sel.r].every((v) => v !== '');
  const canCheck = !done.current && sel !== null && status[sel.r] !== 'good' && rowFull;

  const checkRow = useCallback(() => {
    if (paused || done.current || !sel || !canCheck) return;
    const r = sel.r;
    const st = [...status];
    if (entries[r].join('') === puzzle.rows[r].word) {
      st[r] = 'good';
      setStatus(st);
      if (st.every((s) => s === 'good')) {
        finish(errors, hintsUsed); // the shell plays the win jingle
        return;
      }
      sfx.pop();
      const spot = nextSpot(r, st, entries);
      if (spot) setSel(spot);
    } else {
      st[r] = 'bad';
      setStatus(st);
      setErrors((e) => e + 1);
      sfx.error();
    }
  }, [paused, sel, canCheck, status, entries, puzzle.rows, errors, hintsUsed, finish, nextSpot]);

  const hint = useCallback(() => {
    if (paused || done.current || !assists.reveal || !sel) return;
    const { r, i } = sel;
    if (status[r] === 'good' || hinted.has(`${r}:${i}`)) return;
    assistsUsed.current.add('reveal');
    setHintsUsed((h) => h + 1);
    const ent = entries.map((row) => [...row]);
    ent[r][i] = puzzle.rows[r].word[i];
    setEntries(ent);
    setHinted((s) => new Set(s).add(`${r}:${i}`));
    if (status[r] === 'bad') {
      const st = [...status];
      st[r] = 'open';
      setStatus(st);
    }
    sfx.hint();
    // next open cell in this row, wrapping, so the selection never strands
    // on the just-locked tile while earlier cells are still empty
    for (let k = 1; k < ent[r].length; k++) {
      const idx = (i + k) % ent[r].length;
      if (ent[r][idx] === '' && !hinted.has(`${r}:${idx}`)) {
        setSel({ r, i: idx });
        return;
      }
    }
  }, [paused, assists.reveal, sel, status, entries, puzzle.rows, hinted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || done.current) return;
      if (/^[a-zA-Z]$/.test(e.key)) setLetter(e.key.toUpperCase());
      else if (e.key === 'Backspace' || e.key === 'Delete') erase();
      else if (e.key === 'Enter') checkRow();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setLetter, erase, checkRow, paused]);

  const selGlyph = sel && status[sel.r] !== 'good' ? glyphAt(sel.r, sel.i) : null;

  return (
    <div className={`cryptogram ${paused ? 'board-hidden' : ''} ${won ? 'won' : ''}`}>
      <div className="cg-mystery fx-card">
        <b>Hidden word</b>
        <span>{puzzle.clue}</span>
      </div>

      <div className="sudoku-info">
        <span className="info-item">
          <b>{liveScore.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Words: <b>{solvedRows} / {puzzle.rows.length}</b>
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Errors: <b>{errors}</b>
        </span>
        <span className="info-item">
          Hints: <b>{hintsUsed}</b>
        </span>
      </div>

      <div className="cg-table">
        {puzzle.rows.map((row, r) => (
          <div
            key={r}
            className={`cg-row ${status[r] === 'good' ? 'good' : ''} ${status[r] === 'bad' ? 'bad' : ''} ${
              puzzle.groupBreak === r ? 'break' : ''
            }`}
          >
            <button
              className="cg-rowclue"
              onClick={() => {
                if (status[r] === 'good' || done.current) return;
                sfx.tap();
                const i = entries[r].findIndex((v, idx) => v === '' && !hinted.has(`${r}:${idx}`));
                setSel({ r, i: i === -1 ? 0 : i });
              }}
            >
              {row.clue}
            </button>
            <div
              className="cg-tiles"
              style={{ '--cg-off': puzzle.col - row.hiddenIndex } as React.CSSProperties}
            >
              {row.word.split('').map((_, i) => {
                const g = glyphAt(r, i);
                const isSel = sel?.r === r && sel?.i === i && status[r] !== 'good';
                return (
                  <button
                    key={i}
                    disabled={status[r] === 'good' || done.current}
                    className={[
                      'cg-tile',
                      i === row.hiddenIndex ? 'hiddencol' : '',
                      isSel ? 'sel' : '',
                      !isSel && selGlyph !== null && g === selGlyph ? 'same' : '',
                      hinted.has(`${r}:${i}`) ? 'hint' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={
                      {
                        '--pop-d': `${i * 45}ms`,
                        '--rev-d': `${r * 70}ms`
                      } as React.CSSProperties
                    }
                    onClick={() => {
                      sfx.tap();
                      setSel({ r, i });
                    }}
                  >
                    <span className="cg-letter">{entries[r][i]}</span>
                    <span className="cg-glyph">
                      <CipherGlyph glyph={g} size={13} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          <PadTool silent disabled={!canCheck} onClick={checkRow}>
            <CheckIcon />
            <span>Check</span>
          </PadTool>
          {assists.reveal && (
            <PadTool silent onClick={hint}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
          <PadTool silent onClick={erase}>
            <EraseIcon />
            <span>Erase</span>
          </PadTool>
        </div>
        <div className="cw-keyboard">
          {KEY_ROWS.map((keys, ri) => (
            <div key={ri} className="cw-krow">
              {keys.split('').map((k) => (
                <button key={k} className="cw-key" onClick={() => setLetter(k)}>
                  {k}
                </button>
              ))}
              {ri === 2 && (
                <button className="cw-key cw-key-wide" onClick={erase} aria-label="Erase">
                  ⌫
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
