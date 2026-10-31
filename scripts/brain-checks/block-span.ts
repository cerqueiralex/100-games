/**
 * Block Span (Memory benchmark) — fidelity checks, SCIENCE.md §1.6 and
 * Appendix B "Memory":
 *  - placement respects the spacing and edge rules, falling back to the
 *    lattice when rejection sampling runs out;
 *  - replaying a scripted correct/incorrect pattern reproduces the
 *    staircase, including the 2–10 bounds and the miss-counter resets;
 *  - the MnS worked example scores 7.08 — as a formula AND as a scripted
 *    run through the real TrialLadder (seeded items → staircase → outcome);
 *  - 14 scored trials (voided trials replaced at the same length).
 * Plus determinism from the run seed, the presentation timeline, the
 * validity limits, the reference anchor and the trial-log layout — and
 * proof that the checks catch deliberately broken inputs.
 */
import type { BrainCheck } from './types';
import { PROTOCOL } from '../../src/brain/block-span/logic/protocol';
import {
  arenaSide,
  blockSide,
  drawSequence,
  generateLayout,
  hitBlock,
  latticeLayout,
  layoutProblems,
  makeTrial,
  minSpacing,
  selfCrossings,
  type Layout,
  type TrialItem
} from '../../src/brain/block-span/logic/layout';
import { replayStaircase, stairStart, stairStep, type StairState } from '../../src/brain/block-span/logic/staircase';
import {
  encodeTrialLog,
  invalidReasons,
  limitReasons,
  meanSpan,
  meanTapInterval,
  type TrialResponse
} from '../../src/brain/block-span/logic/scoring';
import { TrialLadder } from '../../src/brain/block-span/logic/session';
import {
  PRESENT_START,
  applyPresentEvent,
  onPeriodOk,
  presentationEvent,
  scheduleFor,
  type PresentState
} from '../../src/brain/block-span/logic/presentation';
import { referenceMean, referenceZ } from '../../src/brain/block-span/logic/reference';
import { indexFromZ } from '../../src/platform/brain/timing';

/** the Appendix B worked example, as a correct/incorrect pattern through the staircase */
const WORKED_PATTERN = [true, true, true, true, true, true, false, false, false, false, false, false, true, false];
const WORKED_LENGTHS = [3, 4, 5, 6, 7, 8, 9, 9, 8, 8, 7, 7, 6, 7];

type StepFn = (s: StairState, correct: boolean) => StairState;

/** compare a staircase implementation against the scripted expectations; returns the problems */
function staircaseProblems(step: StepFn): string[] {
  const out: string[] = [];
  const replay = (pattern: boolean[]) => {
    let s = stairStart(PROTOCOL.lStart);
    const lengths: number[] = [];
    for (const c of pattern) {
      lengths.push(s.L);
      s = step(s, c);
    }
    return { lengths, final: s };
  };
  const eq = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  const w = replay(WORKED_PATTERN);
  if (!eq(w.lengths, WORKED_LENGTHS)) out.push(`worked pattern lengths ${w.lengths.join(',')} ≠ ${WORKED_LENGTHS.join(',')}`);
  const up = replay(Array(14).fill(true));
  if (!eq(up.lengths, [3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 10, 10, 10])) out.push(`all-correct lengths ${up.lengths.join(',')} (upper bound 10)`);
  const down = replay(Array(14).fill(false));
  if (!eq(down.lengths, [3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]) || down.final.L !== 2) out.push(`all-wrong lengths ${down.lengths.join(',')} (lower bound 2)`);
  // the miss counter resets after a correct trial: miss, hit, miss → no step down
  const reset = replay([false, true, false]);
  if (!eq(reset.lengths, [3, 3, 4]) || reset.final.L !== 4 || reset.final.misses !== 1) out.push(`miss/hit/miss gave ${reset.lengths.join(',')} → L ${reset.final.L}, misses ${reset.final.misses}`);
  // … and after each step down: miss, miss (step to 2), miss → still 2, one miss pending
  const afterStep = replay([false, false, false]);
  if (!eq(afterStep.lengths, [3, 3, 2]) || afterStep.final.L !== 2 || afterStep.final.misses !== 1) out.push(`3 misses gave ${afterStep.lengths.join(',')} → L ${afterStep.final.L}, misses ${afterStep.final.misses}`);
  // at the bound the second miss still resets the counter
  const atBound = replay([false, false, false, false]);
  if (atBound.final.L !== 2 || atBound.final.misses !== 0) out.push(`4 misses → L ${atBound.final.L}, misses ${atBound.final.misses} (expected 2, 0)`);
  // a single miss after climbing never steps down
  const one = replay([true, true, false, true]);
  if (!eq(one.lengths, [3, 4, 5, 5]) || one.final.L !== 6) out.push(`hit,hit,miss,hit gave ${one.lengths.join(',')} → ${one.final.L}`);
  return out;
}

/** simulate requestAnimationFrame for one presentation; returns ON durations and the cue time */
function simulatePresentation(L: number, frameTimes: number[], halfFrame: number) {
  const sch = scheduleFor(L);
  let s: PresentState = PRESENT_START;
  const on: number[] = [];
  const off: number[] = [];
  let cue = NaN;
  let changesPerFrameOk = true;
  for (const ts of frameTimes) {
    const ev = presentationEvent(s, ts, sch, halfFrame);
    if (!ev) continue;
    if (ev.type === 'on') on.push(ts);
    else if (ev.type === 'off') off.push(ts);
    else cue = ts;
    const next = applyPresentEvent(s, ev);
    // at most one change per frame: asking again in the same frame must not yield a second edge of the SAME highlight
    const again = presentationEvent(next, ts, sch, halfFrame);
    if (again && again.type === 'off' && ev.type === 'on') changesPerFrameOk = false;
    s = next;
    if (ev.type === 'cue') break;
  }
  return { on, off, cue, changesPerFrameOk };
}

function frames(r: () => number, periodMs: number, untilMs: number, jitterMs = 0, stallAt = -1, stallMs = 0): number[] {
  const out: number[] = [0];
  let t = 0;
  while (t < untilMs) {
    t += periodMs + (jitterMs ? (r() - 0.5) * 2 * jitterMs : 0);
    if (stallAt >= 0 && t >= stallAt && t - periodMs < stallAt) t += stallMs;
    out.push(t);
  }
  return out;
}

function sameItem(a: TrialItem, b: TrialItem): boolean {
  return (
    a.L === b.L &&
    a.seq.join(',') === b.seq.join(',') &&
    a.layout.fallback === b.layout.fallback &&
    a.layout.centres.every((p, i) => p.x === b.layout.centres[i].x && p.y === b.layout.centres[i].y)
  );
}

const noTaps = (): TrialResponse => ({ end: 'gave-up', tapMs: [], tapped: [], earlyTaps: 0, maxOnDevMs: 3, viewportW: 390, viewportH: 844 });

export const check: BrainCheck = async ({ bad, rng }) => {
  /* ---------- protocol constants (§1.6 table) ---------- */
  const expect: [string, number, number][] = [
    ['blocks', PROTOCOL.blocks, 10],
    ['practice blocks', PROTOCOL.practiceBlocks, 6],
    ['scored trials', PROTOCOL.scoredTrials, 14],
    ['practice trials', PROTOCOL.practiceTrials, 4],
    ['practice start', PROTOCOL.practiceStart, 2],
    ['warm-up trials', PROTOCOL.warmupTrials, 1],
    ['warm-up length', PROTOCOL.warmupL, 3],
    ['L start', PROTOCOL.lStart, 3],
    ['L min', PROTOCOL.lMin, 2],
    ['L max', PROTOCOL.lMax, 10],
    ['static ms', PROTOCOL.staticMs, 1000],
    ['on ms', PROTOCOL.onMs, 500],
    ['off ms', PROTOCOL.offMs, 500],
    ['cue delay ms', PROTOCOL.cueDelayMs, 500],
    ['on tolerance ms', PROTOCOL.onToleranceMs, 50],
    ['hit padding px', PROTOCOL.hitPadPx, 6],
    ['tap flash ms', PROTOCOL.tapFlashMs, 150],
    ['end delay ms', PROTOCOL.endDelayMs, 300],
    ['inactivity ms', PROTOCOL.inactivityMs, 15000],
    ['max interruptions', PROTOCOL.maxInterruptions, 2],
    ['max paused ms', PROTOCOL.maxPausedMs, 60000],
    ['timeouts → invalid', PROTOCOL.timeoutsInvalid, 3],
    ['voided timing → invalid', PROTOCOL.voidedTimingInvalid, 3],
    ['layout attempts', PROTOCOL.layoutAttempts, 500]
  ];
  for (const [name, got, want] of expect) if (got !== want) bad(`protocol ${name} is ${got}, SCIENCE.md says ${want}`);

  /* ---------- arena and block size ---------- */
  const sizes: [number, number, number][] = [
    [390, 844, 358],
    [360, 640, 328],
    [375, 667, 343],
    [430, 932, 398],
    [1280, 800, 420]
  ];
  for (const [w, h, S] of sizes) if (arenaSide(w, h) !== S) bad(`arena for ${w}×${h} is ${arenaSide(w, h)}, expected ${S}`);
  if (arenaSide(390, 844, 300) !== 300) bad('the arena must not outgrow its box');
  if (arenaSide(844, 390) !== 264) bad('the arena keeps its 264 px floor (landscape phone)');
  if (blockSide(358) !== 47 || blockSide(328) !== 44 || blockSide(420) !== 55) bad(`block sides ${blockSide(358)}/${blockSide(328)}/${blockSide(420)} ≠ 47/44/55`);

  /* ---------- placement: spacing + edge, lattice fallback ---------- */
  let layouts = 0;
  let commonLayouts = 0;
  let commonFallbacks = 0;
  const rates: string[] = [];
  const arenaSizes = [264, 288, 300, 328, 343, 358, 398, 420];
  for (const S of arenaSizes) {
    const b = blockSide(S);
    for (const n of [PROTOCOL.blocks, PROTOCOL.practiceBlocks]) {
      let fb = 0;
      for (let k = 0; k < 300; k++) {
        const L = generateLayout(rng(S * 7919 + n * 104729 + k), S, b, n);
        layouts++;
        if (L.fallback) fb++;
        const p = layoutProblems(L, n);
        if (p.length) {
          bad(`layout S=${S} n=${n} #${k}: ${p[0]}`);
          break;
        }
      }
      if (n === PROTOCOL.blocks) rates.push(`${S}:${((fb / 300) * 100).toFixed(1)}%`);
      // phones 360 px wide and up (S ≥ 328): sampling must essentially always succeed
      if (S >= 328) {
        commonLayouts += 300;
        commonFallbacks += fb;
      }
      // forced fallback (no sampling budget) must still satisfy every rule
      const forced = generateLayout(rng(S + n), S, b, n, 0);
      if (!forced.fallback) bad(`S=${S}: a zero sampling budget must fall back to the lattice`);
      const fp = layoutProblems(forced, n);
      if (fp.length) bad(`lattice fallback S=${S} n=${n}: ${fp[0]}`);
    }
    // the jitter is real (not a bare grid) wherever the rules leave room for it
    const lat = latticeLayout(rng(S), S, b, PROTOCOL.blocks);
    const pitch = S / 4;
    const offGrid = lat.some((p) => Math.abs(((p.x - pitch / 2) / pitch) % 1) > 1e-6);
    if ((pitch - minSpacing(b)) / 2 > 1 && !offGrid) bad(`S=${S}: lattice cells are not jittered`);
  }
  if (commonFallbacks / commonLayouts > 0.01) bad(`lattice fallback on ${commonFallbacks}/${commonLayouts} layouts at S ≥ 328 — sampling should almost always succeed`);

  /* ---------- sequences ---------- */
  for (let L = PROTOCOL.lMin; L <= PROTOCOL.lMax; L++) {
    for (let k = 0; k < 50; k++) {
      const seq = drawSequence(rng(L * 1000 + k), PROTOCOL.blocks, L);
      if (seq.length !== L || new Set(seq).size !== L || seq.some((i) => i < 0 || i >= PROTOCOL.blocks || !Number.isInteger(i))) {
        bad(`sequence L=${L}: ${seq.join(',')} is not ${L} distinct blocks`);
        break;
      }
    }
  }

  /* ---------- determinism from the run seed ---------- */
  let sameSeedDiffers = 0;
  let otherSeedSame = 0;
  let otherAttemptSame = 0;
  const base = rng(20261030);
  for (let k = 0; k < 200; k++) {
    const seed = (base() * 0xffffffff) >>> 0;
    const L = 2 + (k % 9);
    const a = makeTrial(seed, 'scored', k % 20, L, 10, 358);
    const b = makeTrial(seed, 'scored', k % 20, L, 10, 358);
    if (!sameItem(a, b)) sameSeedDiffers++;
    if (sameItem(a, makeTrial((seed + 1) >>> 0, 'scored', k % 20, L, 10, 358))) otherSeedSame++;
    if (sameItem(a, makeTrial(seed, 'scored', (k % 20) + 1, L, 10, 358))) otherAttemptSame++;
    if (sameItem(a, makeTrial(seed, 'warmup', k % 20, L, 10, 358))) otherAttemptSame++;
  }
  if (sameSeedDiffers) bad(`${sameSeedDiffers}/200 trials differ between two generations from the same seed`);
  if (otherSeedSame) bad(`${otherSeedSame}/200 trials are identical under a different seed`);
  if (otherAttemptSame) bad(`${otherAttemptSame} trials repeat across attempts or ladders`);

  /* ---------- staircase (scripted replay, bounds, miss-counter resets) ---------- */
  for (const p of staircaseProblems((s, c) => stairStep(s, c))) bad(`staircase: ${p}`);
  const replay = replayStaircase(WORKED_PATTERN);
  if (replay.lengths.join(',') !== WORKED_LENGTHS.join(',')) bad(`replayStaircase: ${replay.lengths.join(',')}`);
  // the checker itself must catch a broken staircase (steps down after ONE miss / forgets to reset)
  const broken1: StepFn = (s, c) => (c ? { L: Math.min(10, s.L + 1), misses: 0 } : { L: Math.max(2, s.L - 1), misses: 0 });
  const broken2: StepFn = (s, c) => (c ? { L: Math.min(10, s.L + 1), misses: s.misses } : s.misses + 1 >= 2 ? { L: Math.max(2, s.L - 1), misses: 0 } : { L: s.L, misses: s.misses + 1 });
  if (!staircaseProblems(broken1).length) bad('the staircase check failed to catch a one-miss step-down');
  if (!staircaseProblems(broken2).length) bad('the staircase check failed to catch a miss counter that survives a correct trial');

  /* ---------- MnS ---------- */
  const worked = WORKED_PATTERN.map((correct, i) => ({ L: WORKED_LENGTHS[i], correct }));
  const mns = meanSpan(worked);
  if (Math.abs(mns - (2.5 + 4 + 0.25 + 1 / 3)) > 1e-9 || mns.toFixed(2) !== '7.08') bad(`worked example scores ${mns}, expected 7.08`);
  const withDip = [...worked, { L: 2, correct: false }, { L: 2, correct: true }];
  if (meanSpan(withDip) !== mns) bad('a dip below L_start must not change MnS');
  if (meanSpan([]) !== 2.5) bad('no trials must score the 2.5 floor');
  const allTen = [3, 4, 5, 6, 7, 8, 9, 10].map((L) => ({ L, correct: true }));
  if (meanSpan(allTen) !== 10.5) bad(`a perfect climb to 10 scores ${meanSpan(allTen)}, expected 10.5`);
  // a deliberately broken scorer (no −0.5) must not pass the worked example
  const brokenMns = meanSpan(worked, PROTOCOL.lStart + 0.5);
  if (brokenMns.toFixed(2) === '7.08') bad('the MnS check cannot tell a broken baseline term');

  /* ---------- the worked example end to end: a scripted run through the real ladder ---------- */
  // right = the exact sequence; wrong = the last tap moved to another block. Taps 900 ms after the
  // cue, then every 450 ms → hand-computed mean tap time = (14·900 + (94 − 14)·450) / 94 taps.
  const scripted = new TrialLadder(20261031, 'scored');
  for (const right of WORKED_PATTERN) {
    const it = scripted.next(358);
    const tapped = right ? it.seq.slice() : [...it.seq.slice(0, -1), (it.seq[it.seq.length - 1] + 1) % PROTOCOL.blocks];
    scripted.complete(it, { end: 'complete', tapped, tapMs: tapped.map((_, i) => 900 + 450 * i), earlyTaps: 0, maxOnDevMs: 2, viewportW: 390, viewportH: 844 });
  }
  const so = scripted.outcome();
  const soLens = scripted.records.map((x) => x.L).join(',');
  if (soLens !== WORKED_LENGTHS.join(',')) bad(`scripted run lengths ${soLens} ≠ ${WORKED_LENGTHS.join(',')}`);
  if (!so.valid || so.trials !== 14) bad(`scripted run: valid ${so.valid}, ${so.trials} trials`);
  if (so.metrics.mns.toFixed(2) !== '7.08' || so.metrics.maxSpan !== 8 || so.metrics.correct !== 7) bad(`scripted run scored MnS ${so.metrics.mns} / longest ${so.metrics.maxSpan} / correct ${so.metrics.correct}, expected 7.08 / 8 / 7`);
  if (Math.abs(so.metrics.tapMs - 48600 / 94) > 1e-9) bad(`scripted run tap time ${so.metrics.tapMs}, expected ${48600 / 94}`);

  /* ---------- a full scored block through the real ladder ---------- */
  const responder = (r: () => number, item: TrialItem, capacity: number): TrialResponse => {
    const pCorrect = 1 / (1 + Math.exp(2.2 * (item.L - capacity)));
    const right = r() < pCorrect;
    const tapped = item.seq.slice();
    if (!right) tapped[tapped.length - 1] = (tapped[tapped.length - 1] + 1) % PROTOCOL.blocks;
    let t = 900 + r() * 1200;
    const tapMs = tapped.map((_, i) => (i ? (t += 350 + r() * 500) : t));
    return { end: 'complete', tapMs, tapped, earlyTaps: 0, maxOnDevMs: r() * 8, viewportW: 390, viewportH: 844 };
  };
  let blocks = 0;
  for (let k = 0; k < 40; k++) {
    const r = rng(9000 + k);
    const ladder = new TrialLadder(1000 + k, 'scored');
    const capacity = 4 + r() * 3;
    let guard = 0;
    let voidedL = -1;
    const voidAt = new Set(k % 4 === 0 ? [3, 9] : []);
    while (!ladder.done && guard++ < 100) {
      const item = ladder.next(358);
      if (voidedL >= 0 && item.L !== voidedL) bad(`a replacement trial must keep the voided trial's length (${voidedL} → ${item.L})`);
      voidedL = -1;
      if (voidAt.delete(ladder.completed)) {
        ladder.interruption();
        ladder.void(item, 'pause', null);
        voidedL = item.L;
        continue;
      }
      ladder.complete(item, responder(r, item, capacity));
    }
    const out = ladder.outcome();
    const scored = ladder.records.filter((x) => x.status === 'scored');
    if (scored.length !== 14 || out.trials !== 14) bad(`block ${k}: ${scored.length} scored trials, expected 14`);
    if (!out.valid) bad(`block ${k}: a clean block came back invalid (${out.flags?.join(', ')})`);
    for (const id of ['mns', 'maxSpan', 'correct', 'tapMs']) if (!Number.isFinite(out.metrics[id])) bad(`block ${k}: metric ${id} is not finite`);
    if (Math.abs(out.metrics.mns - meanSpan(scored)) > 1e-12) bad(`block ${k}: outcome MnS ≠ meanSpan of its records`);
    const lens = scored.map((x) => x.L);
    if (lens[0] !== 3) bad(`block ${k}: the first scored trial is L=${lens[0]}`);
    const expected = replayStaircase(scored.map((x) => x.correct)).lengths;
    if (expected.join(',') !== lens.join(',')) bad(`block ${k}: lengths ${lens.join(',')} do not follow the staircase`);
    if ((out.trialLog?.length ?? 0) !== ladder.records.length) bad(`block ${k}: trial log has ${out.trialLog?.length} rows for ${ladder.records.length} attempts`);
    blocks++;
  }

  /* ---------- the warm-up and the practice ladders ---------- */
  const warm = new TrialLadder(77, 'warmup');
  const w1 = warm.next(358);
  if (w1.L !== 3 || w1.layout.centres.length !== 10) bad(`warm-up trial is L=${w1.L} on ${w1.layout.centres.length} blocks`);
  warm.complete(w1, noTaps());
  if (!warm.done) bad('the warm-up is one trial');
  const prac = new TrialLadder(77, 'practice');
  const lens: number[] = [];
  while (!prac.done) {
    const it = prac.next(358);
    lens.push(it.L);
    if (it.layout.centres.length !== 6) bad('practice runs on the 6-block display');
    prac.complete(it, { ...noTaps(), end: 'complete', tapped: it.seq.slice(), tapMs: it.seq.map((_, i) => 800 + i * 400) });
  }
  if (lens.join(',') !== '2,3,4,4') bad(`practice lengths for 4 correct trials: ${lens.join(',')} (expected 2,3,4,4)`);

  /* ---------- validity limits ---------- */
  const c0 = { interruptions: 0, pausedMs: 0, timeouts: 0, voidedTiming: 0 };
  if (limitReasons(c0).length) bad('a clean block must not hit a limit');
  if (limitReasons({ ...c0, interruptions: 2, pausedMs: 60000, timeouts: 2, voidedTiming: 2 }).length) bad('2 interruptions / 60 s paused / 2 timeouts / 2 voided are still within the limits');
  if (!limitReasons({ ...c0, interruptions: 3 }).includes('too-many-interruptions')) bad('3 interruptions must invalidate');
  if (!limitReasons({ ...c0, pausedMs: 60001 }).includes('too-many-interruptions')) bad('more than 60 s paused must invalidate');
  if (!limitReasons({ ...c0, timeouts: 3 }).includes('too-many-timeouts')) bad('3 timeouts must invalidate');
  if (!limitReasons({ ...c0, voidedTiming: 3 }).includes('unstable-timing')) bad('3 voided timing trials must invalidate');
  // a block of "Don't remember" only measured nothing
  const giveUp = new TrialLadder(5, 'scored');
  while (!giveUp.done) giveUp.complete(giveUp.next(358), noTaps());
  const gu = giveUp.outcome();
  if (gu.valid || !gu.flags?.includes('too-few')) bad('a block without a single tap must be invalid (too-few)');
  if (gu.metrics.mns !== 2.5 || 'tapMs' in gu.metrics) bad('an all-give-up block reports MnS 2.5 and no tap time');
  // taps on every trial but never the right order: at chance, not a measurement
  const junk = new TrialLadder(8, 'scored');
  while (!junk.done) {
    const it = junk.next(358);
    const wrong = it.seq.slice().reverse();
    junk.complete(it, { ...noTaps(), end: 'complete', tapped: wrong, tapMs: wrong.map((_, i) => 600 + i * 300) });
  }
  const jo = junk.outcome();
  if (jo.valid || !jo.flags?.includes('at-chance')) bad(`a block of 14 wrong recalls must be invalid (at-chance), got ${jo.flags?.join(',')}`);
  // … while one right answer among 14 is a (very low) measurement
  const one = new TrialLadder(9, 'scored');
  let first = true;
  while (!one.done) {
    const it = one.next(358);
    const tapped = first ? it.seq.slice() : it.seq.slice().reverse();
    first = false;
    one.complete(it, { ...noTaps(), end: 'complete', tapped, tapMs: tapped.map((_, i) => 600 + i * 300) });
  }
  if (!one.outcome().valid) bad('a block with one correct trial is a valid (low) score');
  // timeouts are counted by the ladder itself
  const lazy = new TrialLadder(6, 'scored');
  for (let i = 0; i < 3; i++) lazy.complete(lazy.next(358), { ...noTaps(), end: 'timeout' });
  if (!lazy.limitReasons().includes('too-many-timeouts')) bad('the ladder must count inactivity timeouts');
  if (invalidReasons(lazy.counters, lazy.records).includes('too-few')) bad('an early-ended block reports its limit, not too-few');

  /* ---------- presentation timeline ---------- */
  const r = rng(424242);
  for (const [hz, jitter] of [
    [60, 0],
    [60, 2.5],
    [120, 1],
    [90, 0.8]
  ] as const) {
    const period = 1000 / hz;
    for (let L = 2; L <= 10; L++) {
      const sim = simulatePresentation(L, frames(r, period, 2000 + L * 1000, jitter), period / 2);
      if (sim.on.length !== L || sim.off.length !== L) bad(`${hz} Hz L=${L}: ${sim.on.length} on / ${sim.off.length} off`);
      sim.on.forEach((t, i) => {
        if (!onPeriodOk(t, sim.off[i])) bad(`${hz} Hz L=${L}: ON ${i} lasted ${(sim.off[i] - t).toFixed(1)} ms`);
        if (i && Math.abs(t - sim.on[i - 1] - 1000) > period + 2 * jitter + 0.01) bad(`${hz} Hz L=${L}: onset-to-onset ${(t - sim.on[i - 1]).toFixed(1)} ms`);
      });
      if (Math.abs(sim.cue - (1000 + L * 1000)) > period) bad(`${hz} Hz L=${L}: cue at ${sim.cue.toFixed(1)} ms, expected ${1000 + L * 1000}`);
      if (Math.abs(sim.on[0] - 1000) > period) bad(`${hz} Hz: the layout stood still for ${sim.on[0].toFixed(1)} ms, expected 1000`);
      if (!sim.changesPerFrameOk) bad(`${hz} Hz L=${L}: two edges of one highlight in a single frame`);
    }
  }
  // a stalled frame inside an ON period must void the trial
  const stalled = simulatePresentation(4, frames(r, 1000 / 60, 6000, 0, 2470, 90), 1000 / 120);
  if (stalled.on.every((t, i) => onPeriodOk(t, stalled.off[i]))) bad('a 90 ms stall during a highlight was not detected');
  if (onPeriodOk(0, 551) || onPeriodOk(0, 449) || !onPeriodOk(0, 550) || !onPeriodOk(0, 450)) bad('the ±50 ms ON-period rule is off');

  /* ---------- hit testing (block + 6 px) ---------- */
  const lay: Layout = generateLayout(rng(3), 358, 47, 10);
  const c = lay.centres[0];
  if (hitBlock(c.x, c.y, lay.centres, lay.b) !== 0) bad('a tap on a block centre missed it');
  const lonely = [{ x: 100, y: 100 }];
  if (hitBlock(100 + 23.5 + 6, 100, lonely, 47) !== 0) bad('a release 6 px outside the block must still register');
  if (hitBlock(100 + 23.5 + 6.5, 100, lonely, 47) !== -1) bad('a release 6.5 px outside the block must not register');

  /* ---------- path metrics ---------- */
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 10 },
    { x: 10, y: 0 },
    { x: 0, y: 10 }
  ];
  if (selfCrossings(square, [0, 1, 2, 3]) !== 1) bad('a bow-tie path has exactly one self-crossing');
  if (selfCrossings(square, [0, 2, 1, 3]) !== 0) bad('a U-shaped path has no self-crossing');

  /* ---------- reference anchor (grade C, Woods 2016) ---------- */
  const anchors: [number, string][] = [
    [25, '5.61'],
    [30, '5.50'],
    [40, '5.28'],
    [50, '5.06'],
    [60, '4.84']
  ];
  for (const [age, mu] of anchors) if (referenceMean(age).toFixed(2) !== mu) bad(`μ(${age}) = ${referenceMean(age).toFixed(3)}, SCIENCE.md says ${mu}`);
  if (referenceMean(undefined) !== 5.27) bad('μ without an age must be 5.27');
  if (Math.abs(referenceZ(5.27)) > 1e-12) bad('the normative mean must sit at z = 0 without an age');
  if (indexFromZ(referenceZ(5.95, 26.3)) !== 54) bad(`Woods' young retest sample maps to ${indexFromZ(referenceZ(5.95, 26.3))}, expected ≈ 54`);
  if (Math.abs(referenceZ(5.27 + 1.01) - 1) > 1e-12) bad('σ must be 1.01');
  for (let x = 2.5; x < 10.5; x += 0.25) if (!(referenceZ(x + 0.25, 40) > referenceZ(x, 40))) bad('z must increase with MnS');
  if (referenceMean(10) !== referenceMean(18) || referenceMean(99) !== referenceMean(82)) bad('ages outside 18–82 are held at the sample edges');

  /* ---------- trial log layout ---------- */
  const logLadder = new TrialLadder(11, 'scored');
  const li = logLadder.next(358);
  logLadder.complete(li, { end: 'complete', tapMs: [1500.4, 2100.6, 2800], tapped: li.seq.slice(), earlyTaps: 1, maxOnDevMs: 4.26, viewportW: 390, viewportH: 844 });
  const row = encodeTrialLog(logLadder.records)[0];
  const n = 3;
  if (row.length !== 15 + 2 * n) bad(`trial-log row has ${row.length} columns, expected ${15 + 2 * n}`);
  if (row[0] !== 0 || row[2] !== 3 || row[3] !== 1 || row[4] !== 0 || row[5] !== 3 || row[6] !== 1500 || row[10] !== 358 || row[11] !== 4.3 || row[12] !== 1) bad(`trial-log row ${row.slice(0, 15).join(',')} does not match its columns`);
  if (row.slice(15, 18).join(',') !== '1500,2101,2800' || row.slice(18).join(',') !== li.seq.join(',')) bad('trial-log tap times / tapped blocks are misplaced');
  if (row.some((x) => !Number.isFinite(x))) bad('trial-log rows must be finite numbers');
  if (Math.abs(meanTapInterval([{ tapMs: [1000, 1600, 2000] }]) - 2000 / 3) > 1e-9) bad('mean tap interval must average cue→tap1, tap1→tap2, …');

  /* ---------- no Math.random in the benchmark folder ---------- */
  const fs = (await import('node:fs')) as unknown as {
    readdirSync: (p: string, o: { recursive: boolean }) => string[];
    readFileSync: (p: string, e: string) => string;
  };
  const { fileURLToPath } = await import('node:url');
  const dir = fileURLToPath(new URL('../../src/brain/block-span/', import.meta.url));
  const files = fs.readdirSync(dir, { recursive: true }).filter((f) => /\.(ts|tsx)$/.test(f));
  for (const f of files) if (/Math\.random/.test(fs.readFileSync(dir + f, 'utf8'))) bad(`Math.random in src/brain/block-span/${f}`);
  if (!files.some((f) => f.endsWith('index.ts'))) bad('src/brain/block-span/index.ts is missing');

  return `MnS worked example 7.08 (also end to end through the real ladder) · staircase replay + bounds + resets · ${layouts} layouts spaced (lattice fallback by S ${rates.join(' ')}; forced lattice sound) · ${blocks} simulated blocks of 14 · timing, limits, anchor, log`;
};
