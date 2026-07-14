import type { Difficulty } from '../../../platform/types';

/** points per cell matching the solution — base 20 × difficulty multiplier 1–5 */
export const CELL_POINTS: Record<Difficulty, number> = {
  easy: 20,
  medium: 40,
  hard: 60,
  pro: 80,
  extreme: 100
};

/** a placement that completes a broken run (bad sum or repeat) */
export const ERROR_PENALTY = 25;

/** hints cancel the hinted cell's points and cost 25 more, netting −25 */
export function hintPenalty(difficulty: Difficulty): number {
  return CELL_POINTS[difficulty] + 25;
}

/** par times in seconds; finishing under par earns bonus points per second saved */
const PAR_SEC: Record<Difficulty, number> = {
  easy: 5 * 60,
  medium: 10 * 60,
  hard: 16 * 60,
  pro: 24 * 60,
  extreme: 35 * 60
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
