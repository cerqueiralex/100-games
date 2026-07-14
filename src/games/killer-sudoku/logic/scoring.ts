import type { Difficulty } from '../../../platform/types';

/** Difficulty multipliers 1–5 applied to the 30-point base per correct cell. */
export const PLACEMENT_POINTS: Record<Difficulty, number> = {
  easy: 30,
  medium: 60,
  hard: 90,
  pro: 120,
  extreme: 150
};

export const ERROR_PENALTY = 50;
export const HINT_PENALTY = 30;

/** Par times in seconds; finishing under par earns bonus points per second saved. */
const PAR_SEC: Record<Difficulty, number> = {
  easy: 10 * 60,
  medium: 20 * 60,
  hard: 30 * 60,
  pro: 40 * 60,
  extreme: 50 * 60
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
