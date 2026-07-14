import type { Difficulty } from '../../../platform/types';

export interface Rules {
  /** board is size×size */
  size: number;
  /** first tile value that wins */
  target: number;
  /** probability a spawned tile is a 4 rather than a 2 */
  fourChance: number;
  /** score multiplier (1..5) */
  mult: number;
  /** extreme tier: occasionally spawn a temporary, non-merging blocker */
  blockers: boolean;
}

export const RULES: Record<Difficulty, Rules> = {
  easy: { size: 5, target: 1024, fourChance: 0.1, mult: 1, blockers: false },
  medium: { size: 4, target: 2048, fourChance: 0.1, mult: 2, blockers: false },
  hard: { size: 4, target: 2048, fourChance: 0.2, mult: 3, blockers: false },
  pro: { size: 4, target: 4096, fourChance: 0.2, mult: 4, blockers: false },
  extreme: { size: 4, target: 4096, fourChance: 0.25, mult: 5, blockers: true }
};

/** flat one-time bonus applied (×mult) when the target is reached */
export const WIN_BONUS = 1000;
/** each hint used shaves this off the final score */
export const HINT_PENALTY = 50;
/** how many moves a blocker survives before it clears */
export const BLOCKER_TTL = 6;
/** undo uses granted per game */
export const MAX_UNDOS = 5;

/** the score the shell records — raw merge points scaled + win bonus − hints. */
export function computeScore(raw: number, won: boolean, hintsUsed: number, mult: number): number {
  const s = raw * mult + (won ? WIN_BONUS * mult : 0) - hintsUsed * HINT_PENALTY;
  return Math.max(0, Math.round(s));
}
