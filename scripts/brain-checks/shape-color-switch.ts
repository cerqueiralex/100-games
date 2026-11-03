/**
 * Fidelity check — Shape–Color Switch (SCIENCE.md §1.12, Appendix B
 * "Flexibility"). Drives the benchmark's pure logic only:
 *  - every generated scored block: 24 shape + 6 colour trials, trial 1 a
 *    shape trial, no adjacent colour trials (≥ 2 shape trials between,
 *    never last), each picture 15×, correct side balanced within each cue
 *    type, every picture bivalent and response-incongruent, the [DC] run
 *    limits, ISIs 15 × 300 / 15 × 1000;
 *  - determinism (same seed → same items; different seed → different);
 *  - RCS = N_correct / ΣRT (s) on a scripted run against hand-computed
 *    numbers, including the 2.5 s value for timeouts and anticipations'
 *    own RT; validity rules; switch costs on a hand-built sequence; the
 *    trial log reproduces the score;
 *  - the audit catches deliberately broken blocks and a broken scorer.
 */
import { generateGuided, generatePractice, generateTest, layoutFor } from '../../src/brain/shape-color-switch/logic/generate';
import {
  COLOR,
  PROTOCOL,
  SHAPE,
  cardAt,
  correctSide,
  picParts,
  type Layout,
  type Side,
  type TrialSpec
} from '../../src/brain/shape-color-switch/logic/protocol';
import { CODE, classify, fromLogRow, outcomeOf, rescoreRun, rtForSum, scoreRun, switchCosts, toLogRow, type TrialRecord } from '../../src/brain/shape-color-switch/logic/scoring';
import type { BrainCheck } from './types';

function longestRun<T>(xs: readonly T[]): number {
  let best = 0;
  let run = 0;
  xs.forEach((x, i) => {
    run = i > 0 && x === xs[i - 1] ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

/** every Appendix B invariant (plus the documented [DC] order rules) for one scored block */
export function auditBlock(trials: readonly TrialSpec[], layout: Layout): string[] {
  const out: string[] = [];
  const cues = trials.map((t) => t.cue);
  const shape = trials.filter((t) => t.cue === SHAPE);
  const color = trials.filter((t) => t.cue === COLOR);
  if (trials.length !== PROTOCOL.testTrials) out.push(`${trials.length} trials, want 30`);
  if (shape.length !== 24 || color.length !== 6) out.push(`${shape.length} shape / ${color.length} colour, want 24 / 6`);
  if (cues[0] !== SHAPE) out.push('trial 1 is not a shape trial');
  if (cues[cues.length - 1] !== SHAPE) out.push('the last trial is a colour trial (no switch back)');
  let lastColor = -Infinity;
  cues.forEach((c, i) => {
    if (c !== COLOR) return;
    if (i - lastColor - 1 < PROTOCOL.minShapeGap) out.push(`colour trials at ${lastColor + 1} and ${i + 1} are < 2 shape trials apart`);
    lastColor = i;
  });
  let shapeRun = 0;
  let maxShapeRun = 0;
  for (const c of cues) {
    shapeRun = c === SHAPE ? shapeRun + 1 : 0;
    maxShapeRun = Math.max(maxShapeRun, shapeRun);
  }
  if (maxShapeRun > PROTOCOL.maxShapeRun) out.push(`${maxShapeRun} shape trials in a row`);
  const pic0 = trials.filter((t) => t.pic === 0).length;
  if (pic0 !== 15) out.push(`picture identities ${pic0} / ${trials.length - pic0}, want 15 / 15`);
  const left = (xs: TrialSpec[]) => xs.filter((t) => t.side === 0).length;
  if (left(shape) !== 12) out.push(`shape trials: ${left(shape)} left of 24`);
  if (left(color) !== 3) out.push(`colour trials: ${left(color)} left of 6`);
  trials.forEach((t, i) => {
    if (t.pic !== 0 && t.pic !== 1) {
      out.push(`trial ${i + 1}: unknown picture ${String(t.pic)}`);
      return;
    }
    // bivalent + response-incongruent: the card sharing the picture's shape
    // and the card sharing its colour must be DIFFERENT cards
    const p = picParts(t.pic);
    const sides: Side[] = [0, 1];
    const byShape = sides.filter((s) => cardAt(s, layout).shape === p.shape);
    const byColor = sides.filter((s) => cardAt(s, layout).color === p.color);
    if (byShape.length !== 1 || byColor.length !== 1 || byShape[0] === byColor[0]) out.push(`trial ${i + 1}: picture is not response-incongruent`);
    const want = t.cue === SHAPE ? byShape[0] : byColor[0];
    if (t.side !== want) out.push(`trial ${i + 1}: correct side ${t.side}, the ${t.cue === SHAPE ? 'shape' : 'colour'} rule says ${want}`);
  });
  if (longestRun(trials.map((t) => t.side)) > PROTOCOL.maxSameRun) out.push('more than 4 identical correct sides in a row');
  if (longestRun(trials.map((t) => t.pic)) > PROTOCOL.maxSameRun) out.push('more than 4 identical pictures in a row');
  const short = trials.filter((t) => t.isi === 300).length;
  const long = trials.filter((t) => t.isi === 1000).length;
  if (short !== 15 || long !== 15) out.push(`ISIs ${short} × 300 / ${long} × 1000, want 15 / 15`);
  return out;
}

/** a scripted answer to one trial */
function rec(t: TrialSpec, resp: Side | -1, rt: number): TrialRecord {
  return { cue: t.cue, pic: t.pic, side: t.side, resp, rt, isi: t.isi, lead: 500, early: 0 };
}

const close = (a: number, b: number, eps = 1e-9) => Number.isFinite(a) && Math.abs(a - b) < eps;

export const check: BrainCheck = async ({ bad, rng }) => {
  const draw = rng(0x5c5);
  const SEEDS = 600;
  let aLeft = 0;
  let distinct = 0;
  for (let k = 0; k < SEEDS; k++) {
    const seed = (draw() * 0xffffffff) >>> 0;
    const { layout, trials } = generateTest(seed);
    if (layout.aLeft) aLeft++;
    const problems = auditBlock(trials, layout);
    if (problems.length) {
      bad(`seed ${seed}: ${problems.slice(0, 3).join('; ')}`);
      break;
    }
    // determinism: the same seed replays exactly; a different seed differs
    if (JSON.stringify(generateTest(seed)) !== JSON.stringify({ layout, trials })) bad(`seed ${seed}: scored block is not deterministic`);
    const other = generateTest((seed + 1) >>> 0);
    if (JSON.stringify(other.trials) !== JSON.stringify(trials)) distinct++;
    // practice and guided practice: deterministic, legal, same colour sides as the scored block
    for (const round of [0, 1]) {
      const p = generatePractice(seed, round);
      if (JSON.stringify(p) !== JSON.stringify(generatePractice(seed, round))) bad(`seed ${seed}: practice round ${round} not deterministic`);
      const pc = p.map((t) => t.cue);
      if (p.length !== PROTOCOL.practiceTrials || pc[0] !== SHAPE || pc.filter((c) => c === COLOR).length !== 2 || pc.some((c, i) => c === COLOR && pc[i - 1] === COLOR))
        bad(`seed ${seed}: practice round ${round} breaks its order rules (${pc.join('')})`);
      if (p.some((t) => t.side !== correctSide(t.cue, t.pic, layout))) bad(`seed ${seed}: practice uses a different card layout`);
    }
    const g = generateGuided(seed);
    if (g.map((t) => t.cue).join('') !== [SHAPE, SHAPE, COLOR, COLOR, SHAPE, COLOR].join('') || g[4].pic !== g[5].pic || g[4].side === g[5].side)
      bad(`seed ${seed}: guided practice does not end with one picture under both rules`);
  }
  if (aLeft < SEEDS * 0.4 || aLeft > SEEDS * 0.6) bad(`card sides are not randomised per session (${aLeft}/${SEEDS} with card A left)`);
  if (distinct < SEEDS * 0.99) bad(`only ${distinct}/${SEEDS} neighbouring seeds produced different blocks`);
  if (layoutFor(1).aLeft !== generateTest(1).layout.aLeft) bad('layoutFor disagrees with generateTest');

  // ---- the audit must catch broken blocks ----
  const base = generateTest(42);
  const broken: [string, TrialSpec[]][] = [];
  {
    const t = base.trials.map((x) => ({ ...x }));
    const i = t.findIndex((x, k) => k > 0 && x.cue === COLOR);
    t[i - 1] = { ...t[i - 1], cue: COLOR, side: correctSide(COLOR, t[i - 1].pic, base.layout) }; // adjacent colour trials
    broken.push(['adjacent colour trials', t]);
  }
  {
    const t = base.trials.map((x) => ({ ...x }));
    t[5] = { ...t[5], side: (1 - t[5].side) as Side }; // a side that follows neither rule's card
    broken.push(['a congruent / wrong-side trial', t]);
  }
  broken.push(['an unbalanced picture count', base.trials.map((x, k) => (k === 7 ? { ...x, pic: (1 - x.pic) as 0 | 1, side: correctSide(x.cue, (1 - x.pic) as 0 | 1, base.layout) } : x))]);
  for (const [what, t] of broken) if (!auditBlock(t, base.layout).length) bad(`the audit missed ${what}`);

  // ---- scoring a scripted run against hand-computed numbers ----
  // 30 trials of seed 42: colour trials all correct at 1000 ms; on shape
  // trials two wrong cards (900 ms), one timeout, one anticipation (150 ms,
  // on the right card — still an error), the other 20 correct at 800 ms.
  //   N_correct = 6 + 20 = 26
  //   ΣRT = 6 × 1.0 + 20 × 0.8 + 2 × 0.9 + 2.5 + 0.15 = 26.45 s
  //   RCS = 26 / 26.45 = 0.98298677…, ln RCS = −0.01715962…
  const shapeIdx = base.trials.map((t, i) => (t.cue === SHAPE ? i : -1)).filter((i) => i > 0);
  const [w1, w2, to, an] = [shapeIdx[2], shapeIdx[8], shapeIdx[13], shapeIdx[19]];
  const scripted = base.trials.map((t, i) => {
    if (t.cue === COLOR) return rec(t, t.side, 1000);
    if (i === w1 || i === w2) return rec(t, (1 - t.side) as Side, 900);
    if (i === to) return rec(t, -1, PROTOCOL.deadlineMs);
    if (i === an) return rec(t, t.side, 150);
    return rec(t, t.side, 800);
  });
  const s = scoreRun(scripted);
  if (s.nCorrect !== 26) bad(`scripted run: N_correct ${s.nCorrect}, want 26`);
  if (!close(s.sumRtS, 26.45)) bad(`scripted run: ΣRT ${s.sumRtS} s, want 26.45`);
  if (!close(s.metrics.rcs, 0.982986767485822)) bad(`scripted run: RCS ${s.metrics.rcs}, want 26 / 26.45 = 0.98299`);
  if (!close(s.metrics.lnRcs, -0.017159620282826)) bad(`scripted run: ln RCS ${s.metrics.lnRcs}, want ln(26 / 26.45) = −0.0171596`);
  if (!close(s.metrics.accuracy, (100 * 26) / 30)) bad(`scripted run: accuracy ${s.metrics.accuracy}`);
  if (s.metrics.medRtShape !== 800 || s.metrics.medRtColor !== 1000) bad(`scripted run: medians ${s.metrics.medRtShape} / ${s.metrics.medRtColor}, want 800 / 1000`);
  if (s.metrics.anticipations !== 1 || s.metrics.timeouts !== 1) bad('scripted run: anticipation / timeout counts');
  if (!s.valid || s.flags.length) bad(`scripted run should be valid (flags: ${s.flags.join(', ')})`);
  // the log reproduces the score exactly
  const relog = scoreRun(scripted.map(toLogRow).map(fromLogRow));
  if (JSON.stringify(relog.metrics) !== JSON.stringify(s.metrics)) bad('the trial log does not reproduce the metrics');
  if (scripted.map(toLogRow).some((r) => r.length !== 9 || r.some((x) => !Number.isFinite(x)))) bad('trial log rows must be 9 finite numbers');

  // timeouts count the full 2.5 s whatever the stored RT says; a broken scorer is caught
  const tOut: TrialRecord = { ...rec(base.trials[0], -1, 0) };
  if (rtForSum(tOut) !== 2500 || classify(tOut) !== CODE.timeout) bad('a timeout must add exactly 2.5 s to ΣRT');
  if (classify(rec(base.trials[0], base.trials[0].side, 199)) !== CODE.anticipation) bad('199 ms must be an anticipation');
  if (classify(rec(base.trials[0], base.trials[0].side, 200)) !== CODE.correct) bad('200 ms on the right card must be correct');
  if (classify(rec(base.trials[0], base.trials[0].side, 2501)) !== CODE.timeout) bad('a tap after 2.5 s must be a timeout');
  const naiveSum = scripted.reduce((a, t) => a + (t.resp === -1 ? 0 : t.rt), 0) / 1000; // forgets the timeout
  if (close(26 / naiveSum, s.metrics.rcs)) bad('the RCS check cannot tell a scorer that drops timeouts');

  // validity: > 3 anticipations → 'too-fast'; answers no better than guessing → 'at-chance'
  const anticip = base.trials.map((t, i) => rec(t, t.side, i < 4 ? 120 : 800));
  const sa = scoreRun(anticip);
  if (sa.valid || !sa.flags.includes('too-fast')) bad('4 anticipations must invalidate the run (too-fast)');
  if (!scoreRun(base.trials.map((t, i) => rec(t, t.side, i < 3 ? 120 : 800))).valid) bad('3 anticipations must still be valid');
  const at = (nWrong: number) => scoreRun(base.trials.map((t, i) => rec(t, i < nWrong ? ((1 - t.side) as Side) : t.side, 800)));
  if (!at(9).valid) bad('21 / 30 correct (70 %) must be valid');
  const low = at(10);
  if (low.valid || !low.flags.includes('at-chance')) bad('20 / 30 correct (66.7 %) must invalidate the run (at-chance)');
  if (low.flags.includes('rushed')) bad('the v1 "rushed" flag is still produced');
  if (scoreRun(scripted.slice(0, 29)).valid) bad('an incomplete block must be invalid');
  const none = scoreRun(base.trials.map((t) => rec(t, -1, 2500)));
  if (none.valid || !none.flags.includes('too-few')) bad(`an all-timeout run must be invalid as too few answers (${none.flags.join()})`);

  // C13: slow is a score, never a reason to discard a run. v1 counted a timeout as a wrong card,
  // so this careful player — 20 right of 20 answered, 10 pictures left to time out — was "rushed" (66.7 %)
  const slowRun = (timeouts: number, rt = 2000) =>
    scoreRun(base.trials.map((t, i) => (i % 3 === 2 && i / 3 < timeouts ? rec(t, -1, PROTOCOL.deadlineMs) : rec(t, t.side, rt))));
  const slow = slowRun(10);
  if (!slow.valid || slow.metrics.timeouts !== 10) bad(`a slow, careful run (10 timeouts, 20/20 answered) was discarded: ${slow.flags.join()}`);
  if (!close(slow.metrics.rcs, 20 / (20 * 2 + 10 * 2.5))) bad(`slow run RCS ${slow.metrics.rcs}, want 20 / 65 s`);
  if (!(slow.metrics.lnRcs < s.metrics.lnRcs)) bad('the slow run did not score below the scripted one');
  // a timeout is never read as a guess: 10 answers, all right, 20 timeouts — still a measurement, lower still
  const slower = scoreRun(base.trials.map((t, i) => (i % 3 === 0 ? rec(t, t.side, 2300) : rec(t, -1, PROTOCOL.deadlineMs))));
  if (!slower.valid || !(slower.metrics.lnRcs < slow.metrics.lnRcs)) bad(`a very slow run (10 answers, 20 timeouts): ${slower.valid} ${slower.flags.join()}`);
  // … but a guesser among the answers is caught whatever the timeouts: 12 right of 20 answered (60 %)
  const guess = scoreRun(base.trials.map((t, i) => (i % 3 === 2 ? rec(t, -1, PROTOCOL.deadlineMs) : rec(t, i % 5 < 2 ? ((1 - t.side) as Side) : t.side, 900))));
  if (guess.valid || !guess.flags.includes('at-chance')) bad(`answers at guessing level beside timeouts were scored (${guess.flags.join()})`);

  // rescoring a v1 run (scoring version 2): the slow run as v1 stored it — invalid, 'rushed' — comes back valid, metrics identical
  {
    const recs = base.trials.map((t, i) => (i % 3 === 2 && i / 3 < 10 ? rec(t, -1, PROTOCOL.deadlineMs) : rec(t, t.side, 2000)));
    const live = outcomeOf(recs);
    const out = rescoreRun({ trialLog: live.trialLog ?? [], metrics: live.metrics, flags: ['rushed'], valid: false, scoringVersion: 1 });
    if (!out || !out.valid || JSON.stringify(out.metrics) !== JSON.stringify(live.metrics)) bad(`a v1 'rushed' slow run was not rescored to valid: ${JSON.stringify(out?.flags)}`);
    if (rescoreRun({ trialLog: [], metrics: {}, flags: [], valid: false, scoringVersion: 1 }) !== null) bad('an empty log was rescored');
    if (rescoreRun({ trialLog: [[0, 1, 0]], metrics: {}, flags: [], valid: false, scoringVersion: 1 }) !== null) bad('a malformed log was rescored');
  }

  // switch costs on a hand-built sequence (trial 1 and post-error trials excluded)
  const L: Layout = { aLeft: true };
  const mk = (cue: 0 | 1, ok: boolean, rt: number): TrialRecord => {
    const side = correctSide(cue, 0, L);
    return { cue, pic: 0, side, resp: ok ? side : ((1 - side) as Side), rt, isi: 300, lead: 500, early: 0 };
  };
  const seq = [mk(0, true, 600), mk(0, true, 700), mk(1, true, 1000), mk(0, true, 900), mk(0, false, 800), mk(0, true, 650), mk(1, true, 1100), mk(0, true, 750), mk(0, true, 640)];
  // switch (prev correct): 1000, 900, 1100, 750 → median 950, 0 / 4 errors
  // repeat (prev correct): 700, [error], 640 → median 670, 1 / 3 errors; 650 follows an error → excluded
  const sc = switchCosts(seq);
  if (!close(sc.rt, 280)) bad(`switch cost (time) ${sc.rt}, want 950 − 670 = 280`);
  if (!close(sc.err, -100 / 3, 1e-9)) bad(`switch cost (errors) ${sc.err}, want 0 − 33.3 = −33.3 pts`);

  // the folder must stay seeded (validate scans too)
  const fs = (await import('node:fs')) as unknown as { readdirSync: (p: string, o?: { recursive?: boolean }) => string[]; readFileSync: (p: string, e: string) => string };
  const { fileURLToPath } = await import('node:url');
  const dir = fileURLToPath(new URL('../../src/brain/shape-color-switch/', import.meta.url));
  for (const f of fs.readdirSync(dir, { recursive: true })) {
    if (!/\.(ts|tsx)$/.test(f)) continue;
    if (fs.readFileSync(dir + f, 'utf8').includes('Math.random')) bad(`Math.random in src/brain/shape-color-switch/${f}`);
  }

  return `${SEEDS} seeds: 24/6 cues, trial 1 shape, colour ≥ 2 apart, pictures 15/15, sides balanced per cue, all incongruent; deterministic; RCS 26/26.45 s = ${s.metrics.rcs.toFixed(4)} (ln ${s.metrics.lnRcs.toFixed(4)}); validity + C13 (slow runs scored, chance on answers given) + rescoring + switch costs + log round-trip; audit catches ${broken.length} broken blocks`;
};
