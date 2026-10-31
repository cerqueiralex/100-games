import { randRange, rng, shuffle } from '../../../platform/brain/timing';
import { PROTOCOL, trialSeed, type TrialKind } from './protocol';

/**
 * Block Span — arena geometry, layouts, sequences and path metrics
 * (SCIENCE.md §1.6 "Arena", "Blocks", "Placement", "Sequence").
 * Pure and seeded: every draw comes from `rng(trialSeed(…))` — never from an
 * unseeded source — so validate replays any trial exactly.
 *
 * Coordinates are arena pixels with the origin at the arena's top-left
 * corner; the component renders them as percentages of the side S, so the
 * board scales with its box while the geometry stays the generated one.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Layout {
  /** arena side, px */
  S: number;
  /** block side, px */
  b: number;
  /** block centres, px */
  centres: Point[];
  /** true when rejection sampling ran out and the jittered 4 × 4 lattice was used */
  fallback: boolean;
}

export interface TrialItem {
  kind: TrialKind;
  /** attempt number within its ladder — with the run seed, regenerates this exact trial */
  attempt: number;
  /** sequence length */
  L: number;
  layout: Layout;
  /** the highlighted blocks, in order (indices into layout.centres, all distinct) */
  seq: number[];
  /** centre-to-centre path length of the sequence, in block sides */
  pathLen: number;
  /** pairs of non-adjacent path segments that cross */
  crossings: number;
}

/**
 * S = min(viewport width − 32, 0.6 × viewport height, 420) px, never larger
 * than the box it sits in, and never under the 264 px floor [DC].
 */
export function arenaSide(viewportW: number, viewportH: number, boxW = Infinity, boxH = Infinity): number {
  const s = Math.min(
    viewportW - PROTOCOL.arenaGutterPx,
    PROTOCOL.arenaVhFraction * viewportH,
    PROTOCOL.arenaMaxPx,
    boxW,
    boxH
  );
  return Number.isFinite(s) ? Math.max(PROTOCOL.arenaMinPx, Math.floor(s)) : PROTOCOL.arenaMinPx;
}

/** b = max(44 px, round(0.13 × S)) */
export function blockSide(S: number): number {
  return Math.max(PROTOCOL.blockMinPx, Math.round(PROTOCOL.blockFraction * S));
}

/** minimum centre distance from the arena edge: 0.5 b + 4 px */
export function edgeMargin(b: number): number {
  return 0.5 * b + PROTOCOL.edgePx;
}

/** minimum centre-to-centre distance: 1.5 b */
export function minSpacing(b: number): number {
  return PROTOCOL.spacingInBlocks * b;
}

function dist(p: Point, q: Point): number {
  return Math.hypot(p.x - q.x, p.y - q.y);
}

/**
 * A new random layout of `n` blocks: sequential rejection sampling with a
 * budget of `attempts` candidate draws for the whole layout [DC]; when the
 * budget runs out, the jittered 4 × 4 lattice with `n` random cells.
 */
export function generateLayout(
  r: () => number,
  S: number,
  b: number,
  n: number,
  attempts: number = PROTOCOL.layoutAttempts
): Layout {
  const lo = edgeMargin(b);
  const hi = S - lo;
  const gap = minSpacing(b);
  const pts: Point[] = [];
  if (hi > lo) {
    for (let draw = 0; draw < attempts && pts.length < n; draw++) {
      const p = { x: randRange(r, lo, hi), y: randRange(r, lo, hi) };
      if (pts.every((q) => dist(p, q) >= gap)) pts.push(p);
    }
  }
  if (pts.length === n) return { S, b, centres: pts, fallback: false };
  return { S, b, centres: latticeLayout(r, S, b, n), fallback: true };
}

/**
 * The fallback: `n` random cells of a 4 × 4 lattice, each centre jittered
 * by at most j on both axes, where j is the largest value that keeps the
 * spacing and edge rules for every pair (pitch − 2j ≥ 1.5 b and
 * pitch/2 − j ≥ 0.5 b + 4). For an arena too small for even that (j < 0,
 * only below S ≈ 264 px, i.e. a landscape phone) the cells sit unjittered.
 */
export function latticeLayout(r: () => number, S: number, b: number, n: number): Point[] {
  const k = PROTOCOL.latticeSide;
  const pitch = S / k;
  const j = Math.max(0, Math.min((pitch - minSpacing(b)) / 2, pitch / 2 - edgeMargin(b)));
  const cells = shuffle(
    r,
    Array.from({ length: k * k }, (_, i) => i)
  ).slice(0, Math.min(n, k * k));
  return cells.map((c) => ({
    x: pitch * (c % k) + pitch / 2 + (j > 0 ? randRange(r, -j, j) : 0),
    y: pitch * Math.floor(c / k) + pitch / 2 + (j > 0 ? randRange(r, -j, j) : 0)
  }));
}

/** every rule a layout must satisfy — empty when it is sound (validate and the self-check use it) */
export function layoutProblems(layout: Layout, n: number): string[] {
  const out: string[] = [];
  const { S, b, centres } = layout;
  const eps = 1e-9;
  if (centres.length !== n) out.push(`${centres.length} blocks, expected ${n}`);
  if (b < PROTOCOL.blockMinPx) out.push(`block side ${b} px is under ${PROTOCOL.blockMinPx} px`);
  const margin = edgeMargin(b);
  const gap = minSpacing(b);
  centres.forEach((p, i) => {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) out.push(`block ${i} has a non-finite centre`);
    const edge = Math.min(p.x, p.y, S - p.x, S - p.y);
    if (edge < margin - eps) out.push(`block ${i} is ${edge.toFixed(2)} px from the edge (min ${margin})`);
    for (let k = i + 1; k < centres.length; k++) {
      const d = dist(p, centres[k]);
      if (d < gap - eps) out.push(`blocks ${i} and ${k} are ${d.toFixed(2)} px apart (min ${gap})`);
    }
  });
  return out;
}

/** L distinct blocks in random order */
export function drawSequence(r: () => number, n: number, L: number): number[] {
  return shuffle(
    r,
    Array.from({ length: n }, (_, i) => i)
  ).slice(0, Math.min(L, n));
}

/** centre-to-centre path length of the sequence, px */
export function pathLength(centres: Point[], seq: number[]): number {
  let len = 0;
  for (let i = 1; i < seq.length; i++) len += dist(centres[seq[i - 1]], centres[seq[i]]);
  return len;
}

function orient(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** do segments ab and cd cross at a point interior to both? */
export function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

/**
 * Self-crossings of the sequence path: pairs of non-adjacent segments that
 * intersect (span depends on path configuration — Facchin et al. 2024 —
 * so it is logged per trial; paths are not filtered in the MVP).
 */
export function selfCrossings(centres: Point[], seq: number[]): number {
  let n = 0;
  for (let i = 0; i + 1 < seq.length; i++) {
    for (let k = i + 2; k + 1 < seq.length; k++) {
      if (segmentsCross(centres[seq[i]], centres[seq[i + 1]], centres[seq[k]], centres[seq[k + 1]])) n++;
    }
  }
  return n;
}

/**
 * Which block a release at arena point (x, y) hits: inside the block plus
 * `pad` px on every side. Two padded squares can only overlap in a small
 * corner region between diagonal neighbours (centres ≥ 1.5 b apart); there
 * the nearer centre wins. −1 for a miss.
 */
export function hitBlock(x: number, y: number, centres: Point[], b: number, pad: number = PROTOCOL.hitPadPx): number {
  const half = b / 2 + pad;
  let best = -1;
  let bestD = Infinity;
  centres.forEach((p, i) => {
    if (Math.abs(x - p.x) <= half && Math.abs(y - p.y) <= half) {
      const d = dist({ x, y }, p);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
  });
  return best;
}

/** one trial attempt, generated entirely from the run seed */
export function makeTrial(seed: number, kind: TrialKind, attempt: number, L: number, n: number, S: number): TrialItem {
  const r = rng(trialSeed(seed, kind, attempt));
  const b = blockSide(S);
  const layout = generateLayout(r, S, b, n);
  const seq = drawSequence(r, n, L);
  return {
    kind,
    attempt,
    L: seq.length,
    layout,
    seq,
    pathLen: pathLength(layout.centres, seq) / b,
    crossings: selfCrossings(layout.centres, seq)
  };
}
