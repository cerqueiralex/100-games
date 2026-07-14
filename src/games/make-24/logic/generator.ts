import type { Difficulty } from '../../../platform/types';

/**
 * Make 24 — deal generator + full-search solver (pure TS, fully seeded).
 *
 * A DEAL is four number cards and a target (usually 24). The player combines
 * cards two-at-a-time with + − × ÷ (each number used exactly once, parentheses
 * implied by tap order) until one card equals the target.
 *
 * Soundness contract: `generateDeal` only ever returns a deal that HAS at
 * least one solution, verified by the exhaustive `solve` over every operation
 * tree — including non-integer (fraction) intermediates. Arithmetic is done in
 * EXACT rational form (no floating-point epsilon), so uniqueness/solution
 * counts and the "requires a fraction" property are decided exactly.
 *
 * Difficulty is tuned by the DISTINCT-solution count: easy deals have many
 * ways in (easy to stumble into), hard/pro/extreme deals have few — extreme
 * deals are often unique and cannot be solved with integers alone.
 */

export type Op = '+' | '-' | '*' | '/';

export const OP_GLYPH: Record<Op, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

/* -------------------------------------------------------- exact rationals */

/** A reduced fraction, denominator always > 0. */
export interface Frac {
  n: number;
  d: number;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

export function makeFrac(n: number, d = 1): Frac {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

export function fracOp(op: Op, a: Frac, b: Frac): Frac | null {
  switch (op) {
    case '+':
      return makeFrac(a.n * b.d + b.n * a.d, a.d * b.d);
    case '-':
      return makeFrac(a.n * b.d - b.n * a.d, a.d * b.d);
    case '*':
      return makeFrac(a.n * b.n, a.d * b.d);
    case '/':
      if (b.n === 0) return null; // no division by zero
      return makeFrac(a.n * b.d, a.d * b.n);
  }
}

export function fracEquals(a: Frac, b: Frac): boolean {
  return a.n === b.n && a.d === b.d;
}

export function fracIsInt(f: Frac): boolean {
  return f.d === 1;
}

/** Human display: "6" for integers, "8/3" for fractions (sign on numerator). */
export function fracToStr(f: Frac): string {
  return f.d === 1 ? String(f.n) : `${f.n}/${f.d}`;
}

/* ----------------------------------------------------------- solution tree */

export interface SolNode {
  value: Frac;
  /** absent on a leaf (an original card) */
  op?: Op;
  a?: SolNode;
  b?: SolNode;
}

function leaf(value: Frac): SolNode {
  return { value };
}

function combine(op: Op, a: SolNode, b: SolNode): SolNode | null {
  const value = fracOp(op, a.value, b.value);
  if (!value) return null;
  return { value, op, a, b };
}

/** Fully-parenthesised readable expression, e.g. "(6 × (5 − (8 ÷ 4)))". */
export function exprOf(node: SolNode): string {
  if (!node.op) return fracToStr(node.value);
  return `(${exprOf(node.a!)} ${OP_GLYPH[node.op]} ${exprOf(node.b!)})`;
}

/** exprOf with the outermost parentheses stripped, for a cleaner reveal. */
export function displayExpr(node: SolNode): string {
  const s = exprOf(node);
  return s.startsWith('(') && s.endsWith(')') ? s.slice(1, -1) : s;
}

/** Canonical key that treats commutative ops and equal-valued leaves as one. */
function keyOf(node: SolNode): string {
  if (!node.op) return `${node.value.n}/${node.value.d}`;
  const ka = keyOf(node.a!);
  const kb = keyOf(node.b!);
  if (node.op === '+' || node.op === '*') {
    return ka < kb ? `(${node.op} ${ka} ${kb})` : `(${node.op} ${kb} ${ka})`;
  }
  return `(${node.op} ${ka} ${kb})`;
}

function allIntNodes(node: SolNode): boolean {
  if (node.value.d !== 1) return false;
  if (!node.op) return true;
  return allIntNodes(node.a!) && allIntNodes(node.b!);
}

/**
 * The first evaluation step of a solution: a subtree whose two operands are
 * both original cards. Always exists for any non-leaf tree — used by the hint.
 */
export function firstLeafPair(node: SolNode): { a: Frac; b: Frac; op: Op } | null {
  if (!node.op) return null;
  if (!node.a!.op && !node.b!.op) {
    return { a: node.a!.value, b: node.b!.value, op: node.op };
  }
  return firstLeafPair(node.a!) ?? firstLeafPair(node.b!);
}

/* ------------------------------------------------------------- the search */

interface Analysis {
  /** distinct solutions found, capped at CAP */
  count: number;
  /** true when the distinct count hit the cap (i.e. "many" solutions) */
  capped: boolean;
  /** at least one solution keeps every intermediate an integer */
  hasIntegerSolution: boolean;
  /** shortest-expression canonical solution (for reveal/hint), null if none */
  best: SolNode | null;
}

const CAP = 40;

/**
 * Exhaustively reduce the cards to a single value, collecting every DISTINCT
 * way to hit the target. Enumerates unordered pairs and applies +, ×, both
 * subtraction orders and both division orders at each step.
 */
function analyze(fracs: Frac[], target: number): Analysis {
  const keys = new Set<string>();
  let best: SolNode | null = null;
  let bestLen = Infinity;
  let hasIntegerSolution = false;
  let capped = false;

  const recur = (nodes: SolNode[]): void => {
    if (capped) return;
    if (nodes.length === 1) {
      const v = nodes[0].value;
      if (v.d === 1 && v.n === target) {
        const k = keyOf(nodes[0]);
        if (!keys.has(k)) {
          keys.add(k);
          const s = exprOf(nodes[0]);
          if (s.length < bestLen) {
            bestLen = s.length;
            best = nodes[0];
          }
          if (allIntNodes(nodes[0])) hasIntegerSolution = true;
          if (keys.size >= CAP) capped = true;
        }
      }
      return;
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const rest: SolNode[] = [];
        for (let k = 0; k < nodes.length; k++) if (k !== i && k !== j) rest.push(nodes[k]);
        const results: (SolNode | null)[] = [
          combine('+', a, b),
          combine('*', a, b),
          combine('-', a, b),
          combine('-', b, a),
          combine('/', a, b),
          combine('/', b, a)
        ];
        for (const r of results) {
          if (capped) return;
          if (r) recur([...rest, r]);
        }
      }
    }
  };

  recur(fracs.map(leaf));
  return { count: keys.size, capped, hasIntegerSolution, best };
}

/**
 * Fast boolean reachability with early exit — no solution trees are built.
 * With `intOnly`, every intermediate must stay an integer. Used as a cheap
 * pre-gate during generation before the expensive tree-collecting `analyze`.
 */
function reaches(fracs: Frac[], target: number, intOnly: boolean): boolean {
  if (fracs.length === 1) return fracs[0].d === 1 && fracs[0].n === target;
  for (let i = 0; i < fracs.length; i++) {
    for (let j = i + 1; j < fracs.length; j++) {
      const a = fracs[i];
      const b = fracs[j];
      const rest: Frac[] = [];
      for (let k = 0; k < fracs.length; k++) if (k !== i && k !== j) rest.push(fracs[k]);
      const results: (Frac | null)[] = [
        fracOp('+', a, b),
        fracOp('*', a, b),
        fracOp('-', a, b),
        fracOp('-', b, a),
        fracOp('/', a, b),
        fracOp('/', b, a)
      ];
      for (const r of results) {
        if (!r) continue;
        if (intOnly && r.d !== 1) continue;
        if (reaches([...rest, r], target, intOnly)) return true;
      }
    }
  }
  return false;
}

/* ---------------------------------------------------------- public solver */

/** One canonical solution tree for a set of fractions, or null. The live
 *  board can hold non-integer intermediate cards, so hints solve on Fracs. */
export function solveFracs(fracs: Frac[], target: number): SolNode | null {
  return analyze(fracs, target).best;
}

/** One canonical solution tree for integer `cards` reaching `target`, or null. */
export function solve(cards: number[], target: number): SolNode | null {
  return solveFracs(cards.map((n) => makeFrac(n)), target);
}

/** Whether `cards` can reach `target` at all. */
export function hasSolution(cards: number[], target: number): boolean {
  return solve(cards, target) !== null;
}

/** Cheap boolean: can this set of fractions still reach the target? */
export function canReach(fracs: Frac[], target: number): boolean {
  return reaches(fracs, target, false);
}

/* -------------------------------------------------------------- RNG + deal */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Deal {
  cards: number[];
  target: number;
  seed: number;
  /** a readable canonical solution, for the reveal assist */
  solutionExpr: string;
  /** distinct solutions found (capped at 40) — the difficulty proxy */
  solutionCount: number;
  /** true when the deal cannot be solved with integers alone */
  requiresFraction: boolean;
}

interface TierConfig {
  poolMin: number;
  poolMax: number;
  targets: number[];
  /** minimum distinct solutions to accept */
  minCount: number;
  /** maximum distinct solutions to accept (Infinity = no cap) */
  maxCount: number;
  /** the deal must have NO integer-only solution */
  requireFraction: boolean;
  /** deals to clear in one round */
  deals: number;
  /** score multiplier ×1..×5 */
  mult: number;
}

export const DIFF_CONFIG: Record<Difficulty, TierConfig> = {
  easy: { poolMin: 1, poolMax: 9, targets: [24], minCount: 6, maxCount: Infinity, requireFraction: false, deals: 5, mult: 1 },
  medium: { poolMin: 1, poolMax: 10, targets: [24], minCount: 3, maxCount: 14, requireFraction: false, deals: 5, mult: 2 },
  hard: { poolMin: 1, poolMax: 13, targets: [24], minCount: 1, maxCount: 5, requireFraction: false, deals: 6, mult: 3 },
  pro: { poolMin: 1, poolMax: 13, targets: [24, 36, 48], minCount: 1, maxCount: 3, requireFraction: false, deals: 6, mult: 4 },
  extreme: { poolMin: 0, poolMax: 13, targets: [24, 36, 48], minCount: 1, maxCount: 2, requireFraction: true, deals: 6, mult: 5 }
};

function inWindow(a: Analysis, cfg: TierConfig): boolean {
  if (a.count < cfg.minCount) return false;
  if (cfg.maxCount === Infinity) return true;
  // capped means count >= CAP (too many); reject unless the window is open
  if (a.capped) return false;
  return a.count <= cfg.maxCount;
}

function dealFrom(cards: number[], target: number, seed: number, a: Analysis): Deal {
  return {
    cards,
    target,
    seed,
    solutionExpr: a.best ? `${displayExpr(a.best)} = ${target}` : '',
    solutionCount: a.count,
    requiresFraction: a.count > 0 && !a.hasIntegerSolution
  };
}

/**
 * Deterministically generate one solvable deal for the tier. Draws seeded
 * candidates and keeps the first that meets the tier's solution-count window
 * (and fraction requirement). Falls back to the best solvable candidate seen
 * so a solvable deal is ALWAYS returned.
 */
export function generateDeal(opts: { seed?: number; difficulty: Difficulty }): Deal {
  const cfg = DIFF_CONFIG[opts.difficulty];
  const seed = (opts.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const rnd = mulberry32(seed);
  const span = cfg.poolMax - cfg.poolMin + 1;

  let windowMatch: Deal | null = null; // meets the count window, ignoring fraction
  let anySolvable: Deal | null = null; // any solvable deal at all

  const draw = (): number[] => {
    const cards = [0, 0, 0, 0].map(() => cfg.poolMin + Math.floor(rnd() * span));
    return cards;
  };
  const pickTarget = (): number => cfg.targets[Math.floor(rnd() * cfg.targets.length)];

  for (let tries = 0; tries < 12000; tries++) {
    const cards = draw();
    const target = pickTarget();
    const fracs = cards.map((n) => makeFrac(n));
    // cheap pre-gate: skip unsolvable candidates, and (when a fraction is
    // required) skip any that already have an integer-only solution — this
    // keeps the expensive tree search off the vast majority of draws.
    if (!reaches(fracs, target, false)) continue;
    if (cfg.requireFraction && reaches(fracs, target, true)) continue;
    const a = analyze(fracs, target);
    if (a.count === 0) continue;
    const deal = dealFrom(cards, target, seed, a);
    if (!anySolvable) anySolvable = deal;
    const win = inWindow(a, cfg);
    if (win && !windowMatch) windowMatch = deal;
    if (win && (!cfg.requireFraction || deal.requiresFraction)) return deal;
  }

  if (windowMatch) return windowMatch;
  if (anySolvable) return anySolvable;

  // Extremely unlikely fallback: keep drawing until something is solvable.
  for (let tries = 0; tries < 20000; tries++) {
    const cards = draw();
    const target = pickTarget();
    const a = analyze(cards.map((n) => makeFrac(n)), target);
    if (a.count > 0) return dealFrom(cards, target, seed, a);
  }
  throw new Error(`make-24: could not generate a solvable deal (seed ${seed}, ${opts.difficulty})`);
}

/** Mix a base seed with an index into a fresh 32-bit deal seed. */
function mixSeed(base: number, i: number): number {
  let x = (base ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/** A full round of deals for the tier, deterministic from `seed`. */
export function generateRound(opts: { seed?: number; difficulty: Difficulty }): {
  seed: number;
  deals: Deal[];
} {
  const cfg = DIFF_CONFIG[opts.difficulty];
  const base = (opts.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const deals: Deal[] = [];
  for (let i = 0; i < cfg.deals; i++) {
    deals.push(generateDeal({ seed: mixSeed(base, i), difficulty: opts.difficulty }));
  }
  return { seed: base, deals };
}
