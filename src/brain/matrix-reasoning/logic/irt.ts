import { median } from '../../../platform/brain/timing';

/**
 * The adaptive IRT engine (SCIENCE.md §1.8 "Difficulty classes", "Adaptive
 * rule", "Metrics"). Pure arithmetic, no DOM.
 *
 * Model: 3PL with a = 1 and c = 1/8 (8 options); each difficulty class has a
 * FIXED b derived from Sandia norming accuracy p as b = −logit((p − c)/(1 − c)).
 * Item parameters are never re-estimated from one person's data — ability
 * change and item difficulty would be confounded.
 */

export const IRT_A = 1;
export const IRT_C = 1 / 8;

export interface DifficultyClass {
  id: number;
  b: number;
  /** what the class contains (§1.8 table) */
  label: string;
}

export const CLASSES: readonly DifficultyClass[] = [
  { id: 1, b: -2.6, label: 'One row or column relation' },
  { id: 2, b: -1.9, label: 'One diagonal relation or one progression' },
  { id: 3, b: -1.2, label: 'Two relations including a diagonal' },
  { id: 4, b: -0.65, label: 'Three relations including a diagonal' },
  { id: 5, b: -0.4, label: 'One outward relation' },
  { id: 6, b: -0.1, label: 'Two relations including outward' },
  { id: 7, b: 0.4, label: 'Three relations including outward, or figure addition/subtraction' },
  { id: 8, b: 1.1, label: 'XOR or AND' },
  { id: 9, b: 1.9, label: 'A logic layer plus one transformation (provisional)' }
];

export const bOf = (classId: number): number => CLASSES[classId - 1].b;

/** P(correct | θ) under the 3PL */
export function p3pl(theta: number, b: number, a = IRT_A, c = IRT_C): number {
  return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
}

/** prior N(0, 1), quadrature −4 … 4 in steps of 0.05 (161 nodes) */
export const QUAD = { lo: -4, hi: 4, step: 0.05 } as const;
const NODES = Math.round((QUAD.hi - QUAD.lo) / QUAD.step) + 1;

export interface IrtResponse {
  b: number;
  correct: boolean;
}

/**
 * Expected a-posteriori ability and its posterior SD (the SE). With no
 * responses it returns the (truncated) prior: θ = 0, SE ≈ 0.999.
 */
export function eap(responses: readonly IrtResponse[]): { theta: number; se: number } {
  const lp = new Array<number>(NODES);
  let max = -Infinity;
  for (let i = 0; i < NODES; i++) {
    const th = QUAD.lo + i * QUAD.step;
    let l = -0.5 * th * th;
    for (const r of responses) {
      const p = p3pl(th, r.b);
      l += Math.log(r.correct ? p : 1 - p);
    }
    lp[i] = l;
    if (l > max) max = l;
  }
  let sw = 0;
  let st = 0;
  for (let i = 0; i < NODES; i++) {
    const w = Math.exp(lp[i] - max);
    sw += w;
    st += w * (QUAD.lo + i * QUAD.step);
  }
  const mean = st / sw;
  let sv = 0;
  for (let i = 0; i < NODES; i++) {
    const d = QUAD.lo + i * QUAD.step - mean;
    sv += Math.exp(lp[i] - max) * d * d;
  }
  return { theta: mean, se: Math.sqrt(sv / sw) };
}

/**
 * 3PL information peaks at θ = b + ln[(1 + √(1 + 8c))/2]/a ≈ b + 0.19 for
 * c = 1/8, so the next item comes from the class whose b is closest to
 * θ̂ − 0.2 (§1.8 "Adaptive rule"). Exact ties go to the easier class [DC].
 */
export const TARGET_OFFSET = 0.2;

export function selectClass(thetaHat: number): number {
  const goal = thetaHat - TARGET_OFFSET;
  let best = CLASSES[0].id;
  let bestD = Infinity;
  for (const c of CLASSES) {
    const d = Math.abs(c.b - goal);
    if (d < bestD - 1e-12) {
      best = c.id;
      bestD = d;
    }
  }
  return best;
}

/**
 * Starting θ̂ for item selection: the median θ of the last 5 valid sessions
 * minus 0.5; the first-ever session starts at −0.5 [DC]. It only steers the
 * FIRST selection — the EAP prior stays N(0, 1) (never personalised).
 */
export function startTheta(previous: readonly number[]): number {
  const xs = previous.filter((x) => Number.isFinite(x)).slice(-5);
  return xs.length ? median(xs) - 0.5 : -0.5;
}
