/**
 * Symbol Coding — the glyph pool (SCIENCE.md §1.11 "Glyphs").
 *
 * Forty ORIGINAL abstract line glyphs drawn on a 3×3 stroke lattice. Grid
 * points are numbered row-major (0 = top-left … 8 = bottom-right); a stroke
 * is a straight line [from, to] or a quadratic curve [from, control, to]
 * whose control point is also a lattice point. Every glyph has 2–3 strokes,
 * spans the whole lattice in both directions (equal size) and carries a
 * similar amount of ink (4.85–6.9 lattice units of stroke).
 *
 * How the pool was made: a constrained enumerator listed every lattice glyph
 * of 2–3 strokes (connected, at least one curve, at most one straight
 * knight-slant, no overlapping strokes, no large enclosed region — a
 * crossing may close a small one) — about 50,000 shapes, distinct up to
 * rotation and reflection. 25 glyphs of a first hand-screened pool were
 * kept (letter-, digit- and icon-like glyphs and near-copies were dropped)
 * and 15 were added from a seeded draw of three-stroke, two-curve, crossing
 * candidates that stay distinct from every other glyph. Everything was
 * screened by eye: a glyph resembling a Latin letter, a digit (the answers
 * are digits), a common symbol (+, ×, ∗, arrows, Greek letters) or a
 * familiar icon was dropped. The survivors are baked here, so the pool is
 * fixed content — every session draws its keys from it with the run's seed.
 *
 * Two rules keep every key a matched alternate form (both re-proven by
 * scripts/brain-checks/symbol-coding.ts):
 *  - no two pool glyphs are rotations or mirror images of each other (the
 *    eight symmetries of the square), so no key can hold such a pair; and
 *  - no KEY holds two glyphs that are near-copies under any of those
 *    symmetries (`glyphSimilarity` ≥ KEY_SIMILARITY_MAX — baked as
 *    CONFUSABLE_PAIRS), which the session generator enforces: a key with two
 *    look-alikes would be a harder form.
 *
 * Dependency-free — no DOM, no React — so validate imports it under Node.
 */

/** a lattice point, 0..8 row-major */
export type GridPoint = number;
/** a straight stroke [from, to] or a quadratic stroke [from, control, to] */
export type GlyphStroke = readonly [GridPoint, GridPoint] | readonly [GridPoint, GridPoint, GridPoint];
export type Glyph = readonly GlyphStroke[];

export const GLYPHS: readonly Glyph[] = [
  [[1, 5, 7], [6, 4, 8], [2, 8]],
  [[2, 1, 4], [2, 4, 8], [5, 6]],
  [[0, 5, 6], [3, 7, 5]],
  [[3, 6], [1, 4, 3], [6, 4, 8]],
  [[1, 4, 3], [5, 6], [1, 5, 7]],
  [[1, 0, 3], [1, 4, 5], [3, 4, 7]],
  [[5, 8], [2, 5, 4], [3, 1, 5]],
  [[0, 2, 8], [2, 3], [3, 7]],
  [[3, 7, 5], [5, 8, 7], [1, 8]],
  [[2, 4], [4, 3, 6], [3, 7, 5]],
  [[2, 5, 4], [0, 2, 8], [5, 4, 7]],
  [[4, 7], [0, 3, 4], [6, 4, 8]],
  [[5, 8, 7], [2, 6], [4, 7, 8]],
  [[1, 5], [5, 0, 7], [3, 8]],
  [[5, 8, 7], [0, 3, 4], [1, 3, 7]],
  [[4, 7, 6], [2, 5, 4], [3, 7, 5]],
  [[3, 1, 5], [0, 8], [4, 7, 6]],
  [[5, 0, 7], [3, 1, 5], [0, 3]],
  [[3, 7], [1, 5, 7], [0, 5]],
  [[6, 8], [0, 7], [3, 1, 5]],
  [[2, 8, 6], [5, 8], [3, 8]],
  [[4, 6], [7, 8], [2, 3, 8]],
  [[1, 5], [5, 4, 7], [3, 8]],
  [[2, 6], [1, 3, 7], [2, 5]],
  [[2, 3], [2, 4, 8], [5, 7]],
  [[1, 3], [0, 5, 8], [5, 3, 7]],
  [[0, 5, 4], [1, 7, 8], [3, 1, 4]],
  [[0, 4, 2], [1, 8, 6], [4, 6, 7]],
  [[0, 5], [1, 2, 8], [2, 7, 4]],
  [[0, 3, 1], [1, 0, 4], [4, 2, 8]],
  [[1, 3], [0, 5, 2], [2, 6, 8]],
  [[0, 3, 1], [0, 4, 5], [5, 7, 6]],
  [[0, 5], [1, 0, 3], [5, 4, 8]],
  [[0, 1, 5], [1, 0, 3], [2, 5, 6]],
  [[0, 3, 1], [0, 5, 7], [5, 4, 6]],
  [[0, 4, 1], [1, 5, 6], [2, 3, 4]],
  [[0, 5, 1], [0, 3, 5], [4, 1, 8]],
  [[0, 6, 1], [1, 0, 4], [4, 5, 8]],
  [[0, 4, 2], [0, 1, 4], [4, 0, 6]],
  [[0, 3, 1], [1, 7, 5], [5, 3, 8]]
];

/** the ink band every pool glyph sits in, in lattice units of stroke length */
export const INK_MIN = 4.85;
export const INK_MAX = 6.9;

/* ---------- geometry ---------- */

export function gridXY(p: GridPoint): [number, number] {
  return [p % 3, Math.floor(p / 3)];
}

/** sample a stroke as a polyline of n + 1 points, in lattice units */
export function strokePoints(st: GlyphStroke, n = 32): [number, number][] {
  const pts: [number, number][] = [];
  const a = gridXY(st[0]);
  if (st.length === 2) {
    const b = gridXY(st[1]);
    for (let i = 0; i <= n; i++) pts.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
    return pts;
  }
  const c = gridXY(st[1]);
  const b = gridXY(st[2]);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return pts;
}

/** total stroke length of a glyph, in lattice units ("ink") */
export function glyphInk(g: Glyph): number {
  let total = 0;
  for (const st of g) {
    const pts = strokePoints(st, 64);
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return total;
}

/** width and height of the drawn glyph, in lattice units (2 = the full lattice) */
export function glyphExtent(g: Glyph): { w: number; h: number } {
  const pts = g.flatMap((st) => strokePoints(st));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

/* ---------- rendering ---------- */

/** the SVG viewBox every glyph is drawn in: lattice points sit at 4, 12, 20 */
export const GLYPH_VIEWBOX = '1 1 22 22';
const px = (k: number) => 4 + k * 8;

/** the SVG path data of a glyph (strokes only — draw with fill none, round caps) */
export function glyphPath(g: Glyph): string {
  return g
    .map((st) => {
      const a = gridXY(st[0]);
      if (st.length === 2) {
        const b = gridXY(st[1]);
        return `M${px(a[0])} ${px(a[1])}L${px(b[0])} ${px(b[1])}`;
      }
      const c = gridXY(st[1]);
      const b = gridXY(st[2]);
      return `M${px(a[0])} ${px(a[1])}Q${px(c[0])} ${px(c[1])} ${px(b[0])} ${px(b[1])}`;
    })
    .join('');
}

/** every pool glyph's path, precomputed once (the test writes these straight into the DOM) */
export const GLYPH_PATHS: readonly string[] = GLYPHS.map(glyphPath);

/* ---------- symmetry: rotations and mirror images ---------- */

/** the eight symmetries of the square, acting on lattice coordinates */
const D4: ((p: [number, number]) => [number, number])[] = [
  ([x, y]) => [x, y],
  ([x, y]) => [2 - y, x],
  ([x, y]) => [2 - x, 2 - y],
  ([x, y]) => [y, 2 - x],
  ([x, y]) => [2 - x, y],
  ([x, y]) => [x, 2 - y],
  ([x, y]) => [y, x],
  ([x, y]) => [2 - y, 2 - x]
];

function strokeKey(st: readonly number[]): string {
  // a stroke reads the same from either end
  const fwd = st.join('.');
  const rev = st.slice().reverse().join('.');
  return (st.length === 2 ? 'L' : 'C') + (fwd < rev ? fwd : rev);
}

/** an order-independent identity of the glyph as drawn */
export function glyphKey(g: Glyph): string {
  return g.map((st) => strokeKey(st as readonly number[])).sort().join(' ');
}

/** the glyph under symmetry `k` (0 = identity, 1–3 = rotations, 4–7 = reflections) */
export function transformGlyph(g: Glyph, k: number): Glyph {
  const f = D4[k];
  return g.map((st) => st.map((p) => {
    const [x, y] = f(gridXY(p));
    return y * 3 + x;
  }) as unknown as GlyphStroke);
}

/** the same key for a glyph and all of its rotations and mirror images */
export function canonicalKey(g: Glyph): string {
  let best = '';
  for (let k = 0; k < 8; k++) {
    const key = glyphKey(transformGlyph(g, k));
    if (!best || key < best) best = key;
  }
  return best;
}

/** true when one glyph is a rotation or a mirror image of the other (or identical) */
export function sameUpToSymmetry(a: Glyph, b: Glyph): boolean {
  return canonicalKey(a) === canonicalKey(b);
}

/** the canonical key of every pool glyph, precomputed */
export const GLYPH_CANON: readonly string[] = GLYPHS.map(canonicalKey);


/* ---------- similarity: near-copies under rotation and reflection ---------- */

/**
 * A key may not hold two glyphs whose similarity reaches this: under the
 * best of the eight symmetries, three quarters of their ink would coincide.
 * It extends the spec's "no rotation or mirror pairs" rule to near-misses.
 */
export const KEY_SIMILARITY_MAX = 0.6;
/** no two POOL glyphs reach this — the pool holds no near-copies at all */
export const POOL_SIMILARITY_MAX = 0.75;

// raster: a 53 × 53 grid of 0.05-unit cells over the lattice (−0.3 … 2.3),
// each stroke stamped as a 0.15-unit-radius pen. Plain arithmetic only
// (no Math.hypot), so the browser and Node rasterise identically and a seed
// draws the same key everywhere.
const R_STEP = 0.05;
const R_LO = -0.3;
const R_N = 53;
const R_PEN = 0.15;
const R_WORDS = Math.ceil((R_N * R_N) / 32);

/** the glyph as a bitset of inked raster cells */
export function glyphRaster(g: Glyph): Uint32Array {
  const bits = new Uint32Array(R_WORDS);
  const reach = Math.ceil(R_PEN / R_STEP);
  for (const st of g) {
    for (const [x, y] of strokePoints(st, 80)) {
      const cx = Math.round((x - R_LO) / R_STEP);
      const cy = Math.round((y - R_LO) / R_STEP);
      for (let dx = -reach; dx <= reach; dx++) {
        for (let dy = -reach; dy <= reach; dy++) {
          const ex = R_LO + (cx + dx) * R_STEP - x;
          const ey = R_LO + (cy + dy) * R_STEP - y;
          if (ex * ex + ey * ey > R_PEN * R_PEN) continue;
          const i = (cy + dy) * R_N + (cx + dx);
          bits[i >> 5] |= 1 << (i & 31);
        }
      }
    }
  }
  return bits;
}

function popcount(v: number): number {
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/** intersection over union of two rasters */
function rasterIou(a: Uint32Array, b: Uint32Array): number {
  let inter = 0;
  let union = 0;
  for (let k = 0; k < a.length; k++) {
    inter += popcount(a[k] & b[k]);
    union += popcount(a[k] | b[k]);
  }
  return union ? inter / union : 0;
}

/**
 * How alike two glyphs look: the best overlap (intersection over union of
 * their inked raster cells) of `a` with `b` under any of the eight
 * symmetries of the square. 1 = identical, a rotation or a mirror image.
 */
export function glyphSimilarity(a: Glyph, b: Glyph): number {
  const ra = glyphRaster(a);
  let best = 0;
  for (let k = 0; k < 8; k++) best = Math.max(best, rasterIou(ra, glyphRaster(transformGlyph(b, k))));
  return best;
}

let simCache: Float32Array | null = null;

/** similarity of pool glyphs i and j (the full table is built once, on first use — validate only) */
export function poolSimilarity(i: number, j: number): number {
  if (!simCache) {
    const n = GLYPHS.length;
    const plain = GLYPHS.map(glyphRaster);
    const turned = GLYPHS.map((g) => Array.from({ length: 8 }, (_, k) => glyphRaster(transformGlyph(g, k))));
    simCache = new Float32Array(n * n);
    for (let a = 0; a < n; a++) {
      simCache[a * n + a] = 1;
      for (let b = a + 1; b < n; b++) {
        let best = 0;
        for (let k = 0; k < 8; k++) best = Math.max(best, rasterIou(plain[a], turned[b][k]));
        simCache[a * n + b] = simCache[b * n + a] = best;
      }
    }
  }
  return simCache[i * GLYPHS.length + j];
}

/**
 * The pool pairs that may not share a key (poolSimilarity ≥ KEY_SIMILARITY_MAX),
 * baked so a session never rasterises at run time (building the table costs
 * tens of ms — a hitch as the stage opens). Derived, not chosen:
 * scripts/brain-checks/symbol-coding.ts recomputes it from the geometry and
 * fails, printing the right list, if the pool and this list ever disagree.
 */
export const CONFUSABLE_PAIRS: readonly (readonly [number, number])[] = [
  [4, 18], [6, 9], [7, 10], [7, 20], [8, 17], [8, 22], [9, 16], [9, 23], [10, 20],
  [12, 16], [12, 21], [13, 18], [13, 22], [14, 15], [16, 23], [18, 22], [22, 24]
];
const CONFUSABLE = new Set(CONFUSABLE_PAIRS.map(([a, b]) => Math.min(a, b) * 1024 + Math.max(a, b)));

/** true when two pool glyphs may not share a key: the same glyph, a rotation / mirror pair, or near-copies */
export function confusable(i: number, j: number): boolean {
  if (i === j || GLYPH_CANON[i] === GLYPH_CANON[j]) return true;
  return CONFUSABLE.has(Math.min(i, j) * 1024 + Math.max(i, j));
}
