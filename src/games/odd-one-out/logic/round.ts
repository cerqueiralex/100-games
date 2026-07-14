import type { Difficulty } from '../../../platform/types';

/**
 * Odd One Out — pure round logic (no React, no DOM), so it can be
 * validated headlessly. A "round" is a square grid of near-identical
 * tiles with exactly ONE that differs; the kind of difference and its
 * magnitude are chosen here. The magnitude shrinks (and the grid grows)
 * as the run advances, and is floored so the odd tile is always
 * technically findable — never literally invisible.
 */

export type DiffKind = 'shade' | 'hue' | 'rotation' | 'size' | 'shape';

/** A 0..1 random source (Math.random in play, a seeded PRNG in tests). */
export type Rng = () => number;

/** The fields `makeRound` needs — a superset lives on TierConfig. */
export interface RoundConfig {
  /** grid dimension at round 0 (grid is size×size) */
  startSize: number;
  /** grid dimension at the winning round */
  endSize: number;
  /** number of rounds to clear to win (1-based count) */
  targetRound: number;
  /** normalized difference magnitude at round 0 (biggest) */
  diffStart: number;
  /** normalized difference magnitude at the winning round (smallest) */
  diffEnd: number;
  /** the magnitude never drops below this — the visibility floor */
  diffFloor: number;
  /** which kinds of difference this tier may use */
  kinds: DiffKind[];
}

export interface TierConfig extends RoundConfig {
  /** base seconds per round (before the more-time assist) */
  roundSec: number;
  /** lives — a wrong tap or a timeout costs one */
  lives: number;
  /** score multiplier 1..5 */
  mult: number;
}

export interface Round {
  size: number;
  oddIndex: number;
  diffKind: DiffKind;
  diffAmount: number;
}

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** 0 at round 0, 1 at (and beyond) the winning round. */
export function roundProgress(targetRound: number, roundIndex: number): number {
  if (targetRound <= 1) return 1;
  return clamp(roundIndex / (targetRound - 1), 0, 1);
}

/** Grid dimension for a round — grows from startSize to endSize. */
export function roundSize(cfg: RoundConfig, roundIndex: number): number {
  const t = roundProgress(cfg.targetRound, roundIndex);
  return Math.round(lerp(cfg.startSize, cfg.endSize, t));
}

/** Normalized difference magnitude for a round — shrinks, floored. */
export function roundDiff(cfg: RoundConfig, roundIndex: number): number {
  const t = roundProgress(cfg.targetRound, roundIndex);
  return Math.max(cfg.diffFloor, lerp(cfg.diffStart, cfg.diffEnd, t));
}

/** Deal one round. Pure: same cfg/index/rng-sequence → same round. */
export function makeRound(cfg: RoundConfig, roundIndex: number, rng: Rng): Round {
  const size = roundSize(cfg, roundIndex);
  const n = size * size;
  const oddIndex = clamp(Math.floor(rng() * n), 0, n - 1);
  const kinds = cfg.kinds.length ? cfg.kinds : (['shade'] as DiffKind[]);
  const diffKind = kinds[clamp(Math.floor(rng() * kinds.length), 0, kinds.length - 1)];
  const diffAmount = roundDiff(cfg, roundIndex);
  return { size, oddIndex, diffKind, diffAmount };
}

/**
 * bigger-diff assist: lift the whole magnitude band (and its floor) so the
 * odd tile stays a little easier to spot at every round.
 */
export function withBiggerDiff(cfg: TierConfig): TierConfig {
  const k = 1.45;
  return {
    ...cfg,
    diffStart: cfg.diffStart * k,
    diffEnd: cfg.diffEnd * k,
    diffFloor: cfg.diffFloor * k
  };
}

export const TIERS: Record<Difficulty, TierConfig> = {
  easy: {
    startSize: 2,
    endSize: 3,
    targetRound: 8,
    roundSec: 8,
    lives: 4,
    mult: 1,
    diffStart: 0.3,
    diffEnd: 0.15,
    diffFloor: 0.13,
    kinds: ['shade', 'size']
  },
  medium: {
    startSize: 3,
    endSize: 4,
    targetRound: 9,
    roundSec: 6,
    lives: 3,
    mult: 2,
    diffStart: 0.22,
    diffEnd: 0.1,
    diffFloor: 0.085,
    kinds: ['shade']
  },
  hard: {
    startSize: 4,
    endSize: 5,
    targetRound: 10,
    roundSec: 5,
    lives: 3,
    mult: 3,
    diffStart: 0.16,
    diffEnd: 0.07,
    diffFloor: 0.06,
    kinds: ['shade', 'rotation']
  },
  pro: {
    startSize: 5,
    endSize: 6,
    targetRound: 10,
    roundSec: 4,
    lives: 2,
    mult: 4,
    diffStart: 0.12,
    diffEnd: 0.055,
    diffFloor: 0.045,
    kinds: ['hue', 'shade']
  },
  extreme: {
    startSize: 6,
    endSize: 6,
    targetRound: 12,
    roundSec: 3.5,
    lives: 2,
    mult: 5,
    diffStart: 0.09,
    diffEnd: 0.038,
    diffFloor: 0.032,
    kinds: ['shade', 'rotation']
  }
};

/** Small, fast seeded PRNG for deterministic tests. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
