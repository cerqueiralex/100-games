/**
 * Target Ring geometry (SCIENCE.md §1.9, ISO 9241-411 multidirectional
 * tapping). Pure and dependency-free, so validate imports it under Node.
 *
 * Every length here is a PROTOCOL millimetre. On a board big enough for the
 * widest ring (D + W = 52 mm) a protocol mm is a physical mm, at the assumed
 * pixels-per-mm of the screen. On a smaller board every length is drawn ×s
 * (s = boardSide / (52 · pxPerMm) < 1) and touches are converted back the
 * same way, so the protocol geometry and every threshold stay identical. s is
 * recorded, and s < 0.9 is flagged as not comparable.
 */

/** targets on the ring */
export const N_TARGETS = 13;
/** the highlight jumps 7 positions each tap: t_k = 7k mod 13 */
export const STEP = 7;
/**
 * The chord between two targets 7 apart, as a fraction of the ring diameter:
 * sin(7π/13) = 0.99271… — the "0.993·D" of SCIENCE.md. Every movement in a
 * sequence has exactly this nominal length.
 */
export const CHORD_FACTOR = Math.sin((STEP * Math.PI) / N_TARGETS);
/** the widest ring's outer extent, D + W = 40 + 12 mm */
export const MAX_EXTENT_MM = 52;
/**
 * Uncalibrated CSS px per physical mm for recent phones — SCIENCE.md §1.9's
 * documented default ([U]: derived from manufacturer ppi and scale factors,
 * not verified). The MVP ships without the bank-card calibration, so every
 * run uses this value and stores it.
 */
export const DEFAULT_PX_PER_MM = 6.2;
/** inactive ring positions are drawn as 2 mm dots */
export const DOT_MM = 2;
/** below this board scale a run is flagged 'not-comparable' */
export const SCALE_COMPARABLE = 0.9;
/** a sequence's start tap must land within W/2 + this of target 0 [DC] */
export const START_SLOP_MM = 3;

export type ConditionId = 0 | 1 | 2 | 3;

export interface Condition {
  id: ConditionId;
  /** ring diameter, centre to centre (protocol mm) */
  D: number;
  /** target diameter (protocol mm) */
  W: number;
  /** how the ring reads to the player */
  label: string;
}

/**
 * The four conditions, D ∈ {20, 40} × W ∈ {7, 12} mm, listed in ascending
 * nominal ID (1.41, 1.94, 2.11, 2.74 bits) — so condition 0 is the easiest
 * and condition 3 the hardest (the Fitts-signature flag compares those two).
 * The index is what the trial log stores.
 */
export const CONDITIONS: readonly Condition[] = [
  { id: 0, D: 20, W: 12, label: 'Small ring · big targets' },
  { id: 1, D: 20, W: 7, label: 'Small ring · small targets' },
  { id: 2, D: 40, W: 12, label: 'Wide ring · big targets' },
  { id: 3, D: 40, W: 7, label: 'Wide ring · small targets' }
];

export const EASIEST: ConditionId = 0;
export const HARDEST: ConditionId = 3;
/** the per-session warm-up sequence: D 40, W 12 (SCIENCE.md §1.9 "Blocks") */
export const WARMUP_COND: ConditionId = 2;
/** first run only: two practice sequences, the easiest and the hardest ring [DC] */
export const PRACTICE_CONDS: readonly ConditionId[] = [0, 3];

/** nominal ID = log2(0.993·D / W + 1) bits */
export function nominalId(c: Pick<Condition, 'D' | 'W'>): number {
  return Math.log2((CHORD_FACTOR * c.D) / c.W + 1);
}

/** angle of target j: target 0 at 12 o'clock, numbered clockwise (screen y points down) */
export function targetAngle(j: number): number {
  return -Math.PI / 2 + (2 * Math.PI * j) / N_TARGETS;
}

export interface Point {
  x: number;
  y: number;
}

/** centre of target j on a ring of diameter D, protocol mm from the board centre (y down) */
export function targetCentre(j: number, D: number): Point {
  const a = targetAngle(j);
  return { x: (D / 2) * Math.cos(a), y: (D / 2) * Math.sin(a) };
}

/**
 * The lit target for k = 0…13: k = 0 is target 0, whose tap starts the
 * sequence and is not scored; k = 1…13 are the 13 scored selections, ending
 * back on target 0.
 */
export function sequenceTargets(step: number = STEP, n: number = N_TARGETS): number[] {
  return Array.from({ length: n + 1 }, (_, k) => (step * k) % n);
}

export const SEQUENCE: readonly number[] = sequenceTargets();

/**
 * The scale factor s for a board of `sidePx` CSS px: 1 when the widest ring
 * fits at full size, else the shrink that makes it fit. NaN on bad input.
 */
export function boardScale(sidePx: number, pxPerMm: number): number {
  if (!(sidePx > 0) || !(pxPerMm > 0)) return NaN;
  return Math.min(1, sidePx / (MAX_EXTENT_MM * pxPerMm));
}

export function dist(p: Point, q: Point): number {
  return Math.hypot(p.x - q.x, p.y - q.y);
}
