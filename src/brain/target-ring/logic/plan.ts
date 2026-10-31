import { rng, shuffle } from '../../../platform/brain/timing';
import type { ConditionId } from './geometry';

/**
 * The scored block's order (SCIENCE.md §1.9 "Blocks"): 12 sequences = the 4
 * conditions × 3 rounds, each round in a new random order. The order is the
 * ONLY generated part of the test — the geometry is fixed — and it is drawn
 * from the run's seed alone, so validate can replay any run.
 *
 * "A new random order" is read strictly [DC]: a round never repeats the
 * previous round's order, and no condition runs twice in a row across a
 * round boundary (two identical rings back to back would not be a new ring).
 */

export const ROUNDS = 3;
export const SLOTS = 12;

const BASE: readonly ConditionId[] = [0, 1, 2, 3];

/** condition id for each of the 12 scored slots, in run order */
export function buildPlan(seed: number): ConditionId[] {
  const r = rng(seed);
  const rounds: ConditionId[][] = [];
  for (let i = 0; i < ROUNDS; i++) {
    const prev = rounds[i - 1];
    let order = shuffle(r, BASE);
    for (let tries = 0; tries < 64 && prev && !acceptable(order, prev); tries++) order = shuffle(r, BASE);
    rounds.push(order);
  }
  return rounds.flat();
}

function acceptable(order: readonly ConditionId[], prev: readonly ConditionId[]): boolean {
  return order[0] !== prev[prev.length - 1] && order.some((c, i) => c !== prev[i]);
}
