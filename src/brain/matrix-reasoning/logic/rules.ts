import { isCyclic, LEVELS, type AttrId, type Item, type RuleKind } from './model';

/**
 * Rule fitting — the half of the generator that reads a matrix the way a
 * solver would. `predict(kind, attr, g)` asks: do the 8 VISIBLE cells of this
 * attribute's grid (rows 1–2 and columns 1–2 of row 3; g[8] is never read)
 * fit `kind` with SOME parameters, and if so what does it put in the empty
 * cell? Fitting is deliberately loose (any non-zero step, values need not be
 * distinct), which makes the ambiguity guard conservative.
 *
 * The guard vocabulary is wider than what the generator draws from: it also
 * contains the reversed subtraction (col2 ∖ col1) and every logic operator
 * applied down the columns (row3 = row1 ∘ row2), because a player may read a
 * ray pattern either way.
 */

export type GuardKind = RuleKind | 'rsub' | 'add-t' | 'sub-t' | 'rsub-t' | 'xor-t' | 'and-t';

const ORDINAL_GUARD: readonly GuardKind[] = ['row', 'col', 'prog-r', 'prog-c', 'diag-a', 'diag-b', 'out'];
const CATEGORICAL_GUARD: readonly GuardKind[] = ['row', 'col', 'diag-a', 'diag-b'];
const RAY_GUARD: readonly GuardKind[] = [
  ...CATEGORICAL_GUARD,
  'add',
  'sub',
  'rsub',
  'xor',
  'and',
  'add-t',
  'sub-t',
  'rsub-t',
  'xor-t',
  'and-t'
];

export function guardKindsFor(attr: AttrId): readonly GuardKind[] {
  if (attr === 'rays') return RAY_GUARD;
  if (attr === 'position') return CATEGORICAL_GUARD;
  return ORDINAL_GUARD;
}

/**
 * Difficulty rank of a rule family, for the class-purity guard: an item built
 * on a rank-r rule must not ALSO be explainable by a rule of lower rank (an
 * "XOR" item that is really a union would be a D7 item labelled D8).
 */
export const RANK: Record<GuardKind, number> = {
  row: 0,
  col: 0,
  'prog-r': 1,
  'prog-c': 1,
  'diag-a': 1,
  'diag-b': 1,
  out: 2,
  add: 3,
  sub: 3,
  rsub: 3,
  'add-t': 3,
  'sub-t': 3,
  'rsub-t': 3,
  xor: 4,
  and: 4,
  'xor-t': 4,
  'and-t': 4
};

const FULL = (1 << 6) - 1;

export const RAY_OPS: Record<'add' | 'sub' | 'rsub' | 'xor' | 'and', (a: number, b: number) => number> = {
  add: (a, b) => a | b,
  sub: (a, b) => a & ~b & FULL,
  rsub: (a, b) => b & ~a & FULL,
  xor: (a, b) => (a ^ b) & FULL,
  and: (a, b) => a & b
};

/** signed step from `a` to `b` — cyclic attributes take the short way round, in (−L/2, L/2] */
export function stepOf(attr: AttrId, a: number, b: number): number {
  const d = b - a;
  if (!isCyclic(attr)) return d;
  const L = LEVELS[attr];
  let m = ((d % L) + L) % L;
  if (m > L / 2) m -= L;
  return m;
}

/** `v + k` inside the attribute's domain (cyclic attributes wrap), or null */
export function addStep(attr: AttrId, v: number, k: number): number | null {
  const L = LEVELS[attr];
  const x = v + k;
  if (isCyclic(attr)) return ((x % L) + L) % L;
  return x >= 0 && x < L ? x : null;
}

/** the value `kind` predicts for the empty cell, or null when it does not fit the visible cells */
export function predict(kind: GuardKind, attr: AttrId, g: readonly number[]): number | null {
  switch (kind) {
    case 'row':
      return g[0] === g[1] && g[1] === g[2] && g[3] === g[4] && g[4] === g[5] && g[6] === g[7] ? g[6] : null;
    case 'col':
      return g[0] === g[3] && g[3] === g[6] && g[1] === g[4] && g[4] === g[7] && g[2] === g[5] ? g[2] : null;
    case 'prog-r': {
      const k = stepOf(attr, g[0], g[1]);
      if (k === 0) return null;
      const ok =
        stepOf(attr, g[1], g[2]) === k &&
        stepOf(attr, g[3], g[4]) === k &&
        stepOf(attr, g[4], g[5]) === k &&
        stepOf(attr, g[6], g[7]) === k;
      return ok ? addStep(attr, g[7], k) : null;
    }
    case 'prog-c': {
      const k = stepOf(attr, g[0], g[3]);
      if (k === 0) return null;
      const ok =
        stepOf(attr, g[3], g[6]) === k &&
        stepOf(attr, g[1], g[4]) === k &&
        stepOf(attr, g[4], g[7]) === k &&
        stepOf(attr, g[2], g[5]) === k;
      return ok ? addStep(attr, g[5], k) : null;
    }
    // (c − r) mod 3 groups: {0,4,8} {1,5,6} {2,3,7}
    case 'diag-a':
      return g[0] === g[4] && g[1] === g[5] && g[5] === g[6] && g[2] === g[3] && g[3] === g[7] ? g[0] : null;
    // (r + c) mod 3 groups: {0,5,7} {1,3,8} {2,4,6}
    case 'diag-b':
      return g[0] === g[5] && g[5] === g[7] && g[1] === g[3] && g[2] === g[4] && g[4] === g[6] ? g[1] : null;
    // bands of max(r, c): {0} {1,3,4} {2,5,6,7,8}
    case 'out': {
      if (!(g[1] === g[3] && g[3] === g[4] && g[2] === g[5] && g[5] === g[6] && g[6] === g[7])) return null;
      const k = stepOf(attr, g[0], g[1]);
      return stepOf(attr, g[1], g[2]) === k ? g[2] : null;
    }
    case 'add':
    case 'sub':
    case 'rsub':
    case 'xor':
    case 'and': {
      if (attr !== 'rays') return null;
      const op = RAY_OPS[kind];
      return g[2] === op(g[0], g[1]) && g[5] === op(g[3], g[4]) ? op(g[6], g[7]) : null;
    }
    case 'add-t':
    case 'sub-t':
    case 'rsub-t':
    case 'xor-t':
    case 'and-t': {
      if (attr !== 'rays') return null;
      const op = RAY_OPS[kind.slice(0, -2) as 'add' | 'sub' | 'rsub' | 'xor' | 'and'];
      return g[6] === op(g[0], g[3]) && g[7] === op(g[1], g[4]) ? op(g[2], g[5]) : null;
    }
  }
}

/** the grid of one attribute across the 9 cells */
export const gridOf = (item: Pick<Item, 'cells'>, attr: AttrId): number[] => item.cells.map((c) => c[attr]);

/**
 * Ambiguity guard (§1.8, Appendix B): no rule or direction in the vocabulary
 * may fit rows 1–2 and columns 1–2 while predicting a different answer, for
 * ANY attribute the layout shows. Returns the offending "attr:kind", or null.
 */
export function ambiguity(item: Pick<Item, 'cells' | 'layout'>, shown: readonly AttrId[]): string | null {
  const answer = item.cells[8];
  for (const attr of shown) {
    const g = gridOf(item, attr);
    for (const kind of guardKindsFor(attr)) {
      const p = predict(kind, attr, g);
      if (p !== null && p !== answer[attr]) return `${attr}:${kind}`;
    }
  }
  return null;
}

/**
 * Class purity [DC]: each rule-governed attribute must not also fit a rule
 * of a strictly easier family, so the difficulty class (and its b) describes
 * the easiest way the item can actually be solved.
 */
export function impurity(item: Pick<Item, 'cells' | 'rules'>): string | null {
  for (const rule of item.rules) {
    const g = gridOf(item, rule.attr);
    for (const kind of guardKindsFor(rule.attr)) {
      if (RANK[kind] >= RANK[rule.kind]) continue;
      if (predict(kind, rule.attr, g) !== null) return `${rule.attr}:${rule.kind}~${kind}`;
    }
  }
  return null;
}
