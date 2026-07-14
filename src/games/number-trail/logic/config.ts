/*
 * Number Trail — per-difficulty gameplay parameters (pure, testable).
 * Kept out of the component so the validator/tests reproduce the exact
 * rounds the game generates.
 */

import type { Difficulty } from '../../../platform/types';
import { gridDimForCount, type RoundConfig } from './round';

export interface TierConfig {
  /** numbers shown in round 1 (grows by one each round) */
  startCount: number;
  /** how long the numbers stay visible, in ms */
  flashMs: number;
  /** wrong taps allowed before the game is lost */
  lives: number;
  /** clear this many rounds to win */
  targetRounds: number;
  /** score multiplier, 1..5 */
  mult: number;
  /** extreme: distinct random values instead of 1..count */
  nonConsecutive: boolean;
}

export const TIERS: Record<Difficulty, TierConfig> = {
  easy: { startCount: 4, flashMs: 2500, lives: 4, targetRounds: 6, mult: 1, nonConsecutive: false },
  medium: { startCount: 5, flashMs: 1800, lives: 3, targetRounds: 7, mult: 2, nonConsecutive: false },
  hard: { startCount: 6, flashMs: 1200, lives: 3, targetRounds: 8, mult: 3, nonConsecutive: false },
  pro: { startCount: 7, flashMs: 800, lives: 2, targetRounds: 8, mult: 4, nonConsecutive: false },
  extreme: { startCount: 8, flashMs: 600, lives: 2, targetRounds: 9, mult: 5, nonConsecutive: true }
};

/** Numbers shown in a given round of a tier. */
export function countForRound(cfg: TierConfig, round: number): number {
  return cfg.startCount + (round - 1);
}

/** The RoundConfig fed to makeRound for a given tier + round. */
export function roundConfigFor(cfg: TierConfig, round: number): RoundConfig {
  const count = countForRound(cfg, round);
  return { count, gridDim: gridDimForCount(count), nonConsecutive: cfg.nonConsecutive };
}
