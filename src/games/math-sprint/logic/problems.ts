/*
 * Math Sprint — pure arithmetic problem generator.
 *
 * A problem is a small algebraic value object; `answerOf(p)` re-derives the
 * unique integer answer, `problemTokens(p)` renders it to a serializable token
 * list (exactly one `slot` = the unknown the player types). Nothing here
 * touches React, so soundness is checked headlessly (see validate.ts + the
 * Math Sprint test script): every answer is a non-negative integer, two-step
 * expressions honour operator precedence, and missing-operand puzzles have a
 * single integer solution.
 *
 * Difficulty is adaptive WITHIN a run: `makeProblem(cfg, streak, rng)` widens
 * number ranges and leans on harder problem kinds as the streak grows (the
 * `simple-mode` assist pins that scaling to zero via `cfg.capScaling`).
 * `rng` is any () => number in [0, 1); the game passes Math.random, tests pass
 * a seeded generator.
 */

import type { Difficulty } from '../../../platform/types';

export type Rng = () => number;

/** Internal operators (ascii); display glyphs come from `SYMBOL`. */
export type Op = '+' | '-' | '*' | '/';

export type ProblemKind = 'binary' | 'twostep' | 'missing' | 'square';

export type Problem =
  | { kind: 'binary'; a: number; op: Op; b: number }
  | { kind: 'twostep'; a: number; op1: Op; b: number; op2: Op; c: number }
  | { kind: 'missing'; a: number; op: Op; b: number; blank: 'a' | 'b' }
  | { kind: 'square'; a: number };

/** One renderable piece of the equation. Exactly one token is the `slot`. */
export type DisplayToken =
  | { t: 'num'; s: string }
  | { t: 'sq'; s: string }
  | { t: 'op'; s: string }
  | { t: 'eq' }
  | { t: 'slot' };

export interface TierConfig {
  timeSec: number;
  /** correct answers needed to win */
  target: number;
  /** score multiplier 1..5 */
  diffMult: number;
  /** soft per-problem budget (seconds) — feeds the speed bonus + timeout */
  budgetSec: number;
  /** streak-driven difficulty ramp caps here */
  heatCap: number;
  /** operators available to binary + missing-operand problems */
  ops: Op[];
  /** problem kinds this tier draws from */
  kinds: ProblemKind[];
  /** +/- operand range grows from addBase toward addCap with streak heat */
  addBase: number;
  addStep: number;
  addCap: number;
  /** max factor for binary × */
  mulMax: number;
  /** binary ÷ built as (divisor × quotient) ÷ divisor, both bounded */
  divisorMax: number;
  quotMax: number;
  /** two-step operand bounds (kept small so answers stay mental-sized) */
  twoAddMax: number;
  twoMulMax: number;
  /** operators available inside two-step expressions (never ÷) */
  twoOps: Op[];
  /** square range (sqMax 0 ⇒ tier has no squares) */
  sqMin: number;
  sqMax: number;
  /** runtime override: simple-mode assist pins streak scaling off */
  capScaling?: boolean;
}

export const SYMBOL: Record<Op, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

export const TIERS: Record<Difficulty, TierConfig> = {
  easy: {
    timeSec: 90,
    target: 15,
    diffMult: 1,
    budgetSec: 9,
    heatCap: 4,
    ops: ['+', '-'],
    kinds: ['binary'],
    addBase: 10,
    addStep: 3,
    addCap: 20,
    mulMax: 0,
    divisorMax: 0,
    quotMax: 0,
    twoAddMax: 0,
    twoMulMax: 0,
    twoOps: [],
    sqMin: 0,
    sqMax: 0
  },
  medium: {
    timeSec: 80,
    target: 18,
    diffMult: 2,
    budgetSec: 8,
    heatCap: 5,
    ops: ['+', '-', '*', '/'],
    kinds: ['binary'],
    addBase: 12,
    addStep: 2,
    addCap: 25,
    mulMax: 12,
    divisorMax: 9,
    quotMax: 9,
    twoAddMax: 0,
    twoMulMax: 0,
    twoOps: [],
    sqMin: 0,
    sqMax: 0
  },
  hard: {
    timeSec: 75,
    target: 20,
    diffMult: 3,
    budgetSec: 8,
    heatCap: 6,
    ops: ['+', '-', '*', '/'],
    kinds: ['binary'],
    addBase: 25,
    addStep: 8,
    addCap: 99,
    mulMax: 15,
    divisorMax: 12,
    quotMax: 12,
    twoAddMax: 0,
    twoMulMax: 0,
    twoOps: [],
    sqMin: 0,
    sqMax: 0
  },
  pro: {
    timeSec: 70,
    target: 20,
    diffMult: 4,
    budgetSec: 9,
    heatCap: 6,
    ops: ['+', '-', '*', '/'],
    kinds: ['binary', 'twostep', 'missing'],
    addBase: 12,
    addStep: 3,
    addCap: 30,
    mulMax: 12,
    divisorMax: 10,
    quotMax: 10,
    twoAddMax: 12,
    twoMulMax: 6,
    twoOps: ['+', '-', '*'],
    sqMin: 0,
    sqMax: 0
  },
  extreme: {
    timeSec: 60,
    target: 22,
    diffMult: 5,
    budgetSec: 8,
    heatCap: 7,
    ops: ['+', '-', '*', '/'],
    kinds: ['binary', 'twostep', 'missing', 'square'],
    addBase: 18,
    addStep: 4,
    addCap: 45,
    mulMax: 15,
    divisorMax: 12,
    quotMax: 12,
    twoAddMax: 15,
    twoMulMax: 7,
    twoOps: ['+', '-', '*'],
    sqMin: 4,
    sqMax: 13
  }
};

/* ----------------------------------------------------------------- helpers */

/** inclusive integer in [lo, hi] (hi clamped ≥ lo) */
function ri(rng: Rng, lo: number, hi: number): number {
  const h = Math.max(lo, hi);
  return lo + Math.floor(rng() * (h - lo + 1));
}

function weightedPick<T>(items: T[], weights: number[], rng: Rng): T {
  let total = 0;
  for (const w of weights) total += w;
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

const isHigh = (op: Op): boolean => op === '*' || op === '/';

function apply(a: number, op: Op, b: number): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return a / b;
  }
}

/** evaluate `a op1 b op2 c` with standard × ÷ over + − precedence */
function evalTwo(a: number, op1: Op, b: number, op2: Op, c: number): number {
  if (!isHigh(op1) && isHigh(op2)) return apply(a, op1, apply(b, op2, c));
  return apply(apply(a, op1, b), op2, c);
}

/** effective +/- operand ceiling at the given streak heat */
function addMax(cfg: TierConfig, heat: number): number {
  return Math.min(cfg.addCap, cfg.addBase + heat * cfg.addStep);
}

function pickOp(ops: Op[], heat: number, rng: Rng): Op {
  // low operators fade, high operators (×÷) grow, as the streak heats up
  const weights = ops.map((o) => (isHigh(o) ? 2 + heat : Math.max(1, 4 - Math.floor(heat / 2))));
  return weightedPick(ops, weights, rng);
}

/** a valid binary triple: non-negative result, exact division by construction.
 *  `minOne` forces both operands ≥ 1 (so a hidden operand is never trivially 0). */
function makeBinaryParts(cfg: TierConfig, heat: number, rng: Rng, minOne: boolean): { a: number; op: Op; b: number } {
  const op = pickOp(cfg.ops, heat, rng);
  const max = addMax(cfg, heat);
  if (op === '+') return { a: ri(rng, 1, max), op, b: ri(rng, 1, max) };
  if (op === '-') {
    // keep both operands ≥ 1 for missing puzzles, and never a 0 difference
    const a = ri(rng, minOne ? 2 : 1, max);
    const b = ri(rng, minOne ? 1 : 0, Math.max(minOne ? 1 : 0, a - 1));
    return { a, op, b };
  }
  if (op === '*') return { a: ri(rng, 2, cfg.mulMax), op, b: ri(rng, 2, cfg.mulMax) };
  // division: dividend = divisor × quotient → always exact
  const b = ri(rng, 2, cfg.divisorMax);
  const q = ri(rng, 2, cfg.quotMax);
  return { a: b * q, op, b };
}

function makeTwoStep(cfg: TierConfig, rng: Rng): Problem {
  const op1 = cfg.twoOps[Math.floor(rng() * cfg.twoOps.length)];
  const op2 = cfg.twoOps[Math.floor(rng() * cfg.twoOps.length)];
  const M = cfg.twoAddMax;
  const K = cfg.twoMulMax;
  const hi1 = op1 === '*';
  const hi2 = op2 === '*';
  let a: number;
  let b: number;
  let c: number;

  if (!hi1 && hi2) {
    // eval = a op1 (b × c)
    b = ri(rng, 2, K);
    c = ri(rng, 2, K);
    const inner = b * c;
    a = op1 === '-' ? inner + ri(rng, 0, M) : ri(rng, 1, M);
  } else if (hi1 && !hi2) {
    // eval = (a × b) op2 c
    a = ri(rng, 2, K);
    b = ri(rng, 2, K);
    const prod = a * b;
    c = op2 === '-' ? ri(rng, 0, Math.min(prod, M)) : ri(rng, 1, M);
  } else if (hi1 && hi2) {
    a = ri(rng, 2, K);
    b = ri(rng, 2, K);
    c = ri(rng, 2, K);
  } else {
    // both additive → left-to-right
    a = ri(rng, 1, M);
    b = op1 === '-' ? ri(rng, 0, a) : ri(rng, 1, M);
    const inner = op1 === '+' ? a + b : a - b;
    c = op2 === '-' ? ri(rng, 0, inner) : ri(rng, 1, M);
  }
  return { kind: 'twostep', a, op1, b, op2, c };
}

function pickKind(cfg: TierConfig, heat: number, rng: Rng): ProblemKind {
  const weights = cfg.kinds.map((k) => {
    switch (k) {
      case 'binary':
        return Math.max(1, 5 - heat);
      case 'twostep':
        return 2 + heat;
      case 'missing':
        return 2 + Math.floor(heat / 2);
      case 'square':
        return 1 + Math.floor(heat / 3);
    }
  });
  return weightedPick(cfg.kinds, weights, rng);
}

/* ------------------------------------------------------------------- public */

export function makeProblem(cfg: TierConfig, streak: number, rng: Rng): Problem {
  const heat = cfg.capScaling ? 0 : Math.min(cfg.heatCap, Math.floor(streak / 2));
  const kind = pickKind(cfg, heat, rng);
  switch (kind) {
    case 'square':
      return { kind: 'square', a: ri(rng, cfg.sqMin, cfg.sqMax) };
    case 'twostep':
      return makeTwoStep(cfg, rng);
    case 'missing': {
      const { a, op, b } = makeBinaryParts(cfg, heat, rng, true);
      return { kind: 'missing', a, op, b, blank: rng() < 0.5 ? 'a' : 'b' };
    }
    default: {
      const { a, op, b } = makeBinaryParts(cfg, heat, rng, false);
      return { kind: 'binary', a, op, b };
    }
  }
}

/** the unique integer the player must type */
export function answerOf(p: Problem): number {
  switch (p.kind) {
    case 'binary':
      return apply(p.a, p.op, p.b);
    case 'twostep':
      return evalTwo(p.a, p.op1, p.b, p.op2, p.c);
    case 'missing':
      return p.blank === 'a' ? p.a : p.b;
    case 'square':
      return p.a * p.a;
  }
}

const num = (n: number): DisplayToken => ({ t: 'num', s: String(n) });
const sq = (n: number): DisplayToken => ({ t: 'sq', s: String(n) });
const glyph = (op: Op): DisplayToken => ({ t: 'op', s: SYMBOL[op] });
const EQ: DisplayToken = { t: 'eq' };
const SLOT: DisplayToken = { t: 'slot' };

/** the equation as render tokens, with exactly one `slot` for the answer */
export function problemTokens(p: Problem): DisplayToken[] {
  switch (p.kind) {
    case 'binary':
      return [num(p.a), glyph(p.op), num(p.b), EQ, SLOT];
    case 'twostep':
      return [num(p.a), glyph(p.op1), num(p.b), glyph(p.op2), num(p.c), EQ, SLOT];
    case 'square':
      return [sq(p.a), EQ, SLOT];
    case 'missing': {
      const target = apply(p.a, p.op, p.b);
      return p.blank === 'a'
        ? [SLOT, glyph(p.op), num(p.b), EQ, num(target)]
        : [num(p.a), glyph(p.op), SLOT, EQ, num(target)];
    }
  }
}

/** plain-text equation with `?` for the unknown (aria labels / hints) */
export function problemAria(p: Problem): string {
  return problemTokens(p)
    .map((t) => (t.t === 'slot' ? '?' : t.t === 'eq' ? '=' : t.t === 'sq' ? `${t.s} squared` : t.s))
    .join(' ');
}
