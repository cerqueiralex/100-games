import type { Difficulty } from '../../../platform/types';

/** Difficulty multiplier, 1..5 — scales every reward and the win bonus. */
export const MULT: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  pro: 4,
  extreme: 5
};

/** Points per number the player has correctly slotted into the grid. */
export const PLACE_PTS = 25;
/** Flat win bonus (×MULT). */
export const WIN_BONUS = 250;
/** Penalty each time a completed line breaks the magic sum. */
export const ERROR_PENALTY = 40;
/** Penalty per hint used. */
export const HINT_PENALTY = 25;

/** Par times in seconds; solving under par earns bonus points per second. */
const PAR_SEC: Record<Difficulty, number> = {
  easy: 120,
  medium: 180,
  hard: 300,
  pro: 420,
  extreme: 600
};

export function timeBonus(difficulty: Difficulty, elapsedSec: number): number {
  return Math.max(0, PAR_SEC[difficulty] - elapsedSec) * MULT[difficulty];
}

/**
 * Score = placed numbers × points × multiplier − errors − hints, plus a win
 * bonus and an under-par time bonus on completion. Derived purely from state,
 * so picking a number back up subtracts its points (no place/remove farming).
 */
export function computeScore(opts: {
  difficulty: Difficulty;
  filled: number;
  errors: number;
  hintsUsed: number;
  won: boolean;
  elapsedSec: number;
}): number {
  const m = MULT[opts.difficulty];
  let s = opts.filled * PLACE_PTS * m - opts.errors * ERROR_PENALTY - opts.hintsUsed * HINT_PENALTY;
  if (opts.won) s += WIN_BONUS * m + timeBonus(opts.difficulty, opts.elapsedSec);
  return Math.max(0, Math.round(s));
}
