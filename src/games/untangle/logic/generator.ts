/*
 * Untangle (planarity puzzle) generator — pure TS, seeded (mulberry32),
 * deterministic per seed. Builds a GUARANTEED-PLANAR graph: scatter N points,
 * greedily triangulate them into a maximal crossing-free straight-line graph
 * (this IS a valid planar embedding, so a zero-crossing layout provably
 * exists), then prune down to the tier's edge target while protecting a
 * spanning tree so the graph stays connected. The recorded `solved` positions
 * are that planar embedding; the `start` positions are a random scramble that
 * (almost) always has crossings for the player to remove.
 *
 * Because a planar embedding exists (the solved positions), every generated
 * puzzle is solvable. `countCrossings` is both the live counter and the win
 * check (win at 0). Nothing here imports React so it can be validated headless.
 */

import type { Difficulty } from '../../../platform/types';

export interface Pt {
  x: number;
  y: number;
}

export interface GraphNode {
  /** the planar solution position (normalized 0..1) */
  solved: Pt;
  /** the scrambled starting position (normalized 0..1) */
  start: Pt;
}

export interface Edge {
  a: number;
  b: number;
}

export interface Graph {
  difficulty: Difficulty;
  seed: number;
  nodes: GraphNode[];
  edges: Edge[];
}

/** node / edge counts per tier — edges stay well under the planar cap 3n−6. */
export const CONFIG: Record<Difficulty, { nodes: number; edges: number }> = {
  easy: { nodes: 6, edges: 8 },
  medium: { nodes: 9, edges: 14 },
  hard: { nodes: 12, edges: 20 },
  pro: { nodes: 16, edges: 27 },
  extreme: { nodes: 22, edges: 38 }
};

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

/* ------------------------- geometry primitives ------------------------- */

const EPS = 1e-9;

/** signed area × 2 of triangle a,b,c (orientation sign). */
function orient(a: Pt, b: Pt, c: Pt): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** true when segments p1p2 and p3p4 cross in their interiors (proper). */
function segmentsCross(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d1 = orient(p3, p4, p1);
  const d2 = orient(p3, p4, p2);
  const d3 = orient(p1, p2, p3);
  const d4 = orient(p1, p2, p4);
  return (
    ((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) &&
    ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))
  );
}

/** squared distance from point p to segment ab. */
function distToSegSq(p: Pt, a: Pt, b: Pt): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const len2 = vx * vx + vy * vy;
  let t = len2 > 0 ? (wx * vx + wy * vy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const dx = a.x + t * vx - p.x;
  const dy = a.y + t * vy - p.y;
  return dx * dx + dy * dy;
}

/* ---------------------- crossing detection (public) ---------------------- */

function scan(pos: Pt[], edges: Edge[]): { count: number; set: Set<number> } {
  const set = new Set<number>();
  let count = 0;
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    for (let j = i + 1; j < edges.length; j++) {
      const f = edges[j];
      // ignore pairs that share an endpoint
      if (e.a === f.a || e.a === f.b || e.b === f.a || e.b === f.b) continue;
      if (segmentsCross(pos[e.a], pos[e.b], pos[f.a], pos[f.b])) {
        count++;
        set.add(i);
        set.add(j);
      }
    }
  }
  return { count, set };
}

/** number of crossing edge pairs (the win check and the live counter). */
export function countCrossings(pos: Pt[], edges: Edge[]): number {
  return scan(pos, edges).count;
}

/** indices of edges involved in at least one crossing (for red tinting). */
export function crossingEdges(pos: Pt[], edges: Edge[]): Set<number> {
  return scan(pos, edges).set;
}

/* --------------------------- point placement --------------------------- */

/** Rejection-sample n points keeping a minimum separation; relaxes the gap
 *  if the box gets crowded so it always terminates. Consumes rng in a fixed
 *  algorithmic order, so it stays deterministic for a given seed. */
function placeWithSep(rng: () => number, n: number, minSep: number, lo: number, hi: number): Pt[] {
  let sep = minSep;
  for (let outer = 0; outer < 200; outer++) {
    const pts: Pt[] = [];
    let ok = true;
    for (let i = 0; i < n; i++) {
      let placed: Pt | null = null;
      for (let t = 0; t < 40; t++) {
        const p = { x: lo + (hi - lo) * rng(), y: lo + (hi - lo) * rng() };
        if (pts.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= sep)) {
          placed = p;
          break;
        }
      }
      if (!placed) {
        ok = false;
        break;
      }
      pts.push(placed);
    }
    if (ok) return pts;
    sep *= 0.85;
  }
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) pts.push({ x: lo + (hi - lo) * rng(), y: lo + (hi - lo) * rng() });
  return pts;
}

/* ----------------------- planar graph construction ----------------------- */

const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** Greedy triangulation: add candidate edges shortest-first, skipping any
 *  that would pass through a node or properly cross an already-added edge.
 *  The result is a maximal crossing-free straight-line graph (a triangulation
 *  of the point set) — connected and planar by construction. */
function buildPlanar(pts: Pt[]): Edge[] {
  const n = pts.length;
  const nearEps2 = (0.9 / Math.sqrt(n)) * 0.18;
  const eps2 = nearEps2 * nearEps2;
  const cands: { a: number; b: number; d: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      cands.push({ a: i, b: j, d: dx * dx + dy * dy });
    }
  }
  cands.sort((p, q) => p.d - q.d);
  const edges: Edge[] = [];
  for (const c of cands) {
    let bad = false;
    for (let k = 0; k < n && !bad; k++) {
      if (k === c.a || k === c.b) continue;
      if (distToSegSq(pts[k], pts[c.a], pts[c.b]) < eps2) bad = true;
    }
    if (bad) continue;
    for (const e of edges) {
      if (e.a === c.a || e.a === c.b || e.b === c.a || e.b === c.b) continue;
      if (segmentsCross(pts[c.a], pts[c.b], pts[e.a], pts[e.b])) {
        bad = true;
        break;
      }
    }
    if (bad) continue;
    edges.push({ a: c.a, b: c.b });
  }
  return edges;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Prune a connected triangulation down to exactly `target` edges while
 *  keeping it connected: keep a random spanning tree, then add a random
 *  subset of the remaining edges. Requires tri.length >= target. */
function pruneTo(tri: Edge[], n: number, target: number, rng: () => number): Edge[] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  tri.forEach((e) => {
    adj[e.a].push(e.b);
    adj[e.b].push(e.a);
  });
  // random DFS spanning tree
  const seen = new Array<boolean>(n).fill(false);
  const treeKeys = new Set<string>();
  const stack = [0];
  seen[0] = true;
  while (stack.length) {
    const u = stack.pop()!;
    for (const v of shuffle(adj[u], rng)) {
      if (!seen[v]) {
        seen[v] = true;
        treeKeys.add(key(u, v));
        stack.push(v);
      }
    }
  }
  const treeEdges = tri.filter((e) => treeKeys.has(key(e.a, e.b)));
  const extra = shuffle(
    tri.filter((e) => !treeKeys.has(key(e.a, e.b))),
    rng
  );
  const need = Math.max(0, target - treeEdges.length);
  return [...treeEdges, ...extra.slice(0, need)];
}

/** Convex-circle fallback: n points on a circle, fan-triangulated — a
 *  guaranteed crossing-free graph with 2n−3 edges (>= every tier target). */
function circleFallback(n: number): { pts: Pt[]; tri: Edge[] } {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: 0.5 + 0.4 * Math.cos(ang), y: 0.5 + 0.4 * Math.sin(ang) });
  }
  const tri: Edge[] = [];
  for (let i = 0; i < n; i++) tri.push({ a: i, b: (i + 1) % n }); // polygon
  for (let i = 2; i < n - 1; i++) tri.push({ a: 0, b: i }); // fan diagonals
  return { pts, tri };
}

/** Random layout for the start: no separation guarantee removed, but retried
 *  until it actually has crossings so the puzzle never starts already solved. */
export function scramble(rng: () => number, n: number, edges: Edge[]): Pt[] {
  const sep = (0.9 / Math.sqrt(n)) * 0.42;
  for (let a = 0; a < 40; a++) {
    const pts = placeWithSep(rng, n, sep, 0.07, 0.93);
    if (edges.length === 0 || countCrossings(pts, edges) > 0) return pts;
  }
  return placeWithSep(rng, n, sep, 0.07, 0.93);
}

/* ------------------------------- public API ------------------------------- */

export function generateGraph(opts: { seed?: number; difficulty: Difficulty }): Graph {
  const { difficulty } = opts;
  const seed = (opts.seed ?? Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  const rng = mulberry32(seed);
  const { nodes: n, edges: target } = CONFIG[difficulty];

  let solved: Pt[] | null = null;
  let tri: Edge[] | null = null;
  const sep = (0.9 / Math.sqrt(n)) * 0.55;
  for (let attempt = 0; attempt < 80; attempt++) {
    const pts = placeWithSep(rng, n, sep, 0.1, 0.9);
    const t = buildPlanar(pts);
    if (t.length >= target) {
      solved = pts;
      tri = t;
      break;
    }
  }
  if (!solved || !tri) {
    const fb = circleFallback(n);
    solved = fb.pts;
    tri = fb.tri;
  }

  const edges = pruneTo(tri, n, target, rng);
  const start = scramble(rng, n, edges);
  const nodes: GraphNode[] = solved.map((s, i) => ({ solved: s, start: start[i] }));
  return { difficulty, seed, nodes, edges };
}

/* --------------------- force-directed relax (auto-spread) --------------------- */

/** A few Fruchterman–Reingold steps: node–node repulsion + edge springs,
 *  clamped in-bounds. Detangles clutter a little; not a full solver. Pure. */
export function relax(pos: Pt[], edges: Edge[], steps: number): Pt[] {
  const n = pos.length;
  const p = pos.map((q) => ({ ...q }));
  const k = Math.sqrt(1 / n) * 0.85; // ideal edge length
  const lo = 0.06;
  const hi = 0.94;
  for (let s = 0; s < steps; s++) {
    const disp: Pt[] = p.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = p[i].x - p[j].x;
        let dy = p[i].y - p[j].y;
        let dist = Math.hypot(dx, dy);
        if (dist < 1e-4) {
          dx = (Math.random() - 0.5) * 1e-3;
          dy = (Math.random() - 0.5) * 1e-3;
          dist = Math.hypot(dx, dy) || 1e-4;
        }
        const f = (k * k) / dist;
        const ux = (dx / dist) * f;
        const uy = (dy / dist) * f;
        disp[i].x += ux;
        disp[i].y += uy;
        disp[j].x -= ux;
        disp[j].y -= uy;
      }
    }
    for (const e of edges) {
      let dx = p[e.a].x - p[e.b].x;
      let dy = p[e.a].y - p[e.b].y;
      const dist = Math.hypot(dx, dy) || 1e-4;
      const f = (dist * dist) / k;
      const ux = (dx / dist) * f;
      const uy = (dy / dist) * f;
      disp[e.a].x -= ux;
      disp[e.a].y -= uy;
      disp[e.b].x += ux;
      disp[e.b].y += uy;
    }
    const maxStep = 0.05;
    for (let i = 0; i < n; i++) {
      const len = Math.hypot(disp[i].x, disp[i].y) || 1e-9;
      const m = Math.min(len, maxStep);
      p[i].x = Math.max(lo, Math.min(hi, p[i].x + (disp[i].x / len) * m));
      p[i].y = Math.max(lo, Math.min(hi, p[i].y + (disp[i].y / len) * m));
    }
  }
  return p;
}
