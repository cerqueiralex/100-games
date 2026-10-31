/**
 * Matrix Reasoning — the item model (SCIENCE.md §1.8). Pure data and types:
 * no DOM, no React, so validate imports it under Node.
 *
 * A cell is a set of integer attribute LEVELS. What the levels look like is
 * the renderer's business (render.tsx); everything that decides what an item
 * IS — rules, answer set, ambiguity guard, scoring — works on these integers,
 * which is what lets the check prove "exactly one solution" and "options are
 * distinct" without a browser.
 */

/** the attribute vocabulary [DC values, §1.8 "Attributes"] */
export type AttrId = 'shape' | 'size' | 'shade' | 'orient' | 'number' | 'position' | 'rays';

export const ATTR_IDS: readonly AttrId[] = ['shape', 'size', 'shade', 'orient', 'number', 'position', 'rays'];

/**
 * Number of levels per attribute.
 *  - shape: triangle, square, pentagon, hexagon, circle (ordered by sides, so it can progress)
 *  - size: 40 / 55 / 70 / 85 / 100 % of the cell's inner box (15 % steps)
 *  - shade: outline only, 25, 50, 75, 100 % ink (luminance from the theme's ink, never hue)
 *  - orient: 8 steps of 45° (cyclic), made unambiguous by an asymmetric marker dot
 *  - number: 1–4 copies in fixed layouts (stored 0–3)
 *  - position: one object in a 3×3 sub-grid of the cell (stored 0–8, reading order)
 *  - rays: the logic layer — a 6-bit set of radial strokes (up to 6 per cell)
 */
export const LEVELS: Record<AttrId, number> = { shape: 5, size: 5, shade: 5, orient: 8, number: 4, position: 9, rays: 64 };

export const SIZE_LEVELS = [0.4, 0.55, 0.7, 0.85, 1] as const;
export const SHADE_LEVELS = [0, 0.25, 0.5, 0.75, 1] as const;
export const RAY_COUNT = 6;
export const ORIENT_STEP_DEG = 45;

export const isCyclic = (a: AttrId): boolean => a === 'orient';
/** ordered attributes can progress; position and rays are categorical */
export const isOrdinal = (a: AttrId): boolean => a !== 'position' && a !== 'rays';

export type Cell = Record<AttrId, number>;

/**
 * Which attributes a cell can show. Size is only a free attribute when one
 * figure sits in the middle of the cell: with copies, a sub-grid position or
 * the ray ring, the figure is drawn at a fixed size (a 15 % step of a half-size
 * copy would no longer be distinct at render size — Appendix B).
 */
export type Layout = 'single' | 'number' | 'position' | 'logic';

export const LAYOUT_POOL: Record<Layout, readonly AttrId[]> = {
  single: ['shape', 'size', 'shade', 'orient'],
  number: ['number', 'shape', 'shade', 'orient'],
  position: ['position', 'shade', 'orient'],
  logic: ['rays', 'shape', 'shade', 'orient']
};

/** the attribute a non-single layout exists for (it is always rule-governed there) */
export const LAYOUT_ATTR: Record<Layout, AttrId | null> = { single: null, number: 'number', position: 'position', logic: 'rays' };

/** values of attributes a layout does not show (constant, never probed) */
export const NEUTRAL: Cell = { shape: 1, size: 3, shade: 0, orient: 0, number: 0, position: 4, rays: 0 };

/**
 * The rule vocabulary (§1.8 "Rules"). v[r][c] is the level in row r, column c.
 *  row     constant in a row: v = a[r]
 *  col     constant in a column: v = a[c]
 *  prog-r  pairwise progression along rows: v = s[r] + k·c
 *  prog-c  pairwise progression down columns: v = s[c] + k·r
 *  diag-a  distribution of three on the ↘ diagonals: v = vals[(c − r) mod 3]
 *  diag-b  distribution of three on the ↙ diagonals: v = vals[(r + c) mod 3]
 *  out     outward progression from the top-left: v = s + k·max(r, c)
 *  add / sub / xor / and   logic on the ray sets: col3 = col1 ∪ / ∖ / Δ / ∩ col2
 */
export type RuleKind = 'row' | 'col' | 'prog-r' | 'prog-c' | 'diag-a' | 'diag-b' | 'out' | 'add' | 'sub' | 'xor' | 'and';

export const LOGIC_KINDS: readonly RuleKind[] = ['add', 'sub', 'xor', 'and'];
export const isLogicKind = (k: RuleKind): boolean => k === 'add' || k === 'sub' || k === 'xor' || k === 'and';

export interface RuleSpec {
  attr: AttrId;
  kind: RuleKind;
}

/**
 * Rule families, logged per item as a bitmask so accuracy by family can be
 * recomputed from the trial log (Carpenter's five + Sandia's outward):
 * 1 constant · 2 progression · 4 distribution of three · 8 outward ·
 * 16 figure addition/subtraction · 32 distribution of two (XOR/AND).
 */
export const FAMILY_BIT: Record<RuleKind, number> = {
  row: 1,
  col: 1,
  'prog-r': 2,
  'prog-c': 2,
  'diag-a': 4,
  'diag-b': 4,
  out: 8,
  add: 16,
  sub: 16,
  xor: 32,
  and: 32
};

/** what kind of misapplication a distractor value is (logged for review / audit) */
export type DistractorKind =
  | 'other-row'
  | 'other-col'
  | 'wrong-way'
  | 'other-diag'
  | 'corner'
  | 'other-op'
  | 'adjacent-level';

export interface Item {
  /** difficulty class D1–D9 */
  classId: number;
  layout: Layout;
  rules: RuleSpec[];
  /** the 9 cells in reading order; cells[8] (row 3, column 3) is the hidden answer */
  cells: Cell[];
  /** the 3 probe attributes the answer set is built over (rule attributes first) */
  probes: AttrId[];
  /** the wrong value used for each probe, and what kind of slip it is */
  wrong: { attr: AttrId; value: number; kind: DistractorKind }[];
  /** the 8 options — all 2³ correct/incorrect combinations over the probes */
  options: Cell[];
  /** slot of the correct option, 0–7 (reading order of the 2×4 grid) */
  answer: number;
  /** "the same rule combination never appears twice in a row" compares this */
  key: string;
  /** FAMILY_BIT union of the item's rules */
  family: number;
}

export const ruleKey = (rules: readonly RuleSpec[]): string =>
  rules
    .map((r) => `${r.attr}:${r.kind}`)
    .sort()
    .join('+');

export const popcount = (m: number): number => {
  let n = 0;
  for (let x = m; x; x &= x - 1) n++;
  return n;
};

export const cloneCell = (c: Cell): Cell => ({ ...c });

export const sameCell = (a: Cell, b: Cell): boolean => ATTR_IDS.every((k) => a[k] === b[k]);
