import { PROTOCOL } from './protocol';

/**
 * Block Span — the C-SST 1:2 staircase (SCIENCE.md §1.6 "Staircase").
 * Start at L = 3; +1 after every correct trial; −1 after two consecutive
 * incorrect trials. The miss counter resets after any correct trial and
 * after each step down; at the lower bound the second miss still resets it
 * (the step is taken and clamped) [DC]. Bounds 2–10.
 */

export interface StairState {
  /** the length of the NEXT trial */
  L: number;
  /** consecutive misses since the last correct trial or step down */
  misses: number;
}

export interface StairBounds {
  min: number;
  max: number;
}

const SCORED_BOUNDS: StairBounds = { min: PROTOCOL.lMin, max: PROTOCOL.lMax };

export function stairStart(L: number = PROTOCOL.lStart): StairState {
  return { L, misses: 0 };
}

/** the state after a trial at `s.L` was answered `correct` */
export function stairStep(s: StairState, correct: boolean, bounds: StairBounds = SCORED_BOUNDS): StairState {
  if (correct) return { L: Math.min(bounds.max, s.L + 1), misses: 0 };
  const misses = s.misses + 1;
  if (misses >= PROTOCOL.missesToStepDown) return { L: Math.max(bounds.min, s.L - 1), misses: 0 };
  return { L: s.L, misses };
}

/** the lengths presented by a scripted correct/incorrect pattern, plus the state after it */
export function replayStaircase(
  pattern: readonly boolean[],
  start: number = PROTOCOL.lStart,
  bounds: StairBounds = SCORED_BOUNDS
): { lengths: number[]; final: StairState } {
  let s = stairStart(start);
  const lengths: number[] = [];
  for (const correct of pattern) {
    lengths.push(s.L);
    s = stairStep(s, correct, bounds);
  }
  return { lengths, final: s };
}
