import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, CheckIcon, EraseIcon, RestartIcon } from '../../platform/design/icons';
import { buildWheelLevel, pickLevel, type WheelLevel } from './logic/levels';

const WORD_PTS: Record<Difficulty, number> = { easy: 20, medium: 30, hard: 40 };
const PAR_SEC: Record<Difficulty, number> = { easy: 3 * 60, medium: 5 * 60, hard: 8 * 60 };
const BONUS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
const WRONG_PENALTY = 5;
const HINT_PENALTY = 15;

interface WheelSave {
  level: WheelLevel;
  wheel: string[];
  found: number[];
  revealed: number[];
  errors: number;
  score: number;
  hintsUsed: number;
  assistsUsed: string[];
}

export function WordWheelGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved = savedState as WheelSave | undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const level = useMemo(() => saved?.level ?? pickLevel(difficulty), [difficulty]);
  const built = useMemo(() => buildWheelLevel(level), [level]);

  const [wheel, setWheel] = useState<string[]>(() => saved?.wheel ?? level.letters);
  const [picked, setPicked] = useState<number[]>([]); // indices into wheel
  const [found, setFound] = useState<Set<number>>(() => new Set(saved?.found ?? []));
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set(saved?.revealed ?? []));
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [shake, setShake] = useState(false);

  const done = useRef(false);
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists.firstLetters ? ['firstLetters'] : [])])
  );
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  const firstLetterCells = useMemo(
    () => new Set(assists.firstLetters ? built.entryCells.map((cells) => cells[0]) : []),
    [assists.firstLetters, built]
  );

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { level: level.id, wordsFound: found.size, wordsTotal: level.entries.length }
    });
  }, [score, errors, hintsUsed, found, events, level]);

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
        extra: { level: level.id, wordsTotal: level.entries.length }
      });
    },
    [events, level]
  );

  const current = picked.map((i) => wheel[i]).join('');

  const submit = useCallback(() => {
    if (paused || done.current || current.length < 2) return;
    const matchIdx = level.entries.findIndex(
      (e, i) => e.answer.toUpperCase() === current && !found.has(i)
    );
    setPicked([]);
    if (matchIdx !== -1) {
      const nextFound = new Set(found);
      nextFound.add(matchIdx);
      setFound(nextFound);
      sfx.place();
      const gained = current.length * WORD_PTS[difficulty];
      if (nextFound.size === level.entries.length) {
        const bonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * BONUS[difficulty];
        const final = score + gained + bonus;
        setScore(final);
        finish(final, errors, hintsUsed);
      } else {
        setScore((s) => s + gained);
      }
    } else {
      setErrors((e) => e + 1);
      setScore((s) => Math.max(0, s - WRONG_PENALTY));
      sfx.error();
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }, [paused, current, level, found, difficulty, score, errors, hintsUsed, finish]);

  const useHint = useCallback(() => {
    if (paused || done.current || !assists.revealLetter) return;
    // reveal the first hidden cell of the first unfound word
    for (let w = 0; w < level.entries.length; w++) {
      if (found.has(w)) continue;
      const cell = built.entryCells[w].find((c) => !revealed.has(c) && !firstLetterCells.has(c));
      const target = cell ?? built.entryCells[w].find((c) => !revealed.has(c));
      if (target === undefined) continue;
      assistsUsed.current.add('revealLetter');
      setHintsUsed((h) => h + 1);
      setScore((s) => Math.max(0, s - HINT_PENALTY));
      setRevealed((r) => new Set(r).add(target));
      sfx.hint();
      return;
    }
  }, [paused, assists.revealLetter, level, found, built, revealed, firstLetterCells]);

  const shuffle = () => {
    if (paused || done.current) return;
    sfx.tap();
    setPicked([]);
    setWheel((w) => [...w].sort(() => Math.random() - 0.5));
  };

  // desktop keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || done.current) return;
      const ch = e.key.toUpperCase();
      if (/^[A-Z]$/.test(ch)) {
        const idx = wheel.findIndex((l, i) => l === ch && !picked.includes(i));
        if (idx !== -1) {
          sfx.tap();
          setPicked((p) => [...p, idx]);
        }
      } else if (e.key === 'Backspace') {
        setPicked((p) => p.slice(0, -1));
      } else if (e.key === 'Enter') {
        submit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wheel, picked, paused, submit]);

  // which cells are visible: found words fully, plus revealed/first letters
  const visibleCells = useMemo(() => {
    const set = new Set<number>(revealed);
    firstLetterCells.forEach((c) => set.add(c));
    found.forEach((w) => built.entryCells[w].forEach((c) => set.add(c)));
    return set;
  }, [revealed, firstLetterCells, found, built]);

  const wheelSize = 220;
  const radius = 78;

  useEffect(() => {
    registerSnapshot(() => ({
      level,
      wheel,
      found: [...found],
      revealed: [...revealed],
      errors,
      score,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  return (
    <div className={`wordwheel ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Words: <b>{found.size} / {level.entries.length}</b>
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Misses: <b>{errors}</b>
        </span>
      </div>

      <div
        className="ww-board"
        style={{ gridTemplateColumns: `repeat(${built.cols}, 1fr)`, maxWidth: `${built.cols * 42}px` }}
      >
        {built.grid.map((ch, i) =>
          ch === null ? (
            <span key={i} className="ww-block" />
          ) : (
            <span key={i} className={`ww-cell ${visibleCells.has(i) ? 'filled' : ''}`}>
              {visibleCells.has(i) ? ch : ''}
            </span>
          )
        )}
      </div>

      <div className="game-tools fx-card">
      <div className={`ww-current ${shake ? 'shake' : ''}`}>{current || ' '}</div>

      <div className="ww-wheel" style={{ width: wheelSize, height: wheelSize }}>
        {wheel.map((letter, i) => {
          const angle = (360 / wheel.length) * i - 90;
          const used = picked.includes(i);
          return (
            <button
              key={i}
              className={`ww-letter ${used ? 'used' : ''}`}
              style={{
                transform: `rotate(${angle}deg) translate(${radius}px) rotate(${-angle}deg)`
              }}
              onClick={() => {
                if (paused || done.current || used) return;
                sfx.tap();
                setPicked((p) => [...p, i]);
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>

      <div className="sudoku-controls">
        <button className="pad-tool" onClick={() => setPicked((p) => p.slice(0, -1))}>
          <EraseIcon />
          <span>Undo</span>
        </button>
        <button className="pad-tool" onClick={shuffle}>
          <RestartIcon />
          <span>Shuffle</span>
        </button>
        {assists.revealLetter && (
          <button className="pad-tool" onClick={useHint}>
            <BulbIcon />
            <span>Hint</span>
          </button>
        )}
        <button className="pad-tool active" onClick={submit} disabled={current.length < 2}>
          <CheckIcon />
          <span>Submit</span>
        </button>
      </div>
      </div>
    </div>
  );
}
