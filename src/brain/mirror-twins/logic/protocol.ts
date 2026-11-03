/**
 * Mirror Twins — the protocol (SCIENCE.md §1.13 "Protocol"): every timing
 * and count, the trial plans and the seeded item generator. Pure — all
 * randomness comes from the run's seed through rng() (timing.ts), never the
 * global unseeded generator, so validate replays a run exactly.
 *
 * Seed layout: the plan draws from its own stream, and every item draws from
 * a stream of its own SLOT (mixSeed(seed, slot)), so an item can be rebuilt
 * from (seed, slot, condition) alone and a replacement item (a voided or
 * anticipated trial) never disturbs any other.
 */
import { pick, randInt, randRange, rng, shuffle } from '../../../platform/brain/timing';
import {
  ARM_ORDERINGS,
  DIRS,
  buildFigure,
  mirrorCubes,
  project,
  shapeIsAcceptable,
  viewIsReadable,
  type Figure,
  type P3,
  type View
} from './geometry';

/** angular disparities θ (degrees) — the Ganis & Kievit (2015) grid */
export const ANGLES = [0, 50, 100, 150] as const;
export type Angle = (typeof ANGLES)[number];
/** 0 = same object, 1 = its mirror image (also the response code) */
export type Answer = 0 | 1;

/** scored trials per angle × answer cell → 4 × 2 × 5 = 40 */
export const REPS = 5;
export const SCORED_TRIALS = ANGLES.length * 2 * REPS;
/** every run: one unscored warm-up per angle */
export const WARMUP_TRIALS = ANGLES.length;
/** first run: 8 practice trials with feedback; ≥ 6 correct passes */
export const PRACTICE_TRIALS = 8;
export const PRACTICE_PASS = 6;
/** [DC] practice repeats at most this many rounds in all, then the run continues */
export const PRACTICE_MAX_ROUNDS = 3;

/** timeline (ms) */
export const FIXATION_MS = 300;
export const TIMEOUT_MS = 7000;
export const ACK_MS = 150;
/** RT under this is an anticipation: excluded, re-queued once */
export const ANTICIPATION_MS = 250;

/** sequence constraints of the scored block */
export const MAX_ANSWER_RUN = 3;
export const MAX_ANGLE_RUN = 2;

/** reference yaw φ ∈ [20°, 70°] + k·90° */
export const PHI_MIN = 20;
export const PHI_MAX = 70;

/**
 * Validity (SCIENCE.md §1.13 "Validity") and the class-B interruption limits
 * [DC]. 65%, not the dossier's first 60%: over 40 two-choice trials a pure
 * guesser reaches 60% in ~13% of runs, 65% in ~4% (owner decision,
 * 2026-10-31). Scoring v2 (SCIENCE.md C13 — a slow run is a low score, never
 * an invalid one): the floor is judged on the ANSWERED pairs. A timeout is an
 * error at 7000 ms in the score, never a wrong answer for validity: v1
 * counted timeouts as wrong answers AND as exclusions (more than 8 of
 * anticipations + timeouts invalidated a run), so a slow mental rotator was
 * discarded twice over.
 */
export const MIN_ACCURACY = 65;
/** more anticipations (< 250 ms) than this share of the 40 planned pairs → invalid ('too-fast') */
export const MAX_ANTICIPATION_FRACTION = 0.2;
export const MAX_INTERRUPTIONS = 3;
export const MAX_PAUSED_MS = 60_000;

/** generation slots: one independent stream per item */
export const SLOT = { block: 0, warmup: 40, practice: 100, spare: 1000 } as const;

export interface TrialSpec {
  angle: Angle;
  answer: Answer;
  /** direction of the turn, s = ±1 (irrelevant at 0°, kept for the log) */
  sign: 1 | -1;
}

export interface Item extends TrialSpec {
  slot: number;
  /** reference yaw φ, degrees */
  phi: number;
  figure: Figure;
  /** what the RIGHT plate draws: the figure itself, or its mirror (x → −x) */
  cmpCubes: P3[];
  /** yaw of the left (reference) and right (comparison) views */
  refYaw: number;
  cmpYaw: number;
  ref: View;
  cmp: View;
  /** shapes drawn before this one was accepted (diagnostic) */
  tries: number;
}

/** an integer hash that turns (seed, slot) into an independent stream seed */
export function mixSeed(seed: number, slot: number): number {
  let h = (seed ^ Math.imul(slot + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

const MAX_SHAPES = 4000;
const PHI_TRIES = 6;

/** a random 10-cube, 4-arm path that passes rules 1–3 */
export function drawFigure(r: () => number): { figure: Figure; tries: number } {
  for (let tries = 1; tries <= MAX_SHAPES; tries++) {
    const lengths = pick(r, ARM_ORDERINGS);
    const dirs: P3[] = [pick(r, DIRS)];
    for (let a = 1; a < lengths.length; a++) {
      const prev = dirs[a - 1];
      const perp = DIRS.filter((d) => d[0] * prev[0] + d[1] * prev[1] + d[2] * prev[2] === 0);
      dirs.push(pick(r, perp));
    }
    const figure = buildFigure(lengths, dirs);
    if (shapeIsAcceptable(figure)) return { figure, tries };
  }
  throw new Error('mirror-twins: no acceptable figure'); // unreachable in practice — validate sweeps it
}

/**
 * One trial's item: a fresh figure, its reference yaw and both views, every
 * acceptance rule checked on BOTH views the trial shows. Deterministic in
 * (seed, slot, spec).
 *
 *  - reference (left): the figure at yaw φ;
 *  - same (right): the figure at yaw φ + s·θ;
 *  - mirror (right): the reference's true mirror image, turned s·θ — the
 *    reflection is taken in the picture's frame, so at 0° the twin is the
 *    reference flipped left–right and θ keeps its meaning. Reflecting the
 *    yawed figure (x′ → −x′) equals yawing the reflected figure (x → −x)
 *    by −φ, hence yaw s·θ − φ on the mirrored cubes.
 */
export function makeItem(seed: number, slot: number, spec: TrialSpec): Item {
  const r = rng(mixSeed(seed, slot));
  let tries = 0;
  for (let attempt = 0; attempt < MAX_SHAPES; attempt++) {
    const drawn = drawFigure(r);
    tries += drawn.tries;
    const fig = drawn.figure;
    const cmpCubes = spec.answer === 0 ? fig.cubes : mirrorCubes(fig.cubes);
    const cmpDirs = spec.answer === 0 ? fig.dirs : fig.dirs.map((d) => [-d[0], d[1], d[2]] as P3);
    for (let k = 0; k < PHI_TRIES; k++) {
      const phi = randRange(r, PHI_MIN, PHI_MAX) + 90 * randInt(r, 0, 3);
      const refYaw = phi;
      const cmpYaw = spec.answer === 0 ? phi + spec.sign * spec.angle : spec.sign * spec.angle - phi;
      const ref = project(fig.cubes, refYaw);
      if (!viewIsReadable(fig.cubes, fig.dirs, refYaw, ref)) continue;
      const cmp = project(cmpCubes, cmpYaw);
      if (!viewIsReadable(cmpCubes, cmpDirs, cmpYaw, cmp)) continue;
      return { ...spec, slot, phi, figure: fig, cmpCubes, refYaw, cmpYaw, ref, cmp, tries };
    }
  }
  throw new Error('mirror-twins: no readable item'); // unreachable in practice — validate sweeps it
}

/* ---------- trial plans ---------- */

export function longestRun<T>(xs: readonly T[], keyOf: (t: T) => string | number): number {
  let best = 0;
  let run = 0;
  for (let i = 0; i < xs.length; i++) {
    run = i > 0 && keyOf(xs[i]) === keyOf(xs[i - 1]) ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/** the two sequence constraints of the scored block */
export function runsOk(seq: readonly TrialSpec[]): boolean {
  return longestRun(seq, (t) => t.answer) <= MAX_ANSWER_RUN && longestRun(seq, (t) => t.angle) <= MAX_ANGLE_RUN;
}

/**
 * The 40 scored trials: each angle × answer cell exactly 5 times, at most 3
 * identical correct answers and at most 2 identical angles in a row. Built
 * by weighted sequential sampling with restarts (dead ends are rare); the
 * turn direction s is near-balanced inside every cell (3/2 or 2/3).
 */
export function planBlock(seed: number): TrialSpec[] {
  const r = rng(mixSeed(seed, 0x51a7));
  const cells: { angle: Angle; answer: Answer }[] = [];
  for (const angle of ANGLES) for (const answer of [0, 1] as Answer[]) cells.push({ angle, answer });
  for (let attempt = 0; attempt < 2000; attempt++) {
    const left = cells.map(() => REPS);
    const seq: number[] = [];
    while (seq.length < SCORED_TRIALS) {
      const tailRun = (same: (c: number) => boolean) => {
        let n = 0;
        for (let i = seq.length - 1; i >= 0 && same(seq[i]); i--) n++;
        return n;
      };
      const options: number[] = [];
      let total = 0;
      cells.forEach((c, ci) => {
        if (!left[ci]) return;
        if (tailRun((x) => cells[x].angle === c.angle) >= MAX_ANGLE_RUN) return;
        if (tailRun((x) => cells[x].answer === c.answer) >= MAX_ANSWER_RUN) return;
        options.push(ci);
        total += left[ci];
      });
      if (!options.length) break;
      let roll = r() * total;
      let chosen = options[options.length - 1];
      for (const ci of options) {
        roll -= left[ci];
        if (roll < 0) {
          chosen = ci;
          break;
        }
      }
      left[chosen]--;
      seq.push(chosen);
    }
    if (seq.length < SCORED_TRIALS) continue;
    const signs = cells.map(() => shuffle(r, r() < 0.5 ? [1, 1, 1, -1, -1] : [1, 1, -1, -1, -1]) as (1 | -1)[]);
    const used = cells.map(() => 0);
    return seq.map((ci) => ({ ...cells[ci], sign: signs[ci][used[ci]++] }));
  }
  throw new Error('mirror-twins: no block plan'); // unreachable — validate sweeps it
}

/** the per-session warm-up: one trial per angle, two same and two mirror, shuffled */
export function planWarmup(seed: number): TrialSpec[] {
  const r = rng(mixSeed(seed, 0xa1));
  const angles = shuffle(r, ANGLES);
  const answers = shuffle(r, [0, 0, 1, 1] as Answer[]);
  return angles.map((angle, i) => ({ angle, answer: answers[i], sign: r() < 0.5 ? 1 : -1 }));
}

/**
 * First-run practice round: every angle × answer cell once (8 trials),
 * ramping up in angle — 0° first, so the idea is taught before rotation is
 * needed — with the same/mirror order random inside each angle.
 */
export function planPractice(seed: number, round: number): TrialSpec[] {
  const r = rng(mixSeed(seed, 0x9a + round));
  const out: TrialSpec[] = [];
  for (const angle of ANGLES) for (const answer of shuffle(r, [0, 1] as Answer[])) out.push({ angle, answer, sign: r() < 0.5 ? 1 : -1 });
  return out;
}

export interface SessionItems {
  block: Item[];
  warmup: Item[];
  /** generation time, ms (target < 50 ms) */
  ms: number;
}

/** precompute the session's 44 items (40 scored + 4 warm-up) before trial 1 */
export function buildSession(seed: number, clock: () => number = () => Date.now()): SessionItems {
  const t0 = clock();
  const block = planBlock(seed).map((spec, i) => makeItem(seed, SLOT.block + i, spec));
  const warmup = planWarmup(seed).map((spec, i) => makeItem(seed, SLOT.warmup + i, spec));
  return { block, warmup, ms: clock() - t0 };
}

/** the items of one practice round (8), built when the round starts */
export function practiceItems(seed: number, round: number): Item[] {
  return planPractice(seed, round).map((spec, i) => makeItem(seed, SLOT.practice + round * PRACTICE_TRIALS + i, spec));
}

/** a replacement item for a voided or anticipated trial: same condition, a figure never shown before */
export function spareItem(seed: number, k: number, spec: TrialSpec): Item {
  return makeItem(seed, SLOT.spare + k, { angle: spec.angle, answer: spec.answer, sign: spec.sign });
}
