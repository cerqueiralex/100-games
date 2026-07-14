import type { Difficulty } from '../../../platform/types';

/** Difficulty multiplier ×1..×5 (easy → extreme). */
export const MULT: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  pro: 4,
  extreme: 5
};

const CELL_BASE = 30;
const WIN_BASE = 100;

export const ERROR_PENALTY = 30;
export const HINT_PENALTY = 40;

/** Points the first time a cell holds its correct digit. */
export function cellPoints(difficulty: Difficulty): number {
  return CELL_BASE * MULT[difficulty];
}

export function winBonus(difficulty: Difficulty): number {
  return WIN_BASE * MULT[difficulty];
}

/** Par times in seconds; finishing under par earns bonus points per second saved. */
const PAR_SEC: Record<Difficulty, number> = {
  easy: 5 * 60,
  medium: 8 * 60,
  hard: 12 * 60,
  pro: 16 * 60,
  extreme: 20 * 60
};

export function timeBonus(difficulty: Difficulty, elapsedSec: number): number {
  return Math.max(0, PAR_SEC[difficulty] - elapsedSec) * MULT[difficulty];
}
