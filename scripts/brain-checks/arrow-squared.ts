/**
 * Arrow Squared (Attention · Flanker Squared) — SCIENCE.md Appendix B
 * "Attention" invariants plus determinism, scripted scoring and proof that
 * the checks catch broken input. Imports only the pure logic modules.
 */
import type { BrainCheck } from './types';
import { indexFromZ } from '../../src/platform/brain/timing';
import {
  BLOCK,
  WORKED_EXAMPLE,
  answerFor,
  blockSeed,
  firstItems,
  guidedItems,
  itemProblems,
  longestRun,
  makeItem,
  type Item,
  type TrialType
} from '../../src/brain/arrow-squared/logic/items';
import { buildOutcome, encodeTrial, exploratory, scoreLog, validity, type ArrowTrial } from '../../src/brain/arrow-squared/logic/scoring';
import {
  COUNTDOWN_FROM,
  COUNTDOWN_STEP_MS,
  FAST_MAX_SHARE,
  FAST_RT_MS,
  MAX_SIDE_RUN,
  REF_MU,
  REF_RETEST,
  REF_SD,
  SCHEDULE,
  TEST_MS,
  WARMUP_MS,
  referenceZ
} from '../../src/brain/arrow-squared/logic/protocol';

/** problems with the trial-type shares of a list of items (Appendix B: 25% ± 2% each) */
function typeShareProblems(items: readonly Item[]): string[] {
  const n = [0, 0, 0, 0];
  for (const it of items) n[it.type]++;
  return n.flatMap((c, t) => {
    const share = c / items.length;
    return Math.abs(share - 0.25) > 0.02 ? [`type ${t} share ${(share * 100).toFixed(1)}% is outside 25% ± 2%`] : [];
  });
}

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;

export const check: BrainCheck = ({ bad, rng }) => {
  /* ---- 1. trial-type, direction and side shares over 10⁴ draws ---- */
  const N = 10_000;
  const items = firstItems(0x5eed_a77e, N);
  for (const p of typeShareProblems(items)) bad(p);
  const dRight = items.filter((it) => it.dir === 1).length / N;
  const sRight = items.filter((it) => it.side === 1).length / N;
  if (Math.abs(dRight - 0.5) > 0.02) bad(`d = right on ${(dRight * 100).toFixed(1)}% of draws, expected 50% ± 2%`);
  if (Math.abs(sRight - 0.5) > 0.02) bad(`correct side = right on ${(sRight * 100).toFixed(1)}% of draws, expected 50% ± 2%`);

  /* ---- 2. every constructed item satisfies the rule ---- */
  let checked = 0;
  const all: Item[] = [...items, WORKED_EXAMPLE];
  for (let s = 0; s < 40; s++) all.push(...guidedItems(s * 7919 + 1), ...firstItems(blockSeed(s, BLOCK.warmup), 200));
  for (const it of all) {
    const p = itemProblems(it);
    if (p.length) {
      bad(`item ${JSON.stringify(it)}: ${p.join('; ')}`);
      break;
    }
    if (it.options[it.side][2] !== it.target[0]) {
      bad("the correct option's centre arrow differs from the target's flanker direction");
      break;
    }
    checked++;
  }
  // all 16 configurations (2 d × 4 types × 2 sides) occur
  const configs = new Set(items.map((it) => `${it.dir}${it.type}${it.side}`));
  if (configs.size !== 16) bad(`only ${configs.size} of the 16 configurations occurred in ${N} draws`);
  // the guided set covers each trial type once
  if (guidedItems(12345).map((it) => it.type).sort().join() !== '0,1,2,3') bad('the guided first-run items must cover all four trial types');
  // the worked example is fully incongruent, so its lure copies the target (the trap the explanation names)
  if (WORKED_EXAMPLE.type !== 1 || WORKED_EXAMPLE.options[1 - WORKED_EXAMPLE.side].join() !== WORKED_EXAMPLE.target.join())
    bad('the worked example must be fully incongruent with the lure identical to the target');

  /* ---- 3. never more than 3 same-side answers in a row ---- */
  if (longestRun(items.map((it) => it.side)) > MAX_SIDE_RUN) bad(`a run of more than ${MAX_SIDE_RUN} same-side answers in the 10⁴ stream`);
  for (let s = 1; s <= 200; s++) {
    const run = longestRun(firstItems(blockSeed(s, BLOCK.test), 160).map((it) => it.side));
    if (run > MAX_SIDE_RUN) {
      bad(`seed ${s}: ${run} same-side answers in a row`);
      break;
    }
  }

  /* ---- 4. determinism: same seed → identical items; different seed → different items ---- */
  const a1 = JSON.stringify(firstItems(blockSeed(424242, BLOCK.test), 300));
  const a2 = JSON.stringify(firstItems(blockSeed(424242, BLOCK.test), 300));
  const b1 = JSON.stringify(firstItems(blockSeed(424243, BLOCK.test), 300));
  const w1 = JSON.stringify(firstItems(blockSeed(424242, BLOCK.warmup), 300));
  if (a1 !== a2) bad('the same seed produced different items');
  if (a1 === b1) bad('different seeds produced identical items');
  if (a1 === w1) bad('the warm-up and the scored block share an item stream');
  if (JSON.stringify(guidedItems(9)) !== JSON.stringify(guidedItems(9))) bad('guided items are not deterministic per seed');

  /* ---- 5. scoring of a scripted run equals the hand-computed values ---- */
  // 8 right (RTs 600…1300 → median 950), 2 wrong (500, 150 ms — the 150 is a probable mis-tap),
  // then one right answer that lands after the hard stop (must not count).
  const rows: ArrowTrial[] = [];
  const plan: [boolean, number][] = [
    [true, 600], [true, 700], [false, 500], [true, 800], [true, 900],
    [true, 1000], [false, 150], [true, 1100], [true, 1200], [true, 1300]
  ];
  let onset = 0;
  for (const [ok, rt] of plan) {
    rows.push({ type: 0, dir: 1, side: 1, chosen: ok ? 1 : 0, rt, onset });
    onset += rt;
  }
  rows.push({ type: 1, dir: 0, side: 0, chosen: 0, rt: 900, onset: TEST_MS - 400 }); // response at 90.5 s
  const log = rows.map(encodeTrial);
  const sc = scoreLog(log);
  if (sc.correct !== 8 || sc.incorrect !== 2) bad(`scripted run: expected 8 right / 2 wrong, got ${sc.correct} / ${sc.incorrect}`);
  if (sc.net !== 6) bad(`scripted run: net should be 8 − 2 = 6, got ${sc.net}`);
  if (sc.net !== sc.correct - sc.incorrect) bad('net must equal correct − incorrect');
  if (!near(sc.accuracy, 80)) bad(`scripted run: accuracy should be 80%, got ${sc.accuracy}`);
  if (!near(sc.throughput, 8 / 90)) bad(`scripted run: throughput should be 8/90 per s, got ${sc.throughput}`);
  if (sc.medianRt !== 950) bad(`scripted run: median correct RT should be 950 ms, got ${sc.medianRt}`);
  if (sc.fast !== 1 || !near(sc.fastShare, 0.1)) bad(`scripted run: 1 probable mis-tap (10%) expected, got ${sc.fast}`);
  if (sc.longestStreak !== 3) bad(`scripted run: longest streak should be 3, got ${sc.longestStreak}`);
  const out = buildOutcome(log);
  if (!out.valid) bad(`scripted run (net 6, exactly 10% fast) must be valid, got flags ${out.flags?.join(',')}`);
  if (!out.flags?.includes('probable-mis-taps')) bad('a valid run with a sub-200 ms answer must carry the probable-mis-taps flag');
  if (out.trials !== 10) bad(`scripted run: 10 scored trials expected (the post-stop touch excluded), got ${out.trials}`);
  if (out.metrics.net !== 6 || out.metrics.accuracy !== 80 || out.metrics.medianRt !== 950 || out.metrics.throughput !== 0.089)
    bad(`scripted run: outcome metrics ${JSON.stringify(out.metrics)}`);
  if (log.some((r) => r.length !== 7 || r.some((x) => !Number.isFinite(x)))) bad('trial-log rows must be 7 finite numbers');
  if (log[2][5] !== 0 || log[0][5] !== 1) bad('trial-log column 5 must record correctness');

  /* ---- 6. validity: net ≤ 0 → invalid; > 10% fast → invalid ---- */
  const tie = [true, false, true, false, true, false].map((ok, i) => encodeTrial({ type: 2, dir: 0, side: 0, chosen: ok ? 0 : 1, rt: 900, onset: i * 900 }));
  const vTie = buildOutcome(tie);
  if (vTie.valid || !vTie.flags?.includes('at-chance')) bad('a session with net = 0 must be invalid (at-chance)');
  const worse = buildOutcome(tie.slice(1));
  if (worse.valid || worse.metrics.net !== -1) bad('a session with net < 0 must be invalid');
  if (buildOutcome([]).valid) bad('an empty session must be invalid');
  const rushed = Array.from({ length: 20 }, (_, i) => encodeTrial({ type: 0, dir: 1, side: 1, chosen: 1, rt: i < 3 ? 120 : 800, onset: i * 1000 }));
  const vRushed = buildOutcome(rushed);
  if (vRushed.valid || !vRushed.flags?.includes('too-fast')) bad(`15% of answers under ${FAST_RT_MS} ms must invalidate the run (too-fast)`);
  if (validity({ ...scoreLog(rushed), fastShare: FAST_MAX_SHARE }).valid !== true) bad('exactly 10% fast answers is still valid');

  /* ---- 7. the checks catch deliberately broken input ---- */
  const broken = makeItem(1, 0, 1);
  broken.options[1] = [...broken.options[1]];
  broken.options[1][2] = 1; // flip the correct option's centre arrow
  if (!itemProblems(broken).length) bad('itemProblems missed an item whose correct centre arrow was flipped');
  const wrongTarget = makeItem(0, 1, 0);
  wrongTarget.target = [1, 1, 0, 1, 1]; // a "congruent" target with an odd centre
  if (!itemProblems(wrongTarget).length) bad('itemProblems missed a congruent target with a flipped centre');
  if (answerFor([1, 1, 1, 1, 1], [[1, 1, 1, 1, 1], [0, 0, 1, 0, 0]]) !== -1) bad('answerFor must refuse an item with two qualifying options');
  const biased = Array.from({ length: 1000 }, (_, i) => makeItem((i % 5 === 0 ? 1 : 0) as TrialType, 0, 0));
  if (!typeShareProblems(biased).length) bad('the type-share check missed a generator biased towards FC');
  if (longestRun([0, 1, 1, 1, 1, 0]) !== 4) bad('longestRun miscounted a run of 4');
  const late = scoreLog([encodeTrial({ type: 0, dir: 0, side: 0, chosen: 0, rt: 500, onset: TEST_MS - 100 })]);
  if (late.responses !== 0) bad('a touch after the 90-s stop was scored');

  /* ---- 8. a simulated player through the real stream: the outcome is sane ---- */
  const r = rng(77);
  const stream = firstItems(blockSeed(31337, BLOCK.test), 400);
  const simLog: number[][] = [];
  let t = 0;
  let shown = 0;
  for (const it of stream) {
    const rt = 650 + r() * 1500;
    shown++;
    if (t + rt >= TEST_MS) break; // the item on screen at time-out is not scored
    const ok = r() < 0.94;
    simLog.push(encodeTrial({ type: it.type, dir: it.dir, side: it.side, chosen: ok ? it.side : ((1 - it.side) as 0 | 1), rt, onset: t }));
    t += rt + 16; // the next item appears on the next frame
  }
  const sim = buildOutcome(simLog);
  const simScore = scoreLog(simLog);
  if (!sim.valid) bad(`a plausible simulated run was invalid: ${sim.flags?.join(',')}`);
  if (sim.trials !== simLog.length || shown !== simLog.length + 1) bad('the item on screen at time-out must not be logged');
  if (sim.metrics.net !== simScore.correct - simScore.incorrect) bad('simulated run: net ≠ correct − incorrect');
  for (const k of ['net', 'accuracy', 'throughput', 'medianRt']) if (!Number.isFinite(sim.metrics[k])) bad(`simulated run: metric ${k} is not finite`);
  if (sim.metrics.net < 25 || sim.metrics.net > 75) bad(`simulated run: net ${sim.metrics.net} is implausible for ~1.4 s answers at 94%`);
  const ex = exploratory(simLog);
  if (ex.byType.reduce((n, b) => n + b.n, 0) !== simLog.length) bad('exploratory readouts must cover every scored trial');

  /* ---- 9. reference anchor: z = (net − 40.43) / 14.17 on the primary metric only ---- */
  if (REF_MU !== 40.43 || REF_SD !== 14.17) bad('the reference anchor must be Burgoyne 2023 Study 2 (40.43 ± 14.17)');
  if (!near(referenceZ({ net: 40.43 }), 0) || indexFromZ(referenceZ({ net: 40.43 })) !== 50) bad('net 40.43 must give z 0 / index 50');
  if (indexFromZ(referenceZ({ net: 30 })) !== 43) bad('a home score near 30 must read about 43 on the index');
  if (referenceZ({ net: 20, accuracy: 10, medianRt: 9999 }) !== referenceZ({ net: 20 })) bad('the reference z must read only the primary metric');
  let prev = -Infinity;
  for (let net = -40; net <= 140; net++) {
    const z = referenceZ({ net });
    if (!Number.isFinite(z) || z <= prev) {
      bad(`reference z must be finite and increasing in net (net ${net})`);
      break;
    }
    prev = z;
  }
  if (!Number.isNaN(referenceZ({}))) bad('a missing net must give NaN ("no reference")');

  /* ---- 10. protocol constants and the §2.12 row ---- */
  if (TEST_MS !== 90_000 || WARMUP_MS !== 30_000 || COUNTDOWN_FROM * COUNTDOWN_STEP_MS !== 3000) bad('protocol timings drifted from 30 s practice → 3 s countdown → 90 s test');
  if (FAST_RT_MS !== 200 || FAST_MAX_SHARE !== 0.1 || MAX_SIDE_RUN !== 3) bad('validity / sequence constants drifted from §1.5');
  const sem = REF_SD * Math.sqrt(1 - REF_RETEST);
  if (Math.abs(sem - SCHEDULE.noiseFloorAbs) > 0.05) bad(`σ floor ${SCHEDULE.noiseFloorAbs} ≠ SEM_ref ${sem.toFixed(2)}`);
  if (SCHEDULE.runIn !== 2 || SCHEDULE.perWeek !== 2 || SCHEDULE.interruption !== 'A' || SCHEDULE.practiceProne || !SCHEDULE.stateSensitive)
    bad('the schedule must match §2.12 (R 2, 2×/week, class A, not practice-prone, state-sensitive)');

  return `${N} draws · types ${[0, 1, 2, 3].map((k) => ((items.filter((it) => it.type === k).length / N) * 100).toFixed(1)).join('/')}% · ${checked} items obey the rule · max side run ≤ ${MAX_SIDE_RUN} · scripted net 6 · simulated net ${sim.metrics.net}`;
};
