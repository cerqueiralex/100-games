/**
 * Arrow Squared — the fixed protocol parameters (SCIENCE.md §1.5, Flanker
 * Squared — Burgoyne, Tsukahara, Mashburn, Pak & Engle 2023 — and the
 * "attention" row of §2.12). Pure constants plus the reference function, so
 * validate can import them under Node and compare them with the dossier.
 * A change to any timing or count here is a PROTOCOL change: update
 * SCIENCE.md in the same commit and bump `protocolVersion` in index.ts.
 */
import { zFrom } from '../../../platform/brain/timing';

/** the scored block: a hard stop 90.0 s after the first item's onset [V] */
export const TEST_MS = 90_000;
/** the unscored practice block with feedback, repeated every session as the warm-up [V; every session DC] */
export const WARMUP_MS = 30_000;
/** the countdown before the scored block: 3 beats of 1 s [V] */
export const COUNTDOWN_FROM = 3;
export const COUNTDOWN_STEP_MS = 1000;
/** at most this many same-side correct answers in a row [DC] */
export const MAX_SIDE_RUN = 3;
/** responses faster than this are probable mis-taps (the FlankerDL cut-off — Draheim et al. 2021) [V] */
export const FAST_RT_MS = 200;
/** a run with MORE than this share of probable mis-taps is invalid [DC] */
export const FAST_MAX_SHARE = 0.1;
/** how long the tick / cross beside the score stays up [DC: "about 250 ms"] */
export const FEEDBACK_MS = 250;
/** guided practice items on the first run — one per trial type (design choice, unscored) */
export const GUIDED_ITEMS = 4;

/**
 * The literature anchor (grade C): Burgoyne et al. 2023, Study 2, first
 * in-lab administration — N = 290, ages 18–35, desktop computer and mouse:
 * M = 40.43, SD = 14.17 net points per 90 s.
 */
export const REF_MU = 40.43;
export const REF_SD = 14.17;
/** test–retest r over about 32 days in the lab (Burgoyne et al. 2023) */
export const REF_RETEST = 0.74;

/**
 * z of a run against the anchor — reads ONLY the primary metric (`net`).
 * The index is 50 + 10z (timing.ts indexFromZ), never a percentile.
 */
export function referenceZ(metrics: Record<string, number>): number {
  return zFrom(metrics.net, REF_MU, REF_SD, 'higher');
}

/**
 * Scheduling and analysis parameters, exactly as SCIENCE.md §2.12 lists them
 * for attention: run-in R = 2, σ floor = SEM_ref = 14.17·√(1 − .74) ≈ 7.2
 * net points, not practice-prone (d = −0.07), state-sensitive, interruption
 * class A (fixed-time block), 2×/week.
 */
export const SCHEDULE = {
  runIn: 2,
  noiseFloorAbs: 7.2,
  practiceProne: false,
  stateSensitive: true,
  interruption: 'A',
  perWeek: 2
} as const;
