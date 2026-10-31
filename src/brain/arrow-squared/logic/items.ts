/**
 * Arrow Squared — item generation (SCIENCE.md §1.5: Flanker Squared,
 * Burgoyne et al. 2023). Pure: no DOM, no React, no unseeded randomness. Every item
 * derives from the run seed through rng(), so each run is a fresh alternate
 * form and validate can replay any run exactly.
 *
 * An item is a TARGET row of 5 arrows and two OPTION rows of 5 arrows. The
 * rule: the correct option is the one whose CENTRE arrow points the way the
 * target's OUTER (flanking) arrows point. The target's centre arrow and the
 * options' outer arrows are distractors.
 */
import { rng } from '../../../platform/brain/timing';
import { MAX_SIDE_RUN } from './protocol';

/** an arrow's direction: 0 = left, 1 = right */
export type Dir = 0 | 1;
/** an option pad's side on screen: 0 = left, 1 = right */
export type Side = 0 | 1;

/**
 * The four trial types, p = .25 each — the codes stored in the trial log:
 *  0 FC    congruent target,   congruent options
 *  1 FI    incongruent target, incongruent options
 *  2 TC-OI congruent target,   incongruent options
 *  3 TI-OC incongruent target, congruent options
 */
export type TrialType = 0 | 1 | 2 | 3;
export const TRIAL_TYPE_NAMES = ['FC', 'FI', 'TC-OI', 'TI-OC'] as const;

export interface Item {
  type: TrialType;
  /** d — the direction of the target's flanking (outer) arrows */
  dir: Dir;
  /** the side of the correct option */
  side: Side;
  /** 5 arrows */
  target: Dir[];
  /** [left pad, right pad], 5 arrows each */
  options: [Dir[], Dir[]];
}

export const flip = <T extends 0 | 1>(x: T): T => (x === 0 ? 1 : 0) as T;

/** a 5-arrow row: four outer arrows and the centre one */
export function row(outer: Dir, centre: Dir): Dir[] {
  return [outer, outer, centre, outer, outer];
}

export const targetCongruent = (t: TrialType): boolean => t === 0 || t === 2;
export const optionsCongruent = (t: TrialType): boolean => t === 0 || t === 3;

/**
 * Build one item exactly as SCIENCE.md §1.5 specifies:
 *  - congruent target: all 5 arrows point d; incongruent: the outer 4 point
 *    d and the centre points the other way;
 *  - congruent options: one all-left and one all-right row, the correct one
 *    pointing d; incongruent options: the correct one has its centre
 *    pointing d and its outer arrows the other way, the lure has its centre
 *    pointing away from d and its outer arrows pointing d.
 */
export function makeItem(type: TrialType, dir: Dir, side: Side): Item {
  const target = targetCongruent(type) ? row(dir, dir) : row(dir, flip(dir));
  const correct = optionsCongruent(type) ? row(dir, dir) : row(flip(dir), dir);
  const lure = optionsCongruent(type) ? row(flip(dir), flip(dir)) : row(dir, flip(dir));
  return { type, dir, side, target, options: side === 0 ? [correct, lure] : [lure, correct] };
}

/** independent seeded streams per block, so the warm-up never consumes test items */
export const BLOCK = { test: 1, warmup: 2, tutorial: 3 } as const;

/** a well-mixed 32-bit sub-seed of the run seed for one block (murmur3 finaliser) */
export function blockSeed(seed: number, block: number): number {
  let h = ((seed >>> 0) ^ Math.imul(block + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * The self-paced item sequence of one block. Per trial, in this fixed draw
 * order: d ∈ {left, right} with p = .5; the trial type with p = .25 each;
 * the correct side with p = .5 — except that a 4th same-side answer in a
 * row is turned to the other side (at most MAX_SIDE_RUN in a row; the
 * correction is symmetric, so each side stays at p = .5). The sequence
 * depends only on the seed, never on the player's answers.
 */
export function itemStream(seed: number): () => Item {
  const r = rng(seed);
  let last: Side | -1 = -1;
  let run = 0;
  return () => {
    const dir: Dir = r() < 0.5 ? 0 : 1;
    const type = Math.min(3, Math.floor(r() * 4)) as TrialType;
    let side: Side = r() < 0.5 ? 0 : 1;
    if (side === last && run >= MAX_SIDE_RUN) side = flip(side);
    run = side === last ? run + 1 : 1;
    last = side;
    return makeItem(type, dir, side);
  };
}

/** the first `n` items of a block — validate's replay */
export function firstItems(seed: number, n: number): Item[] {
  const next = itemStream(seed);
  return Array.from({ length: n }, next);
}

/**
 * The guided first-run items: one per trial type, easiest conflict first
 * (FC → TI-OC → TC-OI → FI), d and side drawn from the tutorial stream.
 */
export function guidedItems(seed: number): Item[] {
  const r = rng(blockSeed(seed, BLOCK.tutorial));
  return ([0, 3, 2, 1] as TrialType[]).map((type) => makeItem(type, r() < 0.5 ? 0 : 1, r() < 0.5 ? 0 : 1));
}

/**
 * The worked example of the first-run instructions: fully incongruent, so
 * the lure is a copy of the target — the trap the rule has to overcome.
 * Target → → ← → →; correct option (left) ← ← → ← ←; lure (right) → → ← → →.
 */
export const WORKED_EXAMPLE: Item = makeItem(1, 1, 0);

/** the side the RULE picks from the drawn arrows alone, or −1 if neither or both qualify */
export function answerFor(target: readonly Dir[], options: readonly [readonly Dir[], readonly Dir[]]): Side | -1 {
  const outer = target[0];
  const ok = options.map((o) => o[2] === outer);
  return ok[0] === ok[1] ? -1 : ok[0] ? 0 : 1;
}

/** every way an item breaks the paradigm — empty for a faithful item */
export function itemProblems(it: Item): string[] {
  const p: string[] = [];
  const OUTER = [0, 1, 3, 4];
  if (it.target.length !== 5 || it.options.some((o) => o.length !== 5)) return ['every row has 5 arrows'];
  if (!OUTER.every((i) => it.target[i] === it.dir)) p.push("the target's outer arrows must all point d");
  if ((it.target[2] === it.dir) !== targetCongruent(it.type)) p.push("the target's centre does not match the trial type");
  const correct = it.options[it.side];
  const lure = it.options[flip(it.side)];
  if (correct[2] !== it.dir) p.push("the correct option's centre arrow must equal the target's flanker direction");
  if (lure[2] === it.dir) p.push("the lure's centre arrow must point away from d");
  if (optionsCongruent(it.type)) {
    if (!correct.every((a) => a === it.dir) || !lure.every((a) => a === flip(it.dir)))
      p.push('congruent options must be one all-d row and one all-opposite row');
  } else {
    if (!OUTER.every((i) => correct[i] === flip(it.dir))) p.push("the correct incongruent option's outer arrows must point away from d");
    if (!OUTER.every((i) => lure[i] === it.dir)) p.push("the lure's outer arrows must point d");
  }
  if (answerFor(it.target, it.options) !== it.side) p.push('the rule applied to the drawn arrows does not give the keyed side');
  return p;
}

/** the longest run of equal values — the same-side constraint's measure */
export function longestRun(xs: readonly number[]): number {
  let best = 0;
  let run = 0;
  for (let i = 0; i < xs.length; i++) {
    run = i > 0 && xs[i] === xs[i - 1] ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}
