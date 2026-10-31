import { pick, randInt, rng, shuffle } from '../../../platform/brain/timing';
import {
  FAMILY_BIT,
  LAYOUT_ATTR,
  LAYOUT_POOL,
  LEVELS,
  NEUTRAL,
  RAY_COUNT,
  isCyclic,
  isLogicKind,
  popcount,
  ruleKey,
  type AttrId,
  type Cell,
  type DistractorKind,
  type Item,
  type Layout,
  type RuleKind,
  type RuleSpec
} from './model';
import { RAY_OPS, addStep, ambiguity, impurity } from './rules';

/**
 * The item generator (SCIENCE.md §1.8 "Rules", "Difficulty classes",
 * "Answer set"). Every draw comes from `rng(itemSeed)` — the run seed is
 * split into one sub-seed per item slot (`subSeed`), so the same run seed and
 * the same responses always replay the same items, and a different seed is a
 * fresh alternate form.
 *
 * Answer-set design: 3 probe attributes (rule-governed first, topped up with
 * constants), one wrong value each, and the 8 options are all 2³
 * correct/incorrect combinations — so every value appears in exactly 4
 * options and every pair of values in exactly 2. On top of that every
 * (correct, wrong) pair is drawn so that it is EXCHANGEABLE: the wrong value
 * is as likely to be the larger, darker, more extreme or fuller of the two as
 * the correct one. That is what keeps any context-blind picker (one that
 * ignores the matrix) at chance, including ones that read size, ink or ray
 * counts — the check measures it.
 */

type R = () => number;

/** run-phase codes for `subSeed` */
export const PHASE_PRACTICE = 1;
export const PHASE_WARMUP = 2;
export const PHASE_BLOCK = 3;

/** an integer hash of (seed, a, b, c) → a 32-bit sub-seed */
export function subSeed(seed: number, a: number, b: number, c: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a + 0x7f4a7c15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13) ^ (b + 0x165667b1), 0xc2b2ae35) >>> 0;
  h = Math.imul(h ^ (h >>> 16) ^ (c + 0x27d4eb2f), 0x9e3779b1) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

const DIAGS: readonly RuleKind[] = ['diag-a', 'diag-b'];
const BASIC: readonly RuleKind[] = ['row', 'col', 'prog-r', 'prog-c', 'diag-a', 'diag-b'];
const TRANSFORMS: readonly RuleKind[] = ['prog-r', 'prog-c', 'diag-a', 'diag-b'];

/** which rules an attribute can carry */
export function kindFits(attr: AttrId, kind: RuleKind): boolean {
  if (attr === 'rays') return isLogicKind(kind);
  if (isLogicKind(kind)) return false;
  if (attr === 'position') return kind === 'row' || kind === 'col' || kind === 'diag-a' || kind === 'diag-b';
  return true;
}

/** the rule kinds of one item of class `classId` (§1.8 class table) */
function drawKinds(classId: number, r: R, logicBranch: boolean): RuleKind[] {
  switch (classId) {
    case 1:
      return [pick(r, ['row', 'col'] as const)];
    case 2:
      return [pick(r, ['diag-a', 'diag-b', 'prog-r', 'prog-c'] as const)];
    case 3: {
      const d = pick(r, DIAGS);
      return [d, pick(r, BASIC.filter((k) => k !== d))];
    }
    case 4: {
      const d = pick(r, DIAGS);
      return [d, ...shuffle(r, BASIC.filter((k) => k !== d)).slice(0, 2)];
    }
    case 5:
      return ['out'];
    case 6:
      return ['out', pick(r, BASIC)];
    case 7:
      return logicBranch ? [pick(r, ['add', 'sub'] as const)] : ['out', ...shuffle(r, BASIC).slice(0, 2)];
    case 8:
      return [pick(r, ['xor', 'and'] as const)];
    default:
      return [pick(r, ['xor', 'and'] as const), pick(r, TRANSFORMS)];
  }
}

/** one figure in the middle 60 %, copies 20 %, a sub-grid position 20 % [DC] */
function drawLayout(r: R): Layout {
  const x = r();
  return x < 0.6 ? 'single' : x < 0.8 ? 'number' : 'position';
}

/** put the kinds on distinct attributes of the layout; the layout's own attribute is always rule-governed */
function assign(kinds: readonly RuleKind[], layout: Layout, r: R): RuleSpec[] | null {
  const forced = LAYOUT_ATTR[layout];
  const ks = shuffle(r, kinds);
  const out: RuleSpec[] = [];
  let rest = ks;
  if (forced) {
    const idx = ks.findIndex((k) => kindFits(forced, k));
    if (idx < 0) return null;
    out.push({ attr: forced, kind: ks[idx] });
    rest = ks.filter((_, i) => i !== idx);
  }
  const attrs = shuffle(
    r,
    LAYOUT_POOL[layout].filter((a) => a !== forced)
  );
  for (const k of rest) {
    const a = attrs.find((x) => kindFits(x, k) && !out.some((o) => o.attr === x));
    if (!a) return null;
    out.push({ attr: a, kind: k });
  }
  return out;
}

/** a uniformly random ordered triple of distinct levels */
function distinct3(r: R, L: number): [number, number, number] {
  const a = randInt(r, 0, L - 1);
  let b = randInt(r, 0, L - 2);
  if (b >= a) b++;
  let c = randInt(r, 0, L - 3);
  for (const x of [a, b].sort((p, q) => p - q)) if (c >= x) c++;
  return [a, b, c];
}

/** progression step: ±1, and ±2 (90°) for rotation from class D4 up ("±2 at high levels") [DC] */
function stepFor(attr: AttrId, classId: number, r: R): number {
  const sign = r() < 0.5 ? -1 : 1;
  if (attr === 'orient' && classId >= 4 && r() < 0.5) return 2 * sign;
  return sign;
}

/** starts s with s, s + k, s + 2k all inside the domain */
function startsFor(attr: AttrId, k: number): number[] {
  const L = LEVELS[attr];
  const out: number[] = [];
  for (let s = 0; s < L; s++) if (isCyclic(attr) || (s + 2 * k >= 0 && s + 2 * k < L)) out.push(s);
  return out;
}

const at = (attr: AttrId, s: number, k: number, n: number): number => addStep(attr, s, k * n) as number;

/** the 3×3 grid of a non-logic rule */
function ruleGrid(spec: RuleSpec, classId: number, r: R): number[] | null {
  const { attr, kind } = spec;
  const L = LEVELS[attr];
  const g = new Array<number>(9);
  const set = (fn: (row: number, col: number) => number) => {
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) g[3 * row + col] = fn(row, col);
  };
  switch (kind) {
    case 'row': {
      const a = distinct3(r, L);
      set((row) => a[row]);
      return g;
    }
    case 'col': {
      const a = distinct3(r, L);
      set((_, col) => a[col]);
      return g;
    }
    case 'diag-a': {
      const v = distinct3(r, L);
      set((row, col) => v[(((col - row) % 3) + 3) % 3]);
      return g;
    }
    case 'diag-b': {
      const v = distinct3(r, L);
      set((row, col) => v[(row + col) % 3]);
      return g;
    }
    case 'prog-r':
    case 'prog-c': {
      const k = stepFor(attr, classId, r);
      const S = startsFor(attr, k);
      if (!S.length) return null;
      let s = [pick(r, S), pick(r, S), pick(r, S)];
      for (let t = 0; t < 20 && s[0] === s[1] && s[1] === s[2]; t++) s = [pick(r, S), pick(r, S), pick(r, S)];
      if (s[0] === s[1] && s[1] === s[2]) return null;
      set((row, col) => (kind === 'prog-r' ? at(attr, s[row], k, col) : at(attr, s[col], k, row)));
      return g;
    }
    case 'out': {
      const k = stepFor(attr, classId, r);
      const S = startsFor(attr, k);
      if (!S.length) return null;
      const s = pick(r, S);
      set((row, col) => at(attr, s, k, Math.max(row, col)));
      return g;
    }
    default:
      return null;
  }
}

/** a random ray set of `lo`–`hi` rays */
function randomRays(r: R, lo: number, hi: number): number {
  const n = randInt(r, lo, hi);
  let m = 0;
  for (const i of shuffle(
    r,
    Array.from({ length: RAY_COUNT }, (_, j) => j)
  ).slice(0, n))
    m |= 1 << i;
  return m;
}

/** the logic layer: per row, col3 = col1 ∘ col2 over ray sets of 2–4 rays [DC] */
function rayGrid(kind: 'add' | 'sub' | 'xor' | 'and', r: R): number[] | null {
  const g = new Array<number>(9);
  const op = RAY_OPS[kind];
  for (let row = 0; row < 3; row++) {
    let ok = false;
    for (let t = 0; t < 80 && !ok; t++) {
      const a = randomRays(r, 2, 4);
      const b = randomRays(r, 2, 4);
      const c = op(a, b);
      // no empty third cell, and the third cell is never a plain copy of an operand
      if (a === b || c === 0 || c === a || c === b) continue;
      if (row > 0 && ((a === g[0] && b === g[1]) || (row > 1 && a === g[3] && b === g[4]))) continue;
      g[3 * row] = a;
      g[3 * row + 1] = b;
      g[3 * row + 2] = c;
      ok = true;
    }
    if (!ok) return null;
  }
  return g;
}

/**
 * The wrong value of a rule attribute — a typical misapplication (§1.8
 * "Answer set"), chosen among the kinds whose (correct, wrong) pairs are
 * exchangeable [DC]:
 *  row  another row's value · col  another column's value
 *  prog stepping the wrong way from the neighbour (= the far cell of the
 *       same row/column), or another row's/column's end value
 *  diag another of the three values · out  the opposite corner's value
 *  logic a different operator on the same operands, else another row's
 *       result — always with the SAME ray count ("stroke counts balanced")
 * Returns null when the drawn misapplication does not exist for this grid;
 * the generator then draws a new item.
 */
function ruleWrong(spec: RuleSpec, g: readonly number[], r: R): { value: number; kind: DistractorKind } | null {
  const c = g[8];
  const ok = (value: number, kind: DistractorKind) => (value !== c ? { value, kind } : null);
  switch (spec.kind) {
    case 'row':
      return ok(pick(r, [g[0], g[3]]), 'other-row');
    case 'col':
      return ok(pick(r, [g[6], g[7]]), 'other-col');
    case 'prog-r':
      return r() < 0.5 ? ok(g[6], 'wrong-way') : ok(pick(r, [g[2], g[5]]), 'other-row');
    case 'prog-c':
      return r() < 0.5 ? ok(g[2], 'wrong-way') : ok(pick(r, [g[6], g[7]]), 'other-col');
    case 'diag-a':
      return ok(pick(r, [g[1], g[2]]), 'other-diag');
    case 'diag-b':
      return ok(pick(r, [g[0], g[2]]), 'other-diag');
    case 'out':
      return ok(g[0], 'corner');
    default: {
      const a = g[6];
      const b = g[7];
      const n = popcount(c);
      const ops = (['add', 'sub', 'rsub', 'xor', 'and'] as const).filter((o) => o !== spec.kind);
      const byOp = [...new Set(ops.map((o) => RAY_OPS[o](a, b)))].filter((v) => v !== c && v !== 0 && popcount(v) === n);
      if (byOp.length) return { value: pick(r, byOp), kind: 'other-op' };
      const byRow = [...new Set([g[2], g[5]])].filter((v) => v !== c && popcount(v) === n);
      if (byRow.length) return { value: pick(r, byRow), kind: 'other-row' };
      return null;
    }
  }
}

/** position sub-grid neighbours (4-connected) */
const POSITION_EDGES: [number, number][] = [];
for (let p = 0; p < 9; p++) {
  if (p % 3 < 2) POSITION_EDGES.push([p, p + 1]);
  if (p < 6) POSITION_EDGES.push([p, p + 3]);
}

/**
 * A constant probe: an unordered ADJACENT pair of levels drawn uniformly,
 * then a coin decides which one the matrix uses — so the wrong value is the
 * adjacent level and neither member of the pair is favoured [DC].
 */
function adjacentPair(attr: AttrId, r: R): [number, number] {
  let pair: [number, number];
  if (attr === 'position') pair = pick(r, POSITION_EDGES);
  else if (isCyclic(attr)) {
    const x = randInt(r, 0, LEVELS[attr] - 1);
    pair = [x, (x + 1) % LEVELS[attr]];
  } else {
    const x = randInt(r, 0, LEVELS[attr] - 2);
    pair = [x, x + 1];
  }
  return r() < 0.5 ? pair : [pair[1], pair[0]];
}

function build(classId: number, layout: Layout, rules: RuleSpec[], key: string, r: R): Item | null {
  const pool = LAYOUT_POOL[layout];
  const ruleAttrs = rules.map((x) => x.attr);
  const constants = pool.filter((a) => !ruleAttrs.includes(a));
  const topUp = shuffle(r, constants).slice(0, Math.max(0, 3 - rules.length));
  const probes: AttrId[] = [...ruleAttrs, ...topUp];

  const grids: Partial<Record<AttrId, number[]>> = {};
  for (const rule of rules) {
    const g = isLogicKind(rule.kind) ? rayGrid(rule.kind as 'add' | 'sub' | 'xor' | 'and', r) : ruleGrid(rule, classId, r);
    if (!g) return null;
    grids[rule.attr] = g;
  }
  const wrongBy = new Map<AttrId, { value: number; kind: DistractorKind }>();
  const constant: Partial<Record<AttrId, number>> = {};
  for (const a of constants) {
    if (topUp.includes(a)) {
      const [c, w] = adjacentPair(a, r);
      constant[a] = c;
      wrongBy.set(a, { value: w, kind: 'adjacent-level' });
    } else constant[a] = randInt(r, 0, LEVELS[a] - 1);
  }
  for (const rule of rules) {
    const w = ruleWrong(rule, grids[rule.attr] as number[], r);
    if (!w) return null;
    wrongBy.set(rule.attr, w);
  }

  const cells: Cell[] = Array.from({ length: 9 }, (_, i) => {
    const cell: Cell = { ...NEUTRAL };
    for (const a of pool) cell[a] = grids[a] ? (grids[a] as number[])[i] : (constant[a] as number);
    return cell;
  });

  const answerCell = cells[8];
  const combos: Cell[] = [];
  for (let mask = 0; mask < 8; mask++) {
    const cell: Cell = { ...answerCell };
    probes.forEach((a, i) => {
      if (mask & (1 << i)) cell[a] = (wrongBy.get(a) as { value: number }).value;
    });
    combos.push(cell);
  }
  const answer = randInt(r, 0, 7);
  const others = shuffle(r, combos.slice(1));
  const options = [...others.slice(0, answer), combos[0], ...others.slice(answer)];

  return {
    classId,
    layout,
    rules,
    cells,
    probes,
    wrong: probes.map((a) => ({ attr: a, ...(wrongBy.get(a) as { value: number; kind: DistractorKind }) })),
    options,
    answer,
    key,
    family: rules.reduce((m, x) => m | FAMILY_BIT[x.kind], 0)
  };
}

export interface GenStats {
  /** draws rejected before an item was accepted (for the check) */
  rejected: number;
}

/**
 * One item of difficulty class `classId` (1–9). `prevKey` is the previous
 * item's rule combination, which this item will not repeat. Throws only if
 * no item can be built at all — the check proves it never happens over
 * 10⁴ items per class.
 */
export function generateItem(classId: number, itemSeed: number, prevKey?: string | null, stats?: GenStats): Item {
  const r = rng(itemSeed);
  // D7 is half "three relations including outward", half figure addition /
  // subtraction [DC] — decided once per item, so rejections cannot skew the mix
  const logicBranch = classId === 7 && r() < 0.5;
  for (let attempt = 0; attempt < 4000; attempt++) {
    const kinds = drawKinds(classId, r, logicBranch);
    const layout: Layout = kinds.some(isLogicKind) ? 'logic' : drawLayout(r);
    const rules = assign(kinds, layout, r);
    if (rules) {
      const key = ruleKey(rules);
      if (!prevKey || key !== prevKey) {
        const item = build(classId, layout, rules, key, r);
        if (item && !ambiguity(item, LAYOUT_POOL[layout]) && !impurity(item)) return item;
      }
    }
    if (stats) stats.rejected++;
  }
  throw new Error(`matrix-reasoning: could not build a class-${classId} item`);
}

/** the chosen option's correctness on each probe attribute — bit i = probe i right (HeiQ operation scores) */
export function probeMask(item: Item, slot: number): number {
  const opt = item.options[slot];
  const ans = item.cells[8];
  return item.probes.reduce((m, a, i) => (opt[a] === ans[a] ? m | (1 << i) : m), 0);
}
