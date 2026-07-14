/*
 * Word Guess — pure game logic (no React, headlessly testable).
 * Feedback follows standard Wordle duplicate-letter rules: greens are
 * assigned first, then each remaining secret letter can satisfy at most one
 * yellow (position-first, left-to-right).
 */

import type { Difficulty } from '../../../platform/types';
import {
  ANSWERS_4,
  ANSWERS_5,
  ANSWERS_5_RARE,
  ANSWERS_6,
  ANSWERS_7,
  ALLOWED_BY_LEN,
  STARTERS
} from './words';

/** Per-tile feedback after a submitted guess. */
export type Mark = 'correct' | 'present' | 'absent';

/** Best-known knowledge of a key on the keyboard (correct wins over present…). */
export type KeyState = 'correct' | 'present' | 'absent' | 'unknown';

export interface DiffConfig {
  /** length of the secret word */
  len: number;
  /** number of guesses allowed */
  tries: number;
  /** score multiplier 1..5 */
  mult: number;
  /** the answer pool the secret is drawn from */
  pool: string[];
  /** keyboard heat-coloring is force-disabled at this tier */
  noKeyColor: boolean;
  /** short label describing the word style */
  blurb: string;
}

export const CONFIG: Record<Difficulty, DiffConfig> = {
  easy: { len: 4, tries: 7, mult: 1, pool: ANSWERS_4, noKeyColor: false, blurb: '4-letter words · 7 tries' },
  medium: { len: 5, tries: 6, mult: 2, pool: ANSWERS_5, noKeyColor: false, blurb: '5-letter words · 6 tries' },
  hard: { len: 5, tries: 6, mult: 3, pool: ANSWERS_5_RARE, noKeyColor: false, blurb: 'trickier 5-letter words · 6 tries' },
  pro: { len: 6, tries: 6, mult: 4, pool: ANSWERS_6, noKeyColor: false, blurb: '6-letter words · 6 tries' },
  extreme: { len: 7, tries: 6, mult: 5, pool: ANSWERS_7, noKeyColor: true, blurb: '7-letter words · 6 tries, no key hints' }
};

/** Pick a secret answer for a difficulty (uses the injected RNG). */
export function pickSecret(difficulty: Difficulty, rng: () => number = Math.random): string {
  const pool = CONFIG[difficulty].pool;
  return pool[Math.floor(rng() * pool.length)];
}

/** True when `guess` is a legal word of the right length for this difficulty. */
export function isAllowedGuess(guess: string, difficulty: Difficulty): boolean {
  const g = guess.toUpperCase();
  const len = CONFIG[difficulty].len;
  if (g.length !== len) return false;
  return ALLOWED_BY_LEN[len]?.has(g) ?? false;
}

/**
 * Evaluate a guess against the secret, returning one Mark per position.
 * Standard Wordle duplicate handling: pass 1 assigns 'correct' to exact
 * matches and consumes those secret letters; pass 2 assigns 'present' to a
 * letter only while an unconsumed copy of it remains in the secret.
 */
export function evaluateGuess(guess: string, secret: string): Mark[] {
  const g = guess.toUpperCase();
  const s = secret.toUpperCase();
  const n = g.length;
  const marks: Mark[] = new Array(n).fill('absent');
  const remaining: Record<string, number> = {};

  // pass 1: greens
  for (let i = 0; i < n; i++) {
    if (g[i] === s[i]) {
      marks[i] = 'correct';
    } else {
      remaining[s[i]] = (remaining[s[i]] ?? 0) + 1;
    }
  }
  // pass 2: yellows from the leftovers
  for (let i = 0; i < n; i++) {
    if (marks[i] === 'correct') continue;
    const c = g[i];
    if ((remaining[c] ?? 0) > 0) {
      marks[i] = 'present';
      remaining[c] -= 1;
    }
  }
  return marks;
}

/** Rank so a stronger fact never gets overwritten by a weaker one. */
const KEY_RANK: Record<KeyState, number> = { unknown: 0, absent: 1, present: 2, correct: 3 };

/** Fold a guess's marks into the running per-letter keyboard knowledge. */
export function mergeKeyStates(
  prev: Record<string, KeyState>,
  guess: string,
  marks: Mark[]
): Record<string, KeyState> {
  const next = { ...prev };
  const g = guess.toUpperCase();
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    const m: KeyState = marks[i];
    const cur = next[c] ?? 'unknown';
    if (KEY_RANK[m] > KEY_RANK[cur]) next[c] = m;
  }
  return next;
}

/** The number of greens a guess scored (used by the error heuristic). */
export function greenCount(marks: Mark[]): number {
  return marks.reduce((a, m) => (m === 'correct' ? a + 1 : a), 0);
}

/* --------------------------------------------------------------- scoring */

const WIN_BASE = 300;
/** big reward for winning with tries to spare */
const PER_UNUSED_TRY = 160;
const HINT_PENALTY = 120;

/**
 * Final score for a finished game.
 *  won:   (WIN_BASE + PER_UNUSED_TRY * triesLeft) * mult − hint penalties
 *  lost:  0 (a small consolation for greens discovered is intentionally
 *         omitted so the incentive stays on winning)
 * `guessesUsed` counts submitted guesses; a win on the last row leaves 0
 * unused tries but still earns the win base.
 */
export function computeScore(opts: {
  difficulty: Difficulty;
  won: boolean;
  guessesUsed: number;
  hintsUsed: number;
}): number {
  const { difficulty, won, guessesUsed, hintsUsed } = opts;
  if (!won) return 0;
  const cfg = CONFIG[difficulty];
  const triesLeft = Math.max(0, cfg.tries - guessesUsed);
  const raw = (WIN_BASE + PER_UNUSED_TRY * triesLeft) * cfg.mult;
  return Math.max(0, raw - hintsUsed * HINT_PENALTY);
}

export function starterWord(difficulty: Difficulty): string {
  return STARTERS[CONFIG[difficulty].len] ?? '';
}
