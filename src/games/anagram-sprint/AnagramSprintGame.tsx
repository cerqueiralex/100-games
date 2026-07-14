import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, RestartIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { SPRINT_CONFIG, SKIP_BUFFER, pickRunWords, scramble } from './logic/words';

/* ------------------------------------------------------------- tuning knobs */
const PER_LETTER = 12; // base points per letter of a solved word
const HINT_PENALTY = 20;
const SKIP_PENALTY = 40;
const WIN_BONUS = 100; // × diffMult
const TIME_BONUS = 5; // × diffMult, per remaining second
const PENALTY_SEC = 3; // clock penalty for a wrong submission

/** streak → score multiplier (consecutive solves without skip/wrong) */
function streakMultiplier(streak: number): number {
  if (streak >= 6) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

interface Tile {
  id: number;
  letter: string;
}

interface AnagramSave {
  queue: string[];
  index: number;
  solvedCount: number;
  streak: number;
  bestStreak: number;
  score: number;
  errors: number;
  hintsUsed: number;
  penaltySec: number;
  solvedWords: string[];
  tiles: Tile[];
  slots: (number | null)[];
  locked: number[];
  assistsUsed: string[];
}

const emptySlots = (len: number): (number | null)[] => Array.from({ length: len }, () => null);

/** scramble a word into fresh tiles with ids unique across the whole run */
function makeTiles(word: string, wordIndex: number): Tile[] {
  return scramble(word)
    .split('')
    .map((letter, pos) => ({ id: wordIndex * 100 + pos, letter }));
}

/** little flame badge for the streak meter — monochrome, inherits accent */
function FlameIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 2c1.5 3.2.4 5.2-1.2 6.9-1.6 1.7-2.8 3.2-2.8 5.6A4 4 0 0 0 12 22a4 4 0 0 0 4-4c0-1.7-.8-2.9-1.6-4 .2 1-.4 1.9-1.2 2.2.6-2 .1-4-1.7-6.2C14 7.4 14.6 5 12 2Z" />
    </svg>
  );
}

/** skip-forward glyph (no matching icon in the shared set) */
function SkipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 5l9 7-9 7z" fill="currentColor" stroke="none" />
      <path d="M18 5v14" />
    </svg>
  );
}

export function AnagramSprintGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = SPRINT_CONFIG[difficulty];
  const saved = savedState as AnagramSave | undefined;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queue = useMemo(
    () => saved?.queue ?? pickRunWords(cfg.quota + SKIP_BUFFER, cfg.minLen, cfg.maxLen),
    [cfg]
  );

  const [index, setIndex] = useState(saved?.index ?? 0);
  const [solvedCount, setSolvedCount] = useState(saved?.solvedCount ?? 0);
  const [streak, setStreak] = useState(saved?.streak ?? 0);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [penaltySec, setPenaltySec] = useState(saved?.penaltySec ?? 0);
  const [solvedWords, setSolvedWords] = useState<string[]>(saved?.solvedWords ?? []);

  const [tiles, setTiles] = useState<Tile[]>(
    () => saved?.tiles ?? makeTiles(queue[0] ?? '', 0)
  );
  const [slots, setSlots] = useState<(number | null)[]>(
    () => saved?.slots ?? emptySlots(queue[0]?.length ?? 0)
  );
  const [locked, setLocked] = useState<number[]>(saved?.locked ?? []);

  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const [penaltyFlash, setPenaltyFlash] = useState(false);
  const [dealing, setDealing] = useState(true);

  const done = useRef(false);
  const resolving = useRef(false);
  const bestStreak = useRef(saved?.bestStreak ?? 0);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));

  // mirrors so the finish/resolve paths always read the latest values
  const scoreRef = useRef(score); scoreRef.current = score;
  const errorsRef = useRef(errors); errorsRef.current = errors;
  const hintsRef = useRef(hintsUsed); hintsRef.current = hintsUsed;
  const streakRef = useRef(streak); streakRef.current = streak;
  const solvedRef = useRef(solvedCount); solvedRef.current = solvedCount;
  const penaltyRef = useRef(penaltySec); penaltyRef.current = penaltySec;
  const lockedRef = useRef(locked); lockedRef.current = locked;
  const elapsedRef = useRef(elapsedSec); elapsedRef.current = elapsedSec;

  const target = queue[index] ?? '';
  const letterOf = useCallback(
    (id: number | null) => (id == null ? '' : tiles.find((t) => t.id === id)?.letter ?? ''),
    [tiles]
  );
  const rack = tiles.filter((t) => !slots.includes(t.id));

  const remaining = Math.max(0, cfg.timeSec - elapsedSec - penaltySec);
  const low = remaining <= 10;
  const dispMult = streakMultiplier(streak);

  /* ---------------------------------------------------------- FLIP animation */
  const stageRef = useRef<HTMLDivElement>(null);
  const firstRects = useRef<Map<string, DOMRect>>(new Map());

  const captureFirst = useCallback(() => {
    const m = new Map<string, DOMRect>();
    stageRef.current?.querySelectorAll<HTMLElement>('[data-tile]').forEach((el) => {
      m.set(el.dataset.tile!, el.getBoundingClientRect());
    });
    firstRects.current = m;
  }, []);

  const slotSig = slots.map((s) => (s == null ? '_' : s)).join(',') + '#' + tiles.map((t) => t.id).join(',');

  useLayoutEffect(() => {
    const els = stageRef.current?.querySelectorAll<HTMLElement>('[data-tile]');
    if (els) {
      els.forEach((el) => {
        const first = firstRects.current.get(el.dataset.tile!);
        if (!first) return;
        const last = el.getBoundingClientRect();
        const dx = first.left - last.left;
        const dy = first.top - last.top;
        if (dx || dy) {
          el.style.transition = 'none';
          el.style.transform = `translate(${dx}px, ${dy}px)`;
          void el.offsetWidth; // force reflow so the invert paints before the play
          el.style.transition = '';
          el.style.transform = '';
        }
      });
    }
    firstRects.current = new Map();
  }, [slotSig]);

  /* ------------------------------------------------------------- deal a word */
  const timers = useRef<number[]>([]);
  const flashDeal = useCallback(() => {
    setDealing(true);
    timers.current.push(window.setTimeout(() => setDealing(false), 420));
  }, []);

  useEffect(() => {
    flashDeal();
    return () => {
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dealWord = useCallback(
    (nextIndex: number) => {
      const w = queue[nextIndex];
      setIndex(nextIndex);
      setTiles(makeTiles(w, nextIndex));
      setSlots(emptySlots(w.length));
      setLocked([]);
      firstRects.current = new Map(); // new tiles → no FLIP, CSS deal-in instead
      flashDeal();
    },
    [queue, flashDeal]
  );

  /* ------------------------------------------------------------------ finish */
  const finishGame = useCallback(
    (outcome: 'won' | 'lost', finalScore: number) => {
      if (done.current) return;
      done.current = true;
      bestStreak.current = Math.max(bestStreak.current, streakRef.current);
      events.onFinish({
        outcome,
        score: Math.max(0, Math.round(finalScore)),
        errors: errorsRef.current,
        hintsUsed: hintsRef.current,
        assistsUsed: [...assistsUsed.current],
        extra: {
          wordsSolved: solvedRef.current,
          quota: cfg.quota,
          bestStreak: bestStreak.current
        }
      });
    },
    [events, cfg.quota]
  );

  // time out → lose (penalties can also drive remaining to zero on a wrong)
  useEffect(() => {
    if (done.current) return;
    if (remaining <= 0) finishGame('lost', scoreRef.current);
  }, [remaining, finishGame]);

  /* -------------------------------------------------------------- live stats */
  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: {
        wordsSolved: solvedCount,
        quota: cfg.quota,
        bestStreak: bestStreak.current,
        streak
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, errors, hintsUsed, solvedCount, streak, events, cfg.quota]);

  // passive assist: first-letter glow counts as help whenever enabled
  useEffect(() => {
    if (assists.firstLetter) assistsUsed.current.add('firstLetter');
  }, [assists.firstLetter]);

  /* ------------------------------------------------- auto-submit a full word */
  useEffect(() => {
    if (paused || done.current || resolving.current) return;
    if (slots.length === 0 || slots.some((s) => s === null)) return;
    const assembled = slots.map((id) => letterOf(id)).join('');
    resolving.current = true;

    if (assembled === target) {
      // correct
      sfx.pop();
      setFlash('good');
      const newStreak = streakRef.current + 1;
      const mult = streakMultiplier(newStreak);
      const gained = Math.round(target.length * PER_LETTER * mult * cfg.diffMult);
      const newScore = scoreRef.current + gained;
      const newSolved = solvedRef.current + 1;
      bestStreak.current = Math.max(bestStreak.current, newStreak);
      setStreak(newStreak);
      setScore(newScore);
      setSolvedCount(newSolved);
      setSolvedWords((w) => [...w, target]);

      if (newSolved >= cfg.quota) {
        const remainNow = Math.max(0, cfg.timeSec - elapsedRef.current - penaltyRef.current);
        const winBonus = WIN_BONUS * cfg.diffMult;
        const timeBonus = remainNow * TIME_BONUS * cfg.diffMult;
        finishGame('won', newScore + winBonus + timeBonus);
        // board stays for review; resolving latched so no further input resolves
      } else {
        const nextIndex = index + 1;
        timers.current.push(
          window.setTimeout(() => {
            setFlash(null);
            if (nextIndex >= queue.length) {
              finishGame('lost', scoreRef.current); // ran out of words
              return;
            }
            dealWord(nextIndex);
            resolving.current = false;
          }, 360)
        );
      }
    } else {
      // wrong
      sfx.error();
      setFlash('bad');
      setErrors((e) => e + 1);
      setStreak(0);
      setPenaltySec((p) => p + PENALTY_SEC);
      setPenaltyFlash(true);
      timers.current.push(window.setTimeout(() => setPenaltyFlash(false), 700));
      timers.current.push(
        window.setTimeout(() => {
          captureFirst();
          // return every tile to the rack, keeping any hint-locked letters
          setSlots((prev) => prev.map((id, i) => (lockedRef.current.includes(i) ? id : null)));
          setFlash(null);
          resolving.current = false;
        }, 420)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, paused]);

  /* --------------------------------------------------------- tile placement */
  const placeTile = (id: number) => {
    if (paused || done.current || resolving.current) return;
    const slotIdx = slots.indexOf(null);
    if (slotIdx === -1) return;
    captureFirst();
    setSlots((prev) => {
      const next = prev.slice();
      next[slotIdx] = id;
      return next;
    });
    sfx.tap();
  };

  const returnTile = (slotIdx: number) => {
    if (paused || done.current || resolving.current) return;
    if (locked.includes(slotIdx) || slots[slotIdx] == null) return;
    captureFirst();
    setSlots((prev) => {
      const next = prev.slice();
      next[slotIdx] = null;
      return next;
    });
    sfx.tap();
  };

  const shuffleRack = () => {
    if (paused || done.current || resolving.current) return;
    captureFirst();
    setTiles((prev) => {
      const next = prev.slice();
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
    sfx.tap();
  };

  const skipWord = () => {
    if (paused || done.current || resolving.current) return;
    setScore((s) => Math.max(0, s - SKIP_PENALTY));
    setStreak(0);
    const nextIndex = index + 1;
    if (nextIndex >= queue.length) {
      finishGame('lost', Math.max(0, scoreRef.current - SKIP_PENALTY));
      return;
    }
    captureFirst();
    dealWord(nextIndex);
  };

  const useHint = () => {
    if (paused || done.current || resolving.current || !assists.hint) return;
    // leftmost slot that is empty or holds a wrong letter
    let slotIdx = -1;
    for (let i = 0; i < target.length; i++) {
      if (letterOf(slots[i]) !== target[i]) {
        slotIdx = i;
        break;
      }
    }
    if (slotIdx === -1) return;
    const needed = target[slotIdx];
    // prefer a rack tile with the needed letter; else pull one from a wrong slot
    let sourceId: number | null = rack.find((t) => t.letter === needed)?.id ?? null;
    if (sourceId == null) {
      for (let i = 0; i < slots.length; i++) {
        if (i === slotIdx || locked.includes(i)) continue;
        const id = slots[i];
        if (id != null && letterOf(id) === needed && letterOf(id) !== target[i]) {
          sourceId = id;
          break;
        }
      }
    }
    if (sourceId == null) return;
    captureFirst();
    setSlots((prev) => {
      const next = prev.slice();
      const at = next.indexOf(sourceId!);
      if (at !== -1) next[at] = null;
      next[slotIdx] = sourceId;
      return next;
    });
    setLocked((l) => (l.includes(slotIdx) ? l : [...l, slotIdx]));
    setHintsUsed((h) => h + 1);
    setScore((s) => Math.max(0, s - HINT_PENALTY));
    assistsUsed.current.add('hint');
    sfx.hint();
  };

  // desktop keyboard: type to place, Backspace to pull the last tile
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || done.current || resolving.current) return;
      if (/^[a-zA-Z]$/.test(e.key)) {
        const ch = e.key.toUpperCase();
        const t = rack.find((x) => x.letter === ch);
        if (t) placeTile(t.id);
      } else if (e.key === 'Backspace') {
        for (let i = slots.length - 1; i >= 0; i--) {
          if (slots[i] != null && !locked.includes(i)) {
            returnTile(i);
            break;
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rack, slots, locked, paused]);

  /* --------------------------------------------------------------- snapshot */
  useEffect(() => {
    registerSnapshot(
      () =>
        ({
          queue,
          index,
          solvedCount,
          streak,
          bestStreak: bestStreak.current,
          score,
          errors,
          hintsUsed,
          penaltySec,
          solvedWords,
          tiles,
          slots,
          locked,
          assistsUsed: [...assistsUsed.current]
        }) satisfies AnagramSave
    );
  });

  const firstLetterGlow = assists.firstLetter && target.length > 0 ? target[0] : null;

  /* ------------------------------------------------------------------- view */
  return (
    <div className={`anagram ${paused ? 'board-hidden' : ''}`} ref={stageRef}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Words: <b>{solvedCount} / {cfg.quota}</b>
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Errors: <b>{errors}</b>
        </span>
      </div>

      <div className="ana-top">
        <div className="ana-timer">
          <div
            className={`ana-timer-fill ${low ? 'low' : ''}`}
            style={{ width: `${(remaining / cfg.timeSec) * 100}%` }}
          />
          <span className={`ana-timer-label ${low ? 'low' : ''}`}>
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </span>
          {penaltyFlash && <span className="ana-penalty">-{PENALTY_SEC}s</span>}
        </div>
        <div className={`ana-streak ${dispMult > 1 ? 'hot' : ''} ${streak === 0 ? 'idle' : ''}`}>
          <FlameIcon />
          <span>
            {streak}
            {dispMult > 1 ? ` ·×${dispMult}` : ''}
          </span>
        </div>
      </div>

      {solvedWords.length > 0 && (
        <div className="ana-solved">
          {solvedWords.map((w, i) => (
            <span key={`${w}-${i}`} className="ana-solved-chip">
              {w}
            </span>
          ))}
        </div>
      )}

      <div className={`ana-slots ${flash ? `flash-${flash}` : ''}`}>
        {slots.map((id, i) => (
          <div
            key={i}
            className={`ana-slot ${id != null ? 'filled' : ''}`}
            onClick={() => returnTile(i)}
          >
            {id != null && (
              <button
                type="button"
                data-tile={id}
                className={`ana-tile placed ${locked.includes(i) ? 'locked' : ''} ${dealing ? 'deal' : ''}`}
                style={{ ['--i' as string]: i }}
                onClick={(e) => {
                  e.stopPropagation();
                  returnTile(i);
                }}
                aria-label={`Letter ${letterOf(id)} in slot ${i + 1}`}
              >
                {letterOf(id)}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="game-tools fx-card">
        <div className={`ana-rack ${dealing ? 'dealing' : ''}`}>
          {rack.map((t, i) => (
            <button
              key={t.id}
              type="button"
              data-tile={t.id}
              className={`ana-tile ${firstLetterGlow && t.letter === firstLetterGlow ? 'glow' : ''} ${dealing ? 'deal' : ''}`}
              style={{ ['--i' as string]: i }}
              onClick={() => placeTile(t.id)}
              aria-label={`Tile ${t.letter}`}
            >
              {t.letter}
            </button>
          ))}
          {rack.length === 0 && <span className="ana-rack-empty">All tiles placed</span>}
        </div>
        <div className="sudoku-controls">
          <PadTool silent onClick={shuffleRack} disabled={rack.length < 2}>
            <RestartIcon />
            <span>Shuffle</span>
          </PadTool>
          {assists.hint && (
            <PadTool silent onClick={useHint}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
          <PadTool silent onClick={skipWord}>
            <SkipIcon />
            <span>Skip</span>
          </PadTool>
        </div>
      </div>
    </div>
  );
}
