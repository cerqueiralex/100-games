/** Per-difficulty tuning for Count & Compare. Five tiers, each meaningfully
 *  distinct: more shapes, shorter flash, tougher question mix, fewer lives. */

import type { Difficulty } from '../../../platform/types';
import type { ColorKey, ShapeKind, QuestionType } from './types';
import { COLOR_KEYS, SHAPE_KINDS } from './types';

export interface TierConfig {
  /** shape-count band — round 1 uses shapeMin, the final round uses shapeMax */
  shapeMin: number;
  shapeMax: number;
  /** flash time at round 1 (ms); shrinks toward ~72% by the final round */
  flashMs: number;
  /** base time to answer after the flash hides (ms) */
  answerMs: number;
  lives: number;
  rounds: number;
  /** score multiplier 1..5 */
  mult: number;
  /** how many distinct colors are drawn from */
  colorCount: number;
  /** how many distinct shape kinds are drawn from */
  shapeCount: number;
  /** number of choices for count questions */
  optionCount: number;
  /** question types this tier may ask */
  types: QuestionType[];
}

const COMPARE: QuestionType[] = ['compare-color'];
const COUNTS: QuestionType[] = ['compare-color', 'compare-shape', 'count-shape', 'count-color'];
const WITH_TOTAL: QuestionType[] = [...COUNTS, 'count-total'];
const ALL: QuestionType[] = [...WITH_TOTAL, 'parity', 'count-two-attr'];

export const CONFIG: Record<Difficulty, TierConfig> = {
  easy: {
    shapeMin: 4, shapeMax: 7, flashMs: 1500, answerMs: 4200, lives: 4, rounds: 8,
    mult: 1, colorCount: 3, shapeCount: 3, optionCount: 3, types: COMPARE
  },
  medium: {
    shapeMin: 6, shapeMax: 10, flashMs: 1100, answerMs: 3800, lives: 3, rounds: 9,
    mult: 2, colorCount: 3, shapeCount: 3, optionCount: 3, types: COUNTS
  },
  hard: {
    shapeMin: 9, shapeMax: 14, flashMs: 850, answerMs: 3300, lives: 3, rounds: 10,
    mult: 3, colorCount: 4, shapeCount: 4, optionCount: 4, types: WITH_TOTAL
  },
  pro: {
    shapeMin: 12, shapeMax: 18, flashMs: 650, answerMs: 3000, lives: 2, rounds: 10,
    mult: 4, colorCount: 5, shapeCount: 4, optionCount: 4, types: ALL
  },
  extreme: {
    shapeMin: 16, shapeMax: 24, flashMs: 500, answerMs: 2700, lives: 2, rounds: 12,
    mult: 5, colorCount: 6, shapeCount: 4, optionCount: 4, types: ALL
  }
};

export function tierColors(cfg: TierConfig): ColorKey[] {
  return COLOR_KEYS.slice(0, cfg.colorCount);
}

export function tierShapes(cfg: TierConfig): ShapeKind[] {
  return SHAPE_KINDS.slice(0, cfg.shapeCount);
}

/** fraction 0..1 across the tier's rounds (round 1 -> 0, final round -> 1) */
function progress(cfg: TierConfig, round: number): number {
  if (cfg.rounds <= 1) return 1;
  const r = Math.max(1, Math.min(round, cfg.rounds));
  return (r - 1) / (cfg.rounds - 1);
}

export function shapesForRound(cfg: TierConfig, round: number): number {
  return Math.round(cfg.shapeMin + (cfg.shapeMax - cfg.shapeMin) * progress(cfg, round));
}

export function flashMsForRound(cfg: TierConfig, round: number): number {
  return Math.round(cfg.flashMs * (1 - 0.28 * progress(cfg, round)));
}
