/**
 * Arithmetic Sprint fidelity check (SCIENCE.md §1.7, Appendix B "Calculation"):
 *  - over 10⁴ generated items every class satisfies its rule — restated HERE,
 *    independently of the generator — including the carry / borrow split and
 *    subtraction answers ≥ 10;
 *  - multiplication complex never includes ×2;
 *  - every cycle of 8 holds each operation twice (as one run of 2) and 50%
 *    complex items, and never opens with the previous cycle's last operation;
 *  - no duplicate problem within a session (flipped order counts as the same),
 *    the practice items included;
 *  - problem size alternates below / above each class's median answer;
 *  - same seed → identical items, different seed → different items;
 *  - CPM = C / 2, and a scripted run scores exactly the hand-computed values;
 *  - validity: < 8 answers → 'too-few', accuracy < 85% → 'rushed' (85% passes);
 *  - the reference reads only CPM and maps 6.1 / 10.1 / 14.1 / 18.1 → 40 / 50 / 60 / 70;
 *  - and each checker is proven to catch a deliberately broken input.
 */
import type { BrainCheck } from './types';
import {
  CYCLE_LENGTH,
  ITEM_COUNT,
  META,
  MIN_ACCURACY_PCT,
  STOP_FACTOR,
  STOP_MAX_MS,
  STOP_MIN_MS,
  BLOCK_MS,
  PRACTICE_ITEMS,
  BLOCK_MINUTES,
  referenceZ
} from '../../src/brain/arithmetic-sprint/logic/protocol';
import { generateItems, generatePractice, POOLS, type Op, type Problem } from '../../src/brain/arithmetic-sprint/logic/items';
import { rescoreRun, scoreRun, submissionsFromLog, validityFlags, TRIAL_COLUMNS, type Submission } from '../../src/brain/arithmetic-sprint/logic/scoring';
import { indexFromZ } from '../../src/platform/brain/timing';

const u = (n: number) => n % 10;

/** the eight class rules, restated from SCIENCE.md §1.7 (not imported from the generator) */
function ruleViolation(p: Pick<Problem, 'op' | 'complex' | 'a' | 'b' | 'answer'>): string | null {
  if (![p.a, p.b, p.answer].every(Number.isInteger)) return 'non-integer value';
  if (p.op === 'add') {
    if (p.a + p.b !== p.answer) return 'wrong sum';
    for (const x of [p.a, p.b]) if (x < 12 || x > 75 || u(x) === 0) return `operand ${x} outside [12, 75] / units 1–9`;
    if (p.a === p.b) return 'a = b';
    if (p.answer > 99) return 'a + b > 99';
    const carry = u(p.a) + u(p.b) >= 10;
    if (carry !== p.complex) return p.complex ? 'complex addition without a carry' : 'simple addition with a carry';
    return null;
  }
  if (p.op === 'sub') {
    const m = p.a;
    const s = p.b;
    if (m - s !== p.answer) return 'wrong difference';
    if (m < 23 || m > 98 || u(m) === 0) return `minuend ${m} outside [23, 98] / units 1–9`;
    if (s < 12 || s > m - 10 || u(s) === 0) return `subtrahend ${s} outside [12, m − 10] / units 1–9`;
    if (p.answer < 10) return 'answer < 10';
    const ok = p.complex ? u(s) > u(m) : u(s) < u(m);
    if (!ok) return p.complex ? 'complex subtraction without a borrow' : 'simple subtraction with a borrow';
    return null;
  }
  if (p.op === 'mul') {
    if (p.a * p.b !== p.answer) return 'wrong product';
    const lo = Math.min(p.a, p.b);
    const hi = Math.max(p.a, p.b);
    if (p.complex) {
      if (lo === 2) return 'complex multiplication with ×2';
      if (lo < 3 || lo > 9 || hi < 12 || hi > 19) return 'complex multiplication outside [3, 9] × [12, 19]';
    } else if (lo < 2 || hi > 9 || lo === hi) return 'simple multiplication outside [2, 9], a ≠ b';
    return null;
  }
  // division: (d·q) ÷ d = q
  const d = p.b;
  const q = p.answer;
  if (d === 0 || d * q !== p.a) return 'wrong quotient';
  if (p.complex) {
    if (d < 3 || d > 9 || q < 12 || q > 19) return 'complex division outside a ∈ [3, 9], b ∈ [12, 19]';
  } else if (d < 2 || d > 9 || q < 2 || q > 9 || d === q) return 'simple division outside a, b ∈ [2, 9], a ≠ b';
  return null;
}

/** identity for the no-repeat rule — flipped operand order of + and × is the same problem */
function identity(p: Pick<Problem, 'op' | 'a' | 'b'>): string {
  return p.op === 'add' || p.op === 'mul' ? `${p.op}:${Math.min(p.a, p.b)}:${Math.max(p.a, p.b)}` : `${p.op}:${p.a}:${p.b}`;
}

/** cycle structure problems of one session, or [] */
function cycleProblems(items: readonly Pick<Problem, 'op' | 'complex'>[]): string[] {
  const out: string[] = [];
  for (let c = 0; c * CYCLE_LENGTH < items.length; c++) {
    const cyc = items.slice(c * CYCLE_LENGTH, (c + 1) * CYCLE_LENGTH);
    const perOp = new Map<Op, number>();
    for (const it of cyc) perOp.set(it.op, (perOp.get(it.op) ?? 0) + 1);
    if (perOp.size !== 4 || [...perOp.values()].some((n) => n !== 2)) out.push(`cycle ${c}: operations not 2 each`);
    if (cyc.filter((it) => it.complex).length !== 4) out.push(`cycle ${c}: not 50% complex`);
    for (let r = 0; r < 4; r++) {
      const x = cyc[2 * r];
      const y = cyc[2 * r + 1];
      if (!x || !y || x.op !== y.op || x.complex === y.complex) out.push(`cycle ${c}: run ${r} is not one simple + one complex of one operation`);
    }
    if (c > 0 && cyc[0].op === items[c * CYCLE_LENGTH - 1].op) out.push(`cycle ${c}: opens with the previous cycle's last operation`);
  }
  return out;
}

function duplicates(items: readonly Pick<Problem, 'op' | 'a' | 'b'>[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const k = identity(it);
    if (seen.has(k)) out.push(`duplicate problem ${k}`);
    seen.add(k);
  }
  return out;
}

/** the class problem spaces rebuilt by brute force through ruleViolation, for medians and sizes */
function independentSpaces(): Map<string, number[]> {
  const spaces = new Map<string, number[]>();
  const add = (cls: string, answer: number) => {
    const list = spaces.get(cls) ?? [];
    list.push(answer);
    spaces.set(cls, list);
  };
  for (const complex of [false, true]) {
    const tag = complex ? 'complex' : 'simple';
    for (let a = 1; a <= 99; a++) {
      for (let b = 1; b <= 99; b++) {
        // + and × enumerated unordered (a < b, or a ≤ b for ×), − and ÷ ordered
        if (a < b && !ruleViolation({ op: 'add', complex, a, b, answer: a + b })) add(`add-${tag}`, a + b);
        if (!ruleViolation({ op: 'sub', complex, a, b, answer: a - b })) add(`sub-${tag}`, a - b);
        if (a <= b && !ruleViolation({ op: 'mul', complex, a, b, answer: a * b })) add(`mul-${tag}`, a * b);
      }
    }
    // division: dividends run to 9 × 19 = 171, divisors are single digits
    for (let a = 1; a <= 200; a++) {
      for (let b = 1; b <= 9; b++) {
        if (a % b === 0 && !ruleViolation({ op: 'div', complex, a, b, answer: a / b })) add(`div-${tag}`, a / b);
      }
    }
  }
  return spaces;
}

function medianOf(xs: number[]): number {
  const a = xs.slice().sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function mismatches(metrics: Record<string, number>, expect: Record<string, number>): string[] {
  const out: string[] = [];
  for (const [id, v] of Object.entries(expect)) {
    if (!(Math.abs((metrics[id] ?? NaN) - v) < 1e-9)) out.push(`${id} = ${metrics[id]}, expected ${v}`);
  }
  return out;
}

const P = (op: Op, complex: boolean, a: number, b: number, answer: number): Problem => ({
  op,
  complex,
  a,
  b,
  answer,
  high: false,
  key: identity({ op, a, b })
});

export const check: BrainCheck = ({ bad, rng }) => {
  /* ---------- protocol constants and §2.12 parameters ---------- */
  if (BLOCK_MINUTES !== 2) bad(`block is ${BLOCK_MINUTES} min, not 2.0`);
  if (ITEM_COUNT !== 120 || CYCLE_LENGTH !== 8) bad('pre-generated sequence is not 120 items in cycles of 8');
  if (PRACTICE_ITEMS !== 4) bad('practice is not 4 items');
  if (MIN_ACCURACY_PCT !== 85) bad('accuracy floor is not 85%');
  if (STOP_FACTOR !== 4 || STOP_MIN_MS !== 30_000 || STOP_MAX_MS !== 60_000) bad('the C13 stop rule is not 4 × pace within 30–60 s');
  if (META.runIn !== 3) bad(`R = ${META.runIn}, §2.12 says 3`);
  if (Math.abs(META.noiseFloor.abs - 4.0 * Math.sqrt(1 - 0.81)) > 0.05) bad(`noise floor ${META.noiseFloor.abs} ≠ SEM_ref ≈ 1.7`);
  if (!META.practiceProne || META.stateSensitive || META.interruption !== 'A' || META.perWeek !== 2) bad('§2.12 flags (practice-prone, state, class A, 2×/week) drifted');

  /* ---------- independent class spaces vs the generator's pools ---------- */
  const spaces = independentSpaces();
  const medians = new Map<string, number>();
  for (const pool of POOLS) {
    const cls = `${pool.op}-${pool.complex ? 'complex' : 'simple'}`;
    const answers = spaces.get(cls) ?? [];
    if (answers.length !== pool.all.length) bad(`${cls}: generator space ${pool.all.length} ≠ rule space ${answers.length}`);
    const med = medianOf(answers);
    medians.set(cls, med);
    if (med !== pool.median) bad(`${cls}: median ${pool.median} ≠ ${med}`);
  }
  const mulSimple = spaces.get('mul-simple') ?? [];
  if (mulSimple.length !== 28 || mulSimple.filter((x) => x <= 25).length !== 14) bad('MUL simple is not 28 pairs, 14 with product ≤ 25');

  /* ---------- ≥ 10⁴ draws: rules, cycles, duplicates, problem size ---------- */
  const SESSIONS = 84; // 84 × 120 = 10,080 items
  const r = rng(0x5eed_ca1c);
  let drawn = 0;
  const perClass = new Map<string, number>();
  let ruleFails = 0;
  for (let s = 0; s < SESSIONS; s++) {
    const seed = (r() * 0xffffffff) >>> 0;
    const items = generateItems(seed);
    if (items.length !== ITEM_COUNT) bad(`seed ${seed}: ${items.length} items`);
    drawn += items.length;
    const k = new Map<string, number>();
    for (const it of items) {
      const why = ruleViolation(it);
      if (why && ruleFails++ < 5) bad(`seed ${seed}: ${it.a} ${it.op} ${it.b} (${it.complex ? 'complex' : 'simple'}): ${why}`);
      const cls = `${it.op}-${it.complex ? 'complex' : 'simple'}`;
      perClass.set(cls, (perClass.get(cls) ?? 0) + 1);
      // problem size: simple classes start at/below the median, complex above, then alternate
      const n = k.get(cls) ?? 0;
      k.set(cls, n + 1);
      const wantHigh = (n + (it.complex ? 1 : 0)) % 2 === 1;
      const isHigh = it.answer > (medians.get(cls) ?? NaN);
      if (isHigh !== wantHigh) bad(`seed ${seed}: ${cls} draw ${n} is ${isHigh ? 'above' : 'at/below'} the median`);
      if (it.high !== isHigh) bad(`seed ${seed}: ${cls} 'high' flag wrong`);
    }
    for (const why of cycleProblems(items).slice(0, 3)) bad(`seed ${seed}: ${why}`);
    const practice = generatePractice(seed, items);
    if (practice.length !== 4 || new Set(practice.map((p) => p.op)).size !== 4 || practice.some((p) => p.complex))
      bad(`seed ${seed}: practice is not one simple item per operation`);
    for (const p of practice) if (ruleViolation(p)) bad(`seed ${seed}: practice item breaks its rule`);
    for (const why of duplicates([...items, ...practice]).slice(0, 3)) bad(`seed ${seed}: ${why}`);
  }
  if (drawn < 10_000) bad(`only ${drawn} draws`);
  for (const [cls, n] of perClass) if (n !== drawn / 8) bad(`${cls}: ${n} of ${drawn} draws, not 1/8`);

  /* ---------- determinism ---------- */
  const same = JSON.stringify(generateItems(424242)) === JSON.stringify(generateItems(424242));
  const samePractice =
    JSON.stringify(generatePractice(424242, generateItems(424242))) === JSON.stringify(generatePractice(424242, generateItems(424242)));
  if (!same || !samePractice) bad('the same seed produced different items');
  let differ = 0;
  for (let i = 0; i < 20; i++) {
    const s1 = (r() * 0xffffffff) >>> 0;
    if (JSON.stringify(generateItems(s1).slice(0, 8)) !== JSON.stringify(generateItems(s1 + 1).slice(0, 8))) differ++;
  }
  if (differ < 20) bad(`different seeds gave identical opening cycles (${20 - differ} of 20)`);

  /* ---------- scoring: a scripted run against hand-computed values ---------- */
  const script: [Problem, number, number, number][] = [
    // problem, typed, firstDigit ms, submit RT ms
    [P('add', false, 23, 14, 37), 37, 200, 350], // correct but under 400 ms: kept in CPM, out of the RT medians
    [P('add', true, 38, 47, 85), 85, 900, 2000],
    [P('sub', false, 56, 31, 25), 26, 1000, 3000], // wrong
    [P('sub', true, 83, 28, 55), 55, 1500, 4000],
    [P('mul', false, 3, 7, 21), 21, 1600, 5000],
    [P('mul', true, 9, 15, 135), 135, 2000, 6000],
    [P('div', false, 20, 4, 5), 5, 800, 2500],
    [P('div', true, 136, 8, 17), 17, 1200, 3500],
    [P('add', false, 41, 22, 63), 63, 1100, 4500],
    [P('add', true, 29, 23, 52), 52, 1700, 5500]
  ];
  // one problem every 12 s (each answered within its 12 s), so the run fills the 2-minute block —
  // onsets feed only the stop rule; every metric below reads the RTs
  const subs: Submission[] = script.map(([item, typed, fd, rt], order) => ({
    order,
    item,
    typed,
    firstDigitMs: fd,
    rtMs: rt,
    edits: order === 2 ? 1 : 0,
    onsetMs: order * 12_000
  }));
  const out = scoreRun(subs);
  const m = out.metrics;
  const expect: Record<string, number> = {
    cpm: 9 / 2, // C = 9 of N = 10
    accuracy: 90,
    rtCorrect: 4.25, // median of 2000 2500 3500 4000 4500 5000 5500 6000 ms
    firstDigit: 1.35, // median of 800 900 1100 1200 1500 1600 1700 2000 ms
    addRate: 4 / ((350 + 2000 + 4500 + 5500) / 60000),
    subRate: 1 / ((3000 + 4000) / 60000),
    mulRate: 2 / ((5000 + 6000) / 60000),
    divRate: 2 / ((2500 + 3500) / 60000)
  };
  for (const why of mismatches(m, expect)) bad(`scripted run: ${why}`);
  if (!out.valid || out.flags?.length || out.trials !== 10) bad('scripted run (10 answers, 90%) should be valid with 10 trials');
  const log = out.trialLog ?? [];
  if (log.length !== 10 || log.some((row) => row.length !== TRIAL_COLUMNS.length || row.length > 12 || !row.every(Number.isFinite)))
    bad('trial log rows must be 10 × 12 finite numbers (store.ts drops non-finite rows, keeps ≤ 12 columns)');
  if (log[2]?.[5] !== 0 || log[2]?.[8] !== 1 || log[1]?.[1] !== 1 || log[7]?.[1] !== 7) bad('trial log columns (correct / edits / class) misplaced');
  if (log[0]?.[11] !== 1 || log.slice(1).some((row) => row[11] !== 0)) bad('trial log: the 350-ms submission must be flagged fast, the others not');
  if (!out.highlights?.length || out.highlights.length > 3) bad('scripted run: 1–3 highlights expected');

  // CPM = C / 2 on random scripted runs from real items
  for (let run = 0; run < 50; run++) {
    const items = generateItems((r() * 0xffffffff) >>> 0);
    const rs: Submission[] = [];
    let t = 0;
    for (const item of items) {
      const rtMs = 1500 + r() * 6000;
      if (t + rtMs >= BLOCK_MS) break;
      rs.push({ order: rs.length, item, typed: r() < 0.9 ? item.answer : item.answer + 1, firstDigitMs: 500 + r() * 1000, rtMs, edits: 0, onsetMs: t });
      t += rtMs;
    }
    const n = rs.length;
    const c = rs.filter((s) => s.typed === s.item.answer).length;
    const o = scoreRun(rs);
    if (o.metrics.cpm !== c / 2) bad(`CPM ${o.metrics.cpm} ≠ C/2 = ${c / 2}`);
    // answering without a stop, validity is the accuracy floor alone (one wrong answer is always pardoned)
    if (o.valid !== (n - c <= 1 || c * 100 >= 85 * n)) bad(`validity wrong for ${c}/${n}`);
    if (o.valid) for (const [id, v] of Object.entries(o.metrics)) if (!Number.isFinite(v)) bad(`valid run: ${id} not finite`);
    if (o.valid && Object.keys(o.metrics).length !== 8) bad('a valid run must report all 8 declared metrics');
  }

  /* ---------- validity rules ---------- */
  /** n answers, the first c right, at a steady pace that fills the block (the last stretch to the lock = one interval) */
  const paced = (n: number, c: number, everyMs = BLOCK_MS / (n + 1)): Submission[] =>
    generateItems(7)
      .slice(0, n)
      .map((item, order) => ({ order, item, typed: order < c ? item.answer : item.answer + 1, firstDigitMs: 300, rtMs: everyMs, edits: 0, onsetMs: order * everyMs }));
  const flags = (n: number, c: number) => validityFlags(paced(n, c)).join(',');
  if (flags(8, 7) !== '') bad('8 answers at 87.5% must be valid');
  if (flags(20, 17) !== '') bad('exactly 85% must be valid');
  if (flags(20, 16) !== 'rushed') bad('80% must be invalid (rushed)');
  if (flags(0, 0) !== 'too-few') bad('an empty run must be invalid (too-few)');
  if (validityFlags(paced(120, 120), true).join(',') !== 'too-fast') bad('a run that exhausts the 120 items must be invalid (too-fast)');
  const fast = scoreRun(subs, { exhausted: true });
  if (fast.valid || !fast.flags?.includes('too-fast')) bad('an exhausted sequence scored valid');

  /* ---------- C13: slow is a score, never a reason to discard a run ---------- */
  // v1 discarded every run under 8 answers — about 1.5 SD below the reference mean
  if (flags(7, 7) !== '') bad(`7 careful answers in 2 minutes were discarded (${flags(7, 7)})`);
  const slow = scoreRun(paced(6, 6));
  if (!slow.valid || slow.metrics.cpm !== 3) bad(`a slow, careful run (6 right, one every 17 s) was not scored: ${slow.flags?.join()}`);
  if (!(slow.metrics.cpm < scoreRun(paced(20, 20)).metrics.cpm)) bad('a slow run did not score below a faster one');
  // one slip never invalidates a short run (5 of 6 = 83%); two of six do
  if (flags(6, 5) !== '') bad(`one slip in six answers invalidated the run (${flags(6, 5)})`);
  if (flags(6, 4) !== 'rushed') bad('two wrong of six (67%) was valid');
  // the stop rule follows the player's own pace: 35 s is a stop at one answer per 5 s, a hesitation at one per 15 s
  const withStretch = (everyMs: number, stretchMs: number): Submission[] => {
    const out: Submission[] = [];
    const items = generateItems(11);
    let t = 0;
    for (let k = 0; t + everyMs < BLOCK_MS; k++) {
      const gap = k === 3 ? stretchMs : everyMs;
      if (t + gap >= BLOCK_MS) break;
      out.push({ order: k, item: items[k], typed: items[k].answer, firstDigitMs: 300, rtMs: gap, edits: 0, onsetMs: t });
      t += gap;
    }
    return out;
  };
  if (!validityFlags(withStretch(5_000, 35_000)).includes('long-gap')) bad('a 35-s stop did not invalidate a 5-s-an-answer run');
  if (validityFlags(withStretch(15_000, 35_000)).length) bad(`a 35-s item invalidated a 15-s-an-answer run (${validityFlags(withStretch(15_000, 35_000)).join()})`);
  if (!validityFlags(withStretch(15_000, 61_000)).includes('long-gap')) bad('a 61-s stretch was not a stop at a slow pace');
  // stopping before the lock is a stop too
  {
    const early = paced(10, 10, 5_000); // ten answers in the first 50 s, then 70 s of nothing
    if (!validityFlags(early).includes('long-gap')) bad('70 silent seconds before the lock were not a stop');
  }

  /* ---------- rescoring a v1 run (scoring version 2) ---------- */
  {
    const v1 = scoreRun(paced(7, 7)); // v1 stored it as invalid (too-few)
    const out = rescoreRun({ trialLog: v1.trialLog ?? [], metrics: v1.metrics, flags: ['too-few'], valid: false, scoringVersion: 1 });
    if (!out || !out.valid || out.metrics.cpm !== 3.5) bad(`a v1 7-answer run was not rescored to valid: ${JSON.stringify(out?.flags)}`);
    if (out && JSON.stringify(out.metrics) !== JSON.stringify(v1.metrics)) bad('rescoring changed the metrics of a v1 run');
    // the log rebuilds the submissions exactly (every logged answer reproduces its `correct` cell)
    const back = submissionsFromLog(out?.trialLog ?? []);
    if (!back || back.length !== 7 || back.some((x, i) => x.typed !== paced(7, 7)[i].typed || x.item.answer !== paced(7, 7)[i].item.answer))
      bad('the trial log does not rebuild its submissions');
    const all = submissionsFromLog(scoreRun(subs).trialLog ?? []);
    if (!all || JSON.stringify(scoreRun(all).metrics) !== JSON.stringify(scoreRun(subs).metrics)) bad('rescoring the scripted run differs from scoring it live');
    // a log whose answers disagree with their `correct` cells is never rescored; an exhausted run stays invalid
    const tampered = (v1.trialLog ?? []).map((row, i) => (i === 0 ? [...row.slice(0, 5), 0, ...row.slice(6)] : row));
    if (rescoreRun({ trialLog: tampered, metrics: {}, flags: [], valid: false, scoringVersion: 1 }) !== null) bad('a self-contradicting log was rescored');
    const ex = rescoreRun({ trialLog: scoreRun(paced(120, 120), { exhausted: true }).trialLog ?? [], metrics: {}, flags: ['too-fast'], valid: false, scoringVersion: 1 });
    if (!ex || ex.valid || !ex.flags?.includes('too-fast')) bad('rescoring revived an exhausted run');
  }

  /* ---------- reference: CPM only, 50 + 10z ---------- */
  const idx = (cpm: number) => indexFromZ(referenceZ({ cpm }));
  if (idx(6.1) !== 40 || idx(10.1) !== 50 || idx(14.1) !== 60 || idx(18.1) !== 70) bad('index examples 6.1/10.1/14.1/18.1 → 40/50/60/70 failed');
  if (referenceZ({ cpm: 12, accuracy: 0, rtCorrect: 99, addRate: -5 }) !== referenceZ({ cpm: 12 })) bad('reference z reads more than CPM');
  if (!(referenceZ({ cpm: 12 }) > referenceZ({ cpm: 11.9 }))) bad('reference z is not increasing in CPM');

  /* ---------- the checkers catch broken input ---------- */
  if (!ruleViolation(P('add', false, 38, 47, 85))) bad('checker missed a carry in a simple addition');
  if (!ruleViolation(P('sub', true, 56, 31, 25))) bad('checker missed a complex subtraction without a borrow');
  if (!ruleViolation(P('mul', true, 2, 15, 30))) bad('checker missed ×2 in a complex multiplication');
  if (!ruleViolation(P('div', false, 49, 7, 7))) bad('checker missed a = b in a simple division');
  const good = generateItems(99);
  const broken = good.slice();
  [broken[0], broken[8]] = [broken[8], broken[0]]; // mixes two cycles' runs
  const swappedSameOp = broken[0].op === good[0].op && broken[0].complex === good[0].complex;
  if (!swappedSameOp && !cycleProblems(broken).length) bad('cycle checker missed a broken cycle');
  if (!cycleProblems(good.map((it, i) => (i === 3 ? { ...it, complex: !it.complex } : it))).length) bad('cycle checker missed a 3/5 complex split');
  const comm = good.slice(0, 10).find((it) => it.op === 'add' || it.op === 'mul');
  if (comm && !duplicates([...good.slice(0, 10), { ...comm, a: comm.b, b: comm.a }]).length) bad('duplicate checker missed a flipped repeat');
  if (!duplicates([...good.slice(0, 10), good[3]]).length) bad('duplicate checker missed an exact repeat');
  if (!mismatches({ ...m, cpm: 9 }, expect).length) bad('the scripted-run comparison missed CPM = C instead of C / 2');
  if (!mismatches({ ...m, rtCorrect: 3.0 }, expect).length) bad('the scripted-run comparison missed a fast submission left in the RT median');

  return `${drawn} items over ${SESSIONS} sessions obey the 8 class rules, cycles of 8 (2 per operation, 50% complex), no repeats, size alternation; scripted CPM ${m.cpm} = 9/2; validity + reference examples hold; C13: slow runs scored (6 @ 17 s), stops pace-relative, v1 runs rescore; 10 deliberately broken inputs caught`;
};
