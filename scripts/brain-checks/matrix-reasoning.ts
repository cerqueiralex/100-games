/**
 * Matrix Reasoning (Analysis) — fidelity check, SCIENCE.md Appendix B
 * "Analysis" plus determinism and scoring. Imports only the benchmark's pure
 * logic modules.
 *
 * SAMPLE SIZE: 10⁴ generated items per difficulty class (9 × 10⁴ = 90 000
 * items), exactly the Appendix B figure; on this machine the whole check
 * runs in well under the 25-s budget. Override with MR_CHECK_N=<n> for a
 * quicker local run (the summary line prints the n actually used).
 *
 * Per item it proves: exactly one option satisfies the item's rules (re-fitted
 * from the visible cells, not read from the generator's parameters); the
 * ambiguity guard and class purity hold; the 8 options are pairwise distinct
 * at render size (size steps ≥ 15 %, shade steps ≥ 25 %); the 2³ answer-set
 * balance (every value in exactly 4 options, every pair in exactly 2); the
 * class content matches the §1.8 table; the layout's hidden attributes stay
 * neutral. Over the whole sample: context-blind pickers ≤ 14.5 % (pooled,
 * and ≤ 16 % per class — 4.6 binomial SE above chance at n = 10⁴, so a
 * class-level bias cannot hide in the pool), the correct slot uniform.
 */
import type { BrainCheck } from './types';
import { CLASSES, IRT_C, bOf, eap, p3pl, selectClass, startTheta, TARGET_OFFSET } from '../../src/brain/matrix-reasoning/logic/irt';
import { generateItem, subSeed, probeMask, PHASE_BLOCK, type GenStats } from '../../src/brain/matrix-reasoning/logic/generator';
import { ambiguity, impurity, predict, gridOf, RAY_OPS } from '../../src/brain/matrix-reasoning/logic/rules';
import {
  LAYOUT_POOL,
  NEUTRAL,
  SHADE_LEVELS,
  SIZE_LEVELS,
  ATTR_IDS,
  popcount,
  isLogicKind,
  type AttrId,
  type Cell,
  type Item
} from '../../src/brain/matrix-reasoning/logic/model';
import { KIND_SCORED, KIND_VOID_SCORED, PROTOCOL, rescoreRun, scoreRun, thetaSoFar } from '../../src/brain/matrix-reasoning/logic/protocol';
import { explainItem, describeCell } from '../../src/brain/matrix-reasoning/logic/explain';
import { WORKED_EXAMPLES, DEMO_CELLS, DEMO_OPTIONS, DEMO_ANSWER } from '../../src/brain/matrix-reasoning/logic/examples';

declare const process: { env: Record<string, string | undefined> };

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

/** the value every rule of the item predicts, re-fitted from the visible cells; null if a rule does not fit */
function solve(item: Item): Partial<Cell> | null {
  const want: Partial<Cell> = {};
  for (const attr of LAYOUT_POOL[item.layout]) {
    const g = gridOf(item, attr);
    const rule = item.rules.find((r) => r.attr === attr);
    if (rule) {
      const p = predict(rule.kind, attr, g);
      if (p === null) return null;
      want[attr] = p;
    } else {
      // not rule-governed → constant across the whole matrix
      if (!g.slice(0, 8).every((v) => v === g[0])) return null;
      want[attr] = g[0];
    }
  }
  return want;
}

/** slots whose option satisfies every re-fitted rule */
function solutions(item: Item): number[] {
  const want = solve(item);
  if (!want) return [];
  const out: number[] = [];
  item.options.forEach((o, i) => {
    if ((Object.keys(want) as AttrId[]).every((a) => o[a] === want[a])) out.push(i);
  });
  return out;
}

/** two options can be told apart at render size */
function renderDistinct(a: Cell, b: Cell, item: Item): boolean {
  for (const attr of LAYOUT_POOL[item.layout]) {
    if (a[attr] === b[attr]) continue;
    if (attr === 'size' && Math.abs(SIZE_LEVELS[a.size] - SIZE_LEVELS[b.size]) < 0.15 - 1e-9) continue;
    if (attr === 'shade' && Math.abs(SHADE_LEVELS[a.shade] - SHADE_LEVELS[b.shade]) < 0.25 - 1e-9) continue;
    return true;
  }
  return false;
}

function allDistinct(item: Item): boolean {
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if (!renderDistinct(item.options[i], item.options[j], item)) return false;
  return true;
}

/** the 2³ design: each probe value in exactly 4 options, each cross-probe value pair in exactly 2 */
function balanced(item: Item): boolean {
  const ans = item.cells[8];
  if (item.probes.length !== 3 || item.options.length !== 8) return false;
  for (const a of item.probes) {
    const right = item.options.filter((o) => o[a] === ans[a]).length;
    if (right !== 4 || new Set(item.options.map((o) => o[a])).size !== 2) return false;
  }
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++)
      for (const vi of [true, false])
        for (const vj of [true, false]) {
          const n = item.options.filter(
            (o) => (o[item.probes[i]] === ans[item.probes[i]]) === vi && (o[item.probes[j]] === ans[item.probes[j]]) === vj
          ).length;
          if (n !== 2) return false;
        }
  return true;
}

/** the §1.8 class table, as a predicate on the drawn rules */
function classContentOk(item: Item): boolean {
  const kinds = item.rules.map((r) => r.kind);
  const n = kinds.length;
  const has = (k: string) => kinds.includes(k as never);
  const diag = has('diag-a') || has('diag-b');
  const logic = kinds.some(isLogicKind);
  const distinct = new Set(kinds).size === n && new Set(item.rules.map((r) => r.attr)).size === n;
  if (!distinct) return false;
  switch (item.classId) {
    case 1:
      return n === 1 && (has('row') || has('col'));
    case 2:
      return n === 1 && ['diag-a', 'diag-b', 'prog-r', 'prog-c'].includes(kinds[0]);
    case 3:
      return n === 2 && diag && !has('out') && !logic;
    case 4:
      return n === 3 && diag && !has('out') && !logic;
    case 5:
      return n === 1 && has('out');
    case 6:
      return n === 2 && has('out') && !logic;
    case 7:
      return (n === 3 && has('out') && !logic) || (n === 1 && (has('add') || has('sub')));
    case 8:
      return n === 1 && (has('xor') || has('and'));
    case 9:
      return n === 2 && (has('xor') || has('and')) && kinds.some((k) => ['prog-r', 'prog-c', 'diag-a', 'diag-b'].includes(k));
    default:
      return false;
  }
}

type Picker = (item: Item, tie: () => number) => number;

/** argmax of a score over the 8 options, ties broken uniformly */
function argBest(scores: number[], tie: () => number, max = true): number {
  const best = max ? Math.max(...scores) : Math.min(...scores);
  const idx = scores.flatMap((s, i) => (Math.abs(s - best) < 1e-9 ? [i] : []));
  return idx[Math.floor(tie() * idx.length)];
}

const SHOWN = (item: Item) => LAYOUT_POOL[item.layout];
const ink = (o: Cell) => o.size + o.shade + o.number + popcount(o.rays);
const freqScore = (item: Item) =>
  item.options.map((o) => SHOWN(item).reduce((s, a) => s + item.options.filter((x) => x[a] === o[a]).length, 0));
const simScore = (item: Item) =>
  item.options.map((o) => item.options.reduce((s, x) => s + SHOWN(item).filter((a) => x[a] === o[a]).length, 0));
const centre = (item: Item) =>
  item.options.map((o) =>
    SHOWN(item).reduce((s, a) => {
      const m = item.options.reduce((t, x) => t + x[a], 0) / 8;
      return s + Math.abs(o[a] - m);
    }, 0)
  );

/** context-blind pickers: they see the 8 options, never the matrix */
const PICKERS: Record<string, Picker> = {
  'most frequent values': (it, t) => argBest(freqScore(it), t),
  'rarest option': (it, t) => argBest(freqScore(it), t, false),
  'most similar to the others': (it, t) => argBest(simScore(it), t),
  'odd one out': (it, t) => argBest(simScore(it), t, false),
  'most ink': (it, t) => argBest(it.options.map(ink), t),
  'least ink': (it, t) => argBest(it.options.map(ink), t, false),
  'most central values': (it, t) => argBest(centre(it), t, false),
  'most extreme values': (it, t) => argBest(centre(it), t),
  'most rays': (it, t) => argBest(it.options.map((o) => popcount(o.rays)), t),
  'fewest rays': (it, t) => argBest(it.options.map((o) => popcount(o.rays)), t, false),
  'first option': () => 0
};

export const check: BrainCheck = ({ bad, rng }) => {
  const t0 = Date.now();
  const N = Math.max(200, Number(process.env.MR_CHECK_N) || 10_000);

  /* ---------- difficulty classes, selection ---------- */
  if (CLASSES.length !== 9) bad(`expected 9 difficulty classes, got ${CLASSES.length}`);
  for (let i = 1; i < CLASSES.length; i++)
    if (!(CLASSES[i].b > CLASSES[i - 1].b)) bad(`b not monotonic: D${i} ${CLASSES[i - 1].b} ≥ D${i + 1} ${CLASSES[i].b}`);
  const expectedB = [-2.6, -1.9, -1.2, -0.65, -0.4, -0.1, 0.4, 1.1, 1.9];
  CLASSES.forEach((c, i) => {
    if (c.b !== expectedB[i]) bad(`D${c.id} b = ${c.b}, SCIENCE.md says ${expectedB[i]}`);
  });
  // b = −logit((p − c)/(1 − c)) round-trips: an average person (θ = 0) on D1 succeeds ≈ 93–95 %
  if (!near(p3pl(0, bOf(1)), 0.94, 0.01)) bad(`3PL at θ=0 on D1 = ${p3pl(0, bOf(1))}, expected ≈ .94 (Sandia)`);
  if (!near(p3pl(-99, 0), IRT_C, 1e-9)) bad('3PL lower asymptote must be c = 1/8');
  // information peak of the 3PL is at b + ln[(1+√(1+8c))/2] ≈ b + 0.19 → TARGET_OFFSET 0.2
  const peak = Math.log((1 + Math.sqrt(1 + 8 * IRT_C)) / 2);
  if (!near(peak, TARGET_OFFSET, 0.015)) bad(`3PL information peak ${peak.toFixed(3)} vs target offset ${TARGET_OFFSET}`);
  for (let th = -4; th <= 4.0001; th += 0.01) {
    const goal = th - 0.2;
    let bestD = Infinity;
    for (const c of CLASSES) bestD = Math.min(bestD, Math.abs(c.b - goal));
    const got = selectClass(th);
    if (Math.abs(bOf(got) - goal) > bestD + 1e-9) bad(`selectClass(${th.toFixed(2)}) = D${got}, not the class nearest θ̂ − 0.2`);
  }
  const spots: [number, number][] = [
    [-0.5, 4],
    [0, 6],
    [-3, 1],
    [3, 9],
    [0.75, 7],
    [1.3, 8]
  ];
  for (const [th, want] of spots) if (selectClass(th) !== want) bad(`selectClass(${th}) = D${selectClass(th)}, expected D${want}`);
  if (startTheta([]) !== -0.5) bad('first-ever session must start at θ0 = −0.5');
  if (!near(startTheta([0.2, 9, 0.4, 0.6, 0.8, 1.0]), 0.8 - 0.5, 1e-9)) bad('θ0 must be the median of the LAST 5 valid sessions − 0.5');

  /* ---------- EAP against independently computed references ---------- */
  // reference values: an independent Python implementation of the same EAP
  // (prior N(0,1), 3PL a=1 c=1/8, quadrature −4…4 by 0.05), see the report
  const pat: [number, boolean][] = [
    [4, true],
    [6, true],
    [8, false],
    [7, true],
    [8, false],
    [7, false],
    [6, true],
    [7, true],
    [8, true],
    [9, false],
    [8, false],
    [8, true]
  ];
  const refs: [string, [number, boolean][], number, number][] = [
    ['prior only', [], 0, 0.999513],
    ['one correct on D4', [[4, true]], 0.250267, 0.942245],
    ['12-item pattern', pat, 0.518384, 0.593402],
    ['9 wrong on D1', Array.from({ length: 9 }, () => [1, false] as [number, boolean]), -3.122059, 0.493704]
  ];
  for (const [name, resp, th, se] of refs) {
    const e = eap(resp.map(([c, ok]) => ({ b: bOf(c), correct: ok })));
    if (!near(e.theta, th, 5e-6) || !near(e.se, se, 5e-6)) bad(`EAP ${name}: θ ${e.theta.toFixed(6)} SE ${e.se.toFixed(6)}, reference ${th} / ${se}`);
  }

  /* ---------- generation: Appendix B over N items per class ---------- */
  const tie = rng(0x5eed);
  const hits: Record<string, number> = {};
  const hitsByClass: Record<string, number[]> = {};
  for (const k of Object.keys(PICKERS)) {
    hits[k] = 0;
    hitsByClass[k] = new Array(10).fill(0);
  }
  const slotCount = new Array(8).fill(0);
  const stats: GenStats = { rejected: 0 };
  let total = 0;
  const fails: Record<string, number> = {};
  const fail = (what: string, item: Item) => {
    if (!fails[what]) bad(`${what} (class D${item.classId}, ${item.key})`);
    fails[what] = (fails[what] ?? 0) + 1;
  };
  for (let cls = 1; cls <= 9; cls++) {
    let prevKey: string | null = null;
    for (let i = 0; i < N; i++) {
      const item = generateItem(cls, subSeed(0xa11ce + cls, 7, i, 0), prevKey, stats);
      total++;
      if (prevKey && item.key === prevKey) fail('same rule combination twice in a row', item);
      prevKey = item.key;
      const sol = solutions(item);
      if (sol.length !== 1 || sol[0] !== item.answer) fail(`exactly one solution violated (${sol.length} solutions)`, item);
      if (ambiguity(item, LAYOUT_POOL[item.layout])) fail('ambiguity guard violated', item);
      if (impurity(item)) fail('class purity violated', item);
      if (!allDistinct(item)) fail('options not distinct at render size', item);
      if (!balanced(item)) fail('answer set not a balanced 2³ design', item);
      if (!classContentOk(item)) fail('rules do not match the class table', item);
      if (item.rules.some((r) => !item.probes.includes(r.attr))) fail('a rule attribute is not a probe', item);
      const hidden = ATTR_IDS.filter((a) => !LAYOUT_POOL[item.layout].includes(a));
      if ([...item.cells, ...item.options].some((c) => hidden.some((a) => c[a] !== NEUTRAL[a]))) fail('hidden attribute not neutral', item);
      if (item.layout === 'logic') {
        const w = item.wrong.find((x) => x.attr === 'rays');
        if (!w || popcount(w.value) !== popcount(item.cells[8].rays)) fail('ray counts not balanced on a logic item', item);
      }
      slotCount[item.answer]++;
      for (const [name, pickFn] of Object.entries(PICKERS)) {
        if (pickFn(item, tie) === item.answer) {
          hits[name]++;
          hitsByClass[name][cls]++;
        }
      }
    }
  }
  for (const [name, h] of Object.entries(hits)) {
    const rate = h / total;
    if (rate > 0.145) bad(`context-blind picker "${name}" hits ${(rate * 100).toFixed(1)} % (> 14.5 %)`);
    for (let cls = 1; cls <= 9; cls++) {
      const rc = hitsByClass[name][cls] / N;
      if (N >= 2000 && rc > 0.16) bad(`context-blind picker "${name}" hits ${(rc * 100).toFixed(1)} % on D${cls} (> 16 %)`);
    }
  }
  const worst = Math.max(...Object.values(hits)) / total;
  const worstClass = Math.max(...Object.values(hitsByClass).flatMap((h) => h.slice(1).map((x) => x / N)));
  // correct slot uniform: χ² with 7 df, p < .001 critical value 24.32
  const exp = total / 8;
  const chi = slotCount.reduce((s, n) => s + (n - exp) ** 2 / exp, 0);
  if (chi > 24.32) bad(`correct slot not uniform: χ²(7) = ${chi.toFixed(1)}`);

  /* ---------- determinism: a whole adaptive session replays from its seed ---------- */
  const session = (seed: number) => {
    const resp = rng(seed ^ 0xbeef);
    const log: number[][] = [];
    const items: Item[] = [];
    let prev: string | null = null;
    for (let slot = 0; slot < PROTOCOL.scoredItems; slot++) {
      const th = thetaSoFar(log) ?? startTheta([]);
      const it = generateItem(selectClass(th), subSeed(seed, PHASE_BLOCK, slot, 0), prev);
      prev = it.key;
      items.push(it);
      const chosen = resp() < 0.6 ? it.answer : (it.answer + 1) % 8;
      log.push([KIND_SCORED, it.classId, chosen === it.answer ? 1 : 0, 9000, 0, 0, chosen, it.answer, probeMask(it, chosen), it.family, th, 0]);
    }
    return JSON.stringify(items);
  };
  if (session(1234) !== session(1234)) bad('same seed did not replay identical items');
  if (session(1234) === session(1235)) bad('different seeds produced identical items');
  if (JSON.stringify(generateItem(5, 99)) !== JSON.stringify(generateItem(5, 99))) bad('generateItem is not deterministic');

  /* ---------- scoring of a scripted run (hand-computed) ---------- */
  // the 12-item pattern above, as a trial log, plus a warm-up row, a voided
  // row and one rapid guess that must all stay out of θ
  const row = (kind: number, cls: number, ok: boolean, rt: number, opts: { timeout?: boolean; chosen?: number } = {}) => {
    const chosen = opts.chosen ?? (opts.timeout ? -1 : ok ? 3 : 4);
    return [kind, cls, ok ? 1 : 0, rt, opts.timeout ? 1 : 0, rt < PROTOCOL.rapidMs ? 1 : 0, chosen, 3, chosen < 0 ? -1 : ok ? 7 : 5, 1, 0, 0];
  };
  const rts = [6000, 9000, 30000, 12000, 14000, 8000, 7000, 11000, 16000, 30000, 20000, 18000];
  const log = [
    row(0, 2, true, 5000),
    row(KIND_VOID_SCORED, 4, false, 3000, { chosen: -1 }),
    ...pat.map(([c, ok], i) => row(KIND_SCORED, c, ok, rts[i], rts[i] === 30000 ? { timeout: true } : {})),
    row(KIND_SCORED, 9, true, 900)
  ];
  const out = scoreRun(log, { interrupted: false, capped: false });
  const m = out.metrics;
  if (!near(m.theta, 0.518, 0.0011) || !near(m.se, 0.593, 0.0011)) bad(`scripted run θ ${m.theta} SE ${m.se}, hand value 0.518 / 0.593`);
  // 7 of the 12 valid items correct; the rapid guess is excluded from accuracy and θ
  if (!near(m.accuracy, (100 * 7) / 12, 1e-9)) bad(`scripted accuracy ${m.accuracy}, hand value 58.33`);
  // correct RTs 6000 9000 12000 7000 11000 16000 18000 → median 11000 ms
  if (m.rtCorrect !== 11) bad(`scripted median correct time ${m.rtCorrect} s, hand value 11`);
  // 10 answered valid items: 7 × mask 7 (3 ops) + 3 × mask 5 (2 ops) = 27 of 30 → 90 %
  if (!near(m.opAccuracy, 90, 1e-9)) bad(`scripted operation accuracy ${m.opAccuracy}, hand value 90`);
  if (m.timeouts !== 2 || m.rapidGuesses !== 1) bad(`scripted timeouts/rapid ${m.timeouts}/${m.rapidGuesses}, hand values 2/1`);
  if (!out.valid || out.trials !== 13) bad(`scripted run should be valid with 13 scored trials (valid ${out.valid}, trials ${out.trials})`);
  if (!out.flags?.includes('items-replaced')) bad('a voided item must flag "items-replaced"');
  for (const id of ['theta', 'se', 'accuracy', 'opAccuracy', 'rtCorrect', 'timeouts', 'rapidGuesses'])
    if (!Number.isFinite(m[id])) bad(`metric ${id} not finite`);

  /* ---------- validity rules, and checks that catch broken input ---------- */
  const careless = scoreRun([...log.slice(2, 12), row(1, 3, true, 800), row(1, 3, false, 700), row(1, 4, true, 1200)], { interrupted: false, capped: false });
  if (careless.valid || !careless.flags?.includes('careless')) bad('3 rapid guesses must invalidate the run as "careless"');
  // C13: slow is a score, never a reason to discard a run. At the slowest pace the window allows
  // (every item used to its 30 s), the 240-s cap completes 8 items — v1's 9-item floor discarded that run
  const few = scoreRun(log.slice(2, 10), { interrupted: false, capped: true });
  if (!few.valid || !few.flags?.includes('time-cap') || few.flags?.includes('too-few-items')) bad(`a run the time cap cut to 8 items was not scored (${few.flags?.join()})`);
  if (!(few.metrics.se > out.metrics.se) || !Number.isFinite(few.metrics.theta)) bad('a shorter run must report a finite θ with a larger SE');
  {
    let t = 0;
    let n = 0;
    while (t < PROTOCOL.capMs) {
      t += PROTOCOL.blankMs + PROTOCOL.windowMs;
      n++;
    }
    if (n !== 8) bad(`the slowest pace completes ${n} items before the cap (SCIENCE.md says 8)`);
    const slowest = scoreRun(Array.from({ length: n }, () => row(KIND_SCORED, 3, false, PROTOCOL.windowMs, { timeout: true })), { interrupted: false, capped: true });
    if (!slowest.valid) bad(`the slowest possible run (8 timeouts at the cap) was discarded (${slowest.flags?.join()})`);
  }
  const none = scoreRun([row(KIND_SCORED, 3, true, 900), row(KIND_SCORED, 3, true, 800)], { interrupted: false, capped: true });
  if (none.valid) bad('a run with no valid item must stay invalid');
  // rescoring (scoring version 2): the capped 8-item run as v1 stored it comes back valid, metrics identical
  {
    const live = scoreRun(log.slice(2, 10), { interrupted: false, capped: true });
    const back = rescoreRun({ trialLog: live.trialLog ?? [], metrics: live.metrics, flags: ['too-few-items', 'time-cap'], valid: false, scoringVersion: 1 });
    if (!back || !back.valid || JSON.stringify(back.metrics) !== JSON.stringify(live.metrics)) bad(`a v1 capped run was not rescored to valid: ${JSON.stringify(back?.flags)}`);
    const intr = rescoreRun({ trialLog: live.trialLog ?? [], metrics: live.metrics, flags: ['interrupted'], valid: false, scoringVersion: 1 });
    if (!intr || intr.valid) bad('rescoring revived an interrupted run');
    if (rescoreRun({ trialLog: [[1, 2]], metrics: {}, flags: [], valid: false, scoringVersion: 1 }) !== null) bad('a malformed log was rescored');
  }
  const broke = scoreRun(log, { interrupted: true, capped: false });
  if (broke.valid || !broke.flags?.includes('interrupted')) bad('a run past the interruption limit must be invalid');
  const empty = scoreRun([], { interrupted: false, capped: false });
  if (empty.valid || !Number.isFinite(empty.metrics.theta)) bad('an empty run must be invalid with finite metrics');

  const sample = generateItem(3, 4242);
  const dup = { ...sample, options: sample.options.map((o, i) => (i === 1 ? { ...sample.options[0] } : o)) };
  if (allDistinct(dup)) bad('distinctness check failed to catch a duplicated option');
  const shifted = { ...sample, answer: (sample.answer + 1) % 8 };
  const sol = solutions(shifted);
  if (sol.length === 1 && sol[0] === shifted.answer) bad('solution check failed to catch a wrong answer key');
  // rows 1–2 are both unions AND exclusive-ors (disjoint rays), row 3 overlaps:
  // ADD predicts 7, XOR predicts 5 → the guard must refuse it
  const amb = [1, 2, 3, 4, 8, 12, 3, 6, 7].map((rays) => ({ ...NEUTRAL, rays }));
  if (!ambiguity({ cells: amb, layout: 'logic' }, ['rays'])) bad('ambiguity guard failed to catch an ADD/XOR-ambiguous matrix');
  if (RAY_OPS.add(3, 6) !== 7 || RAY_OPS.xor(3, 6) !== 5) bad('ray operators are wrong');
  // a "XOR" item that is secretly a union must be caught by the purity guard
  const fakeXor = [1, 2, 3, 4, 8, 12, 16, 32, 48].map((rays) => ({ ...NEUTRAL, rays }));
  if (!impurity({ cells: fakeXor, rules: [{ attr: 'rays', kind: 'xor' }] })) bad('purity guard failed to catch a union labelled XOR');

  /* ---------- teaching material is itself correct ---------- */
  for (const ex of WORKED_EXAMPLES) {
    for (const rule of ex.rules) {
      const p = predict(rule.kind, rule.attr, gridOf(ex, rule.attr));
      if (p !== ex.cells[8][rule.attr]) bad(`worked example "${ex.title}" does not follow its own rule`);
    }
    if (ambiguity(ex, LAYOUT_POOL[ex.layout])) bad(`worked example "${ex.title}" is ambiguous`);
    if (!explainItem(ex).length || !describeCell(ex.cells[8], ex.layout)) bad('explanations missing');
  }
  if (DEMO_OPTIONS.length !== 8 || DEMO_OPTIONS.filter((o) => o.shape === DEMO_CELLS[8].shape && o.size === DEMO_CELLS[8].size && o.shade === DEMO_CELLS[8].shade).length !== 1)
    bad('demo answer set is not a 2³ set with one correct option');
  if (DEMO_OPTIONS[DEMO_ANSWER].size !== DEMO_CELLS[8].size || DEMO_OPTIONS[DEMO_ANSWER].shape !== DEMO_CELLS[8].shape) bad('demo answer slot is wrong');

  if (Object.keys(fails).length) bad(`generator failures: ${JSON.stringify(fails)}`);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  return `${N.toLocaleString('en')} items × 9 classes: 1 solution each, guard + purity hold, render-distinct, balanced 2³; best context-blind picker ${(worst * 100).toFixed(1)} % pooled, ${(worstClass * 100).toFixed(1)} % worst class; b monotonic; EAP matches reference; selection = nearest θ̂ − 0.2; replay deterministic; scripted θ ${m.theta} (${secs} s)`;
};
