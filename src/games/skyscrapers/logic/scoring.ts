import type { Difficulty } from '../../../platform/types';

/** points per placed tower — base 20 × difficulty multiplier 1–5 */
export const CELL_POINTS: Record<Difficulty, number> = {
  easy: 20,
  medium: 40,
  hard: 60,
  pro: 80,
  extreme: 100
};

export const ERROR_PENALTY = 50;
export const HINT_PENALTY = 25;

/** Par times in seconds; finishing under par earns bonus points per second saved. */
const PAR_SEC: Record<Difficulty, number> = {
  easy: 4 * 60,
  medium: 9 * 60,
  hard: 15 * 60,
  pro: 22 * 60,
  extreme: 32 * 60
};

const BONUS_PER_SEC: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  pro: 4,
  extreme: 5
};

export function timeBonus(difficulty: Difficulty, elapsedSec: number): number {
  return Math.max(0, PAR_SEC[difficulty] - elapsedSec) * BONUS_PER_SEC[difficulty];
}
