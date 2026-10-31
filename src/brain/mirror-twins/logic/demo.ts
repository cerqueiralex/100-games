/**
 * The demonstration's fixed pair (MirrorTwinsDemo.tsx) — kept here, as pure
 * data, so the fidelity check can prove it obeys the same acceptance rules
 * as every generated figure (rules 1–3 for the shape, rule 4 at both ends of
 * both turns the demo shows).
 *
 * A chiral 10-cube figure, arms 2-4-4-3: a stub, a long arm toward you, a
 * column, an arm on top.
 */
import { buildFigure } from './geometry';

export const DEMO_FIGURE = buildFigure(
  [2, 4, 4, 3],
  [
    [1, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
    [0, 0, 1]
  ]
);
/** reference yaw, and the two turns the demo animates (same pair, then mirror pair) */
export const DEMO_PHI = 38;
export const DEMO_SAME_THETA = 100;
export const DEMO_MIRROR_THETA = 150;
