import type { Difficulty } from '../../../platform/types';

/** Difficulty multiplier 1–5 applied to cell points and the time bonus. */
export const MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  pro: 4,
  extreme: 5
};

/** Base points per correctly filled cell (awarded once per cell). */
export const CELL_POINTS = 40;
/** Penalty for an entry that breaks a rule against digits already placed. */
export const ERROR_PENALTY = 40;
export const HINT_PENALTY = 30;

/** Par times in seconds; finishing under par earns MULTIPLIER points per second saved. */
const PAR_SEC: Record<Difficulty, number> = {
  easy: 4 * 60,
  medium: 8 * 60,
  hard: 14 * 60,
  pro: 20 * 60,
  extreme: 25 * 60
};

export function timeBonus(difficulty: Difficulty, elapsedSec: number): number {
  return Math.max(0, PAR_SEC[difficulty] - elapsedSec) * MULTIPLIER[difficulty];
}
