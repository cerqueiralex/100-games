import { zFrom } from '../../../platform/brain/timing';

/**
 * Arithmetic Sprint — the protocol in numbers (SCIENCE.md §1.7, the
 * "calculation" row of §2.12, Appendix B "Calculation"). Pure and
 * dependency-free apart from timing.ts, so the component, the definition and
 * the validate check all read the SAME constants — change one here and
 * SCIENCE.md (and protocolVersion / scoringVersion / referenceVersion) in the
 * same commit.
 */

/** the scored block: 120.0 s of speeded production, from the first problem's onset */
export const BLOCK_MS = 120_000;
/** CPM divides correct answers by this (C / 2.0) */
export const BLOCK_MINUTES = BLOCK_MS / 60_000;

/** items come in cycles of 8: four operation runs of 2 (one simple, one complex) */
export const CYCLE_LENGTH = 8;
/** pre-generated items — 15 cycles, far beyond anything a 2-minute block reaches */
export const ITEM_COUNT = 120;

/** the answer field holds up to 3 digits (the largest answer is 9 × 19 = 171) */
export const MAX_DIGITS = 3;

/** first-run practice: one untimed simple item per operation */
export const PRACTICE_ITEMS = 4;

/** validity (C11): fewer than 8 submissions → invalid ('too-few') */
export const MIN_SUBMISSIONS = 8;
/** validity: accuracy below 85% → invalid ('rushed', SCIENCE.md A24) */
export const MIN_ACCURACY_PCT = 85;
/** a submission this soon after onset is implausible (≥ 2 keys + ✓): dropped from RT statistics */
export const FAST_MS = 400;

/** practice feedback beats (untimed practice only — the scored block shows none) */
export const PRACTICE_GOOD_MS = 750;
export const PRACTICE_BAD_MS = 2600;

/**
 * Reference anchor (grade C): Math4Speed, excluding Greece (n = 1,063):
 * 81.04 ± 31.70 correct per 8 minutes = 10.1 ± 4.0 correct per minute
 * averaged over operations (Loenneker et al. 2025).
 */
export const REF_MU = 10.1;
export const REF_SIGMA = 4.0;

/**
 * z of a run against the anchor — reads ONLY the primary metric. The index is
 * always 50 + 10z (timing.ts indexFromZ): 6.1 → 40, 10.1 → 50, 14.1 → 60.
 */
export function referenceZ(metrics: Record<string, number>): number {
  return zFrom(metrics.cpm, REF_MU, REF_SIGMA, 'higher');
}

/**
 * The analytics parameters of the "calculation" row of SCIENCE.md §2.12 —
 * kept here (not only in index.ts) so the validate check can pin them
 * without importing React.
 */
export const META = {
  runIn: 3,
  /** SEM_ref ≈ 4.0 × √(1 − .81) ≈ 1.7 CPM */
  noiseFloor: { abs: 1.7 },
  practiceProne: true,
  /** "unknown" in §2.12 — so it stays out of the Today composite */
  stateSensitive: false,
  interruption: 'A',
  perWeek: 2
} as const;
