import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx, playNote } from '../../platform/audio';
import { BulbIcon, EyeIcon, Keyboard, PadTool } from '../../platform/components/ui';
import { LIVES, MULT, SHOW_CATEGORY, pickWord } from './logic/words';
import {
  computeScore,
  guessOutcome,
  isRevealed,
  isSolved,
  pickPeekVowel,
  wrongLetters
} from './logic/engine';
import { BalloonScene, type SceneState } from './BalloonScene';

const MAX_VOWEL_PEEKS = 2;

interface HangmanSave {
  word: string;
  category: string;
  guessed: string[];
  assistLetters: string[];
  safeUsed: boolean;
  categoryVisible: boolean;
  vowelPeekUses: number;
  hintsUsed: number;
  assistsUsed: string[];
}

export function HangmanGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved =
    savedState && typeof (savedState as HangmanSave).word === 'string'
      ? (savedState as HangmanSave)
      : undefined;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const puzzle = useMemo(() => (saved ? { word: saved.word, category: saved.category } : pickWord(difficulty)), [difficulty]);
  const word = puzzle.word;
  const lives = LIVES[difficulty];
  const mult = MULT[difficulty];
  const categoryShownByDefault = SHOW_CATEGORY[difficulty];

  const [guessed, setGuessed] = useState<Set<string>>(() => new Set(saved?.guessed ?? []));
  const [assistLetters, setAssistLetters] = useState<Set<string>>(() => new Set(saved?.assistLetters ?? []));
  const [safeUsed, setSafeUsed] = useState(saved?.safeUsed ?? false);
  const [categoryVisible, setCategoryVisible] = useState(saved?.categoryVisible ?? categoryShownByDefault);
  const [vowelPeekUses, setVowelPeekUses] = useState(saved?.vowelPeekUses ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [phase, setPhase] = useState<'play' | 'won' | 'lost'>('play');
  const [revealAll, setRevealAll] = useState(false);
  const [wobbleNonce, setWobbleNonce] = useState(0);
  const [shake, setShake] = useState<{ key: string; n: number } | null>(null);

  const done = useRef(false);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists['safe-first'] ? ['safe-first'] : [])])
  );

  // refs mirroring state so the delayed finish reads the freshest committed values
  const guessedRef = useRef(guessed);
  guessedRef.current = guessed;
  const assistLettersRef = useRef(assistLetters);
  assistLettersRef.current = assistLetters;
  const safeUsedRef = useRef(safeUsed);
  safeUsedRef.current = safeUsed;
  const hintsRef = useRef(hintsUsed);
  hintsRef.current = hintsUsed;

  const wrong = useMemo(() => wrongLetters(word, guessed), [word, guessed]);
  const livesLost = Math.max(0, wrong.length - (safeUsed ? 1 : 0));
  const livesLeft = Math.max(0, lives - livesLost);

  useEffect(() => () => {
    if (finishTimer.current) clearTimeout(finishTimer.current);
  }, []);

  // continuous stats (so abandons capture the latest state)
  useEffect(() => {
    if (assists['safe-first']) assistsUsed.current.add('safe-first');
    events.onStats({
      score: computeScore({
        word,
        guessed,
        assistLetters,
        livesRemaining: livesLeft,
        hintsUsed,
        won: phase === 'won',
        mult
      }),
      errors: wrong.length,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { category: puzzle.category }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guessed, assistLetters, safeUsed, hintsUsed, phase, assists['safe-first']]);

  const finishGame = useCallback(
    (won: boolean) => {
      if (done.current || phase !== 'play') return;
      setPhase(won ? 'won' : 'lost');
      if (won) {
        // GameShell plays the win jingle on onFinish
      } else {
        setRevealAll(true);
        sfx.error(); // the deep pop
      }
      finishTimer.current = setTimeout(
        () => {
          if (done.current) return;
          done.current = true;
          const g = guessedRef.current;
          const al = assistLettersRef.current;
          const wrongNow = wrongLetters(word, g);
          const livesLostNow = Math.max(0, wrongNow.length - (safeUsedRef.current ? 1 : 0));
          const livesLeftNow = Math.max(0, lives - livesLostNow);
          events.onFinish({
            outcome: won ? 'won' : 'lost',
            score: computeScore({
              word,
              guessed: g,
              assistLetters: al,
              livesRemaining: won ? livesLeftNow : 0,
              hintsUsed: hintsRef.current,
              won,
              mult
            }),
            errors: wrongNow.length,
            hintsUsed: hintsRef.current,
            assistsUsed: [...assistsUsed.current],
            extra: { category: puzzle.category, word }
          });
        },
        won ? 1150 : 1050
      );
    },
    [phase, word, lives, mult, events, puzzle.category]
  );

  const guess = useCallback(
    (letter: string) => {
      if (paused || done.current || phase !== 'play') return;
      const outcome = guessOutcome(word, guessed, letter);
      if (outcome.repeated) {
        setShake((s) => ({ key: letter, n: (s?.n ?? 0) + 1 }));
        return;
      }
      const ng = new Set(guessed);
      ng.add(letter);
      setGuessed(ng);

      if (outcome.correct) {
        sfx.pop();
        if (isSolved(word, ng)) finishGame(true);
        return;
      }

      // a wrong letter
      const forgiven = assists['safe-first'] && !safeUsed;
      if (forgiven) {
        setSafeUsed(true);
        assistsUsed.current.add('safe-first');
        setWobbleNonce((w) => w + 1);
        playNote(460, 120, 'sine'); // gentle wobble blip, no sink
        return;
      }
      const newWrong = wrongLetters(word, ng);
      const newLivesLost = Math.max(0, newWrong.length - (safeUsed ? 1 : 0));
      if (newLivesLost >= lives) {
        finishGame(false);
        return;
      }
      playNote(230, 170, 'sine'); // soft deflate
    },
    [paused, phase, word, guessed, assists, safeUsed, lives, finishGame]
  );

  const peekVowel = useCallback(() => {
    if (paused || done.current || phase !== 'play' || vowelPeekUses >= MAX_VOWEL_PEEKS) return;
    const v = pickPeekVowel(word, guessed);
    if (!v) return;
    const ng = new Set(guessed);
    ng.add(v);
    const nal = new Set(assistLetters);
    nal.add(v);
    setGuessed(ng);
    setAssistLetters(nal);
    setVowelPeekUses((x) => x + 1);
    setHintsUsed((h) => h + 1);
    assistsUsed.current.add('vowel-peek');
    sfx.hint();
    if (isSolved(word, ng)) finishGame(true);
  }, [paused, phase, vowelPeekUses, word, guessed, assistLetters, finishGame]);

  const revealCategory = useCallback(() => {
    if (paused || done.current || phase !== 'play' || categoryVisible) return;
    setCategoryVisible(true);
    setHintsUsed((h) => h + 1);
    assistsUsed.current.add('category-hint');
    sfx.hint();
  }, [paused, phase, categoryVisible]);

  // desktop physical keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[a-zA-Z]$/.test(e.key)) guess(e.key.toUpperCase());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [guess]);

  useEffect(() => {
    registerSnapshot(() => ({
      word,
      category: puzzle.category,
      guessed: [...guessed],
      assistLetters: [...assistLetters],
      safeUsed,
      categoryVisible,
      vowelPeekUses,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  const sceneState: SceneState = phase === 'play' ? 'flying' : phase;
  const sink = phase === 'lost' ? 1 : Math.min(1, livesLost / lives);
  const noVowelLeft = pickPeekVowel(word, guessed) === null;

  const showVowelPeek = !!assists['vowel-peek'];
  const showCategoryHint = !!assists['category-hint'] && !categoryShownByDefault && !categoryVisible;

  return (
    <div className={`hangman ${paused ? 'board-hidden' : ''}`}>
      <BalloonScene
        sink={sink}
        state={sceneState}
        wobbleNonce={wobbleNonce}
        lives={lives}
        livesLost={phase === 'lost' ? lives : livesLost}
      />

      <div className="hng-clue">
        {categoryVisible ? (
          <>
            <span className="hng-clue-label">Category</span>
            <span className="hng-clue-name">{puzzle.category}</span>
          </>
        ) : (
          <span className="hng-clue-name muted">Mystery word — no category</span>
        )}
      </div>

      <div className="hng-word" aria-label="answer">
        {[...word].map((ch, i) => {
          if (ch === ' ') return <span key={i} className="hng-break" />;
          const revealed = isRevealed(ch, guessed);
          const missed = revealAll && !guessed.has(ch);
          return (
            <span key={i} className={`hng-slot ${revealed ? 'revealed' : ''} ${missed ? 'missed' : ''}`}>
              <span className="hng-slot-face">{revealed || revealAll ? ch : ''}</span>
            </span>
          );
        })}
      </div>

      <div className="hng-info">
        <span className="hng-lives" aria-label={`${livesLeft} lives left`}>
          {Array.from({ length: lives }).map((_, i) => (
            <span key={i} className={`hng-pip ${i < livesLeft ? 'on' : ''}`} />
          ))}
        </span>
        <span className={`hng-errors ${wrong.length > 0 ? 'bad' : ''}`}>
          Misses: <b>{wrong.length}</b>
        </span>
      </div>

      <div className="game-tools fx-card">
        {(showVowelPeek || showCategoryHint) && (
          <div className="hng-toolrow">
            {showVowelPeek && (
              <PadTool
                silent
                onClick={peekVowel}
                disabled={vowelPeekUses >= MAX_VOWEL_PEEKS || noVowelLeft}
                aria-label="Reveal a vowel"
              >
                <EyeIcon />
                <span>Vowel {MAX_VOWEL_PEEKS - vowelPeekUses}</span>
              </PadTool>
            )}
            {showCategoryHint && (
              <PadTool silent onClick={revealCategory} aria-label="Reveal the category">
                <BulbIcon />
                <span>Category</span>
              </PadTool>
            )}
          </div>
        )}

        <Keyboard
          onKey={guess}
          keyClass={(k) => {
            const tone = guessed.has(k) ? ([...word].includes(k) ? 'good' : 'bad') : '';
            return shake?.key === k ? `${tone} shake` : tone;
          }}
          keyNonce={(k) => (shake?.key === k ? shake.n : 0)}
        />
      </div>
    </div>
  );
}
