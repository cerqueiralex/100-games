import { median, rng, shuffle } from '../../../platform/brain/timing';
import { CYCLE_LENGTH, ITEM_COUNT, PRACTICE_ITEMS } from './protocol';

/**
 * Arithmetic Sprint items (SCIENCE.md §1.7) — the eight Math4Speed item
 * classes (Loenneker et al. 2025), regenerated from the run's seed so every
 * session is a fresh alternate form with nothing to memorise.
 *
 *   ADD simple   a, b ∈ [12, 75], units 1–9, a ≠ b, units sum ≤ 9, a + b ≤ 99
 *   ADD complex  same ranges, units sum ≥ 10 (a carry), a + b ≤ 99
 *   SUB simple   m ∈ [23, 98], s ∈ [12, m − 10], units 1–9, units(s) < units(m)
 *   SUB complex  same, units(s) > units(m) (a borrow); answer ≥ 10 in both
 *   MUL simple   a, b ∈ [2, 9], a ≠ b (28 unordered pairs), random order
 *   MUL complex  a ∈ [3, 9] × b ∈ [12, 19], random order (×2 dropped [DC])
 *   DIV simple   (a·b) ÷ a, a, b ∈ [2, 9], a ≠ b
 *   DIV complex  (a·b) ÷ a, a ∈ [3, 9], b ∈ [12, 19]
 *
 * Sequence: cycles of 8 = four operation runs of 2 (one simple + one complex,
 * random order within the run), runs in random order, and a cycle never opens
 * with the operation the previous cycle closed on. Problem size: within each
 * class the draws alternate below / above the class's median answer —
 * simple classes start below, complex classes above [DC], so every run of 2
 * and every cycle holds one small and one large item of each pairing. No
 * problem repeats within a session; flipped operand order counts as the same
 * problem (practice transfers across it — Rickard et al. 1994).
 *
 * Pure: no DOM, no unseeded randomness — validate replays it.
 */

export type Op = 'add' | 'sub' | 'mul' | 'div';
export const OPS: readonly Op[] = ['add', 'sub', 'mul', 'div'];

/** display glyphs — true minus (U+2212), multiplication and division signs (screen readers speak them) */
export const OP_SYMBOL: Record<Op, string> = { add: '+', sub: '−', mul: '×', div: '÷' };

export interface Problem {
  op: Op;
  complex: boolean;
  /** operands in DISPLAY order: "a op b =" */
  a: number;
  b: number;
  answer: number;
  /** answer above the class's median answer (problem-size control) */
  high: boolean;
  /** identity for the no-repeat rule — flipped operand order shares it */
  key: string;
}

/** class code 0–7 = operation index × 2 + complex (the trial log's class column) */
export function classCode(op: Op, complex: boolean): number {
  return OPS.indexOf(op) * 2 + (complex ? 1 : 0);
}

export function classOf(code: number): { op: Op; complex: boolean } {
  return { op: OPS[Math.floor(code / 2)], complex: code % 2 === 1 };
}

interface Canon {
  /** canonical operands; for + and × a < b (the display order is drawn later) */
  a: number;
  b: number;
  answer: number;
  key: string;
  commutative: boolean;
}

export interface ClassPool {
  code: number;
  op: Op;
  complex: boolean;
  all: Canon[];
  /** the class's median answer over its whole problem space */
  median: number;
  /** answer ≤ median */
  low: Canon[];
  /** answer > median */
  high: Canon[];
}

const units = (n: number) => n % 10;

function enumerate(op: Op, complex: boolean): Canon[] {
  const out: Canon[] = [];
  if (op === 'add') {
    for (let a = 12; a <= 75; a++) {
      for (let b = a + 1; b <= 75; b++) {
        if (units(a) === 0 || units(b) === 0 || a + b > 99) continue;
        const carry = units(a) + units(b) >= 10;
        if (carry !== complex) continue;
        out.push({ a, b, answer: a + b, key: `add:${a}:${b}`, commutative: true });
      }
    }
  } else if (op === 'sub') {
    for (let m = 23; m <= 98; m++) {
      if (units(m) === 0) continue;
      for (let s = 12; s <= m - 10; s++) {
        if (units(s) === 0 || units(s) === units(m)) continue;
        const borrow = units(s) > units(m);
        if (borrow !== complex) continue;
        out.push({ a: m, b: s, answer: m - s, key: `sub:${m}:${s}`, commutative: false });
      }
    }
  } else if (op === 'mul') {
    if (!complex) {
      for (let a = 2; a <= 9; a++) for (let b = a + 1; b <= 9; b++) out.push({ a, b, answer: a * b, key: `mul:${a}:${b}`, commutative: true });
    } else {
      for (let a = 3; a <= 9; a++) for (let b = 12; b <= 19; b++) out.push({ a, b, answer: a * b, key: `mul:${a}:${b}`, commutative: true });
    }
  } else {
    const [lo, hi, qlo, qhi] = complex ? [3, 9, 12, 19] : [2, 9, 2, 9];
    for (let d = lo; d <= hi; d++) {
      for (let q = qlo; q <= qhi; q++) {
        if (!complex && q === d) continue;
        out.push({ a: d * q, b: d, answer: q, key: `div:${d * q}:${d}`, commutative: false });
      }
    }
  }
  return out;
}

/** the eight class pools, indexed by class code — computed once, deterministic */
export const POOLS: readonly ClassPool[] = Array.from({ length: 8 }, (_, code) => {
  const { op, complex } = classOf(code);
  const all = enumerate(op, complex);
  const med = median(all.map((c) => c.answer));
  return {
    code,
    op,
    complex,
    all,
    median: med,
    low: all.filter((c) => c.answer <= med),
    high: all.filter((c) => c.answer > med)
  };
});

/** the size half the k-th draw (0-based) of a class must come from */
export function wantsHigh(complex: boolean, k: number): boolean {
  return (k + (complex ? 1 : 0)) % 2 === 1;
}

function take(r: () => number, pool: ClassPool, from: Canon[], used: Set<string>): Problem {
  let cands = from.filter((c) => !used.has(c.key));
  // never reached by the protocol (each half holds ≥ 14 problems, a session
  // draws ≤ 8 per half) — a guard so a future change cannot loop or crash
  if (!cands.length) cands = pool.all.filter((c) => !used.has(c.key));
  if (!cands.length) cands = pool.all;
  const c = cands[Math.floor(r() * cands.length)];
  used.add(c.key);
  const flip = c.commutative && r() < 0.5;
  return {
    op: pool.op,
    complex: pool.complex,
    a: flip ? c.b : c.a,
    b: flip ? c.a : c.b,
    answer: c.answer,
    high: c.answer > pool.median,
    key: c.key
  };
}

/**
 * The scored block's 120 items for a seed: 15 cycles of 8, each cycle every
 * operation twice (one simple, one complex), runs of 2 by operation.
 */
export function generateItems(seed: number): Problem[] {
  const r = rng(seed);
  const used = new Set<string>();
  const draws = new Array<number>(8).fill(0);
  const items: Problem[] = [];
  let lastOp: Op | null = null;
  for (let cycle = 0; cycle < ITEM_COUNT / CYCLE_LENGTH; cycle++) {
    const order = shuffle(r, OPS);
    if (order[0] === lastOp) {
      // swap the opener with a random later run — uniform over the 18 valid orders
      const j = 1 + Math.floor(r() * 3);
      [order[0], order[j]] = [order[j], order[0]];
    }
    for (const op of order) {
      const pair = r() < 0.5 ? [false, true] : [true, false];
      for (const complex of pair) {
        const pool = POOLS[classCode(op, complex)];
        const k = draws[pool.code]++;
        items.push(take(r, pool, wantsHigh(complex, k) ? pool.high : pool.low, used));
      }
    }
    lastOp = order[order.length - 1];
  }
  return items;
}

/**
 * The first-run practice: one simple item per operation, in a seeded random
 * order, drawn from what the scored block did NOT use (so the block never
 * shows a problem the practice already answered). Its own stream, so the
 * scored items are identical whether or not the practice ran.
 */
export function generatePractice(seed: number, scored: readonly Problem[]): Problem[] {
  const r = rng((seed ^ 0x9e3779b9) >>> 0);
  const used = new Set(scored.map((p) => p.key));
  return shuffle(r, OPS)
    .slice(0, PRACTICE_ITEMS)
    .map((op) => {
      const pool = POOLS[classCode(op, false)];
      return take(r, pool, pool.all, used);
    });
}

/** "38 + 47" — the problem as text (the practice correction line) */
export function problemText(p: Pick<Problem, 'op' | 'a' | 'b'>): string {
  return `${p.a} ${OP_SYMBOL[p.op]} ${p.b}`;
}
