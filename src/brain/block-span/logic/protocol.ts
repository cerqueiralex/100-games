/**
 * Block Span — the fixed protocol (SCIENCE.md §1.6, "Memory: adaptive
 * spatial span (C-SST)"). Every number the test runs on lives here, once,
 * so the component, the scoring and the validate check can never disagree.
 * A change to anything in PROTOCOL that can move a raw score MUST bump
 * `protocolVersion` in index.ts and update SCIENCE.md in the same commit.
 *
 * Dependency-free: no DOM, no React — validate imports it under Node.
 */

export const PROTOCOL = {
  /* ---- display ---- */
  /** identical blocks on every scored and warm-up trial (the C-SST uses 10) */
  blocks: 10,
  /** blocks on the first-run practice display */
  practiceBlocks: 6,
  /** arena side S = min(viewport width − 32, 0.6 × viewport height, 420) px */
  arenaGutterPx: 32,
  arenaVhFraction: 0.6,
  arenaMaxPx: 420,
  /**
   * [DC] floor under S: below 264 px even the fallback lattice cannot keep
   * centres 1.5 b apart (pitch S/4 < 66 px with b = 44). Only a landscape
   * phone gets there — portrait (C7) never does (S ≥ 288 at 320 px wide).
   */
  arenaMinPx: 264,
  /** block side b = max(44, round(0.13 × S)) px */
  blockMinPx: 44,
  blockFraction: 0.13,
  /** placement: centres ≥ 1.5 b apart, ≥ 0.5 b + 4 px from the arena edge */
  spacingInBlocks: 1.5,
  edgePx: 4,
  /** rejection-sampling budget: candidate draws per layout before the lattice fallback */
  layoutAttempts: 500,
  /** the fallback lattice is 4 × 4 cells */
  latticeSide: 4,

  /* ---- trial timeline (ms) ---- */
  /** the new layout stands still before the first highlight */
  staticMs: 1000,
  /** each highlight: 500 on, 500 off (1000 onset-to-onset — eCorsi, Brunetti et al. 2014) */
  onMs: 500,
  offMs: 500,
  /** the recall cue comes this long after the last highlight turns off */
  cueDelayMs: 500,
  /** an ON period further than this from 500 ms voids the trial (replaced, uncounted) */
  onToleranceMs: 50,

  /* ---- response ---- */
  /** hit area = the block plus this padding on every side (pointerup inside it) */
  hitPadPx: 6,
  /** each registered tap lights its block this long */
  tapFlashMs: 150,
  /** the trial ends this long after the L-th tap */
  endDelayMs: 300,
  /** no tap for this long (from the cue or the last tap) ends the trial as incorrect */
  inactivityMs: 15000,

  /* ---- staircase (C-SST 1:2) ---- */
  lStart: 3,
  lMin: 2,
  lMax: 10,
  /** consecutive misses that step the length down */
  missesToStepDown: 2,

  /* ---- block ---- */
  /** scored trials, no early stop */
  scoredTrials: 14,
  /** the per-session warm-up: one unscored trial at L = 3 (Appendix C.7) */
  warmupTrials: 1,
  warmupL: 3,
  /** first-run practice: 4 trials on the 6-block display from L = 2, with feedback */
  practiceTrials: 4,
  practiceStart: 2,
  /** [DC] the practice staircase is capped at 4 — it teaches the procedure, it measures nothing */
  practiceMax: 4,

  /* ---- interruptions (class B) and validity ---- */
  /** more than this many interruptions during the scored block → invalid */
  maxInterruptions: 2,
  /** more than this much paused time during the scored block → invalid */
  maxPausedMs: 60000,
  /** this many inactivity timeouts → invalid */
  timeoutsInvalid: 3,
  /** this many trials voided for presentation timing → invalid */
  voidedTimingInvalid: 3,

  /* ---- pacing between trials [DC] ---- */
  /** the finished layout fades out over this long … */
  itiFadeMs: 220,
  /** … then the arena stays empty this long before the next layout appears */
  itiBlankMs: 500
} as const;

export type TrialKind = 'practice' | 'warmup' | 'scored';

/** the three ladders a run walks through: same trial machinery, different settings */
export interface LadderConfig {
  kind: TrialKind;
  /** blocks on the display */
  n: number;
  /** trials in this ladder (voided trials are replaced, so this many are completed) */
  trials: number;
  start: number;
  min: number;
  max: number;
}

export const LADDERS: Record<TrialKind, LadderConfig> = {
  practice: {
    kind: 'practice',
    n: PROTOCOL.practiceBlocks,
    trials: PROTOCOL.practiceTrials,
    start: PROTOCOL.practiceStart,
    min: PROTOCOL.lMin,
    max: PROTOCOL.practiceMax
  },
  warmup: {
    kind: 'warmup',
    n: PROTOCOL.blocks,
    trials: PROTOCOL.warmupTrials,
    start: PROTOCOL.warmupL,
    min: PROTOCOL.lMin,
    max: PROTOCOL.lMax
  },
  scored: {
    kind: 'scored',
    n: PROTOCOL.blocks,
    trials: PROTOCOL.scoredTrials,
    start: PROTOCOL.lStart,
    min: PROTOCOL.lMin,
    max: PROTOCOL.lMax
  }
};

/** murmur3's 32-bit finaliser — a cheap, well-mixed integer hash */
function mix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

const KIND_TAG: Record<TrialKind, number> = { practice: 0x51a7, warmup: 0x2c3d, scored: 0x7e19 };

/**
 * The seed of ONE trial attempt, derived from the run seed (SCIENCE.md C8).
 * Each attempt draws from its own independent stream, so an attempt's
 * layout and sequence depend only on (run seed, ladder, attempt number,
 * length, arena side) — a voided trial or a longer practice can never shift
 * what a later trial shows, and validate can regenerate any logged trial.
 */
export function trialSeed(seed: number, kind: TrialKind, attempt: number): number {
  return mix32((seed >>> 0) ^ mix32(Math.imul(KIND_TAG[kind], 0x9e3779b1) + Math.imul(attempt + 1, 0x85ebca77)));
}
