import type { Difficulty } from '../../../platform/types';

/*
 * Pipes (rotate to connect) — seeded board generation + network simulation.
 *
 * Each cell holds a pipe piece whose open connectors are a 4-bit mask
 * (N=1, E=2, S=4, W=8). A piece is drawn from its `solved` mask and turned
 * in-place by a rotation count `rot` (each tap = one 90° clockwise turn);
 * its effective connectors are `rot4(solved, rot)`.
 *
 * Boards are built by growing a random SPANNING TREE over the grid rooted at
 * the source (randomized Kruskal over shuffled grid edges) — every cell is
 * therefore part of one fully-connected, leak-free network, so the board is
 * ALWAYS solvable: rotating every tile back to its `solved` mask wins. Each
 * tile's initial rotation is then scrambled. `par` is the minimum number of
 * (clockwise) taps to bring every tile from its scramble back to `solved`.
 *
 * The extreme tier plays on a torus: edges wrap, so a connector on the border
 * links to the opposite edge. All simulation helpers take a `wrap` flag.
 */

/* ---------------- directions ---------------- */

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
/** the four single-direction bits, in clockwise order */
export const DIRS = [N, E, S, W] as const;

/** rotate a mask 90° clockwise (N→E→S→W→N) */
function rotCW(mask: number): number {
  return ((mask << 1) | (mask >> 3)) & 0xf;
}

/** rotate a mask by `k` clockwise quarter-turns (k may be any integer) */
export function rot4(mask: number, k: number): number {
  let m = mask & 0xf;
  const turns = ((k % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) m = rotCW(m);
  return m;
}

/** the opposite direction of a single-direction bit (N↔S, E↔W) */
export function oppDir(d: number): number {
  return ((d << 2) | (d >> 2)) & 0xf;
}

export function popcount(m: number): number {
  let c = 0;
  let x = m;
  while (x) {
    c += x & 1;
    x >>= 1;
  }
  return c;
}

export type PipeType = 'end' | 'straight' | 'elbow' | 'tee' | 'cross' | 'empty';

/** classify a piece by its connector mask (rotation-invariant) */
export function pieceType(mask: number): PipeType {
  const pc = popcount(mask);
  if (pc === 0) return 'empty';
  if (pc === 1) return 'end';
  if (pc === 2) return mask === (N | S) || mask === (E | W) ? 'straight' : 'elbow';
  if (pc === 3) return 'tee';
  return 'cross';
}

/**
 * Fewest clockwise taps to turn a tile from its scrambled rotation back to
 * `solved` — accounts for rotational symmetry (a straight needs at most 1, a
 * cross always 0). Taps only go clockwise, so an off-by-one CW scramble costs
 * three taps to come back around.
 */
export function minTaps(solved: number, startRot: number): number {
  const start = rot4(solved, startRot);
  for (let k = 0; k < 4; k++) if (rot4(start, k) === solved) return k;
  return 0; // unreachable: start is always a rotation of solved
}

/* ---------------- grid geometry ---------------- */

/** index of the neighbour in direction `d`, or -1 when off a non-wrap edge */
export function neighborIndex(i: number, d: number, size: number, wrap: boolean): number {
  const r = Math.floor(i / size);
  const c = i % size;
  if (d === N) {
    let nr = r - 1;
    if (nr < 0) {
      if (!wrap) return -1;
      nr = size - 1;
    }
    return nr * size + c;
  }
  if (d === S) {
    let nr = r + 1;
    if (nr >= size) {
      if (!wrap) return -1;
      nr = 0;
    }
    return nr * size + c;
  }
  if (d === E) {
    let nc = c + 1;
    if (nc >= size) {
      if (!wrap) return -1;
      nc = 0;
    }
    return r * size + nc;
  }
  // W
  let nc = c - 1;
  if (nc < 0) {
    if (!wrap) return -1;
    nc = size - 1;
  }
  return r * size + nc;
}

/**
 * Flood the network of matching connectors from the source. A cell is watered
 * when reachable from the source through a chain of mutually-matching
 * connectors. Returns a per-cell boolean array.
 */
export function floodWatered(
  masks: number[],
  size: number,
  wrap: boolean,
  source: number
): boolean[] {
  const n = size * size;
  const seen = new Array<boolean>(n).fill(false);
  const stack = [source];
  seen[source] = true;
  while (stack.length) {
    const c = stack.pop()!;
    for (const d of DIRS) {
      if (!(masks[c] & d)) continue;
      const nb = neighborIndex(c, d, size, wrap);
      if (nb < 0) continue;
      if (masks[nb] & oppDir(d) && !seen[nb]) {
        seen[nb] = true;
        stack.push(nb);
      }
    }
  }
  return seen;
}

/** true when any connector points off the grid or at a non-matching neighbour */
export function hasOpenEnd(masks: number[], size: number, wrap: boolean): boolean {
  const n = size * size;
  for (let c = 0; c < n; c++) {
    for (const d of DIRS) {
      if (!(masks[c] & d)) continue;
      const nb = neighborIndex(c, d, size, wrap);
      if (nb < 0) return true;
      if (!(masks[nb] & oppDir(d))) return true;
    }
  }
  return false;
}

/** the win condition: whole network connected to the source and leak-free */
export function isSolved(masks: number[], size: number, wrap: boolean, source: number): boolean {
  if (hasOpenEnd(masks, size, wrap)) return false;
  return floodWatered(masks, size, wrap, source).every(Boolean);
}

/** BFS tree-distance from the source over matching connectors (for the win flow wave) */
export function networkDistance(
  masks: number[],
  size: number,
  wrap: boolean,
  source: number
): number[] {
  const n = size * size;
  const dist = new Array<number>(n).fill(0);
  const seen = new Array<boolean>(n).fill(false);
  let frontier = [source];
  seen[source] = true;
  let d = 0;
  while (frontier.length) {
    const next: number[] = [];
    for (const c of frontier) {
      dist[c] = d;
      for (const dir of DIRS) {
        if (!(masks[c] & dir)) continue;
        const nb = neighborIndex(c, dir, size, wrap);
        if (nb < 0) continue;
        if (masks[nb] & oppDir(dir) && !seen[nb]) {
          seen[nb] = true;
          next.push(nb);
        }
      }
    }
    frontier = next;
    d++;
  }
  return dist;
}

/* ---------------- rng ---------------- */

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

/* ---------------- generation ---------------- */

export interface PipesConfig {
  size: number;
  wrap: boolean;
}

/** Difficulty tiers — the board grows and the extreme tier wraps (torus). */
export const PIPES_CONFIG: Record<Difficulty, PipesConfig> = {
  easy: { size: 5, wrap: false },
  medium: { size: 6, wrap: false },
  hard: { size: 7, wrap: false },
  pro: { size: 8, wrap: false },
  extreme: { size: 9, wrap: true }
};

export interface PipesPuzzle {
  size: number;
  wrap: boolean;
  seed: number;
  /** canonical (drawn) connector mask per cell — the winning orientation */
  solved: number[];
  /** initial rotation taps per cell (0..3), i.e. the scramble */
  startRot: number[];
  /** source cell index (glowing tank; always watered) */
  source: number;
  /** leaf cells other than the source (little drain outlets) */
  drains: number[];
  /** minimum clockwise taps from the scramble to the solved orientation */
  par: number;
}

interface Edge {
  a: number;
  b: number;
  /** direction from a to b */
  dir: number;
}

/** all grid edges (each once), including wrap edges on a torus */
function gridEdges(size: number, wrap: boolean): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < size * size; i++) {
    const r = Math.floor(i / size);
    const c = i % size;
    // east
    if (c < size - 1) edges.push({ a: i, b: i + 1, dir: E });
    else if (wrap) edges.push({ a: i, b: r * size, dir: E });
    // south
    if (r < size - 1) edges.push({ a: i, b: i + size, dir: S });
    else if (wrap) edges.push({ a: i, b: c, dir: S });
  }
  return edges;
}

/** randomized Kruskal → a random spanning tree; returns connector mask per cell */
function buildTree(size: number, wrap: boolean, rnd: () => number): number[] {
  const n = size * size;
  const edges = gridEdges(size, wrap);
  // Fisher–Yates shuffle
  for (let i = edges.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [edges[i], edges[j]] = [edges[j], edges[i]];
  }
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    while (parent[x] !== root) {
      const nx = parent[x];
      parent[x] = root;
      x = nx;
    }
    return root;
  };
  const masks = new Array<number>(n).fill(0);
  let added = 0;
  for (const e of edges) {
    if (added === n - 1) break;
    const ra = find(e.a);
    const rb = find(e.b);
    if (ra === rb) continue;
    parent[ra] = rb;
    masks[e.a] |= e.dir;
    masks[e.b] |= oppDir(e.dir);
    added++;
  }
  return masks;
}

/** source = the highest-degree cell, closest to the centre on ties (water fans out) */
function pickSource(masks: number[], size: number): number {
  const centre = (size - 1) / 2;
  let best = 0;
  let bestDeg = -1;
  let bestDist = Infinity;
  for (let i = 0; i < masks.length; i++) {
    const deg = popcount(masks[i]);
    const r = Math.floor(i / size);
    const c = i % size;
    const dist = Math.abs(r - centre) + Math.abs(c - centre);
    if (deg > bestDeg || (deg === bestDeg && dist < bestDist)) {
      best = i;
      bestDeg = deg;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Generate a solvable Pipes board for a difficulty. Deterministic per seed.
 * Retries (with derived seeds) until the scramble is non-trivial — par must
 * clear a floor so the board never starts near-solved.
 */
export function generatePipes(opts: { seed?: number; difficulty: Difficulty }): PipesPuzzle {
  const cfg = PIPES_CONFIG[opts.difficulty];
  const { size, wrap } = cfg;
  const n = size * size;
  const s = (opts.seed ?? Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  const parFloor = Math.ceil(n * 0.55);

  let last: PipesPuzzle | null = null;
  for (let attempt = 0; attempt < 200; attempt++) {
    const rnd = mulberry32(((s ^ Math.imul(attempt + 1, 0x9e3779b9)) >>> 0) || 1);
    const solved = buildTree(size, wrap, rnd);
    const source = pickSource(solved, size);
    const drains: number[] = [];
    for (let i = 0; i < n; i++) if (popcount(solved[i]) === 1 && i !== source) drains.push(i);

    const startRot = new Array<number>(n);
    let par = 0;
    for (let i = 0; i < n; i++) {
      startRot[i] = Math.floor(rnd() * 4);
      par += minTaps(solved[i], startRot[i]);
    }

    last = { size, wrap, seed: s, solved, startRot, source, drains, par };
    if (par >= parFloor) return last;
  }
  return last!;
}
