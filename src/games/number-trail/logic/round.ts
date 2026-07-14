/*
 * Number Trail — pure round generation (no React, headlessly testable).
 *
 * A round places `count` numbers at random cells of a square grid. The
 * player must tap them in ASCENDING value order from memory. In the
 * consecutive variant the values are 1..count; in the non-consecutive
 * variant they are `count` distinct random values that still sort into a
 * unique tap order. `order` is the target tap sequence (positions sorted
 * by ascending value) — this is what both the game and the validator
 * check against.
 */

export type Rng = () => number;

export interface RoundConfig {
  /** how many numbers appear this round */
  count: number;
  /** grid is gridDim × gridDim cells */
  gridDim: number;
  /** true → distinct random values (tap smallest→largest); false → 1..count */
  nonConsecutive: boolean;
}

export interface RoundItem {
  /** flat cell index, 0 .. gridDim*gridDim - 1 */
  pos: number;
  /** the number displayed on the tile */
  value: number;
}

export interface Round {
  gridDim: number;
  cells: number;
  items: RoundItem[];
  /** cell positions in ascending-value order = the correct tap sequence */
  order: number[];
}

/** Deterministic seedable PRNG for tests (returns [0, 1)). */
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

/** Grid dimension that comfortably fits `count` numbers with spare cells. */
export function gridDimForCount(count: number): number {
  return count <= 12 ? 4 : 5;
}

/** Fisher–Yates: return the first `k` of a shuffled [0, n). */
function sampleIndices(n: number, k: number, rng: Rng): number[] {
  const pool = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (n - i));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, k);
}

/** `k` distinct integers drawn from the inclusive range [lo, hi]. */
function distinctValues(k: number, lo: number, hi: number, rng: Rng): number[] {
  const span = hi - lo + 1;
  return sampleIndices(span, k, rng).map((i) => lo + i);
}

/** Build one round of numbers + the ascending target order. */
export function makeRound(cfg: RoundConfig, rng: Rng): Round {
  const cells = cfg.gridDim * cfg.gridDim;
  const positions = sampleIndices(cells, cfg.count, rng);

  let values: number[];
  if (cfg.nonConsecutive) {
    // wide enough span that values look scattered but stay ≤ 2 digits
    const hi = Math.min(99, Math.max(cfg.count + 6, cfg.count * 4));
    values = distinctValues(cfg.count, 1, hi, rng);
  } else {
    values = Array.from({ length: cfg.count }, (_, i) => i + 1);
    // shuffle so a value's grid position is random
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = values[i];
      values[i] = values[j];
      values[j] = tmp;
    }
  }

  const items: RoundItem[] = positions.map((pos, i) => ({ pos, value: values[i] }));
  const order = [...items].sort((a, b) => a.value - b.value).map((it) => it.pos);
  return { gridDim: cfg.gridDim, cells, items, order };
}
