import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, EyeIcon } from '../../platform/design/icons';
import { Keyboard, PadTool } from '../../platform/components/ui';
import {
  CONFIG,
  computeScore,
  evaluateGuess,
  greenCount,
  isAllowedGuess,
  mergeKeyStates,
  pickSecret,
  starterWord,
  type KeyState,
  type Mark
} from './logic/engine';

const FLIP_STAGGER = 120; // ms between tiles flipping
const FLIP_DUR = 480; // ms for a single tile's flip

interface WordGuessSave {
  secret: string;
  guesses: string[];
  marks: Mark[][];
  current: string;
  keyStates: Record<string, KeyState>;
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
  starterUsed: boolean;
  revealUsed: boolean;
  revealPos: number | null;
  revealLetter: string;
}

export function WordGuessGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = CONFIG[difficulty];
  const saved =
    savedState && typeof (savedState as WordGuessSave).secret === 'string'
      ? (savedState as WordGuessSave)
      : undefined;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const secret = useMemo(() => saved?.secret ?? pickSecret(difficulty), [difficulty]);

  const [guesses, setGuesses] = useState<string[]>(() => saved?.guesses ?? []);
  const [marks, setMarks] = useState<Mark[][]>(() => saved?.marks ?? []);
  const [current, setCurrent] = useState(() => saved?.current ?? '');
  const [keyStates, setKeyStates] = useState<Record<string, KeyState>>(() => saved?.keyStates ?? {});
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [starterUsed, setStarterUsed] = useState(saved?.starterUsed ?? false);
  const [revealUsed, setRevealUsed] = useState(saved?.revealUsed ?? false);
  const [revealPos, setRevealPos] = useState<number | null>(saved?.revealPos ?? null);
  const [revealLetter, setRevealLetter] = useState(saved?.revealLetter ?? '');

  // transient UI state (never persisted; a resumed save is always mid-game)
  const [flipRow, setFlipRow] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [outcome, setOutcome] = useState<'won' | 'lost' | null>(null);

  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  const done = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const keyColorActive = assists['key-colors'] && !cfg.noKeyColor;

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const report = useCallback(
    (errs: number, hints: number) => {
      events.onStats({
        score: 0,
        errors: errs,
        hintsUsed: hints,
        assistsUsed: [...assistsUsed.current],
        extra: { word: `${cfg.len} letters`, guesses: guesses.length }
      });
    },
    [events, cfg.len, guesses.length]
  );

  // passive assist counts whenever it is effectively active (never on extreme)
  useEffect(() => {
    if (keyColorActive) assistsUsed.current.add('key-colors');
    report(errors, hintsUsed);
  }, [keyColorActive, errors, hintsUsed, report]);

  useEffect(() => {
    // derive keyboard knowledge from the record of guesses so a save taken
    // mid-flip (before setKeyStates fires) is still exact on resume
    let derivedKeys: Record<string, KeyState> = {};
    for (let i = 0; i < guesses.length; i++) derivedKeys = mergeKeyStates(derivedKeys, guesses[i], marks[i]);
    registerSnapshot(
      (): WordGuessSave => ({
        secret,
        guesses,
        marks,
        current,
        keyStates: derivedKeys,
        errors,
        hintsUsed,
        assistsUsed: [...assistsUsed.current],
        starterUsed,
        revealUsed,
        revealPos,
        revealLetter
      })
    );
  });

  const finish = useCallback(
    (won: boolean, usedGuesses: number, errs: number, hints: number) => {
      if (done.current) return;
      done.current = true;
      const score = computeScore({ difficulty, won, guessesUsed: usedGuesses, hintsUsed: hints });
      events.onFinish({
        outcome: won ? 'won' : 'lost',
        score,
        errors: errs,
        hintsUsed: hints,
        assistsUsed: [...assistsUsed.current],
        extra: {
          word: secret,
          guesses: won ? usedGuesses : 0,
          result: won ? `Solved in ${usedGuesses}` : 'Out of tries'
        }
      });
    },
    [difficulty, events, secret]
  );

  const submit = useCallback(() => {
    if (paused || done.current || flipRow !== null) return;
    const guess = current.toUpperCase();
    // invalid guess: shake + error, counts as an error
    if (guess.length !== cfg.len || !isAllowedGuess(guess, difficulty)) {
      setShake(true);
      sfx.error();
      const errs = errors + 1;
      setErrors(errs);
      const t = setTimeout(() => setShake(false), 420);
      timers.current.push(t);
      return;
    }

    const gMarks = evaluateGuess(guess, secret);
    const rowIndex = guesses.length;
    const won = gMarks.every((m) => m === 'correct');
    const greens = greenCount(gMarks);

    // error heuristic: a valid guess from the 4th row on that finds zero
    // greens is a wasted turn (documented in scoringNote)
    let errs = errors;
    if (!won && rowIndex >= 3 && greens === 0) errs = errors + 1;
    if (errs !== errors) setErrors(errs);

    const nextGuesses = [...guesses, guess];
    setGuesses(nextGuesses);
    setMarks((m) => [...m, gMarks]);
    setCurrent('');
    setFlipRow(rowIndex);

    // staggered per-tile sound during the flip
    for (let i = 0; i < gMarks.length; i++) {
      const t = setTimeout(() => {
        if (gMarks[i] === 'correct') sfx.pop();
        else sfx.tap();
      }, i * FLIP_STAGGER);
      timers.current.push(t);
    }

    const total = (gMarks.length - 1) * FLIP_STAGGER + FLIP_DUR;
    const doneRow = rowIndex + 1 >= cfg.tries;
    const after = setTimeout(() => {
      setFlipRow(null);
      // keyboard heat updates in sync with the reveal finishing
      setKeyStates((prev) => mergeKeyStates(prev, guess, gMarks));
      if (won) {
        setOutcome('won');
        finish(true, nextGuesses.length, errs, hintsUsed);
      } else if (doneRow) {
        setOutcome('lost');
        finish(false, nextGuesses.length, errs, hintsUsed);
      }
    }, total);
    timers.current.push(after);
  }, [paused, current, cfg.len, cfg.tries, difficulty, secret, guesses, errors, hintsUsed, flipRow, finish]);

  const typeLetter = useCallback(
    (ch: string) => {
      if (paused || done.current || flipRow !== null) return;
      if (current.length >= cfg.len) return;
      sfx.tap();
      setCurrent((c) => (c.length >= cfg.len ? c : c + ch));
    },
    [paused, current.length, cfg.len, flipRow]
  );

  const backspace = useCallback(() => {
    if (paused || done.current || flipRow !== null) return;
    setCurrent((c) => c.slice(0, -1));
  }, [paused, flipRow]);

  const useStarter = useCallback(() => {
    if (paused || done.current || guesses.length > 0 || starterUsed) return;
    const word = starterWord(difficulty);
    if (!word) return;
    setCurrent(word);
    setStarterUsed(true);
    assistsUsed.current.add('starter');
    setHintsUsed((h) => h + 1);
    sfx.hint();
  }, [paused, guesses.length, starterUsed, difficulty]);

  const useReveal = useCallback(() => {
    if (paused || done.current || revealUsed) return;
    // reveal a correct letter+position the player hasn't fixed yet
    const candidates: number[] = [];
    for (let i = 0; i < secret.length; i++) {
      const known = guesses.some((g) => g[i] === secret[i]);
      if (!known) candidates.push(i);
    }
    const pool = candidates.length > 0 ? candidates : secret.split('').map((_, i) => i);
    const pos = pool[Math.floor(Math.random() * pool.length)];
    setRevealPos(pos);
    setRevealLetter(secret[pos]);
    setRevealUsed(true);
    assistsUsed.current.add('reveal-one');
    setHintsUsed((h) => h + 1);
    sfx.hint();
  }, [paused, revealUsed, secret, guesses]);

  // physical keyboard support (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || done.current) return;
      if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key.toUpperCase());
      else if (e.key === 'Backspace' || e.key === 'Delete') backspace();
      else if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [typeLetter, backspace, submit, paused]);

  const activeRow = guesses.length;
  const showStarter = assists.starter && activeRow === 0 && !starterUsed && !done.current;
  const showReveal = assists['reveal-one'] && !revealUsed && !done.current;

  return (
    <div className={`word-guess ${paused ? 'board-hidden' : ''}`}>
      <div className="wg-meta">
        <span className="info-item">
          Guess {Math.min(activeRow + (outcome ? 0 : 1), cfg.tries)}/{cfg.tries}
        </span>
        {errors > 0 && (
          <span className="info-item bad">
            Slips: <b>{errors}</b>
          </span>
        )}
        {hintsUsed > 0 && (
          <span className="info-item">
            Hints: <b>{hintsUsed}</b>
          </span>
        )}
      </div>

      <div
        className="wg-board"
        style={{ ['--wg-cols' as string]: cfg.len }}
      >
        {Array.from({ length: cfg.tries }, (_, r) => {
          const isSubmitted = r < guesses.length;
          const isCurrent = r === activeRow && !done.current && !isSubmitted;
          const rowLetters = isSubmitted ? guesses[r] : isCurrent ? current : '';
          const rowMarks = isSubmitted ? marks[r] : null;
          const flipping = flipRow === r;
          const won = outcome === 'won' && r === guesses.length - 1;
          return (
            <div
              key={r}
              className={[
                'wg-row',
                isCurrent && shake ? 'shake' : '',
                won ? 'win' : ''
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {Array.from({ length: cfg.len }, (_, c) => {
                const ch = rowLetters[c] ?? '';
                const mark = rowMarks?.[c];
                const showGhost =
                  isCurrent && revealPos === c && current.length <= c && revealLetter;
                if (isSubmitted && mark) {
                  return (
                    <div
                      key={c}
                      className={`wg-tile evaluated ${flipping ? 'flipping' : ''}`}
                      style={flipping ? { animationDelay: `${c * FLIP_STAGGER}ms` } : undefined}
                    >
                      <div className="wg-tile-inner" style={{ animationDelay: `${c * FLIP_STAGGER}ms` }}>
                        <div className="wg-face wg-front">{ch}</div>
                        <div className={`wg-face wg-back ${mark}`}>{ch}</div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={c}
                    className={[
                      'wg-tile',
                      ch ? 'filled pop' : '',
                      showGhost ? 'ghost' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {showGhost ? revealLetter : ch}
                  </div>
                );
              })}
            </div>
          );
        })}
        {outcome === 'won' && (
          <div className="wg-confetti" aria-hidden>
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} className={`wg-dot d${i % 7}`} style={{ ['--i' as string]: i }} />
            ))}
          </div>
        )}
      </div>

      {outcome === 'lost' && (
        <div className="wg-answer fx-card">
          <span className="wg-answer-label">The word was</span>
          <span className="wg-answer-word">{secret}</span>
        </div>
      )}

      <div className="game-tools fx-card">
        {(showStarter || showReveal) && (
          <div className="wg-toolrow">
            {showStarter && (
              <PadTool silent onClick={useStarter}>
                <BulbIcon />
                <span>Starter</span>
              </PadTool>
            )}
            {showReveal && (
              <PadTool silent onClick={useReveal}>
                <EyeIcon />
                <span>Reveal</span>
              </PadTool>
            )}
          </div>
        )}

        <Keyboard
          onKey={typeLetter}
          keyClass={(k) => (keyColorActive ? (keyStates[k] ?? '') : '')}
          bottomLeft={{
            node: 'ENTER',
            ariaLabel: 'Submit guess',
            onPress: () => {
              sfx.tap();
              submit();
            }
          }}
          bottomRight={{
            node: '⌫',
            ariaLabel: 'Backspace',
            onPress: () => {
              sfx.tap();
              backspace();
            }
          }}
        />
      </div>
    </div>
  );
}
