import type { Difficulty } from '../../../platform/types';

/**
 * Schulte Table logic — pure and React-free so it can be validated
 * headlessly. A board is a scrambled array of tiles; the index of a tile is
 * its fixed cell position (positions never move — clearing a tile only
 * repaints it). The player taps tiles following the target sequence.
 */

export type SchulteMode = 'ascending' | 'descending' | 'interleaved';

export interface SchulteConfig {
  /** grid dimension (a size×size board of size² tiles) */
  size: number;
  mode: SchulteMode;
}

/** null for single-sequence modes; 'a'/'b' for the two interleaved colours. */
export type TileColor = 'a' | 'b' | null;

export interface Tile {
  value: number;
  color: TileColor;
}

export interface Target {
  value: number;
  color: TileColor;
}

/** The five platform difficulty tiers mapped to board configs. */
export const DIFFICULTY_CONFIGS: Record<Difficulty, SchulteConfig> = {
  easy: { size: 3, mode: 'ascending' }, // 1–9
  medium: { size: 4, mode: 'ascending' }, // 1–16
  hard: { size: 5, mode: 'ascending' }, // 1–25 (the classic)
  pro: { size: 5, mode: 'descending' }, // 25→1
  extreme: { size: 5, mode: 'interleaved' } // two colours, alternating
};

/** Deterministic PRNG (mulberry32) — used by tests/validation. */
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

export function tileCount(cfg: SchulteConfig): number {
  return cfg.size * cfg.size;
}

/** Number of taps that complete the board. */
export function totalSteps(cfg: SchulteConfig): number {
  return tileCount(cfg);
}

/** In interleaved mode colour 'a' takes the extra tile on odd counts. */
function interleavedCounts(n: number): { a: number; b: number } {
  const a = Math.ceil(n / 2);
  return { a, b: n - a };
}

/** The exact contents that must appear on the board (pre-shuffle). */
function boardContents(cfg: SchulteConfig): Tile[] {
  const n = tileCount(cfg);
  if (cfg.mode === 'interleaved') {
    const { a, b } = interleavedCounts(n);
    const out: Tile[] = [];
    for (let v = 1; v <= a; v++) out.push({ value: v, color: 'a' });
    for (let v = 1; v <= b; v++) out.push({ value: v, color: 'b' });
    return out;
  }
  const out: Tile[] = [];
  for (let v = 1; v <= n; v++) out.push({ value: v, color: null });
  return out;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build a scrambled board; the array index is the fixed cell position. */
export function makeBoard(cfg: SchulteConfig, rng: () => number): Tile[] {
  return shuffle(boardContents(cfg), rng);
}

/**
 * The target that must be tapped at `step` (0-based); null once the board is
 * complete. Encodes each mode's order:
 *  - ascending  → 1, 2, 3, …
 *  - descending → n, n−1, …, 1
 *  - interleaved→ a1, b1, a2, b2, … (colour 'a' gets the final tap on odd n)
 */
export function nextTarget(cfg: SchulteConfig, step: number): Target | null {
  const n = tileCount(cfg);
  if (step < 0 || step >= n) return null;
  if (cfg.mode === 'descending') return { value: n - step, color: null };
  if (cfg.mode === 'interleaved') {
    const half = Math.floor(step / 2);
    return step % 2 === 0 ? { value: half + 1, color: 'a' } : { value: half + 1, color: 'b' };
  }
  return { value: step + 1, color: null };
}

/** The full expected tap order — handy for tests. */
export function targetSequence(cfg: SchulteConfig): Target[] {
  const out: Target[] = [];
  for (let s = 0; s < totalSteps(cfg); s++) {
    const t = nextTarget(cfg, s);
    if (t) out.push(t);
  }
  return out;
}

/** Does a tile satisfy a target? */
export function tileMatchesTarget(tile: Tile, t: Target): boolean {
  return tile.value === t.value && tile.color === t.color;
}

/** Index of the (uncleared) cell holding the current target, or -1. */
export function targetCell(board: Tile[], t: Target | null, cleared: Set<number>): number {
  if (!t) return -1;
  return board.findIndex((tile, i) => !cleared.has(i) && tileMatchesTarget(tile, t));
}
