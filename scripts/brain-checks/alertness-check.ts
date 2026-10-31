/**
 * Alertness Check (Reaction · PVT-B) — SCIENCE.md Appendix B "Reaction":
 *  - the ISI deck is the 31 values 1,000…4,000 ms in steps of 100;
 *  - false-start and lapse thresholds include the platform offset;
 *  - PS matches its formula;
 *  - the test stops on the first response after 180 s;
 *  - a 30,000 ms timeout counts as a valid stimulus and a lapse;
 * plus determinism (same seed → same items, different seed → different),
 * a scripted run scored against hand-computed values, the validity rules,
 * the grade-C anchor, and proofs that each checker catches a broken input.
 * Drives the REAL state machine (logic/protocol.ts) frame by frame with a
 * scripted responder — input before rAF, as browsers dispatch it.
 */
import type { BrainCheck } from './types';
import {
  CODE,
  ISI_DECK,
  PVT,
  PvtSession,
  isiSequence,
  practiceSeed,
  thresholds
} from '../../src/brain/alertness-check/logic/protocol';
import {
  anchorFor,
  buildOutcome,
  judge,
  performanceScore,
  referenceZ,
  scorePvt,
  tailCount
} from '../../src/brain/alertness-check/logic/scoring';

const IOS = 57.6;
const FRAME = 1000 / 60;
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;

/** every consecutive 31 values must be one full permutation of the deck */
function deckProblems(seq: readonly number[]): string | null {
  const want = ISI_DECK.join(',');
  for (let i = 0; i + 31 <= seq.length; i += 31) {
    const chunk = seq.slice(i, i + 31).sort((a, b) => a - b).join(',');
    if (chunk !== want) return `ISIs ${i}…${i + 30} are not one shuffled deck`;
  }
  return null;
}

/** the stop rule on a finished log: the LAST row is the first valid stimulus ending ≥ durationMs */
function stopRuleProblem(rows: number[][], durationMs: number): string | null {
  const endOf = (r: number[]) => r[2] + r[3];
  const validIdx = rows.map((r, i) => (r[0] === CODE.response || r[0] === CODE.timeout ? i : -1)).filter((i) => i >= 0);
  if (!validIdx.length) return 'no valid stimulus';
  const last = validIdx[validIdx.length - 1];
  if (last !== rows.length - 1) return 'rows after the final response';
  if (endOf(rows[last]) < durationMs) return `ended at ${endOf(rows[last])} ms, before ${durationMs}`;
  const firstAfter = validIdx.find((i) => endOf(rows[i]) >= durationMs);
  if (firstAfter !== last) return `kept going after the first response past ${durationMs} ms`;
  return null;
}

/** PS straight from its definition */
function psProblem(s: { lapses: number; falseStarts: number; valid: number; ps: number }): string | null {
  const want = 100 * (1 - (s.lapses + s.falseStarts) / (s.valid + s.falseStarts));
  return near(s.ps, want, 1e-9) ? null : `PS ${s.ps} ≠ ${want}`;
}

interface SimOpts {
  seed: number;
  offsetMs?: number;
  durationMs?: number;
  /** RT for the k-th revealed stimulus, or null for no response (timeout) */
  rtFor: (k: number) => number | null;
  /** after the k-th stimulus's response, also tap `fsDelay` ms later (a false start into the 1 s display) */
  fsAfter?: Set<number>;
  fsDelay?: number;
  /** absolute extra taps, ms from the block start */
  taps?: number[];
}

/** drive one block to its end; returns the session and the presented-stimulus count */
function simulate(o: SimOpts) {
  const sess = new PvtSession({ seed: o.seed, offsetMs: o.offsetMs ?? IOS, durationMs: o.durationMs ?? PVT.blockMs });
  const start = 5000;
  sess.begin(start);
  const queue: number[] = (o.taps ?? []).map((t) => t + start);
  /** scheduled response time → the index of the stimulus it answers */
  const answers = new Map<number, number>();
  let ts = start;
  let k = 0;
  let presented = 0;
  for (let guard = 0; !sess.ended && guard < 400_000; guard++) {
    ts += FRAME;
    queue.sort((a, b) => a - b);
    while (queue.length && queue[0] <= ts && !sess.ended) {
      const t = queue.shift()!;
      const ev = sess.press(t);
      const idx = answers.get(t);
      if (ev?.kind === 'response' && idx !== undefined && o.fsAfter?.has(idx)) queue.push(t + (o.fsDelay ?? 200));
    }
    if (sess.ended) break;
    const f = sess.frame(ts);
    if (f.revealed) {
      presented++;
      const idx = k++;
      const rt = o.rtFor(idx);
      if (rt !== null) {
        const t = sess.stimulusOnset + rt;
        queue.push(t);
        answers.set(t, idx);
      }
    }
  }
  return { sess, presented };
}

export const check: BrainCheck = async ({ bad, rng }) => {
  let n = 0;
  const ok = (cond: boolean, msg: string) => {
    n++;
    if (!cond) bad(msg);
  };

  /* ---- the ISI deck ---- */
  ok(ISI_DECK.length === 31, `deck has ${ISI_DECK.length} values, want 31`);
  ok(ISI_DECK[0] === 1000 && ISI_DECK[30] === 4000, 'deck must run 1,000…4,000 ms');
  ok(ISI_DECK.every((v, i) => v === 1000 + 100 * i), 'deck must step by 100 ms');
  const seqA = isiSequence(1234, 31 * 8);
  ok(deckProblems(seqA) === null, `block randomisation: ${deckProblems(seqA)}`);
  // the checker catches a doctored deck (one value duplicated)
  const broken = seqA.slice();
  broken[5] = broken[6];
  ok(deckProblems(broken) !== null, 'deckProblems failed to catch a duplicated ISI');

  /* ---- determinism ---- */
  ok(JSON.stringify(isiSequence(1234, 200)) === JSON.stringify(isiSequence(1234, 200)), 'same seed must give the same ISIs');
  ok(JSON.stringify(isiSequence(1234, 200)) !== JSON.stringify(isiSequence(1235, 200)), 'different seeds must give different ISIs');
  ok(JSON.stringify(isiSequence(77, 31)) !== JSON.stringify(isiSequence(practiceSeed(77), 31)), 'practice must not replay the scored block');

  /* ---- thresholds include the offset ---- */
  const th = thresholds(IOS);
  ok(near(th.falseStartMs, 157.6) && near(th.lapseMs, 412.6), `iOS thresholds ${th.falseStartMs}/${th.lapseMs}, want 157.6/412.6`);
  const th0 = thresholds(0);
  ok(th0.falseStartMs === 100 && th0.lapseMs === 355, 'zero offset must give 100/355');
  ok(thresholds(NaN).falseStartMs === 160, 'a missing offset must fall back to the 60 ms placeholder');
  {
    // classification on the live machine: 150 ms is a false start on iOS, a response at offset 0
    const at = (offsetMs: number, rt: number) => {
      const s = new PvtSession({ seed: 9, offsetMs, durationMs: 60_000 });
      s.begin(0);
      let ts = 0;
      while (!Number.isFinite(s.stimulusOnset)) s.frame((ts += FRAME));
      return s.press(s.stimulusOnset + rt)!;
    };
    ok(at(IOS, 150).kind === 'false-start', 'RT 150 ms on iOS must be a false start (100 + 57.6)');
    ok(at(0, 150).kind === 'response', 'RT 150 ms with no offset must be valid');
    ok(at(IOS, 160).kind === 'response', 'RT 160 ms on iOS must be valid');
    ok(!at(IOS, 412).lapse && at(IOS, 413).lapse, 'iOS lapse threshold must be 355 + 57.6 ms');
    ok(!at(0, 354).lapse && at(0, 355).lapse, 'lapse threshold must be ≥ 355 ms at offset 0');
  }

  /* ---- scripted run, hand-computed ---- */
  {
    const rows = [
      [CODE.response, 1000, 1000, 250],
      [CODE.response, 2000, 3250, 500],
      [CODE.falseStart, 1500, 5000, -300],
      [CODE.timeout, 3000, 9000, 30000]
    ];
    const s = scorePvt(rows, IOS);
    ok(s.valid === 3 && s.falseStarts === 1 && s.timeouts === 1, `counts ${s.valid}/${s.falseStarts}/${s.timeouts}, want 3/1/1`);
    ok(s.lapses === 2, `lapses ${s.lapses}, want 2 (500 ms and the timeout)`);
    ok(near(s.speed, (4 + 2 + 1 / 30) / 3), `speed ${s.speed}, want 2.011111`);
    ok(near(s.ps, 25), `PS ${s.ps}, want 25`);
    ok(near(s.slowSpeed, 1 / 30) && s.fastRt === 250 && s.medianRt === 500, 'tails/median of the 4-row script');
    ok(psProblem(s) === null, `PS formula: ${psProblem(s)}`);
    // the PS checker catches a scorer that drops false starts from the denominator
    ok(psProblem({ ...s, ps: 100 * (1 - (s.lapses + s.falseStarts) / s.valid) }) !== null, 'psProblem failed to catch a broken PS');
    // a 30,000 ms timeout is a valid stimulus AND a lapse
    const t = scorePvt([[CODE.timeout, 1000, 1000, 30000]], IOS);
    ok(t.valid === 1 && t.lapses === 1 && near(t.speed, 1 / 30), 'a timeout must be valid, a lapse, at RT 30,000');
    ok(near(performanceScore(2, 1, 3), 25) && Number.isNaN(performanceScore(0, 0, 0)), 'performanceScore');
    // validity boundaries: 40 valid stimuli and 10 false starts are still valid, 39 / 11 are not
    const base = { ...s, lapses: 0, timeouts: 0 };
    ok(judge({ ...base, valid: 40, falseStarts: 10 }).valid, '40 valid stimuli with 10 false starts must be valid');
    ok(!judge({ ...base, valid: 39, falseStarts: 0 }).valid, '39 valid stimuli must be invalid');
    ok(!judge({ ...base, valid: 60, falseStarts: 11 }).valid, '11 false starts must be invalid');
    ok(judge({ ...base, valid: 60, falseStarts: 3 }).flags.length === 0, '3 false starts carry no flag');

    // 20 responses 200…390 ms, offset 0: k = 2
    const rts = Array.from({ length: 20 }, (_, i) => 200 + 10 * i);
    const s20 = scorePvt(rts.map((rt, i) => [CODE.response, 1000, i * 3000, rt]), 0);
    ok(tailCount(20) === 2 && tailCount(62) === 6 && tailCount(3) === 1, 'tailCount = max(1, round(n/10))');
    ok(s20.lapses === 4, `20-row lapses ${s20.lapses}, want 4 (360…390)`);
    ok(near(s20.fastRt, 205) && near(s20.slowSpeed, (1000 / 390 + 1000 / 380) / 2), '20-row tails');
    ok(s20.medianRt === 295 && near(s20.ps, 80), '20-row median 295, PS 80');
    ok(near(s20.speed, rts.reduce((a, rt) => a + 1000 / rt, 0) / 20), '20-row speed');
    // malformed rows are skipped, never trusted
    const hostile = scorePvt([[CODE.response, 1000, 0, 300], [0, 1, 2] as number[], 'x' as unknown as number[], [0, NaN, 0, 5]], IOS);
    ok(hostile.valid === 1, `malformed rows must be skipped (got ${hostile.valid} valid)`);
  }

  /* ---- full simulated runs through the real machine ---- */
  const human = (seed: number) => {
    const r = rng(seed);
    return (k: number) => (k % 17 === 9 ? 480 + 200 * r() : 240 + 110 * r());
  };
  const runA = simulate({ seed: 4242, rtFor: human(1) });
  const rowsA = runA.sess.rows;
  ok(stopRuleProblem(rowsA, PVT.blockMs) === null, `stop rule: ${stopRuleProblem(rowsA, PVT.blockMs)}`);
  // the checker catches a log that stopped early (final response removed)
  ok(stopRuleProblem(rowsA.slice(0, -1), PVT.blockMs) !== null, 'stopRuleProblem failed to catch an early stop');
  const outA = buildOutcome(rowsA, IOS);
  ok(outA.valid && outA.trials >= 50 && outA.trials <= 75, `a proper run: valid ${outA.valid}, ${outA.trials} stimuli (expect ≈62)`);
  ok(['speed', 'lapses', 'falseStarts', 'ps', 'slowSpeed', 'fastRt', 'medianRt'].every((m) => Number.isFinite(outA.metrics[m])), 'every metric finite');
  ok(outA.metrics.speed > 2.5 && outA.metrics.speed < 4.5, `speed ${outA.metrics.speed} implausible`);
  // the presented stimuli consume the deck in order, each ISI measured from the last response
  {
    const seq = isiSequence(4242, 200);
    const presentedIsi = rowsA.filter((r) => r[0] !== CODE.falseStart || r[3] >= 0).map((r) => r[1]);
    ok(JSON.stringify(presentedIsi) === JSON.stringify(seq.slice(0, presentedIsi.length)), 'stimuli must consume the ISI deck in order');
    let prevEnd = 0;
    let gapsOk = true;
    for (const r of rowsA) {
      const gap = r[2] - prevEnd;
      if (gap < r[1] - 0.11 || gap > r[1] + FRAME + 0.11) gapsOk = false;
      prevEnd = r[2] + r[3];
    }
    ok(gapsOk, 'each onset must follow the previous response by its ISI (within one frame)');
  }
  // determinism of a whole run
  const runA2 = simulate({ seed: 4242, rtFor: human(1) });
  ok(JSON.stringify(runA2.sess.rows) === JSON.stringify(rowsA), 'same seed + same responses must replay identically');
  const runB = simulate({ seed: 4243, rtFor: human(1) });
  ok(JSON.stringify(runB.sess.rows.map((r) => r[1])) !== JSON.stringify(rowsA.map((r) => r[1])), 'a different seed must change the ISIs');

  // a false start into the 1 s display restarts the SAME interval; 4+ flag the run
  {
    const fsAfter = new Set([3, 11, 20, 33, 41]);
    const run = simulate({ seed: 99, rtFor: human(2), fsAfter, fsDelay: 250 });
    const rows = run.sess.rows;
    const fsIdx = rows.map((r, i) => (r[0] === CODE.falseStart ? i : -1)).filter((i) => i >= 0);
    ok(fsIdx.length === 5, `expected 5 false starts, got ${fsIdx.length}`);
    ok(
      fsIdx.every((i) => rows[i][3] < 0 && rows[i + 1] && rows[i + 1][1] === rows[i][1]),
      'after a false start the same ISI must restart'
    );
    ok(
      fsIdx.every((i) => {
        const tap = rows[i][2] + rows[i][3];
        const gap = rows[i + 1][2] - tap;
        return gap >= rows[i][1] - 0.11 && gap <= rows[i][1] + FRAME + 0.11;
      }),
      'the restarted ISI must run from the false-start tap'
    );
    const out = buildOutcome(rows, IOS);
    ok(out.valid && (out.flags ?? []).includes('responding-before-the-counter'), `5 false starts: valid + flagged (got ${JSON.stringify(out.flags)})`);
    const run11 = simulate({ seed: 99, rtFor: human(2), fsAfter: new Set([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21]), fsDelay: 250 });
    const out11 = buildOutcome(run11.sess.rows, IOS);
    ok(!out11.valid && (out11.flags ?? []).includes('too-many-false-starts'), `11 false starts must invalidate (got ${JSON.stringify(out11.flags)})`);
  }

  // a timeout: OVERRUN, valid + lapse at 30,000, and the next ISI runs from the timeout
  {
    const run = simulate({ seed: 5, rtFor: (k) => (k === 2 ? null : 300) });
    const rows = run.sess.rows;
    const ti = rows.findIndex((r) => r[0] === CODE.timeout);
    ok(ti === 2 && rows[ti][3] === 30000, 'the unanswered stimulus must log a 30,000 ms timeout');
    const gap = rows[ti + 1][2] - (rows[ti][2] + 30000);
    ok(gap >= rows[ti + 1][1] - 0.11 && gap <= rows[ti + 1][1] + FRAME + 0.11, 'the next ISI must start at the timeout');
    const s = scorePvt(rows, IOS);
    ok(s.timeouts === 1 && s.lapses >= 1, 'the timeout must count as a lapse');
  }

  // the stop rule, by hand: a false start after the block time does not end it; the next response does
  {
    /** answer `count` stimuli 300 ms after onset; returns the last response time */
    const drive = (s: PvtSession, count: number) => {
      let ts = 0;
      let last = NaN;
      for (let done = 0; done < count && !s.ended; ) {
        s.frame((ts += FRAME));
        if (Number.isFinite(s.stimulusOnset)) {
          last = s.stimulusOnset + 300;
          s.press(last);
          done++;
        }
      }
      return { last, ts };
    };
    const probe = new PvtSession({ seed: 31, offsetMs: IOS, durationMs: 600_000 });
    probe.begin(0);
    const t5 = drive(probe, 5).last;
    // same seed, same answers, but the block time runs out 10 ms after the 5th response
    const s = new PvtSession({ seed: 31, offsetMs: IOS, durationMs: t5 + 10 });
    s.begin(0);
    let { ts } = drive(s, 5);
    ok(!s.ended, 'a response before the block time must not end the block');
    const fs = s.press(t5 + 20);
    ok(fs?.kind === 'false-start' && !s.ended, 'a false start after the block time must not end the block');
    while (!Number.isFinite(s.stimulusOnset) && !s.ended) s.frame((ts += FRAME));
    const last = s.press(s.stimulusOnset + 280);
    ok(!!last && last.kind === 'response' && last.ended && s.ended, 'the first response after the block time must end it');
    ok(s.press(s.stimulusOnset + 2000) === null, 'no press is accepted after the end');
  }

  /* ---- junk runs ---- */
  {
    const asleep = simulate({ seed: 8, rtFor: () => null });
    const o = buildOutcome(asleep.sess.rows, IOS);
    ok(!o.valid && (o.flags ?? []).includes('too-few'), `never responding must be invalid "too-few" (got ${JSON.stringify(o.flags)})`);
    ok(asleep.sess.rows.every((r) => r[0] === CODE.timeout), 'an unanswered run is all timeouts');
    const taps = Array.from({ length: 600 }, (_, i) => 300 + i * 400);
    const spam = simulate({ seed: 8, rtFor: () => 300, taps });
    const os = buildOutcome(spam.sess.rows, IOS);
    ok(spam.sess.ended && !os.valid && (os.flags ?? []).includes('too-many-false-starts'), 'tap-spamming must end (safety cap) and be invalid');
  }

  /* ---- the grade-C anchor ---- */
  {
    const ios46 = { platformOffsetMs: IOS, offsetKnown: true };
    const a = anchorFor(ios46);
    ok(near(a.muS, 1000 / 270.6) && Math.round(a.muS * 100) / 100 === 3.7, `μ_S ${a.muS}, want 3.70 on iOS at 46`);
    ok(near(a.sigmaS, 26800 / 270.6 ** 2) && Math.round(a.sigmaS * 100) / 100 === 0.37, `σ_S ${a.sigmaS}, want 0.37`);
    ok(near(referenceZ(a.muS, ios46), 0), 'z(μ_S) must be 0');
    ok(near(referenceZ(a.muS + a.sigmaS, ios46), 1), 'z(μ_S + σ_S) must be 1');
    const zs = [2, 2.5, 3, 3.5, 4, 4.5].map((v) => referenceZ(v, ios46));
    ok(zs.every((z, i) => Number.isFinite(z) && (i === 0 || z > zs[i - 1])), 'z must be finite and increasing in speed');
    ok(Number.isNaN(referenceZ(3.7, { platformOffsetMs: 60, offsetKnown: false })), 'no reference where the offset is unmeasured');
    ok(anchorFor({ ...ios46, age: 66 }).muRt === 213 + 0.55 * 20 + IOS, 'age shifts μ_RT by 0.55 ms/yr');
    ok(near(anchorFor({ ...ios46, age: undefined }).muRt, 270.6), 'missing age uses 46');
  }

  /* ---- no Math.random in the benchmark ---- */
  {
    const fs = (await import('node:fs')) as unknown as {
      readdirSync: (p: string, o: { withFileTypes: true }) => { name: string; isDirectory(): boolean }[];
      readFileSync: (p: string, e: string) => string;
    };
    const { fileURLToPath } = await import('node:url');
    const root = fileURLToPath(new URL('../../src/brain/alertness-check/', import.meta.url));
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(`${dir}/${d.name}`) : [`${dir}/${d.name}`]));
    const offenders = walk(root).filter((f) => /\.(ts|tsx)$/.test(f) && /Math\.random/.test(fs.readFileSync(f, 'utf8')));
    ok(offenders.length === 0, `Math.random in ${offenders.join(', ')}`);
  }

  return `${n} assertions · ${runA.presented} stimuli in a scripted 180 s run · S ${outA.metrics.speed.toFixed(2)}/s, PS ${Math.round(outA.metrics.ps)}%`;
};
