/**
 * Untangle's ropes — the little physics under each edge, dependency-free so
 * `npm run validate` can drive it.
 *
 * An edge is drawn as a quadratic Bézier from screw A to screw B whose
 * control point is a MASS on a damped spring: its rest position is the
 * midpoint plus a little gravity sag, and when a screw is dragged the rest
 * point moves while the mass lags behind, so the rope bows against the
 * motion, then swings back past rest a couple of times and settles within a
 * few seconds (underdamped: ζ ≈ 0.23). The screws themselves never move on
 * their own — the puzzle state is exactly where the player put them; only
 * the rope between them has inertia.
 */
export interface RopeState {
  /** the control point, absolute, in the board's normalized 0..1 space */
  px: number;
  py: number;
  /** its velocity, board units per second */
  vx: number;
  vy: number;
}

export const ROPE = {
  /** spring stiffness (ω² — ω ≈ 8.4 rad/s, about 1.3 swings a second) */
  k: 70,
  /** viscous damping; 2·√k would be critical, this is well under it so the rope bounces */
  damping: 3.8,
  /** gravity sag at rest, as a share of the rope's length */
  sag: 0.07,
  /** the bow can never exceed this share of the rope's length */
  maxBow: 0.35,
  /** below this distance and speed the rope is still and the loop may stop */
  stillDist: 0.001,
  stillSpeed: 0.002
} as const;

export interface Pt2 {
  x: number;
  y: number;
}

/** where the control point rests: the midpoint, sagging down a little */
export function restPoint(a: Pt2, b: Pt2): Pt2 {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + ROPE.sag * len };
}

export function initRope(rest: Pt2): RopeState {
  return { px: rest.x, py: rest.y, vx: 0, vy: 0 };
}

/** one integration step (semi-implicit Euler; `dt` in seconds, clamped by the caller) */
export function stepRope(s: RopeState, rest: Pt2, len: number, dt: number): RopeState {
  const ax = -ROPE.k * (s.px - rest.x) - ROPE.damping * s.vx;
  const ay = -ROPE.k * (s.py - rest.y) - ROPE.damping * s.vy;
  let vx = s.vx + ax * dt;
  let vy = s.vy + ay * dt;
  let px = s.px + vx * dt;
  let py = s.py + vy * dt;
  // a rope can bow, not fly off: clamp the offset and kill the outward speed
  const ox = px - rest.x;
  const oy = py - rest.y;
  const off = Math.hypot(ox, oy);
  const max = Math.max(0.01, ROPE.maxBow * len);
  if (off > max) {
    const k = max / off;
    px = rest.x + ox * k;
    py = rest.y + oy * k;
    const outward = (vx * ox + vy * oy) / off;
    if (outward > 0) {
      vx -= (outward * ox) / off;
      vy -= (outward * oy) / off;
    }
  }
  return { px, py, vx, vy };
}

/** true when the rope has come to rest (the animation loop may sleep) */
export function settled(s: RopeState, rest: Pt2): boolean {
  return (
    Math.hypot(s.px - rest.x, s.py - rest.y) < ROPE.stillDist && Math.hypot(s.vx, s.vy) < ROPE.stillSpeed
  );
}

/** snap to rest — used when the loop sleeps so a sub-threshold drift never lingers */
export function stillRope(rest: Pt2): RopeState {
  return initRope(rest);
}
