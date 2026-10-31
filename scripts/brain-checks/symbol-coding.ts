/**
 * Fidelity checks for Symbol Coding, the Processing Speed benchmark
 * (SCIENCE.md §1.11 and Appendix B "Processing Speed"):
 *  - the glyph pool: ≥ 36 glyphs, 2–4 strokes on the 3×3 lattice, equal size,
 *    similar ink, and no two glyphs that are rotations (90/180/270°) or
 *    mirror images of each other — so no key can contain such a pair (also
 *    re-proven on the keys actually drawn) — and no near-copies either:
 *    no pool pair reaches POOL_SIMILARITY_MAX, no KEY holds a pair at
 *    KEY_SIMILARITY_MAX (best raster overlap under the 8 symmetries);
 *  - each set of 9 items shows every glyph once, no repeat across set
 *    boundaries, 200 coding items pre-generated, disjoint test / practice keys;
 *  - determinism: same seed → identical session, different seed → different;
 *  - scoring of a scripted run equals hand-computed values, DM90 = 6 × DM15,
 *    and the validity rules fire on broken runs;
 *  - the reference anchor (54 ± 9 on the 50 + 10z scale);
 *  - the checks themselves catch deliberately broken inputs.
 */
import type { BrainCheck } from './types';
import { indexFromZ } from '../../src/platform/brain/timing';
import {
  GLYPHS,
  INK_MAX,
  INK_MIN,
  CONFUSABLE_PAIRS,
  KEY_SIMILARITY_MAX,
  POOL_SIMILARITY_MAX,
  canonicalKey,
  confusable,
  glyphExtent,
  glyphInk,
  glyphSimilarity,
  poolSimilarity,
  sameUpToSymmetry,
  transformGlyph,
  type Glyph
} from '../../src/brain/symbol-coding/logic/glyphs';
import { PROTOCOL, generateSession, setSequence } from '../../src/brain/symbol-coding/logic/protocol';
import { COL, PHASE, STATUS, frameRow, scoreRun, trialRow } from '../../src/brain/symbol-coding/logic/scoring';
import { METRICS, PARAMS, PRIMARY_METRIC, REFERENCE } from '../../src/brain/symbol-coding/logic/meta';
import { DEMO_KEY, DEMO_TARGETS, ICON_GLYPHS } from '../../src/brain/symbol-coding/logic/demo';

/** every structural problem of a glyph pool (empty = sound) */
function poolProblems(pool: readonly Glyph[]): string[] {
  const out: string[] = [];
  if (pool.length < 36) out.push(`pool has ${pool.length} glyphs (< 36)`);
  const seen = new Map<string, number>();
  pool.forEach((g, i) => {
    if (g.length < 2 || g.length > 4) out.push(`glyph ${i} has ${g.length} strokes`);
    for (const st of g) {
      if (!st.every((p) => Number.isInteger(p) && p >= 0 && p <= 8)) out.push(`glyph ${i} leaves the 3×3 lattice`);
      if (st.length === 3) {
        const [a, c, b] = st.map((p) => [p % 3, Math.floor(p / 3)]);
        if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) === 0) out.push(`glyph ${i} has a degenerate curve`);
      }
      if (st[0] === st[st.length - 1]) out.push(`glyph ${i} has a zero-length stroke`);
    }
    const { w, h } = glyphExtent(g);
    if (w < 1.99 || h < 1.99) out.push(`glyph ${i} does not span the lattice (${w.toFixed(2)}×${h.toFixed(2)})`);
    const ink = glyphInk(g);
    if (ink < INK_MIN || ink > INK_MAX) out.push(`glyph ${i} ink ${ink.toFixed(2)} outside ${INK_MIN}–${INK_MAX}`);
    const k = canonicalKey(g);
    if (seen.has(k)) out.push(`glyphs ${seen.get(k)} and ${i} are rotations / mirror images of each other`);
    else seen.set(k, i);
  });
  return out;
}

/** problems of an item sequence: sets of 9 that repeat a digit, immediate repeats */
function sequenceProblems(seq: readonly number[], size = 9): string[] {
  const out: string[] = [];
  for (let s = 0; s < seq.length; s += size) {
    const set = seq.slice(s, s + size);
    if (new Set(set).size !== set.length) out.push(`set at ${s} repeats a digit`);
    if (set.some((d) => !Number.isInteger(d) || d < 1 || d > size)) out.push(`set at ${s} has a digit outside 1–${size}`);
  }
  for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) out.push(`immediate repeat at ${i}`);
  return out;
}

/** problems of one drawn key: rotation / mirror pairs and near-copies */
function keyProblems(key: readonly number[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < key.length; i++)
    for (let j = i + 1; j < key.length; j++) {
      if (sameUpToSymmetry(GLYPHS[key[i]], GLYPHS[key[j]])) out.push(`key holds a rotation / mirror pair ${key[i]}/${key[j]}`);
      if (poolSimilarity(key[i], key[j]) >= KEY_SIMILARITY_MAX) out.push(`key holds near-copies ${key[i]}/${key[j]}`);
    }
  return out;
}

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;

/** a scripted run; every number below is hand-computed in the comments */
function scriptedLog(): number[][] {
  const rows: number[][] = [];
  // practice: round 0 with 9/10 right (item 4 wrong)
  for (let i = 0; i < 10; i++) rows.push(trialRow(PHASE.practice, i, 0, 3, i === 4 ? 5 : 3, 900 * (i + 1), 900, i % 9, STATUS.registered));
  // motor: 12 registered responses, 11 right (the 6th wrong), plus 2 ignored double taps
  for (let i = 0; i < 12; i++) {
    const t = 1200 * (i + 1); // 1.2 … 14.4 s, all inside 15 s
    rows.push(trialRow(PHASE.motor, i, -1, (i % 9) + 1, i === 5 ? 9 : (i % 9) + 1, t, 1200, i % 9, STATUS.registered));
  }
  rows.push(trialRow(PHASE.motor, 3, -1, 4, 4, 4850, 50, 3, STATUS.doubleTap));
  rows.push(trialRow(PHASE.motor, 7, -1, 8, 8, 9640, 40, 7, STATUS.doubleTap));
  // coding: responses at 1 s, 2 s, … 89 s (89 answers); every k ≡ 9 (mod 10) wrong
  //   → errors at k = 9, 19, …, 79 = 8, correct = 81, accuracy 81/89 = 91.0 %
  //   → gaps between correct answers: 73 × 1000 ms + 8 × 2000 ms → median 1000 ms
  //   → first 30 s: k = 0…28 (29 answers, 2 wrong) = 27 → 54/min;
  //     last 30 s: k = 59…88 (30 answers, 3 wrong) = 27 → 54/min → slope 0
  //   → longest gap 1000 ms (onset → 1 s, …, 89 s → the 90-s lock)
  for (let k = 0; k < 89; k++) {
    const digit = (k % 9) + 1;
    rows.push(trialRow(PHASE.coding, k, 7, digit, k % 10 === 9 ? (digit % 9) + 1 : digit, 1000 * (k + 1), 980, k % 9, STATUS.registered));
  }
  // 5 more ignored taps in the coding block → 7 ignored in all (> 5 → flag)
  for (let j = 0; j < 5; j++) rows.push(trialRow(PHASE.coding, 10 * j, 7, 1, 1, 1000 * (10 * j + 1) + 60, 60, 0, STATUS.doubleTap));
  rows.push([PHASE.frames, 5400, 16.7, 17.1, 33.4, 0, 0, 0, 0]);
  return rows;
}

export const check: BrainCheck = async ({ bad, rng }) => {
  /* ---------- the glyph pool ---------- */
  const problems = poolProblems(GLYPHS);
  for (const p of problems) bad(p);
  // the check catches a broken pool: a rotated copy and a mirrored copy
  if (!poolProblems([...GLYPHS, transformGlyph(GLYPHS[0], 1)]).some((p) => p.includes('rotations')))
    bad('pool check missed a 90° rotation');
  if (!poolProblems([...GLYPHS, transformGlyph(GLYPHS[5], 6)]).some((p) => p.includes('rotations')))
    bad('pool check missed a mirror image');
  if (!poolProblems(GLYPHS.slice(0, 30)).length) bad('pool check missed a pool under 36 glyphs');
  for (let k = 1; k < 8; k++) if (!sameUpToSymmetry(GLYPHS[3], transformGlyph(GLYPHS[3], k))) bad(`symmetry ${k} not recognised`);
  // near-copies: none in the pool; few enough near-pairs that both keys always fill
  let nearPairs = 0;
  let worstPair = 0;
  const derivedPairs: string[] = [];
  for (let i = 0; i < GLYPHS.length; i++)
    for (let j = i + 1; j < GLYPHS.length; j++) {
      const sim = poolSimilarity(i, j);
      if (Math.abs(sim - glyphSimilarity(GLYPHS[i], GLYPHS[j])) > 1e-6) bad(`similarity table differs for ${i}/${j}`);
      if (sim >= POOL_SIMILARITY_MAX) bad(`glyphs ${i} and ${j} are near-copies (similarity ${sim.toFixed(2)})`);
      if (sim >= KEY_SIMILARITY_MAX) derivedPairs.push(`[${i}, ${j}]`);
      if (confusable(i, j) !== (sim >= KEY_SIMILARITY_MAX || canonicalKey(GLYPHS[i]) === canonicalKey(GLYPHS[j]))) bad(`confusable(${i}, ${j}) disagrees with the geometry`);
      if (confusable(i, j)) nearPairs++;
      worstPair = Math.max(worstPair, sim);
    }
  if (nearPairs > GLYPHS.length - 2 * PROTOCOL.keySize) bad(`${nearPairs} confusable pairs: keys could fail to fill`);
  const baked = CONFUSABLE_PAIRS.map(([a, b]) => `[${Math.min(a, b)}, ${Math.max(a, b)}]`).sort().join(', ');
  if (baked !== [...derivedPairs].sort().join(', ')) bad(`CONFUSABLE_PAIRS is stale — bake: ${derivedPairs.join(', ')}`);
  // the similarity measure: 1 for a glyph and its rotations / mirrors, high for a
  // near-copy (one short extra stroke — a pair the first pool really had), low for
  // a glyph that only shares its centre with another
  for (let k = 0; k < 8; k++) if (glyphSimilarity(GLYPHS[7], transformGlyph(GLYPHS[7], k)) < 0.999) bad(`similarity of a glyph and its symmetry ${k} is not 1`);
  const nearCopy = glyphSimilarity([[0, 5, 6], [3, 7, 5]], [[0, 5, 6], [3, 7, 5], [5, 8]]);
  if (nearCopy < POOL_SIMILARITY_MAX) bad(`similarity missed a near-copy (${nearCopy.toFixed(2)})`);
  if (glyphSimilarity([[0, 5, 6], [3, 7, 5]], transformGlyph([[0, 5, 6], [3, 7, 5], [5, 8]], 4)) < POOL_SIMILARITY_MAX) bad('similarity missed a mirrored near-copy');

  /* ---------- sessions: keys, sets, determinism ---------- */
  let keysChecked = 0;
  for (let n = 0; n < 400; n++) {
    const seed = (n * 2654435761 + 12345) >>> 0;
    const s = generateSession(seed);
    const all = [...s.testKey, ...s.practiceKey];
    if (s.testKey.length !== 9 || s.practiceKey.length !== 9) bad(`seed ${seed}: key sizes ${s.testKey.length}/${s.practiceKey.length}`);
    if (new Set(all).size !== 18) bad(`seed ${seed}: test and practice glyphs overlap or repeat`);
    if (all.some((g) => !Number.isInteger(g) || g < 0 || g >= GLYPHS.length)) bad(`seed ${seed}: key glyph outside the pool`);
    for (const key of [s.testKey, s.practiceKey]) {
      for (const p of keyProblems(key)) bad(`seed ${seed}: ${p}`);
      keysChecked++;
    }
    if (s.block.length !== PROTOCOL.blockItems) bad(`seed ${seed}: ${s.block.length} coding items (≠ 200)`);
    for (const p of sequenceProblems(s.block)) bad(`seed ${seed} block: ${p}`);
    for (const p of sequenceProblems(s.motor)) bad(`seed ${seed} motor: ${p}`);
    if (s.motor.length < Math.ceil(PROTOCOL.motorMs / PROTOCOL.doubleTapMs)) bad(`seed ${seed}: motor items could run out`);
    for (const r of s.practice) {
      if (r.length !== PROTOCOL.practiceItems) bad(`seed ${seed}: practice round of ${r.length}`);
      for (const p of sequenceProblems(r)) bad(`seed ${seed} practice: ${p}`);
    }
    if (new Set(s.tutorial).size !== PROTOCOL.tutorialItems) bad(`seed ${seed}: tutorial items repeat`);
  }
  // the sequence check catches a repeat across a set boundary and a doubled digit
  const broken = setSequence(rng(7), 18);
  broken[9] = broken[8];
  if (!sequenceProblems(broken).length) bad('sequence check missed a boundary repeat');
  if (!sequenceProblems([1, 2, 3, 4, 5, 6, 7, 8, 8]).length) bad('sequence check missed a doubled digit');
  // the demo shows a key the generator could draw
  if (DEMO_KEY.length !== 9 || new Set(DEMO_KEY).size !== 9 || DEMO_KEY.some((g) => !Number.isInteger(g) || g < 0 || g >= GLYPHS.length))
    bad('demo key is not 9 distinct pool glyphs');
  for (const p of keyProblems(DEMO_KEY)) bad(`demo ${p}`);
  if (DEMO_TARGETS.some((d) => !Number.isInteger(d) || d < 1 || d > 9) || new Set(DEMO_TARGETS).size !== DEMO_TARGETS.length) bad('demo targets are not distinct digits');
  if (new Set(ICON_GLYPHS).size !== 3 || keyProblems(ICON_GLYPHS).length) bad('sticker glyphs are not a valid key fragment');
  if (CONFUSABLE_PAIRS.slice(1).map(([a, b]) => `[${a}, ${b}]`).sort().join(', ') === [...derivedPairs].sort().join(', ')) bad('the stale-list check would miss a dropped pair');
  // the key check catches a key holding a real near-pair of the pool
  {
    let pair: [number, number] | null = null;
    for (let i = 0; i < GLYPHS.length && !pair; i++)
      for (let j = i + 1; j < GLYPHS.length && !pair; j++) if (poolSimilarity(i, j) >= KEY_SIMILARITY_MAX) pair = [i, j];
    const key = generateSession(5).testKey.filter((g) => !pair || (g !== pair[0] && g !== pair[1])).slice(0, 7);
    if (!pair) bad('no near-pair in the pool to test the key check with');
    else if (!keyProblems([pair[0], pair[1], ...key]).some((p) => p.includes('near-copies'))) bad('key check missed a near-pair');
  }
  // determinism
  const a = JSON.stringify(generateSession(424242));
  if (a !== JSON.stringify(generateSession(424242))) bad('same seed gave different sessions');
  let same = 0;
  for (let n = 1; n <= 50; n++) {
    if (JSON.stringify(generateSession(n).block) === JSON.stringify(generateSession(n + 1000).block)) same++;
    if (generateSession(n).testKey.join() === generateSession(n + 1000).testKey.join()) same++;
  }
  if (same) bad(`different seeds gave identical items ${same} times`);
  // the random glyph → digit mapping: every pool glyph lands on every digit somewhere
  const hits = new Set<string>();
  for (let n = 0; n < 2000; n++) generateSession(n).testKey.forEach((g, i) => hits.add(`${g}:${i}`));
  if (hits.size < GLYPHS.length * 9 * 0.98) bad(`glyph→digit mapping covers only ${hits.size}/${GLYPHS.length * 9} pairs`);

  /* ---------- scoring of a scripted run ---------- */
  const log = scriptedLog();
  const s = scoreRun(log);
  const m = s.metrics;
  if (m.sds90 !== 81) bad(`scripted SDS90 ${m.sds90} (expected 81)`);
  if (m.errors !== 8) bad(`scripted errors ${m.errors} (expected 8)`);
  if (!near(m.accuracy, 91)) bad(`scripted accuracy ${m.accuracy} (expected 91.0)`);
  if (m.dm90 !== 66) bad(`scripted DM90 ${m.dm90} (expected 6 × 11 = 66)`);
  const dm15 = log.filter((r) => r[COL.phase] === PHASE.motor && r[COL.status] === STATUS.registered && r[COL.response] === r[COL.digit]).length;
  if (m.dm90 !== PROTOCOL.dmScale * dm15 || PROTOCOL.dmScale !== 6) bad('DM90 ≠ 6 × DM15');
  if (!near(m.medianGapMs, 1000)) bad(`scripted median gap ${m.medianGapMs} (expected 1000)`);
  if (!near(m.codingRatio, 1.227)) bad(`scripted coding ratio ${m.codingRatio} (expected 81/66 = 1.227)`);
  if (m.learningSlope !== 0) bad(`scripted learning slope ${m.learningSlope} (expected 0)`);
  if (!s.valid) bad(`scripted run invalid: ${s.flags.join(', ')}`);
  if (s.flags.join() !== 'double-taps') bad(`scripted flags ${s.flags.join()} (expected double-taps)`);
  if (s.responses !== 89 || s.longestGapMs !== 1000) bad(`scripted responses ${s.responses} / longest gap ${s.longestGapMs}`);
  for (const [k, v] of Object.entries(m)) if (!Number.isFinite(v)) bad(`metric ${k} not finite`);

  // a speed-up gives a positive slope: first 30 s every 1.5 s, then every 0.75 s
  {
    const rows: number[][] = [];
    let t = 0;
    let k = 0;
    while (t < 89_000) {
      t += t < 30_000 ? 1500 : 750;
      if (t >= PROTOCOL.blockMs) break;
      rows.push(trialRow(PHASE.coding, k, 1, 1, 1, t, 700, k % 9, STATUS.registered));
      k++;
    }
    // first window: t = 1.5 … 28.5 s → 19 correct → 38/min; last: t in [60, 90) → 40 → 80/min
    const sl = scoreRun(rows);
    if (sl.metrics.learningSlope !== 80 - 38) bad(`speed-up slope ${sl.metrics.learningSlope} (expected 42)`);
  }

  // the frame row: intervals summarised, junk dropped, the app version stamped, never scored
  {
    // four real intervals (16.6, 16.7, 16.8, 50.2): median 16.75 → 16.8, max 50.2, one over 50 ms
    const fr = frameRow([16.7, 16.6, 0, NaN, 50.2, 16.8], [3, 12, 456]);
    const [ph, n, med, p95, max, over, ...ver] = fr;
    if (ph !== PHASE.frames || n !== 4 || med !== 16.8 || !(p95 >= med && p95 <= max) || max !== 50.2 || over !== 1 || ver.join() !== '3,12,456')
      bad(`frame row ${fr.join()}`);
    if (frameRow([], [1, 2, 3]).join() !== [PHASE.frames, 0, 0, 0, 0, 0, 1, 2, 3].join()) bad('empty frame row lost its version');
    if (frameRow([16], [1.5, -2]).slice(6).join() !== '0,0,0') bad('frame row kept a malformed version');
    if (scoreRun([...log, fr]).metrics.sds90 !== 81) bad('the frame row was scored');
  }

  /* ---------- validity rules on broken runs ---------- */
  const flagsOf = (rows: number[][]) => scoreRun(rows);
  // a 6-s pause mid-block
  {
    const rows = log.filter((r) => !(r[COL.phase] === PHASE.coding && r[COL.t] > 40_000 && r[COL.t] < 46_500));
    const r = flagsOf(rows);
    if (r.valid || !r.flags.includes('long-gap')) bad(`a 6.5-s pause was not invalid (${r.flags.join()})`);
  }
  // stopping 6 s before the lock is a gap too
  {
    const rows = log.filter((r) => !(r[COL.phase] === PHASE.coding && r[COL.t] > 83_500));
    const r = flagsOf(rows);
    if (r.valid || !r.flags.includes('long-gap')) bad('a silent last 6.5 s was not invalid');
  }
  // random tapping: ~11 % accuracy
  {
    const rr = rng(99);
    const rows: number[][] = [];
    for (let k = 0; k < 180; k++) rows.push(trialRow(PHASE.coding, k, 2, (k % 9) + 1, 1 + Math.floor(rr() * 9), 400 * (k + 1), 380, k % 9, STATUS.registered));
    const r = flagsOf(rows);
    if (r.valid || !r.flags.includes('low-accuracy')) bad(`random tapping was not invalid (${r.flags.join()})`);
  }
  // accurate but too few: 19 correct
  {
    const rows: number[][] = [];
    for (let k = 0; k < 19; k++) rows.push(trialRow(PHASE.coding, k, 2, 1, 1, 4500 * (k + 1), 4400, k % 9, STATUS.registered));
    const r = flagsOf(rows);
    if (r.valid || !r.flags.includes('too-few-correct')) bad(`19 correct was not invalid (${r.flags.join()})`);
  }
  // 79 % accuracy is invalid, 80 % is not
  {
    const mk = (wrong: number) => {
      const rows: number[][] = [];
      for (let k = 0; k < 100; k++) rows.push(trialRow(PHASE.coding, k, 2, 1, k < wrong ? 2 : 1, 890 * (k + 1), 880, k % 9, STATUS.registered));
      return flagsOf(rows);
    };
    if (mk(21).valid || !mk(21).flags.includes('low-accuracy')) bad('79% accuracy was valid');
    if (!mk(20).valid) bad(`80% accuracy was invalid (${mk(20).flags.join()})`);
  }
  // ignored taps never count as answers
  {
    const rows = log.map((r) => (r[COL.phase] === PHASE.coding && r[COL.status] === STATUS.doubleTap ? [...r] : r));
    rows.push(trialRow(PHASE.coding, 3, 7, 4, 4, 4050, 50, 3, STATUS.beforeOnset));
    if (scoreRun(rows).metrics.sds90 !== 81) bad('an ignored tap was counted');
  }
  // practice still below criterion after its repeat → flag only
  {
    const rows = log.filter((r) => r[COL.phase] !== PHASE.practice);
    for (let i = 0; i < 20; i++) rows.push(trialRow(PHASE.practice, i, 0, 3, i % 3 === 0 ? 5 : 3, 900 * (i + 1), 900, i % 9, STATUS.registered));
    const r = scoreRun(rows);
    if (!r.valid || !r.flags.includes('practice-below-criterion')) bad(`practice 6/10 twice: ${r.valid} ${r.flags.join()}`);
  }

  /* ---------- protocol constants and the reference anchor ---------- */
  const P = PROTOCOL;
  if (
    P.blockMs !== 90_000 ||
    P.motorMs !== 15_000 ||
    P.blockItems !== 200 ||
    P.practiceItems !== 10 ||
    P.practicePass !== 8 ||
    P.practiceFeedbackMs !== 250 ||
    P.doubleTapMs !== 120 ||
    P.doubleTapFlagOver !== 5 ||
    P.minCorrect !== 20 ||
    P.minAccuracy !== 0.8 ||
    P.maxGapMs !== 5_000 ||
    P.keySize !== 9
  )
    bad('a protocol constant differs from SCIENCE.md §1.11');
  const z = (v: number) => REFERENCE.z({ sds90: v }, { platformOffsetMs: 57.6, offsetKnown: true });
  for (const [v, idx] of [
    [45, 40],
    [54, 50],
    [63, 60],
    [72, 70]
  ])
    if (indexFromZ(z(v)) !== idx) bad(`index of SDS90 ${v} is ${indexFromZ(z(v))} (expected ${idx})`);
  if (Number.isFinite(z(NaN))) bad('reference z is finite for a missing metric');
  if (REFERENCE.z({ sds90: 60, dm90: 0, errors: 99 }, { platformOffsetMs: 0, offsetKnown: false }) !== z(60)) bad('reference z reads more than SDS90');
  if (REFERENCE.grade !== 'C' || !/Pham/.test(REFERENCE.anchor)) bad('reference anchor lost its grade or citation');
  if (PARAMS.runIn !== 3 || !PARAMS.practiceProne || !PARAMS.stateSensitive || PARAMS.interruption !== 'A' || PARAMS.perWeek !== 2)
    bad('definition differs from the §2.12 speed row');
  if (PARAMS.noiseFloor.abs !== 3.1) bad('noise floor is not the §2.12 SEM of 3.1');
  if (METRICS.find((x) => x.id === PRIMARY_METRIC)?.better !== 'higher') bad('primary metric is not better: higher');
  for (const id of Object.keys(m)) if (!METRICS.some((x) => x.id === id)) bad(`scoring emits undeclared metric ${id}`);
  for (const x of METRICS) if (!(x.id in m)) bad(`declared metric ${x.id} missing from a valid run`);

  /* ---------- no Math.random in the benchmark ---------- */
  const fs = (await import('node:fs')) as unknown as {
    readdirSync: (p: string, o: { recursive: boolean }) => string[];
    readFileSync: (p: string, e: string) => string;
    statSync: (p: string) => { isFile: () => boolean };
  };
  const { fileURLToPath } = await import('node:url');
  const dir = fileURLToPath(new URL('../../src/brain/symbol-coding/', import.meta.url));
  for (const f of fs.readdirSync(dir, { recursive: true })) {
    const p = dir + f;
    if (fs.statSync(p).isFile() && /Math\.random/.test(fs.readFileSync(p, 'utf8'))) bad(`Math.random in src/brain/symbol-coding/${f}`);
  }

  return `${GLYPHS.length} glyphs symmetry-free (closest pair ${worstPair.toFixed(2)}, ${nearPairs} kept out of keys), ${keysChecked} keys / 400 sessions in sets of 9, scripted run = 81 correct, DM90 66, validity rules fire`;
};
