/**
 * Target Ring (Precision) fidelity check — SCIENCE.md §1.9 and Appendix B
 * "Precision":
 *  - t_k = 7k mod 13 visits all 13 targets and returns to 0, every move the
 *    same chord;
 *  - the chord factor is 0.993 and the nominal IDs are 1.41/1.94/2.11/2.74;
 *  - TP of a scripted run equals a value computed by hand (an independent
 *    Python computation from the raw touch coordinates);
 *  - every exclusion rule fires on a crafted trial, and > 3 exclusions
 *    invalidate a sequence and schedule exactly one re-run;
 *  - the seeded order is deterministic, differs across seeds and keeps the
 *    "new random order" rule; validity and quality flags fire as specified;
 *  - the index anchor maps 6.39 → 50, 7.29 → 60, 5.49 → 40;
 *  - the checks themselves catch broken inputs.
 */
import type { BrainCheck } from './types';
import { indexFromZ } from '../../src/platform/brain/timing';
import {
  CHORD_FACTOR,
  CONDITIONS,
  MAX_EXTENT_MM,
  N_TARGETS,
  SEQUENCE,
  WARMUP_COND,
  boardScale,
  dist,
  nominalId,
  sequenceTargets,
  targetCentre,
  type ConditionId
} from '../../src/brain/target-ring/logic/geometry';
import { buildPlan, SLOTS } from '../../src/brain/target-ring/logic/plan';
import {
  EXCL,
  buildTrialLog,
  measureSequence,
  scoreSession,
  sequenceValid,
  type SequenceRecord,
  type Tap
} from '../../src/brain/target-ring/logic/scoring';
import { blockDone, completeSequence, currentItem, startBlock, voidSequence } from '../../src/brain/target-ring/logic/block';
import { referenceZ } from '../../src/brain/target-ring/logic/reference';

/** the visiting rule as a predicate, so the check can prove it rejects a broken sequence */
function visitsAllAndReturns(seq: readonly number[], n: number): boolean {
  if (seq.length !== n + 1 || seq[0] !== 0 || seq[n] !== 0) return false;
  return new Set(seq.slice(1)).size === n;
}

/** selection = target centre + δ along the from→to axis + p across it */
function scriptedSequence(cond: ConditionId, deltas: number[], perp: (k: number) => number, mts: number[], start?: Tap): Omit<SequenceRecord, 'slot' | 'attempt'> {
  const { D } = CONDITIONS[cond];
  const s0 = start ?? { ...targetCentre(0, D), t: 0 };
  const taps: Tap[] = [];
  let t = s0.t;
  for (let k = 1; k <= 13; k++) {
    const to = targetCentre(SEQUENCE[k], D);
    const from = k === 1 ? s0 : targetCentre(SEQUENCE[k - 1], D);
    const a = dist(from, to);
    const ux = (to.x - from.x) / a;
    const uy = (to.y - from.y) / a;
    const p = perp(k);
    t += mts[k - 1];
    taps.push({ x: to.x + deltas[k - 1] * ux - p * uy, y: to.y + deltas[k - 1] * uy + p * ux, t });
  }
  return { cond, start: s0, taps };
}

/** standard normal from a seeded uniform stream (Box–Muller) */
function gauss(r: () => number): number {
  const u = Math.max(1e-12, r());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/** a virtual participant: Fitts-law MT plus Gaussian endpoint scatter */
function simulated(r: () => number, cond: ConditionId, o: { a: number; b: number; mtSd: number; along: number; across: number }) {
  const id = nominalId(CONDITIONS[cond]);
  const deltas = Array.from({ length: 13 }, () => o.along * gauss(r));
  const perps = Array.from({ length: 13 }, () => o.across * gauss(r));
  const mts = Array.from({ length: 13 }, () => Math.max(120, o.a + o.b * id + o.mtSd * gauss(r)));
  return scriptedSequence(cond, deltas, (k) => perps[k - 1], mts);
}

function runBlock(seed: number, make: (cond: ConditionId) => Omit<SequenceRecord, 'slot' | 'attempt'>) {
  let s = startBlock(seed);
  let guard = 0;
  while (!blockDone(s) && guard++ < 100) {
    const item = currentItem(s)!;
    const seq = make(item.cond);
    s = completeSequence(s, seq.start, seq.taps);
  }
  return s;
}

const near = (x: number, y: number, tol: number) => Math.abs(x - y) <= tol;

export const check: BrainCheck = ({ bad, rng }) => {
  /* ---- the visiting rule and the chord ---- */
  if (!visitsAllAndReturns(SEQUENCE, N_TARGETS)) bad(`t_k = 7k mod 13 must visit all 13 targets and return to 0 (got ${SEQUENCE.join(',')})`);
  if (visitsAllAndReturns(sequenceTargets(13, 13), 13) || visitsAllAndReturns(sequenceTargets(7, 12), 13)) {
    bad('the visiting-rule check failed to reject a broken step sequence');
  }
  if (Math.round(CHORD_FACTOR * 1000) / 1000 !== 0.993) bad(`chord factor ${CHORD_FACTOR} does not round to 0.993`);
  const ids = CONDITIONS.map((c) => Math.round(nominalId(c) * 100) / 100);
  if (ids.join(',') !== '1.41,1.94,2.11,2.74') bad(`nominal IDs ${ids.join(',')} ≠ 1.41,1.94,2.11,2.74`);
  for (const c of CONDITIONS) {
    for (let k = 1; k <= 13; k++) {
      const a = dist(targetCentre(SEQUENCE[k - 1], c.D), targetCentre(SEQUENCE[k], c.D));
      if (!near(a, CHORD_FACTOR * c.D, 1e-9)) bad(`move ${k} on D=${c.D} is ${a} mm, not the chord ${CHORD_FACTOR * c.D}`);
    }
    if (c.W < 7) bad(`W = ${c.W} mm is below the 7 mm fat-finger floor`);
  }
  if (Math.max(...CONDITIONS.map((c) => c.D + c.W)) !== MAX_EXTENT_MM) bad('MAX_EXTENT_MM must equal the widest ring D + W (52 mm)');
  if (CONDITIONS[WARMUP_COND].D !== 40 || CONDITIONS[WARMUP_COND].W !== 12) bad('the warm-up sequence must be D 40, W 12');
  if (boardScale(358, 6.2) !== 1 || !near(boardScale(288, 6.2), 288 / (52 * 6.2), 1e-12)) bad('board scale s must be min(1, side / (52·pxPerMm))');

  /* ---- TP of a scripted run vs the hand computation ---- */
  const deltas = [0.8, -0.6, 0.4, -0.2, 1.0, -1.0, 0.5, -0.5, 0.3, -0.7, 0.6, -0.4, 0.2];
  const offs = [0, 20, -10, 30, 0, -20, 10, 0, 15, -15, 5, -5, 0];
  const base = [300, 360, 380, 450];
  const records: SequenceRecord[] = [];
  for (const c of CONDITIONS) {
    for (let rep = 0; rep < 3; rep++) {
      const seq = scriptedSequence(c.id, deltas, (k) => 0.3 * (k % 2 ? -1 : 1), offs.map((o) => base[c.id] + o));
      records.push({ ...seq, slot: c.id * 3 + rep, attempt: 0 });
    }
  }
  const scripted = scoreSession({ records, interruptions: 0, pxPerMm: 6.2, scale: 1, input: 'touch' });
  // independent hand computation (Python, from raw coordinates): TP = 9.648023034,
  // mean MT = 374.807692 ms, We = 2.551550 mm in every condition
  if (!near(scripted.metrics.tp, 9.648023034, 1e-6)) bad(`scripted TP ${scripted.metrics.tp} ≠ hand-computed 9.648023034`);
  if (!near(scripted.metrics.mtMs, 374.807692, 1e-5)) bad(`scripted MT ${scripted.metrics.mtMs} ≠ 374.807692 ms`);
  if (!near(scripted.metrics.tightness, 2.55155, 1e-5)) bad(`scripted tightness ${scripted.metrics.tightness} ≠ 2.55155 mm`);
  if (scripted.metrics.errorRate !== 0 || !scripted.valid || scripted.flags.length) {
    bad(`scripted run should be valid, 0 % errors, no flags (got ${scripted.metrics.errorRate} %, ${scripted.flags.join(',')})`);
  }
  // the comparison catches a broken scorer: TP pooled across conditions is not the mean of means
  const pooledTrials = records.flatMap((r) => measureSequence(r));
  const pooledMt = pooledTrials.reduce((s, t) => s + t.mt, 0) / pooledTrials.length / 1000;
  const pooledDx = pooledTrials.map((t) => t.dx);
  const mdx = pooledDx.reduce((s, x) => s + x, 0) / pooledDx.length;
  const sdx = Math.sqrt(pooledDx.reduce((s, x) => s + (x - mdx) ** 2, 0) / (pooledDx.length - 1));
  const pooledAe = pooledTrials.reduce((s, t) => s + t.ae, 0) / pooledTrials.length;
  const brokenTp = Math.log2(pooledAe / (4.133 * sdx) + 1) / pooledMt;
  if (near(brokenTp, 9.648023034, 1e-3)) bad('the TP comparison failed to catch a pooled-across-conditions scorer');

  /* ---- the exclusion rules on crafted trials ---- */
  const mts = Array.from({ length: 13 }, () => 400);
  mts[1] = 50; // k = 2: double / bounced touch
  mts[3] = 3000; // k = 4: a lapse
  const dl = deltas.slice();
  const pp = (k: number) => (k === 6 ? 25 : 0); // k = 6: 25 mm off target — a gross miss
  const aOf = CHORD_FACTOR * CONDITIONS[0].D;
  dl[12] = -0.8 * aOf; // k = 13: landed 16 mm short, near where it came from — ae < 0.5·a (b < 20 mm)
  const crafted = scriptedSequence(0, dl, pp, mts);
  const trials = measureSequence(crafted);
  const want: Record<number, number> = { 2: EXCL.fast, 4: EXCL.slow, 6: EXCL.gross, 13: EXCL.direction };
  const mismatches = (codes: number[]) => codes.filter((c, i) => c !== (want[i + 1] ?? EXCL.none)).length;
  for (const t of trials) {
    const w = want[t.k] ?? EXCL.none;
    if (t.excl !== w) bad(`crafted trial k=${t.k}: exclusion ${t.excl}, expected ${w}`);
  }
  // the comparison catches a scorer that forgot the direction rule
  if (mismatches(trials.map((t) => (t.excl === EXCL.direction ? EXCL.none : t.excl))) === 0) {
    bad('the exclusion comparison failed to catch a scorer without the ae < 0.5·a rule');
  }
  if (sequenceValid(trials)) bad('a sequence with 4 exclusions must be invalid');
  const three = scriptedSequence(0, deltas, () => 0, mts.map((m, i) => (i === 3 ? 400 : m)).map((m, i) => (i === 1 ? 50 : m)));
  if (!sequenceValid(measureSequence({ ...three, taps: three.taps.map((t, i) => (i === 5 ? { ...t, x: t.x + 25 } : t)) }))) {
    // two exclusions (k = 2 fast, k = 6 gross) — still valid
    bad('a sequence with ≤ 3 exclusions must stay valid');
  }

  /* ---- re-run once, void + replace, interruption limit ---- */
  let blk = startBlock(42);
  const firstSlot = currentItem(blk)!.slot;
  blk = completeSequence(blk, crafted.start, crafted.taps); // invalid first attempt
  if (blk.queue.length !== SLOTS + 1 || blk.queue[SLOTS].origin !== 'rerun' || blk.queue[SLOTS].slot !== firstSlot) {
    bad('a first attempt with > 3 exclusions must append exactly one re-run of its slot at the end');
  }
  const v1 = voidSequence(blk);
  const v2 = voidSequence(v1.state);
  const v3 = voidSequence(v2.state);
  if (v1.overLimit || v2.overLimit || !v3.overLimit) bad('the run must become invalid on the 3rd voided sequence, not before');
  const lastQ = v1.state.queue[v1.state.queue.length - 1];
  if (lastQ?.origin !== 'replacement' || lastQ?.slot !== blk.queue[blk.pos].slot) {
    bad('a voided sequence must append a replacement for the same slot');
  }
  // drive the queue to the re-run and fail it again: no second re-run
  let s2 = blk;
  while (!blockDone(s2)) {
    const item = currentItem(s2)!;
    const seq = item.origin === 'rerun' ? crafted : scriptedSequence(item.cond, deltas, () => 0, offs.map((o) => 400 + o));
    s2 = completeSequence(s2, seq.start, seq.taps);
  }
  if (s2.queue.length !== SLOTS + 1 || s2.records.length !== SLOTS + 1) bad('a failed re-run must not schedule another');
  const s2score = scoreSession({ records: s2.records, interruptions: 0, pxPerMm: 6.2, scale: 1, input: 'touch' });
  if (s2score.validSlots !== 11 || !s2score.valid) bad(`11 valid slots must score as valid (got ${s2score.validSlots}, ${s2score.flags.join(',')})`);

  /* ---- determinism and the order rule ---- */
  const plans = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const seed = Math.floor(rng(9000 + i)() * 0xffffffff) >>> 0;
    const p = buildPlan(seed);
    if (p.join() !== buildPlan(seed).join()) bad(`plan for seed ${seed} is not deterministic`);
    plans.add(p.join());
    if (p.length !== SLOTS) bad(`plan has ${p.length} slots, not 12`);
    for (let r = 0; r < 3; r++) {
      const round = p.slice(r * 4, r * 4 + 4);
      if (round.slice().sort().join() !== '0,1,2,3') bad(`round ${r + 1} of seed ${seed} is not a permutation of the 4 conditions`);
      if (r > 0) {
        const prev = p.slice(r * 4 - 4, r * 4);
        if (round[0] === prev[3]) bad(`seed ${seed}: condition repeats across a round boundary`);
        if (round.join() === prev.join()) bad(`seed ${seed}: a round repeats the previous round's order`);
      }
    }
  }
  if (plans.size < 30) bad(`only ${plans.size} distinct orders over 40 seeds — the seed is not driving the order`);

  /* ---- a plausible participant, a sloppy one, and the flags ---- */
  let gi = 0;
  const goodRun = runBlock(7, (c) => simulated(rng(5000 + gi++), c, { a: 150, b: 110, mtSd: 25, along: 1.4, across: 1.1 }));
  const gs = scoreSession({ records: goodRun.records, interruptions: 1, pxPerMm: 6.2, scale: 1, input: 'touch' });
  if (!gs.valid || !(gs.metrics.tp > 4 && gs.metrics.tp < 12)) bad(`simulated participant: valid ${gs.valid}, TP ${gs.metrics.tp?.toFixed(2)} (flags ${gs.flags.join(',')})`);
  if (gs.flags.includes('fitts-signature-violated')) bad('a Fitts-law participant must not trip the Fitts-signature flag');
  if (!(gs.fit && gs.fit.slope > 0)) bad('the Fitts fit of a Fitts-law participant must have a positive slope');
  let si = 0;
  const sloppy = runBlock(8, (c) => simulated(rng(7000 + si++), c, { a: 90, b: 40, mtSd: 20, along: 4.5, across: 4 }));
  const ss = scoreSession({ records: sloppy.records, interruptions: 0, pxPerMm: 6.2, scale: 1, input: 'touch' });
  if (ss.valid || !ss.flags.includes('rushed')) bad(`a sloppy run (error rate ${ss.metrics.errorRate?.toFixed(1)} %) must be invalid with 'rushed' (got ${ss.flags.join(',')})`);
  // junk: every tap at the board centre — every trial fails ae ≥ 0.5·a, every slot invalid
  const junkRecords: SequenceRecord[] = Array.from({ length: SLOTS }, (_, slot) => ({
    slot,
    cond: (slot % 4) as ConditionId,
    attempt: 0,
    start: { ...targetCentre(0, CONDITIONS[slot % 4].D), t: 0 },
    taps: Array.from({ length: 13 }, (_, k) => ({ x: 0, y: 0, t: 300 * (k + 1) }))
  }));
  const js = scoreSession({ records: junkRecords, interruptions: 0, pxPerMm: 6.2, scale: 1, input: 'touch' });
  if (js.valid || !js.flags.includes('too-few') || js.validSlots !== 0) bad(`a junk run must be invalid with 'too-few' (got ${js.flags.join(',')})`);
  const flagged = scoreSession({ records, interruptions: 3, pxPerMm: 6.2, scale: 0.85, input: 'mouse' });
  for (const f of ['too-many-interruptions', 'not-comparable', 'input-mouse']) if (!flagged.flags.includes(f)) bad(`missing flag ${f}`);
  if (flagged.valid) bad('more than 2 voided sequences must invalidate the run');
  const swapped = records.map((r) => ({ ...r, taps: r.taps.map((t, i) => ({ ...t, t: (i + 1) * (r.cond === 3 ? 280 : r.cond === 0 ? 470 : 380) })) }));
  const fs = scoreSession({ records: swapped, interruptions: 0, pxPerMm: 6.2, scale: 1, input: 'touch' });
  if (!fs.flags.includes('fitts-signature-violated') || !fs.valid) bad('hardest-faster-than-easiest must flag the Fitts signature without invalidating');

  /* ---- trial log: compact, finite, enough to rescore ---- */
  const log = buildTrialLog(goodRun.records);
  if (log.length > 400 || log.some((row) => row.length > 12 || !row.every(Number.isFinite))) bad('trial log exceeds the store caps or holds a non-finite value');
  const back: SequenceRecord[] = [];
  for (const row of log) {
    if (row[4] === 0) back.push({ slot: row[1], cond: row[2] as ConditionId, attempt: row[3] as 0 | 1, start: { x: row[7], y: row[8], t: 0 }, taps: [] });
    else {
      const rec = back[back.length - 1];
      const prevT = rec.taps.length ? rec.taps[rec.taps.length - 1].t : 0;
      rec.taps.push({ x: row[7], y: row[8], t: prevT + row[6] });
    }
  }
  const rescored = scoreSession({ records: back, interruptions: 1, pxPerMm: 6.2, scale: 1, input: 'touch' });
  if (!near(rescored.metrics.tp, gs.metrics.tp, 0.01)) bad(`rescoring from the trial log gives TP ${rescored.metrics.tp}, not ${gs.metrics.tp}`);

  /* ---- the index anchor ---- */
  const idx = [6.39, 7.29, 5.49].map((tp) => indexFromZ(referenceZ(tp)));
  if (idx.join() !== '50,60,40') bad(`index anchor: 6.39/7.29/5.49 bits/s → ${idx.join('/')}, expected 50/60/40`);
  if (Number.isFinite(referenceZ(NaN)) || !(referenceZ(7) > referenceZ(6.9))) bad('reference z must be NaN for no TP and increasing in TP');

  return `13-ring 7k mod 13 visits all, chord ${CHORD_FACTOR.toFixed(3)}, IDs ${ids.join('/')}; scripted TP ${scripted.metrics.tp.toFixed(4)} = hand value; 4 exclusion rules fire; re-run/void/limit; ${plans.size}/40 distinct orders; simulated TP ${gs.metrics.tp.toFixed(2)} bits/s; sloppy + junk invalid; flags; log ${log.length} rows rescored`;
};
