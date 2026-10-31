import { randInt, rng, shuffle, shuffleNoRuns } from '../../../platform/brain/timing';
import { COLOR, PROTOCOL, SHAPE, correctSide, type Cue, type Layout, type Pic, type TrialSpec } from './protocol';

/**
 * Item generation — ONLY from the run's seed (SCIENCE.md C8), through
 * rng(); nothing unseeded. Each part of a run draws from its own
 * sub-stream, so the scored block of a seed is the same whatever happened
 * in practice, and validate can replay any run exactly.
 */

const SALT = { layout: 0x1a7, test: 0x7e5, isi: 0x151, practice: 0x9ac, guided: 0x6d1 } as const;

function stream(seed: number, salt: number, round = 0): () => number {
  return rng((seed ^ Math.imul(salt + round * 0x101, 0x9e3779b1)) >>> 0);
}

/** which card sits on the left for this session [DC: randomised per session] */
export function layoutFor(seed: number): Layout {
  return { aLeft: stream(seed, SALT.layout)() < 0.5 };
}

function longestRun<T>(xs: readonly T[]): number {
  let best = 0;
  let run = 0;
  for (let i = 0; i < xs.length; i++) {
    run = i > 0 && xs[i] === xs[i - 1] ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

function cuesFromGaps(gaps: number[]): Cue[] {
  const out: Cue[] = [];
  gaps.forEach((g, i) => {
    for (let k = 0; k < g; k++) out.push(SHAPE);
    if (i < gaps.length - 1) out.push(COLOR);
  });
  return out;
}

/**
 * The 30 cues: 24 "shape", 6 "color". The 24 shape trials are dealt into the
 * 7 gaps around the colour trials — the first and last gap need ≥ 1 (trial 1
 * is a shape trial, and every colour trial is followed by a switch back), the
 * five inner gaps ≥ 2 (no adjacent colour trials, ≥ 2 shape trials between
 * them) — and no gap may exceed 6 shape trials [DC].
 */
export function cueSequence(r: () => number): Cue[] {
  const { shapeTrials, colorTrials, minShapeGap, maxShapeRun } = PROTOCOL;
  const n = colorTrials + 1;
  const base = Array.from({ length: n }, (_, i) => (i === 0 || i === n - 1 ? 1 : minShapeGap));
  const extra = shapeTrials - base.reduce((a, b) => a + b, 0);
  for (let attempt = 0; attempt < 400; attempt++) {
    const gaps = base.slice();
    for (let k = 0; k < extra; k++) gaps[randInt(r, 0, n - 1)]++;
    if (gaps.every((g) => g <= maxShapeRun)) return cuesFromGaps(gaps);
  }
  const gaps = base.slice();
  for (let k = 0; k < extra; k++) gaps[k % n]++;
  return cuesFromGaps(gaps);
}

/**
 * Pictures for a cue sequence: within each cue type half are pic 0 and half
 * pic 1, which balances the correct side within each cue type AND gives
 * each picture 15 appearances (12 + 3). Reshuffled until no more than 4
 * identical pictures or correct sides run in a row [DC].
 */
function assignPictures(r: () => number, cues: Cue[], layout: Layout): Pic[] {
  const nShape = cues.filter((c) => c === SHAPE).length;
  const nColor = cues.length - nShape;
  const half = (k: number): Pic[] => [...Array<Pic>(k >> 1).fill(0), ...Array<Pic>(k - (k >> 1)).fill(1)];
  let best: Pic[] = [];
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 600; attempt++) {
    const s = shuffle(r, half(nShape));
    const c = shuffle(r, half(nColor));
    let i = 0;
    let j = 0;
    const pics = cues.map((cue) => (cue === SHAPE ? s[i++] : c[j++]));
    const sides = cues.map((cue, k) => correctSide(cue, pics[k], layout));
    const score = Math.max(0, longestRun(pics) - PROTOCOL.maxSameRun) + Math.max(0, longestRun(sides) - PROTOCOL.maxSameRun);
    if (score < bestScore) {
      best = pics;
      bestScore = score;
      if (score === 0) break;
    }
  }
  return best;
}

/** the scored block of a seed: layout + 30 trials */
export function generateTest(seed: number): { layout: Layout; trials: TrialSpec[] } {
  const layout = layoutFor(seed);
  const r = stream(seed, SALT.test);
  const cues = cueSequence(r);
  const pics = assignPictures(r, cues, layout);
  const [short, long] = PROTOCOL.isiMs;
  const isiList = [...Array<number>(PROTOCOL.testTrials / 2).fill(short), ...Array<number>(PROTOCOL.testTrials / 2).fill(long)];
  const isis = shuffleNoRuns(stream(seed, SALT.isi), isiList, PROTOCOL.maxSameRun);
  const trials = cues.map((cue, k) => ({ cue, pic: pics[k], isi: isis[k], side: correctSide(cue, pics[k], layout) }));
  return { layout, trials };
}

/** the three legal warm-up cue orders: 3 shape + 2 colour, shape first, colour never adjacent */
export const PRACTICE_PATTERNS: readonly Cue[][] = [
  [SHAPE, COLOR, SHAPE, COLOR, SHAPE],
  [SHAPE, COLOR, SHAPE, SHAPE, COLOR],
  [SHAPE, SHAPE, COLOR, SHAPE, COLOR]
];

/**
 * The per-session warm-up (round 0, and round 1 when it is repeated): 5
 * mixed trials on the PRACTICE pictures, under the session's layout so each
 * colour stays on the side it will have in the scored block. Both pictures
 * appear under both rules.
 */
export function generatePractice(seed: number, round: number): TrialSpec[] {
  const layout = layoutFor(seed);
  const r = stream(seed, SALT.practice, round);
  const cues = PRACTICE_PATTERNS[randInt(r, 0, PRACTICE_PATTERNS.length - 1)];
  const colorPics = shuffle(r, [0, 1] as Pic[]);
  const shapePics = shuffle(r, (r() < 0.5 ? [0, 0, 1] : [0, 1, 1]) as Pic[]);
  let i = 0;
  let j = 0;
  return cues.map((cue) => {
    const pic = cue === SHAPE ? shapePics[i++] : colorPics[j++];
    return { cue, pic, isi: r() < 0.5 ? PROTOCOL.isiMs[0] : PROTOCOL.isiMs[1], side: correctSide(cue, pic, layout) };
  });
}

/**
 * The first-run guided practice (untimed, coached): two "shape" trials,
 * two "color" trials, then ONE picture twice — first under "shape", then
 * under "color" — so the player sees the same picture go to opposite cards.
 */
export function generateGuided(seed: number): TrialSpec[] {
  const layout = layoutFor(seed);
  const r = stream(seed, SALT.guided);
  const a = shuffle(r, [0, 1] as Pic[]);
  const b = shuffle(r, [0, 1] as Pic[]);
  const same: Pic = r() < 0.5 ? 0 : 1;
  const plan: [Cue, Pic][] = [
    [SHAPE, a[0]],
    [SHAPE, a[1]],
    [COLOR, b[0]],
    [COLOR, b[1]],
    [SHAPE, same],
    [COLOR, same]
  ];
  return plan.map(([cue, pic]) => ({ cue, pic, isi: 600, side: correctSide(cue, pic, layout) }));
}
