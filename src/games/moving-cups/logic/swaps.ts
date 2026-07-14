import type { Difficulty } from '../../../platform/types';

/**
 * Pure logic for Moving Cups (follow-the-ball). No React here so the whole
 * module is importable headlessly and covered by `npm run validate`.
 *
 * Model: a row of `cups` cups occupies slots 0..cups-1. A ball hides under
 * one cup. A shuffle is a list of pairwise SWAPS expressed in terms of
 * SLOTS: a swap {a, b} means whichever cups currently sit at slots a and b
 * exchange places. Tracking the ball is therefore just tracking a slot
 * index through the swap list (`resolveFinalPosition`).
 */

export type Rng = () => number;

/** A single pairwise swap of two slots in the row. */
export interface Swap {
  a: number;
  b: number;
}

export interface CupsConfig {
  /** number of cups in the row (fixed per difficulty) */
  cups: number;
  /** swaps in round 1 (grows +1 per round) */
  baseSwaps: number;
  /** duration of one swap in round 1, ms (speeds up each round) */
  baseMs: number;
  /** wrong picks allowed before the run ends */
  lives: number;
  /** clearing this round number wins the run */
  targetRound: number;
  /** score multiplier (1..5) */
  mult: number;
}

export const CUPS_CONFIG: Record<Difficulty, CupsConfig> = {
  easy: { cups: 3, baseSwaps: 4, baseMs: 520, lives: 4, targetRound: 6, mult: 1 },
  medium: { cups: 3, baseSwaps: 6, baseMs: 420, lives: 3, targetRound: 7, mult: 2 },
  hard: { cups: 4, baseSwaps: 8, baseMs: 340, lives: 3, targetRound: 8, mult: 3 },
  pro: { cups: 5, baseSwaps: 11, baseMs: 260, lives: 2, targetRound: 8, mult: 4 },
  extreme: { cups: 5, baseSwaps: 14, baseMs: 190, lives: 2, targetRound: 9, mult: 5 }
};

/** each round the swap duration shrinks by this factor (faster shuffle) */
export const SPEED_RAMP = 0.9;
/** never shuffle faster than this, even at the deepest rounds */
export const MIN_SWAP_MS = 120;

/** swaps performed in a given round (base + one per round beyond the first) */
export function swapsForRound(cfg: CupsConfig, round: number): number {
  return cfg.baseSwaps + Math.max(0, round - 1);
}

/** per-swap animation duration for a round, before assist scaling */
export function durationForRound(cfg: CupsConfig, round: number): number {
  return Math.max(MIN_SWAP_MS, Math.round(cfg.baseMs * Math.pow(SPEED_RAMP, round - 1)));
}

/** Deterministic small PRNG (used by the validation harness for seeded runs). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Produce `n` valid pairwise swaps for a row of `cupCount` cups. Every swap
 * is two distinct in-range slot indices; consecutive swaps are never the
 * identical pair (a repeated swap reads as a no-op on screen).
 */
export function makeSwaps(cupCount: number, n: number, rng: Rng): Swap[] {
  const swaps: Swap[] = [];
  if (cupCount < 2) return swaps;
  let prev: Swap | null = null;
  for (let i = 0; i < n; i++) {
    let a = 0;
    let b = 0;
    // reject same-index or an exact repeat of the previous pair
    do {
      a = Math.floor(rng() * cupCount);
      b = Math.floor(rng() * cupCount);
    } while (
      a === b ||
      (prev !== null &&
        ((prev.a === a && prev.b === b) || (prev.a === b && prev.b === a)))
    );
    const swap: Swap = { a, b };
    swaps.push(swap);
    prev = swap;
  }
  return swaps;
}

/**
 * Apply a swap list to a starting slot and return the slot the ball ends in.
 * This is the single source of truth for "which cup hides the ball"; the UI
 * animates the same swaps step by step and must agree with this result.
 */
export function resolveFinalPosition(startIdx: number, swaps: Swap[]): number {
  let pos = startIdx;
  for (const s of swaps) {
    if (pos === s.a) pos = s.b;
    else if (pos === s.b) pos = s.a;
  }
  return pos;
}

export interface RoundData {
  /** slot the ball starts under (0-based) */
  ballStart: number;
  /** the shuffle for this round */
  swaps: Swap[];
}

/** Generate a full round (ball start + shuffle) for a difficulty and round. */
export function makeRound(cfg: CupsConfig, round: number, rng: Rng): RoundData {
  const ballStart = Math.floor(rng() * cfg.cups);
  const swaps = makeSwaps(cfg.cups, swapsForRound(cfg, round), rng);
  return { ballStart, swaps };
}
