import type { Difficulty } from '../../../platform/types';

/**
 * Pure logic for Pattern Recall — a spatial memory-matrix game. A set of
 * cells lights up briefly; the player reproduces the SET (order does not
 * matter). Everything here is React-free so it can be validated headlessly.
 */

export interface TierConfig {
  /** Starting square-grid side length (cols === rows). */
  baseGrid: number;
  /** Lit cells in round 1. */
  litStart: number;
  /** Base flash window in ms (before the slow-flash assist). */
  flashMs: number;
  /** Lives for the whole run. */
  lives: number;
  /** Clear this many rounds to win. */
  targetRounds: number;
  /** Show a red decoy pattern before the answer phase. */
  distractor: boolean;
  /** Score multiplier 1..5. */
  mult: number;
  /** Round at which the grid grows by +1 side (extreme only). */
  gridGrowAt?: number;
}

export const CONFIG: Record<Difficulty, TierConfig> = {
  easy: { baseGrid: 3, litStart: 3, flashMs: 2000, lives: 4, targetRounds: 6, distractor: false, mult: 1 },
  medium: { baseGrid: 4, litStart: 4, flashMs: 1500, lives: 3, targetRounds: 7, distractor: false, mult: 2 },
  hard: { baseGrid: 4, litStart: 6, flashMs: 1200, lives: 3, targetRounds: 8, distractor: false, mult: 3 },
  pro: { baseGrid: 5, litStart: 7, flashMs: 900, lives: 2, targetRounds: 8, distractor: true, mult: 4 },
  extreme: { baseGrid: 5, litStart: 8, flashMs: 700, lives: 2, targetRounds: 9, distractor: true, mult: 5, gridGrowAt: 6 }
};

export interface PatternConfig {
  gridSize: number;
  litCount: number;
}

/**
 * The grid size and lit-cell count for a given 1-indexed round. The lit
 * count grows +1 every two rounds within a run; extreme also grows its
 * grid a side at `gridGrowAt`. Lit count is capped so at least two cells
 * always stay dark.
 */
export function roundParams(cfg: TierConfig, round: number): PatternConfig {
  const gridSize = cfg.gridGrowAt && round >= cfg.gridGrowAt ? cfg.baseGrid + 1 : cfg.baseGrid;
  const cells = gridSize * gridSize;
  const grown = cfg.litStart + Math.floor((round - 1) / 2);
  const litCount = Math.min(grown, Math.max(1, cells - 2));
  return { gridSize, litCount };
}

/**
 * Choose `litCount` distinct cell indices in a `gridSize`×`gridSize` grid.
 * Partial Fisher–Yates guarantees distinctness; the result is sorted for a
 * stable, comparable representation. `rng` is any 0..1 source (seedable in
 * tests via {@link mulberry32}).
 */
export function makePattern(cfg: PatternConfig, rng: () => number): number[] {
  const cells = cfg.gridSize * cfg.gridSize;
  const count = Math.max(0, Math.min(cfg.litCount, cells));
  const pool = Array.from({ length: cells }, (_, i) => i);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (cells - i));
    const t = pool[i];
    pool[i] = pool[j];
    pool[j] = t;
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}

/**
 * A decoy pattern of the same size as `truth`, guaranteed to differ from it
 * in at least one cell (used as the pro/extreme distractor flash).
 */
export function makeDecoy(truth: number[], gridSize: number, rng: () => number): number[] {
  const truthKey = truth.join(',');
  let decoy = makePattern({ gridSize, litCount: truth.length }, rng);
  let tries = 0;
  while (tries < 16 && decoy.join(',') === truthKey) {
    decoy = makePattern({ gridSize, litCount: truth.length }, rng);
    tries++;
  }
  return decoy;
}

/** Small deterministic PRNG for reproducible tests/validation. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
