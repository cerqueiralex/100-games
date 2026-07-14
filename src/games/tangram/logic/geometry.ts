/*
 * Tangram geometry — pure TS, no React, headlessly validatable.
 *
 * Coordinate unit = the SMALL triangle's leg. The seven classic pieces are
 * defined as canonical integer polygons; a placement rotates (multiples of
 * 45°), optionally flips, and translates one. Because 90°-multiple rotations
 * keep integer coordinates and every piece already carries its natural 45°
 * edges, whole figures can be authored on the integer lattice.
 *
 * The whole tangram set always has total area 8 in these units:
 *   2 large triangles (2 each) + medium (1) + 2 small (0.5 each) +
 *   square (1) + parallelogram (1) = 8.
 */

export interface Pt {
  x: number;
  y: number;
}

export type PieceKind = 'largeTri' | 'medTri' | 'smallTri' | 'square' | 'parallelogram';

/** Canonical piece polygons (CCW), integer coords, leg = 1 unit. */
export const CANONICAL: Record<PieceKind, Pt[]> = {
  // right isosceles, legs 2 along +x/+y, hypotenuse NE→SW. area 2
  largeTri: [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 2 }
  ],
  // right isosceles, base 2 on x, apex up at (1,1), legs √2. area 1
  medTri: [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 1, y: 1 }
  ],
  // right isosceles, legs 1 along +x/+y. area 0.5
  smallTri: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 }
  ],
  // unit square. area 1
  square: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ],
  // sides 1 and √2. area 1
  parallelogram: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 1 },
    { x: 1, y: 1 }
  ]
};

/** Exact area of each canonical piece (used by validation). */
export const PIECE_AREA: Record<PieceKind, number> = {
  largeTri: 2,
  medTri: 1,
  smallTri: 0.5,
  square: 1,
  parallelogram: 1
};

/** The seven pieces every tangram figure is made of, in a stable order. */
export const PIECE_SET: PieceKind[] = [
  'largeTri',
  'largeTri',
  'medTri',
  'smallTri',
  'smallTri',
  'square',
  'parallelogram'
];

export const TOTAL_AREA = 8;

export interface Placement {
  kind: PieceKind;
  /** rotation in 45° steps, 0..7 */
  rot: number;
  /** parallelogram (and any piece) may be mirrored across its local Y axis */
  flip: boolean;
  pos: Pt;
}

/** Signed area (positive = counter-clockwise in maths axes). */
export function signedArea(poly: Pt[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function area(poly: Pt[]): number {
  return Math.abs(signedArea(poly));
}

export function centroid(poly: Pt[]): Pt {
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const cross = p.x * q.y - q.x * p.y;
    a += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  a /= 2;
  if (Math.abs(a) < 1e-12) {
    // degenerate: fall back to vertex mean
    const m = poly.reduce((s, p) => ({ x: s.x + p.x, y: s.y + p.y }), { x: 0, y: 0 });
    return { x: m.x / poly.length, y: m.y / poly.length };
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

/** Transform a canonical piece into world space: flip → rotate → translate. */
export function transform(kind: PieceKind, rot: number, flip: boolean, pos: Pt): Pt[] {
  const ang = (rot * Math.PI) / 4;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return CANONICAL[kind].map((p) => {
    const x = flip ? -p.x : p.x;
    const y = p.y;
    return { x: x * c - y * s + pos.x, y: x * s + y * c + pos.y };
  });
}

export function transformPlacement(pl: Placement): Pt[] {
  return transform(pl.kind, pl.rot, pl.flip, pl.pos);
}

/** Bounding box of a set of polygons. */
export function bounds(polys: Pt[][]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of polys) {
    for (const p of poly) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return { minX, minY, maxX, maxY };
}

function ccw(poly: Pt[]): Pt[] {
  return signedArea(poly) < 0 ? [...poly].reverse() : poly;
}

/** cross product of (b-a) × (p-a) */
function cross3(a: Pt, b: Pt, p: Pt): number {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

function segIntersect(a: Pt, b: Pt, p: Pt, q: Pt): Pt {
  const denom = (b.x - a.x) * (q.y - p.y) - (b.y - a.y) * (q.x - p.x);
  // parametric intersection of infinite lines a-b and p-q
  const t = ((p.x - a.x) * (q.y - p.y) - (p.y - a.y) * (q.x - p.x)) / denom;
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}

const CLIP_EPS = 1e-9;

/**
 * Area of intersection of two CONVEX polygons (Sutherland–Hodgman clipping).
 * Every tangram piece is convex, so this is exact enough for overlap tests.
 */
export function intersectionArea(subject: Pt[], clip: Pt[]): number {
  let output = ccw(subject);
  const clipPoly = ccw(clip);
  const n = clipPoly.length;
  for (let i = 0; i < n && output.length > 0; i++) {
    const a = clipPoly[i];
    const b = clipPoly[(i + 1) % n];
    const input = output;
    output = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j];
      const q = input[(j + 1) % input.length];
      const pIn = cross3(a, b, p) >= -CLIP_EPS;
      const qIn = cross3(a, b, q) >= -CLIP_EPS;
      if (pIn) output.push(p);
      if (pIn !== qIn) output.push(segIntersect(a, b, p, q));
    }
  }
  if (output.length < 3) return 0;
  return Math.abs(signedArea(output));
}

export function pointInPolygon(pt: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const intersect =
      a.y > pt.y !== b.y > pt.y &&
      pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * A tangram target: the authored solved arrangement. The silhouette IS the
 * union of these seven piece polygons; the outline is derived from them.
 */
export interface Target {
  solution: Placement[];
  polys: Pt[][];
  totalArea: number;
}

export function buildTarget(solution: Placement[]): Target {
  const polys = solution.map(transformPlacement);
  return { solution, polys, totalArea: polys.reduce((s, p) => s + area(p), 0) };
}

const SOLVE_EPS = 2e-3;

/**
 * The core placement checker. The given pieces solve the target when:
 *   1. their areas sum to the target area (they are the full tangram set),
 *   2. no two pieces overlap (pairwise intersection area ≈ 0), and
 *   3. every piece lies within the target region (its area is fully
 *      accounted for by intersections with the target's decomposition).
 * Together these force the pieces to tile the silhouette exactly — this
 * accepts ANY valid tiling, not only the authored one.
 */
export function isSolved(pieces: Pt[][], target: Target): boolean {
  const total = pieces.reduce((s, p) => s + area(p), 0);
  if (Math.abs(total - target.totalArea) > SOLVE_EPS) return false;

  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      if (intersectionArea(pieces[i], pieces[j]) > SOLVE_EPS) return false;
    }
  }

  for (const piece of pieces) {
    let inside = 0;
    for (const tp of target.polys) inside += intersectionArea(piece, tp);
    if (Math.abs(inside - area(piece)) > SOLVE_EPS) return false;
  }
  return true;
}

/** True when a placed piece exactly coincides with one target-decomposition
 *  cell (so the UI can "lock" it green). Matches by vertex set within eps. */
export function matchesSolutionCell(piece: Pt[], target: Target): boolean {
  for (const tp of target.polys) {
    if (piece.length !== tp.length) continue;
    if (Math.abs(area(piece) - area(tp)) > 1e-4) continue;
    if (sameVertexSet(piece, tp)) return true;
  }
  return false;
}

function sameVertexSet(a: Pt[], b: Pt[]): boolean {
  if (a.length !== b.length) return false;
  const used = new Array(b.length).fill(false);
  for (const p of a) {
    let found = -1;
    for (let k = 0; k < b.length; k++) {
      if (!used[k] && Math.abs(b[k].x - p.x) < 1e-4 && Math.abs(b[k].y - p.y) < 1e-4) {
        found = k;
        break;
      }
    }
    if (found === -1) return false;
    used[found] = true;
  }
  return true;
}

const vkey = (p: Pt) => `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)}`;

/**
 * Non-cancelled directed boundary edges of a set of polygons: an internal
 * edge appears once in each direction and cancels, leaving the silhouette.
 * Every edge is first split at any other vertex lying on it, so a long edge
 * on one piece cancels against the shorter edges of the pieces beside it
 * (otherwise collinear internal seams would survive).
 */
export function silhouetteEdges(polys: Pt[][]): { a: Pt; b: Pt }[] {
  // all distinct vertices, so edges can be split where pieces meet mid-edge
  const verts: Pt[] = [];
  const vseen = new Set<string>();
  for (const poly of polys)
    for (const p of poly) {
      const k = vkey(p);
      if (!vseen.has(k)) {
        vseen.add(k);
        verts.push(p);
      }
    }

  const edges = new Map<string, { a: Pt; b: Pt }>();
  const addSeg = (a: Pt, b: Pt) => {
    const rev = `${vkey(b)}|${vkey(a)}`;
    if (edges.has(rev)) edges.delete(rev);
    else edges.set(`${vkey(a)}|${vkey(b)}`, { a, b });
  };

  for (const poly of polys) {
    const cp = ccw(poly);
    for (let i = 0; i < cp.length; i++) {
      const a = cp[i];
      const b = cp[(i + 1) % cp.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      // params of vertices that lie strictly between a and b on this edge
      const ts: number[] = [];
      for (const v of verts) {
        const cross = dx * (v.y - a.y) - dy * (v.x - a.x);
        if (Math.abs(cross) > 1e-7) continue; // not collinear
        const t = ((v.x - a.x) * dx + (v.y - a.y) * dy) / len2;
        if (t > 1e-6 && t < 1 - 1e-6) ts.push(t);
      }
      ts.sort((p, q) => p - q);
      let prev = a;
      for (const t of ts) {
        const mid = { x: a.x + dx * t, y: a.y + dy * t };
        if (vkey(mid) === vkey(prev)) continue;
        addSeg(prev, mid);
        prev = mid;
      }
      addSeg(prev, b);
    }
  }
  return [...edges.values()];
}

/**
 * Outline of a set of polygons (the silhouette border), stitched into closed
 * loops. Every boundary edge is consumed exactly once, so the returned loops
 * collectively trace the whole outline even at points where the shape pinches.
 */
export function silhouetteLoops(polys: Pt[][]): Pt[][] {
  const edgeList = silhouetteEdges(polys);
  const byKey = new Map<string, { a: Pt; b: Pt }>();
  const adj = new Map<string, string[]>();
  for (const e of edgeList) {
    const k = `${vkey(e.a)}|${vkey(e.b)}`;
    byKey.set(k, e);
    const from = vkey(e.a);
    const list = adj.get(from);
    if (list) list.push(k);
    else adj.set(from, [k]);
  }
  const used = new Set<string>();
  const loops: Pt[][] = [];
  for (const startKey of byKey.keys()) {
    if (used.has(startKey)) continue;
    const loop: Pt[] = [];
    let curKey: string | undefined = startKey;
    let guard = 0;
    while (curKey !== undefined && !used.has(curKey) && guard++ < 100000) {
      const cur: string = curKey;
      used.add(cur);
      const e = byKey.get(cur);
      if (!e) break;
      loop.push(e.a);
      const outs: string[] = adj.get(vkey(e.b)) ?? [];
      curKey = outs.find((k: string) => !used.has(k));
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}
