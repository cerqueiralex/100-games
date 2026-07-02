import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, EraseIcon } from '../../platform/design/icons';
import { pickPhrase, type CryptoPhrase } from './logic/phrases';

const LETTER_PTS: Record<Difficulty, number> = { easy: 25, medium: 35, hard: 50 };
const PAR_SEC: Record<Difficulty, number> = { easy: 4 * 60, medium: 7 * 60, hard: 10 * 60 };
const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
const ERROR_PENALTY = 10;
const HINT_PENALTY = 25;
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

/** Random substitution cipher with no letter mapping to itself. */
function makeCipher(): Record<string, string> {
  let shuffled: string[];
  do {
    shuffled = [...ALPHA].sort(() => Math.random() - 0.5);
  } while (shuffled.some((c, i) => c === ALPHA[i]));
  return Object.fromEntries(ALPHA.map((p, i) => [p, shuffled[i]]));
}

interface CryptoSave {
  phrase: CryptoPhrase;
  cipher: Record<string, string>;
  guesses: Record<string, string>;
  locked: string[];
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
  const saved = savedState as CryptoSave | undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const phrase = useMemo(() => saved?.phrase ?? pickPhrase(difficulty), [difficulty]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cipher = useMemo(() => saved?.cipher ?? makeCipher(), [phrase]);
  const inverse = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [p, c] of Object.entries(cipher)) m[c] = p;
    return m;
  }, [cipher]);
  const cipherText = useMemo(
    () => phrase.text.split('').map((ch) => (/[A-Z]/.test(ch) ? cipher[ch] : ch)).join(''),
    [phrase, cipher]
  );
  const usedLetters = useMemo(() => {
    const seen: string[] = [];
    for (const ch of cipherText) if (/[A-Z]/.test(ch) && !seen.includes(ch)) seen.push(ch);
    return seen;
  }, [cipherText]);
  const freq = useMemo(() => {
    const f = new Map<string, number>();
    for (const ch of cipherText) if (/[A-Z]/.test(ch)) f.set(ch, (f.get(ch) ?? 0) + 1);
    return f;
  }, [cipherText]);

  const [guesses, setGuesses] = useState<Record<string, string>>(() =>
    saved ? { ...saved.guesses } : {}
  );
  const [locked, setLocked] = useState<Set<string>>(() => new Set(saved?.locked ?? []));
  const [selected, setSelected] = useState<string | null>(usedLetters[0] ?? null);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [toast, setToast] = useState<string | null>(null);

  const done = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...(assists.autoCheck ? ['autoCheck'] : []),
      ...(assists.frequency ? ['frequency'] : [])
    ])
  );
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  const correctCount = useMemo(
    () => usedLetters.filter((c) => guesses[c] === inverse[c]).length,
    [usedLetters, guesses, inverse]
  );
  const liveScore = Math.max(
    0,
    correctCount * LETTER_PTS[difficulty] - errors * ERROR_PENALTY - hintsUsed * HINT_PENALTY
  );

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { phrase: phrase.id, lettersSolved: `${correctCount}/${usedLetters.length}` }
    });
  }, [liveScore, errors, hintsUsed, correctCount, usedLetters.length, phrase.id, events]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const finish = useCallback(
    (e: number, h: number) => {
      if (done.current) return;
      done.current = true;
      const bonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * MULT[difficulty];
      const score = Math.max(
        0,
        usedLetters.length * LETTER_PTS[difficulty] - e * ERROR_PENALTY - h * HINT_PENALTY + bonus
      );
      events.onFinish({
        outcome: 'won',
        score,
        errors: e,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { phrase: phrase.id, letters: usedLetters.length }
      });
    },
    [difficulty, usedLetters.length, phrase.id, events]
  );

  const advance = (g: Record<string, string>, from: string | null) => {
    const start = from ? usedLetters.indexOf(from) : -1;
    for (let k = 1; k <= usedLetters.length; k++) {
      const c = usedLetters[(start + k) % usedLetters.length];
      if (!g[c]) {
        setSelected(c);
        return;
      }
    }
  };

  const assign = useCallback(
    (letter: string) => {
      if (paused || done.current || !selected || locked.has(selected)) return;
      const wasEmpty = !guesses[selected];
      const g = { ...guesses, [selected]: letter };
      setGuesses(g);

      const allCorrect = usedLetters.every((c) => g[c] === inverse[c]);
      const wrong = inverse[selected] !== letter;

      if (assists.autoCheck && wrong) {
        setErrors((e) => e + 1);
        sfx.error();
      } else {
        sfx.tap();
      }

      if (allCorrect) {
        finish(errors + (assists.autoCheck && wrong ? 1 : 0), hintsUsed);
        return;
      }
      if (!assists.autoCheck && wasEmpty && usedLetters.every((c) => g[c])) {
        setErrors((e) => e + 1);
        sfx.error();
        showToast("Everything is assigned, but something's off…");
      }
      advance(g, selected);
    },
    [paused, selected, locked, guesses, usedLetters, inverse, assists.autoCheck, errors, hintsUsed, finish]
  );

  const erase = useCallback(() => {
    if (paused || done.current || !selected || locked.has(selected)) return;
    sfx.tap();
    setGuesses((g) => {
      const n = { ...g };
      delete n[selected];
      return n;
    });
  }, [paused, selected, locked]);

  const reveal = useCallback(() => {
    if (paused || done.current || !assists.reveal || !selected || locked.has(selected)) return;
    assistsUsed.current.add('reveal');
    const h = hintsUsed + 1;
    setHintsUsed(h);
    const g = { ...guesses, [selected]: inverse[selected] };
    setGuesses(g);
    setLocked((l) => new Set(l).add(selected));
    sfx.hint();
    if (usedLetters.every((c) => g[c] === inverse[c])) finish(errors, h);
    else advance(g, selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, assists.reveal, selected, locked, guesses, inverse, usedLetters, errors, hintsUsed, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || done.current) return;
      if (/^[a-zA-Z]$/.test(e.key)) assign(e.key.toUpperCase());
      else if (e.key === 'Backspace' || e.key === 'Delete') erase();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [assign, erase, paused]);

  useEffect(() => {
    registerSnapshot(() => ({
      phrase,
      cipher,
      guesses,
      locked: [...locked],
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  const usedPlain = useMemo(() => new Set(Object.values(guesses)), [guesses]);
  const words = useMemo(() => cipherText.split(' '), [cipherText]);

  return (
    <div className={`cryptogram ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{liveScore.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Letters: <b>{Object.keys(guesses).length} / {usedLetters.length}</b>
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Errors: <b>{errors}</b>
        </span>
      </div>

      <div className="cg-board">
        {words.map((word, wi) => (
          <span key={wi} className="cg-word">
            {word.split('').map((ch, k) => {
              const guess = guesses[ch] ?? '';
              const isWrong = assists.autoCheck && guess !== '' && guess !== inverse[ch];
              return (
                <button
                  key={k}
                  className={[
                    'cg-cell',
                    selected === ch ? 'sel' : '',
                    locked.has(ch) ? 'locked' : '',
                    isWrong ? 'wrong' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    sfx.tap();
                    setSelected(ch);
                  }}
                >
                  <span className="cg-guess">{guess}</span>
                  <span className="cg-cipher">{ch}</span>
                </button>
              );
            })}
          </span>
        ))}
      </div>

      {assists.frequency && (
        <div className="cg-freq">
          {[...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([c, n]) => (
              <span key={c} className={`chip ${selected === c ? 'accent' : ''}`}>
                {c}·{n}
              </span>
            ))}
        </div>
      )}

      {toast && <div className="cw-toast">{toast}</div>}

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          <button className="pad-tool" onClick={erase}>
            <EraseIcon />
            <span>Erase</span>
          </button>
          {assists.reveal && (
            <button className="pad-tool" onClick={reveal}>
              <BulbIcon />
              <span>Reveal letter</span>
            </button>
          )}
        </div>
        <div className="cw-keyboard">
          {KEY_ROWS.map((row, ri) => (
            <div key={ri} className="cw-krow">
              {row.split('').map((k) => (
                <button
                  key={k}
                  className={`cw-key ${usedPlain.has(k) ? 'dim' : ''}`}
                  onClick={() => assign(k)}
                >
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
