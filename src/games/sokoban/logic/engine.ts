/**
 * Sokoban core rules & shared types. Pure TypeScript, no React — importable
 * headlessly by the generator, solver and the validate harness.
 *
 * The board is a flat row-major grid of `width * height` cells. Walls are a
 * boolean mask; crates, targets and the player are cell indices. Everything a
 * solver or the UI needs is derived from these.
 */

export type Dir = 0 | 1 | 2 | 3;
/** Direction deltas, index-aligned: 0 up · 1 down · 2 left · 3 right. */
export const DIRS: { dr: number; dc: number }[] = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 }
];
/** The opposite of each direction (up↔down, left↔right). */
export const OPP: Dir[] = [1, 0, 3, 2];

export const UP = 0;
export const DOWN = 1;
export const LEFT = 2;
export const RIGHT = 3;

/** A fully generated, always-solvable puzzle in its scrambled start state. */
export interface SokobanPuzzle {
  width: number;
  height: number;
  /** true = wall, length width*height */
  walls: boolean[];
  /** goal cells; crates.length === targets.length */
  targets: number[];
  /** the player's starting cell */
  player: number;
  /** the crates' starting cells */
  crates: number[];
  /** an achievable push count to solve — the score's par */
  parPushes: number;
  /** a forward player-move sequence (Dir list) that solves the start state */
  solution: number[];
}

/** Step one cell from `idx` in direction `dir`; -1 if it leaves the grid. */
export function step(idx: number, dir: number, w: number, h: number): number {
  const r = Math.floor(idx / w) + DIRS[dir].dr;
  const c = (idx % w) + DIRS[dir].dc;
  if (r < 0 || r >= h || c < 0 || c >= w) return -1;
  return r * w + c;
}

export interface MoveResult {
  player: number;
  crates: number[];
  pushed: boolean;
}

/**
 * Attempt a single forward move in `dir`. Returns the resulting state, or
 * `null` when the move is illegal (into a wall, or a push blocked by a wall
 * or a second crate). Never pulls, only pushes one crate at a time.
 */
export function tryMove(
  puzzle: Pick<SokobanPuzzle, 'width' | 'height' | 'walls'>,
  crates: number[],
  player: number,
  dir: number
): MoveResult | null {
  const { width: w, height: h, walls } = puzzle;
  const to = step(player, dir, w, h);
  if (to < 0 || walls[to]) return null;
  const ci = crates.indexOf(to);
  if (ci !== -1) {
    const beyond = step(to, dir, w, h);
    if (beyond < 0 || walls[beyond] || crates.includes(beyond)) return null;
    const next = crates.slice();
    next[ci] = beyond;
    return { player: to, crates: next, pushed: true };
  }
  return { player: to, crates, pushed: false };
}

/** Win check: every crate sits on a target. */
export function isSolved(crates: number[], targets: number[]): boolean {
  const t = new Set(targets);
  return crates.every((c) => t.has(c));
}

/** Deterministic PRNG (mulberry32) — same seed always yields the same puzzle. */
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
