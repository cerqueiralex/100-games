/**
 * Target Number — Countdown numbers-round content.
 *
 * Pure, React-free logic so it can be validated headlessly:
 *  - `solve(numbers)` explores every value reachable from the tiles using each
 *    number AT MOST once and + − × ÷ (division only when exact, every
 *    intermediate a positive integer), memoised on the multiset of current
 *    values, and returns a Map value → the fewest-step plan that builds it.
 *  - `bestSolution(numbers, target)` picks the reachable value closest to the
 *    target (ties broken toward the shortest plan) and returns one witness
 *    expression + ordered combine steps.
 *  - `generateRound({seed?, difficulty})` deals the tier's small/large mix and
 *    picks a target GUARANTEED to be exactly reachable (chosen from the solved
 *    value set), biased toward harder solutions on the higher tiers.
 *
 * Design contract (checked by scripts/validate.ts): every generated round's
 * target lies in the tier range, uses only pool numbers, and its returned
 * solution evaluates back to the target using each number at most once and
 * only even divisions.
 */

import type { Difficulty } from '../../../platform/types';
import { mulberry32, pick, shuffle } from './rng';

/** Operators, using the display glyphs the toolbar shows. */
export type Op = '+' | '−' | '×' | '÷';
export const OPS: Op[] = ['+', '−', '×', '÷'];

/** One combine of two working values into a result. */
export interface Step {
  a: number;
  b: number;
  op: Op;
  result: number;
}

export interface Solution {
  /** value actually reached (equals target when exact) */
  value: number;
  /** |value - target| */
  diff: number;
  exact: boolean;
  /** ordered combines that build `value` from a subset of the tiles */
  steps: Step[];
  /** flat parenthesised expression, e.g. "(100 + 5) × 6" */
  expr: string;
  /** how many original tiles the solution consumes */
  numbersUsed: number;
}

export interface Round {
  /** the dealt tiles (values, in dealt order) */
  numbers: number[];
  target: number;
  /** an exact (diff 0) solution used for reveal + the reachable badge */
  solution: Solution;
}

/* --------------------------- number pools ------------------------------- */

export const SMALL_POOL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const LARGE_POOL = [25, 50, 75, 100];

export function isLarge(v: number): boolean {
  return LARGE_POOL.includes(v);
}

/* ------------------------------ the search ------------------------------ */

interface Item {
  value: number;
  steps: Step[];
  expr: string;
}

/** Apply one operator to two working items, honouring the rules
 *  (no negatives, no zero results, division only when exact). Subtraction
 *  and division auto-orient to larger-first so a legal move is never wasted.
 *  Returns null when the operation is illegal or pointless. */
export function combine(A: Item, B: Item, op: Op): Item | null {
  let a = A.value;
  let b = B.value;
  let exprA = A.expr;
  let exprB = B.expr;
  let result: number;

  if (op === '+') {
    result = a + b;
  } else if (op === '×') {
    if (a === 1 || b === 1) return null; // multiplying by 1 changes nothing
    result = a * b;
  } else if (op === '−') {
    if (a < b) {
      [a, b] = [b, a];
      [exprA, exprB] = [exprB, exprA];
    }
    result = a - b;
    if (result === 0) return null; // no zero intermediates
  } else {
    // division
    if (a < b) {
      [a, b] = [b, a];
      [exprA, exprB] = [exprB, exprA];
    }
    if (b <= 1 || a % b !== 0) return null; // ÷1 pointless, must be exact
    result = a / b;
  }

  return {
    value: result,
    steps: [...A.steps, ...B.steps, { a, b, op, result }],
    expr: `(${exprA} ${op} ${exprB})`
  };
}

/**
 * Every value reachable from `numbers`, mapped to its fewest-step witness.
 *
 * Subset DP: `reach[mask]` is the value → best-witness map achievable using
 * exactly the tiles in `mask` (each once). A composite subset is built from
 * every split into two non-empty disjoint parts — both parts are proper
 * submasks, hence numerically smaller, so a single increasing pass fills the
 * table with each subset visited exactly once. Distinct tiles are tracked by
 * bit, so repeated tile values are handled correctly.
 */
export function solve(numbers: number[]): Map<number, Item> {
  const n = numbers.length;
  const full = 1 << n;
  const reach: (Map<number, Item> | undefined)[] = new Array(full);

  for (let i = 0; i < n; i++) {
    reach[1 << i] = new Map([
      [numbers[i], { value: numbers[i], steps: [], expr: String(numbers[i]) }]
    ]);
  }

  const best = new Map<number, Item>();
  const record = (it: Item) => {
    const cur = best.get(it.value);
    if (!cur || it.steps.length < cur.steps.length) best.set(it.value, it);
  };
  for (let i = 0; i < n; i++) record((reach[1 << i] as Map<number, Item>).values().next().value as Item);

  for (let mask = 1; mask < full; mask++) {
    if (reach[mask]) continue; // singleton, already seeded
    const m = new Map<number, Item>();
    reach[mask] = m;
    // split mask into unordered part pair {A, B}; combine() already covers
    // both operand orders (commutative +/×, larger-first −/÷), so visit once
    for (let A = (mask - 1) & mask; A > 0; A = (A - 1) & mask) {
      const B = mask ^ A;
      if (A > B) continue;
      const ra = reach[A];
      const rb = reach[B];
      if (!ra || !rb) continue;
      for (const ia of ra.values()) {
        for (const ib of rb.values()) {
          for (const op of OPS) {
            const res = combine(ia, ib, op);
            if (!res) continue;
            const cur = m.get(res.value);
            if (!cur || res.steps.length < cur.steps.length) m.set(res.value, res);
          }
        }
      }
    }
    for (const it of m.values()) record(it);
  }
  return best;
}

function stripOuterParens(e: string): string {
  // the top-level combined expression is always one wrapping pair
  return e.startsWith('(') && e.endsWith(')') ? e.slice(1, -1) : e;
}

/** Closest achievable value to `target` (tie → shortest plan) + a witness. */
export function bestSolution(numbers: number[], target: number): Solution {
  const map = solve(numbers);
  let best: Item | null = null;
  let bestDiff = Infinity;
  for (const it of map.values()) {
    const d = Math.abs(it.value - target);
    if (d < bestDiff || (d === bestDiff && best !== null && it.steps.length < best.steps.length)) {
      best = it;
      bestDiff = d;
    }
  }
  const b = best as Item; // `map` always holds the raw tiles, so this is set
  return {
    value: b.value,
    diff: bestDiff,
    exact: bestDiff === 0,
    steps: b.steps,
    expr: stripOuterParens(b.expr),
    numbersUsed: b.steps.length + 1
  };
}

/**
 * Independently replay a solution's steps to prove it is legal and reaches the
 * claimed value using each tile at most once. Used by validation.
 */
export function verifySolution(
  numbers: number[],
  solution: Solution
): { ok: boolean; reason?: string } {
  // multiset of currently-available values (originals + made results)
  const bag: number[] = [...numbers];
  const take = (v: number): boolean => {
    const idx = bag.indexOf(v);
    if (idx === -1) return false;
    bag.splice(idx, 1);
    return true;
  };
  let last = numbers.length ? numbers[0] : 0;
  for (const s of solution.steps) {
    if (!take(s.a)) return { ok: false, reason: `operand ${s.a} not available` };
    if (!take(s.b)) return { ok: false, reason: `operand ${s.b} not available` };
    let r: number;
    switch (s.op) {
      case '+':
        r = s.a + s.b;
        break;
      case '−':
        r = s.a - s.b;
        if (r <= 0) return { ok: false, reason: `subtraction ${s.a}-${s.b} not positive` };
        break;
      case '×':
        r = s.a * s.b;
        break;
      case '÷':
        if (s.b === 0 || s.a % s.b !== 0)
          return { ok: false, reason: `division ${s.a}/${s.b} not exact` };
        r = s.a / s.b;
        break;
    }
    if (r !== s.result) return { ok: false, reason: `step result ${s.result} != ${r}` };
    bag.push(r);
    last = r;
  }
  if (last !== solution.value) return { ok: false, reason: `final ${last} != ${solution.value}` };
  return { ok: true };
}

/* ------------------------------ difficulty ------------------------------ */

export interface TierConfig {
  targetLo: number;
  targetHi: number;
  /** count of small (1–10) tiles dealt */
  small: number;
  /** count of large (25/50/75/100) tiles dealt */
  large: number;
  rounds: number;
  /** score multiplier 1..5 */
  mult: number;
  /** a submitted value within this of the target still scores partial */
  tolerance: number;
  /** soft per-round timer (s) driving the speed bonus — never a hard fail */
  softTimeSec: number;
  /** prefer targets whose easiest solution needs at least this many tiles */
  minNumbers: number;
}

export const CONFIG: Record<Difficulty, TierConfig> = {
  easy: {
    targetLo: 100, targetHi: 300, small: 4, large: 1, rounds: 4,
    mult: 1, tolerance: 10, softTimeSec: 90, minNumbers: 2
  },
  medium: {
    targetLo: 200, targetHi: 500, small: 5, large: 1, rounds: 5,
    mult: 2, tolerance: 8, softTimeSec: 80, minNumbers: 3
  },
  hard: {
    targetLo: 300, targetHi: 999, small: 4, large: 2, rounds: 6,
    mult: 3, tolerance: 6, softTimeSec: 75, minNumbers: 4
  },
  pro: {
    targetLo: 100, targetHi: 999, small: 5, large: 1, rounds: 6,
    mult: 4, tolerance: 5, softTimeSec: 65, minNumbers: 4
  },
  extreme: {
    targetLo: 200, targetHi: 999, small: 4, large: 2, rounds: 6,
    mult: 5, tolerance: 4, softTimeSec: 60, minNumbers: 5
  }
};

export const TILE_COUNT: Record<Difficulty, number> = {
  easy: CONFIG.easy.small + CONFIG.easy.large,
  medium: CONFIG.medium.small + CONFIG.medium.large,
  hard: CONFIG.hard.small + CONFIG.hard.large,
  pro: CONFIG.pro.small + CONFIG.pro.large,
  extreme: CONFIG.extreme.small + CONFIG.extreme.large
};

function drawNumbers(cfg: TierConfig, rng: () => number): number[] {
  // two of each small value (classic Countdown), drawn without replacement
  const bag: number[] = [];
  for (const v of SMALL_POOL) bag.push(v, v);
  const smalls = shuffle(bag, rng).slice(0, cfg.small);
  const larges = shuffle(LARGE_POOL, rng).slice(0, cfg.large);
  return shuffle([...smalls, ...larges], rng);
}

/**
 * Deal a round whose target is GUARANTEED exactly reachable. The target is
 * drawn from the actual reachable value set (never a blind roll), biased on
 * the higher tiers toward values that cannot be reached with just a couple of
 * tiles. Deterministic in `seed`.
 */
export function generateRound({
  seed,
  difficulty
}: {
  seed?: number;
  difficulty: Difficulty;
}): Round {
  const cfg = CONFIG[difficulty];
  const rng = mulberry32((seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0);

  for (let attempt = 0; attempt < 400; attempt++) {
    const numbers = drawNumbers(cfg, rng);
    const map = solve(numbers);

    const candidates: { value: number; steps: number }[] = [];
    for (const it of map.values()) {
      if (it.steps.length >= 1 && it.value >= cfg.targetLo && it.value <= cfg.targetHi) {
        candidates.push({ value: it.value, steps: it.steps.length });
      }
    }
    if (candidates.length === 0) continue;

    // difficulty bias: prefer targets whose EASIEST solution already needs the
    // tier's minimum tile count, so higher tiers avoid trivial one-step targets
    const preferred = candidates.filter((c) => c.steps + 1 >= cfg.minNumbers);
    const pool = preferred.length > 0 ? preferred : candidates;
    const chosen = pick(pool, rng);
    const solution = bestSolution(numbers, chosen.value);
    return { numbers, target: chosen.value, solution };
  }

  // Practically unreachable fallback: any reachable value forms a valid round.
  const numbers = drawNumbers(cfg, rng);
  const map = solve(numbers);
  let fallback = numbers[0];
  for (const it of map.values()) {
    if (it.steps.length >= 1) {
      fallback = it.value;
      break;
    }
  }
  return { numbers, target: fallback, solution: bestSolution(numbers, fallback) };
}
