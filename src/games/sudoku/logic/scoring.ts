import type { Difficulty } from '../../../platform/types';

export const PLACEMENT_POINTS: Record<Difficulty, number> = {
  easy: 50,
  medium: 75,
  hard: 100,
  pro: 125,
  extreme: 150
};

export const ERROR_PENALTY = 50;
export const HINT_PENALTY = 25;

/** Par times in seconds; finishing under par earns bonus points per second saved. */
const PAR_SEC: Record<Difficulty, number> = {
  easy: 8 * 60,
  medium: 15 * 60,
  hard: 25 * 60,
  pro: 35 * 60,
  extreme: 45 * 60
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
