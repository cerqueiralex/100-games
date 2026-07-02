import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { EyeIcon } from '../../platform/design/icons';

/* Card faces are game content (like avatars), not UI chrome — emojis allowed. */
const FACES = [
  '🐶', '🦊', '🐼', '🐸', '🦉', '🐙', '🦋', '🌵', '🍕',
  '🍩', '🚀', '⚽', '🎲', '🎧', '🌙', '⭐', '🔑', '🎈'
];

interface Config {
  cols: number;
  pairs: number;
  matchPts: number;
  parSec: number;
  bonusPerSec: number;
}

const CONFIG: Record<Difficulty, Config> = {
  easy: { cols: 4, pairs: 8, matchPts: 50, parSec: 90, bonusPerSec: 1 },
  medium: { cols: 5, pairs: 15, matchPts: 75, parSec: 210, bonusPerSec: 2 },
  hard: { cols: 6, pairs: 18, matchPts: 100, parSec: 300, bonusPerSec: 3 }
};

const MISMATCH_PENALTY = 10;
const PEEK_PENALTY = 25;
const STREAK_BONUS = 10;

function buildDeck(pairs: number): string[] {
  const faces = [...FACES].sort(() => Math.random() - 0.5).slice(0, pairs);
  return [...faces, ...faces].sort(() => Math.random() - 0.5);
}

interface MemorySave {
  deck: string[];
  matched: boolean[];
  errors: number;
  score: number;
  moves: number;
  hintsUsed: number;
  streak: number;
  assistsUsed: string[];
}

export function MemoryMatchGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = CONFIG[difficulty];
  const saved = savedState as MemorySave | undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const deck = useMemo(() => saved?.deck ?? buildDeck(cfg.pairs), [cfg.pairs]);

  const [matched, setMatched] = useState<boolean[]>(() =>
    saved ? [...saved.matched] : new Array(cfg.pairs * 2).fill(false)
  );
  const [flipped, setFlipped] = useState<number[]>([]);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [moves, setMoves] = useState(saved?.moves ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [streak, setStreak] = useState(saved?.streak ?? 0);
  const [revealAll, setRevealAll] = useState(false);

  const matchedCount = useRef(saved ? saved.matched.filter(Boolean).length : 0);
  const done = useRef(false);
  const flipBackTimer = useRef<number | null>(null);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  // opening peek: reveal everything briefly at the start (not on resume)
  useEffect(() => {
    if (!assists.previewStart || saved) return;
    assistsUsed.current.add('previewStart');
    setRevealAll(true);
    const t = window.setTimeout(() => setRevealAll(false), 2800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { moves, pairsFound: matchedCount.current / 2 }
    });
  }, [score, errors, hintsUsed, moves, events]);

  const finish = useCallback(
    (finalScore: number, e: number, h: number, m: number) => {
      if (done.current) return;
      done.current = true;
      events.onFinish({
        outcome: 'won',
        score: finalScore,
        errors: e,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { moves: m, pairsFound: cfg.pairs }
      });
    },
    [events, cfg.pairs]
  );

  const flip = (i: number) => {
    if (paused || done.current || revealAll || matched[i] || flipped.includes(i)) return;
    sfx.tap();
    if (flipped.length === 2) {
      // impatient tap: resolve the pending mismatch immediately
      if (flipBackTimer.current) {
        clearTimeout(flipBackTimer.current);
        flipBackTimer.current = null;
      }
      setFlipped([i]);
      return;
    }
    const pair = [...flipped, i];
    setFlipped(pair);
    if (pair.length < 2) return;

    const nextMoves = moves + 1;
    setMoves(nextMoves);
    const [a, b] = pair;
    if (deck[a] === deck[b]) {
      setMatched((m) => {
        const n = [...m];
        n[a] = true;
        n[b] = true;
        return n;
      });
      matchedCount.current += 2;
      setFlipped([]);
      setStreak((s) => s + 1);
      sfx.place();
      const gained = cfg.matchPts + streak * STREAK_BONUS;
      if (matchedCount.current === cfg.pairs * 2) {
        const timeBonus = Math.max(0, cfg.parSec - elapsedRef.current) * cfg.bonusPerSec;
        finish(score + gained + timeBonus, errors, hintsUsed, nextMoves);
        setScore(score + gained + timeBonus);
      } else {
        setScore((s) => s + gained);
      }
    } else {
      setStreak(0);
      setErrors((e) => e + 1);
      setScore((s) => Math.max(0, s - MISMATCH_PENALTY));
      sfx.error();
      flipBackTimer.current = window.setTimeout(() => {
        setFlipped([]);
        flipBackTimer.current = null;
      }, 900);
    }
  };

  const peek = () => {
    if (paused || done.current || revealAll || !assists.peek) return;
    assistsUsed.current.add('peek');
    setHintsUsed((h) => h + 1);
    setScore((s) => Math.max(0, s - PEEK_PENALTY));
    sfx.hint();
    setRevealAll(true);
    window.setTimeout(() => setRevealAll(false), 1000);
  };

  useEffect(() => () => {
    if (flipBackTimer.current) clearTimeout(flipBackTimer.current);
  }, []);

  useEffect(() => {
    registerSnapshot(() => ({
      deck,
      matched,
      errors,
      score,
      moves,
      hintsUsed,
      streak,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  return (
    <div className={`memory ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Moves: <b>{moves}</b>
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Misses: <b>{errors}</b>
        </span>
      </div>

      <div
        className="mm-board"
        style={{ gridTemplateColumns: `repeat(${cfg.cols}, 1fr)` }}
        role="grid"
      >
        {deck.map((face, i) => {
          const up = revealAll || matched[i] || flipped.includes(i);
          return (
            <button
              key={i}
              className={`mm-card ${up ? 'up' : ''} ${matched[i] ? 'matched' : ''}`}
              onClick={() => flip(i)}
              aria-label={up ? face : 'Hidden card'}
            >
              {up ? <span className="mm-face">{face}</span> : <span className="mm-back" />}
            </button>
          );
        })}
      </div>

      {assists.peek && (
        <div className="game-tools fx-card">
        <div className="sudoku-controls">
          <button className="pad-tool" onClick={peek}>
            <EyeIcon />
            <span>Peek</span>
          </button>
        </div>
        </div>
      )}
    </div>
  );
}
