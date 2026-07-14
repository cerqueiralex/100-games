/*
 * Code Breaker — pure game logic (no React) so it can be validated headlessly.
 * Standard Mastermind rules: a hidden code of colored pegs; each guess is
 * answered with feedback pegs — filled (exact) = right color, right position;
 * hollow (present) = right color, wrong position. Feedback carries no
 * position information.
 */
import type { Difficulty } from '../../../platform/types';

export interface CbkConfig {
  /** code length */
  slots: number;
  /** size of the color pool (indices 0..colors-1) */
  colors: number;
  /** whether the secret code may repeat a color */
  allowDupes: boolean;
  /** guess limit */
  guesses: number;
}

export const CONFIG: Record<Difficulty, CbkConfig> = {
  easy: { slots: 3, colors: 5, allowDupes: false, guesses: 12 },
  medium: { slots: 4, colors: 6, allowDupes: false, guesses: 10 },
  hard: { slots: 4, colors: 7, allowDupes: true, guesses: 10 },
  pro: { slots: 5, colors: 8, allowDupes: true, guesses: 9 },
  extreme: { slots: 6, colors: 9, allowDupes: true, guesses: 8 }
};

export interface Feedback {
  /** filled pegs: right color in the right position */
  exact: number;
  /** hollow pegs: right color in the wrong position */
  present: number;
}

/** One submitted guess with its feedback, as kept in history. */
export interface GuessRecord extends Feedback {
  guess: number[];
}

/**
 * Draw a random secret code for a config. `rng` defaults to Math.random;
 * tests pass a seeded rng (see `mulberry32`).
 */
export function randomCode(
  cfg: Pick<CbkConfig, 'slots' | 'colors' | 'allowDupes'>,
  rng: () => number = Math.random
): number[] {
  if (cfg.allowDupes) {
    return Array.from({ length: cfg.slots }, () => Math.floor(rng() * cfg.colors));
  }
  // no duplicates: partial Fisher–Yates over the color pool
  const pool = Array.from({ length: cfg.colors }, (_, i) => i);
  for (let i = 0; i < cfg.slots; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, cfg.slots);
}

/**
 * Standard Mastermind scoring. `exact` counts matching positions; `present`
 * counts color overlap among the remaining pegs (per-color minimum of the
 * two multisets), so duplicates are never double-counted.
 */
export function scoreGuess(secret: readonly number[], guess: readonly number[]): Feedback {
  let exact = 0;
  const secretRest: number[] = [];
  const guessRest: number[] = [];
  for (let i = 0; i < secret.length; i++) {
    if (secret[i] === guess[i]) exact++;
    else {
      secretRest.push(secret[i]);
      guessRest.push(guess[i]);
    }
  }
  let present = 0;
  const counts = new Map<number, number>();
  for (const c of secretRest) counts.set(c, (counts.get(c) ?? 0) + 1);
  for (const c of guessRest) {
    const left = counts.get(c) ?? 0;
    if (left > 0) {
      present++;
      counts.set(c, left - 1);
    }
  }
  return { exact, present };
}

/**
 * Could `candidate` be the secret code, given every past guess and its
 * feedback? A code is consistent iff, were it the secret, it would have
 * produced exactly the feedback observed for each past guess. This checks
 * the candidate directly (O(history × slots)) — no enumeration of the code
 * space is needed, because "some consistent code equals the candidate"
 * reduces to "the candidate itself reproduces all feedback".
 */
export function isConsistent(candidate: readonly number[], history: readonly GuessRecord[]): boolean {
  for (const h of history) {
    const f = scoreGuess(candidate, h.guess);
    if (f.exact !== h.exact || f.present !== h.present) return false;
  }
  return true;
}

/** Small deterministic PRNG for tests/validation (same family the repo uses). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
