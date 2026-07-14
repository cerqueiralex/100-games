import type { Difficulty } from '../../../platform/types';

/**
 * Sequence Cracker — seeded, provably-unambiguous numeric-sequence puzzles.
 *
 * A puzzle shows a numeric sequence with its last 1–2 terms hidden. The
 * player must deduce the rule and supply the missing term(s). Every puzzle
 * is generated from one of six rule families and then verified so that the
 * VISIBLE prefix is explained by exactly one continuation among the whole
 * candidate rule set — no competing "simple rule" fits the shown terms and
 * predicts a different next value (see `continuationIsUnique`). This makes
 * the intended answer the only defensible one.
 */

export type Family =
  | 'arithmetic'
  | 'geometric'
  | 'alternating'
  | 'quadratic'
  | 'fibonacci'
  | 'opchain';

export type PuzzleMode = 'choice' | 'exact';

export interface SequencePuzzle {
  family: Family;
  /** Human family name for the rule-hint assist, e.g. "Quadratic". */
  familyName: string;
  /** Short deducible-rule caption revealed on solve, e.g. "×2 each step". */
  ruleLabel: string;
  /** The full sequence, including the hidden term(s). */
  terms: number[];
  /** Indices of the hidden term(s) — always the last 1–2 positions. */
  hiddenIdx: number[];
  /** The hidden values, in ascending index order. */
  answers: number[];
  /** 'choice' → pick from `options`; 'exact' → type the number(s). */
  mode: PuzzleMode;
  /** Present iff mode==='choice' (single hidden term): the 4 shuffled options. */
  options?: number[];
}

export interface TierConfig {
  families: Family[];
  /** Puzzles that must be SOLVED to win the round. */
  goal: number;
  /** Wrong answers allowed before the round is lost. */
  lives: number;
  /** Hidden terms per puzzle (1, or 2 for extreme). */
  hidden: number;
  /** 'choice'/'exact' fixed, or 'mixed' → decided per puzzle. */
  modePolicy: PuzzleMode | 'mixed';
  /** Difficulty multiplier for scoring (1–5). */
  mult: number;
}

export const TIERS: Record<Difficulty, TierConfig> = {
  easy: {
    families: ['arithmetic', 'geometric'],
    goal: 5,
    lives: 3,
    hidden: 1,
    modePolicy: 'choice',
    mult: 1
  },
  medium: {
    families: ['arithmetic', 'geometric', 'alternating'],
    goal: 6,
    lives: 3,
    hidden: 1,
    modePolicy: 'choice',
    mult: 2
  },
  hard: {
    families: ['arithmetic', 'geometric', 'alternating', 'quadratic'],
    goal: 6,
    lives: 4,
    hidden: 1,
    modePolicy: 'mixed',
    mult: 3
  },
  pro: {
    families: ['arithmetic', 'geometric', 'alternating', 'quadratic', 'fibonacci', 'opchain'],
    goal: 6,
    lives: 4,
    hidden: 1,
    modePolicy: 'exact',
    mult: 4
  },
  extreme: {
    families: ['arithmetic', 'geometric', 'alternating', 'quadratic', 'fibonacci', 'opchain'],
    goal: 7,
    lives: 5,
    hidden: 2,
    modePolicy: 'exact',
    mult: 5
  }
};

export const FAMILY_NAME: Record<Family, string> = {
  arithmetic: 'Arithmetic',
  geometric: 'Geometric',
  alternating: 'Alternating',
  quadratic: 'Quadratic',
  fibonacci: 'Fibonacci-like',
  opchain: 'Operation chain'
};

/** Largest absolute term/answer we ever emit — keeps numbers reasonable. */
const BOUND = 20000;

/** Visible (shown, non-hidden) terms per family — chosen so the intended
 *  rule is fully determined and competitors are ruled out. */
const VISIBLE: Record<Family, number> = {
  arithmetic: 4,
  geometric: 4,
  alternating: 6,
  quadratic: 5,
  fibonacci: 5,
  opchain: 5
};

/* ----------------------------- RNG helpers ----------------------------- */

export type Rng = () => number;

/** mulberry32 — small deterministic PRNG so generation is testable. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randint(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* --------------------------- family builders --------------------------- */

interface Built {
  terms: number[];
  ruleLabel: string;
}

const EPS = 1e-6;

function nonZeroStep(rng: Rng, diff: Difficulty): number {
  const mag = diff === 'easy' ? randint(rng, 1, 7) : randint(rng, 1, 9);
  const sign = diff !== 'easy' && rng() < 0.45 ? -1 : 1;
  return sign * mag;
}

function buildArithmetic(diff: Difficulty, rng: Rng, hidden: number): Built {
  const total = VISIBLE.arithmetic + hidden;
  const mag = diff === 'easy' ? randint(rng, 2, 7) : randint(rng, 2, 12);
  const d = diff !== 'easy' && rng() < 0.4 ? -mag : mag;
  const start = diff === 'easy' ? randint(rng, 1, 12) : randint(rng, -6, 20);
  const terms = Array.from({ length: total }, (_, i) => start + d * i);
  return { terms, ruleLabel: `${d >= 0 ? '+' : '−'}${Math.abs(d)} each step` };
}

function buildGeometric(diff: Difficulty, rng: Rng, hidden: number): Built | null {
  const total = VISIBLE.geometric + hidden;
  const ratios =
    diff === 'easy' || diff === 'medium'
      ? [2, 3]
      : diff === 'hard'
        ? [2, 3, -2]
        : [2, 3, -2, -3];
  const r = pick(ratios, rng);
  const startMax = Math.abs(r) === 3 ? 6 : 9;
  let v = randint(rng, 2, startMax);
  const terms: number[] = [];
  for (let i = 0; i < total; i++) {
    terms.push(v);
    v *= r;
  }
  if (terms.some((t) => Math.abs(t) > BOUND)) return null;
  return { terms, ruleLabel: r < 0 ? `×(${r}) each step` : `×${r} each step` };
}

function buildAlternating(diff: Difficulty, rng: Rng, hidden: number): Built | null {
  const total = VISIBLE.alternating + hidden;
  const dA = nonZeroStep(rng, diff);
  let dB = nonZeroStep(rng, diff);
  if (dA === dB) dB = dA + (dA > 0 ? 1 : -1); // keep the two series genuinely distinct
  const startA = randint(rng, 1, 16);
  const startB = randint(rng, 1, 16);
  const terms: number[] = [];
  for (let i = 0; i < total; i++) {
    terms.push(i % 2 === 0 ? startA + dA * (i / 2) : startB + dB * ((i - 1) / 2));
  }
  if (terms.some((t) => Math.abs(t) > BOUND)) return null;
  return { terms, ruleLabel: 'two interleaved series' };
}

function buildQuadratic(diff: Difficulty, rng: Rng, hidden: number): Built | null {
  const total = VISIBLE.quadratic + hidden;
  const aOpts = diff === 'hard' ? [1, 2, -1] : [1, 2, 3, -1, -2];
  const a = pick(aOpts, rng);
  const b = randint(rng, -4, 4);
  const c = randint(rng, -3, 8);
  const terms = Array.from({ length: total }, (_, n) => a * n * n + b * n + c);
  if (terms.some((t) => Math.abs(t) > BOUND)) return null;
  const g = 2 * a;
  const ruleLabel = g >= 0 ? `gaps grow by +${g}` : `gaps shrink by ${Math.abs(g)}`;
  return { terms, ruleLabel };
}

function buildFibonacci(_diff: Difficulty, rng: Rng, hidden: number): Built | null {
  const total = VISIBLE.fibonacci + hidden;
  const terms = [randint(rng, 1, 6), randint(rng, 1, 7)];
  for (let i = 2; i < total; i++) terms.push(terms[i - 1] + terms[i - 2]);
  if (terms.some((t) => Math.abs(t) > BOUND)) return null;
  return { terms, ruleLabel: 'sum of previous two' };
}

function buildOpChain(_diff: Difficulty, rng: Rng, hidden: number): Built | null {
  const total = VISIBLE.opchain + hidden;
  // keep growth modest: only ×2 when two terms are hidden (extreme)
  const m = hidden > 1 ? 2 : pick([2, 3], rng);
  const k = pick([1, 2, 3, 4, -1, -2], rng);
  const start = randint(rng, 1, m === 3 ? 4 : 6);
  const terms: number[] = [];
  let v = start;
  for (let i = 0; i < total; i++) {
    terms.push(v);
    v = m * v + k;
  }
  if (terms.some((t) => Math.abs(t) > BOUND)) return null;
  return { terms, ruleLabel: `×${m} then ${k >= 0 ? '+' : '−'}${Math.abs(k)}` };
}

function buildFamily(fam: Family, diff: Difficulty, rng: Rng, hidden: number): Built | null {
  switch (fam) {
    case 'arithmetic':
      return buildArithmetic(diff, rng, hidden);
    case 'geometric':
      return buildGeometric(diff, rng, hidden);
    case 'alternating':
      return buildAlternating(diff, rng, hidden);
    case 'quadratic':
      return buildQuadratic(diff, rng, hidden);
    case 'fibonacci':
      return buildFibonacci(diff, rng, hidden);
    case 'opchain':
      return buildOpChain(diff, rng, hidden);
  }
}

/* ----------------------- uniqueness verification ----------------------- */

type Predictor = (index: number) => number;

/** Extend a running sequence to `index` using a per-step next() rule. */
function extendTo(base: number[], index: number, next: (arr: number[]) => number): number {
  const arr = base.slice();
  while (arr.length <= index) arr.push(next(arr));
  return arr[index];
}

function fitArithmetic(p: number[]): Predictor | null {
  if (p.length < 3) return null;
  const d = p[1] - p[0];
  for (let i = 1; i < p.length; i++) if (p[i] - p[i - 1] !== d) return null;
  return (i) => p[0] + d * i;
}

function fitGeometric(p: number[]): Predictor | null {
  if (p.length < 3 || p[0] === 0) return null;
  const r = p[1] / p[0];
  for (let i = 1; i < p.length; i++) {
    if (p[i - 1] === 0 || Math.abs(p[i] / p[i - 1] - r) > EPS) return null;
  }
  return (i) => extendTo(p, i, (arr) => arr[arr.length - 1] * r);
}

function fitQuadratic(p: number[]): Predictor | null {
  if (p.length < 4) return null;
  const d1: number[] = [];
  for (let i = 1; i < p.length; i++) d1.push(p[i] - p[i - 1]);
  const s = d1[1] - d1[0];
  for (let i = 1; i < d1.length; i++) if (d1[i] - d1[i - 1] !== s) return null;
  return (i) => {
    const arr = p.slice();
    const gaps = d1.slice();
    while (arr.length <= i) {
      const nextGap = gaps[gaps.length - 1] + s;
      gaps.push(nextGap);
      arr.push(arr[arr.length - 1] + nextGap);
    }
    return arr[i];
  };
}

function fitFibonacci(p: number[]): Predictor | null {
  if (p.length < 4) return null;
  for (let i = 2; i < p.length; i++) if (p[i] !== p[i - 1] + p[i - 2]) return null;
  return (i) => extendTo(p, i, (arr) => arr[arr.length - 1] + arr[arr.length - 2]);
}

function fitOpChain(p: number[]): Predictor | null {
  if (p.length < 4 || p[1] - p[0] === 0) return null;
  const m = (p[2] - p[1]) / (p[1] - p[0]);
  const k = p[1] - m * p[0];
  for (let i = 1; i < p.length; i++) if (Math.abs(p[i] - (m * p[i - 1] + k)) > EPS) return null;
  return (i) => extendTo(p, i, (arr) => m * arr[arr.length - 1] + k);
}

function fitArithSub(sub: number[]): Predictor | null {
  if (sub.length < 2) return null;
  const d = sub[1] - sub[0];
  for (let j = 1; j < sub.length; j++) if (sub[j] - sub[j - 1] !== d) return null;
  return (j) => sub[0] + d * j;
}

function fitInterleaved(p: number[]): Predictor | null {
  if (p.length < 5) return null;
  const even = p.filter((_, i) => i % 2 === 0);
  const odd = p.filter((_, i) => i % 2 === 1);
  const ea = fitArithSub(even);
  const oa = fitArithSub(odd);
  if (!ea || !oa) return null;
  return (i) => (i % 2 === 0 ? ea(Math.floor(i / 2)) : oa(Math.floor(i / 2)));
}

const FITTERS: ((p: number[]) => Predictor | null)[] = [
  fitArithmetic,
  fitGeometric,
  fitQuadratic,
  fitFibonacci,
  fitOpChain,
  fitInterleaved
];

/**
 * True when the visible prefix admits exactly one integer continuation at
 * the hidden positions: every candidate rule that fits the shown terms
 * predicts the intended answers (rules whose prediction isn't an integer
 * aren't valid competitors and are ignored).
 */
export function continuationIsUnique(
  terms: number[],
  hiddenIdx: number[],
  answers: number[]
): boolean {
  const visible = terms.length - hiddenIdx.length; // hidden are the last terms
  const prefix = terms.slice(0, visible);
  for (const fit of FITTERS) {
    const pred = fit(prefix);
    if (!pred) continue;
    for (let h = 0; h < hiddenIdx.length; h++) {
      const raw = pred(hiddenIdx[h]);
      if (!Number.isFinite(raw)) break;
      const rounded = Math.round(raw);
      if (Math.abs(raw - rounded) > EPS) break; // non-integer rule → not a competitor
      if (rounded !== answers[h]) return false; // a rule gives a different integer path
    }
  }
  return true;
}

/* ------------------------- option generation --------------------------- */

function makeOptions(puzzle: SequencePuzzle, rng: Rng): number[] {
  const ans = puzzle.answers[0];
  const vis = puzzle.terms.slice(0, puzzle.terms.length - 1);
  const last = vis[vis.length - 1];
  const prev = vis[vis.length - 2];
  const cands = new Set<number>();
  const add = (v: number) => {
    if (Number.isInteger(v) && v !== ans && Math.abs(v) <= BOUND) cands.add(v);
  };
  add(last + (last - prev)); // "kept adding the last gap"
  add(last * 2); // "kept doubling"
  add(ans + 1);
  add(ans - 1);
  add(ans + 2);
  add(ans - 2);
  const step = Math.max(1, Math.round(Math.abs(ans - last) / 2));
  add(ans + step);
  add(ans - step);
  const distractors = shuffle([...cands], rng).slice(0, 3);
  let k = 1;
  while (distractors.length < 3) {
    const v = ans + (k % 2 === 1 ? k : -k);
    if (v !== ans && !distractors.includes(v)) distractors.push(v);
    k++;
  }
  return shuffle([ans, ...distractors], rng);
}

/* ----------------------------- entry point ----------------------------- */

export interface GenOptions {
  difficulty: Difficulty;
  seed?: number;
  /** Restrict to arithmetic/geometric (the "narrow" assist). */
  narrow?: boolean;
}

function decideMode(policy: PuzzleMode | 'mixed', rng: Rng): PuzzleMode {
  if (policy === 'mixed') return rng() < 0.5 ? 'choice' : 'exact';
  return policy;
}

/**
 * Generate one verified puzzle. Deterministic when `seed` is given (used by
 * validation); otherwise driven by Math.random for varied live play.
 */
export function generateSequence(opts: GenOptions): SequencePuzzle {
  const rng: Rng = opts.seed !== undefined ? mulberry32(opts.seed) : Math.random;
  const tier = TIERS[opts.difficulty];
  let families = tier.families;
  if (opts.narrow) {
    const narrowed = families.filter((f) => f === 'arithmetic' || f === 'geometric');
    if (narrowed.length > 0) families = narrowed;
  }
  const mode = decideMode(tier.modePolicy, rng);
  // multiple-choice is always a single missing term
  const hidden = mode === 'choice' ? 1 : tier.hidden;

  for (let attempt = 0; attempt < 400; attempt++) {
    const fam = pick(families, rng);
    const built = buildFamily(fam, opts.difficulty, rng, hidden);
    if (!built) continue;
    const { terms } = built;
    const hiddenIdx: number[] = [];
    for (let i = terms.length - hidden; i < terms.length; i++) hiddenIdx.push(i);
    const answers = hiddenIdx.map((i) => terms[i]);
    if (!answers.every((a) => Number.isInteger(a) && Math.abs(a) <= BOUND)) continue;
    if (!continuationIsUnique(terms, hiddenIdx, answers)) continue;

    const puzzle: SequencePuzzle = {
      family: fam,
      familyName: FAMILY_NAME[fam],
      ruleLabel: built.ruleLabel,
      terms,
      hiddenIdx,
      answers,
      mode
    };
    if (mode === 'choice') puzzle.options = makeOptions(puzzle, rng);
    return puzzle;
  }

  // Deterministic fallback (always unique): a plain arithmetic run.
  const start = randint(rng, 1, 9);
  const d = randint(rng, 2, 6);
  const terms = Array.from({ length: VISIBLE.arithmetic + hidden }, (_, i) => start + d * i);
  const hiddenIdx: number[] = [];
  for (let i = terms.length - hidden; i < terms.length; i++) hiddenIdx.push(i);
  const answers = hiddenIdx.map((i) => terms[i]);
  const puzzle: SequencePuzzle = {
    family: 'arithmetic',
    familyName: FAMILY_NAME.arithmetic,
    ruleLabel: `+${d} each step`,
    terms,
    hiddenIdx,
    answers,
    mode
  };
  if (mode === 'choice') puzzle.options = makeOptions(puzzle, rng);
  return puzzle;
}

/** True when `guesses` match the hidden term(s), in order. */
export function checkAnswer(puzzle: SequencePuzzle, guesses: number[]): boolean {
  if (guesses.length !== puzzle.answers.length) return false;
  return puzzle.answers.every((a, i) => guesses[i] === a);
}
