/*
 * Bridges (Hashi) generator — grows a random connected island layout
 * (crossing-free by construction), upgrades some links to double bridges,
 * derives island numbers, then keeps only layouts the solver proves have a
 * UNIQUE solution. Seeded (mulberry32) and deterministic per seed. Pure TS.
 */

import type { Difficulty } from '../../../platform/types';
import { countHashiSolutions } from './solver';

export interface HashiIsland {
  r: number;
  c: number;
  /** required bridge count (1..8) */
  n: number;
}

export interface HashiLink {
  a: number;
  b: number;
}

export interface HashiPuzzle {
  w: number;
  h: number;
  islands: HashiIsland[];
  /** every playable pair: aligned, clear line of sight, ≥ 1 gap cell */
  links: HashiLink[];
  /** bridges per candidate link in the unique solution (0 | 1 | 2) */
  solution: number[];
  /** per link: indices of links it would cross (share an interior cell) */
  crossings: number[][];
  seed: number;
}

export const HASHI_CONFIG: Record<Difficulty, { w: number; h: number; islands: number }> = {
  easy: { w: 7, h: 7, islands: 8 },
  medium: { w: 9, h: 9, islands: 12 },
  hard: { w: 10, h: 10, islands: 16 },
  pro: { w: 11, h: 11, islands: 20 },
  extreme: { w: 13, h: 13, islands: 26 }
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

const DIRS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 }
];

export interface HashiGenOptions {
  seed?: number;
  w: number;
  h: number;
  islands: number;
}

export function generateHashi(opts: HashiGenOptions): HashiPuzzle {
  const baseSeed = (opts.seed ?? Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  for (let attempt = 0; attempt < 1200; attempt++) {
    const rnd = mulberry32((baseSeed + attempt * 0x9e3779b1) >>> 0);
    const puzzle = tryGenerate(opts.w, opts.h, opts.islands, rnd, baseSeed);
    if (puzzle) return puzzle;
  }
  // statistically unreachable (measured acceptance is a few attempts)
  throw new Error(`hashi: no unique ${opts.w}x${opts.h}/${opts.islands} puzzle for seed ${baseSeed}`);
}

function tryGenerate(
  w: number,
  h: number,
  target: number,
  rnd: () => number,
  seed: number
): HashiPuzzle | null {
  const layout = growLayout(w, h, target, rnd);
  if (!layout) return null;

  // randomly upgrade solution links to double bridges (max degree stays ≤ 8
  // automatically: ≤ 4 links per island × ≤ 2 bridges each)
  const counts = layout.links.map(() => (rnd() < 0.4 ? 2 : 1));
  const deg = new Array<number>(layout.pos.length).fill(0);
  layout.links.forEach((l, i) => {
    deg[l.a] += counts[i];
    deg[l.b] += counts[i];
  });
  const islands: HashiIsland[] = layout.pos.map((p, i) => ({ r: p.r, c: p.c, n: deg[i] }));

  const { links, crossings } = deriveCandidates(w, h, islands);
  const key = (a: number, b: number) => (a < b ? a * 4096 + b : b * 4096 + a);
  const solMap = new Map<number, number>();
  layout.links.forEach((l, i) => solMap.set(key(l.a, l.b), counts[i]));
  const solution = links.map((l) => solMap.get(key(l.a, l.b)) ?? 0);

  const res = countHashiSolutions({ degrees: islands.map((i) => i.n), links, crossings }, 2);
  if (res.count !== 1) return null;
  if (!res.solution || res.solution.some((v, i) => v !== solution[i])) return null; // paranoia
  return { w, h, islands, links, solution, crossings, seed };
}

interface Layout {
  pos: { r: number; c: number }[];
  links: HashiLink[];
}

/**
 * Grow a connected, crossing-free layout: start with one island, repeatedly
 * step 2+ cells from an existing island in a free direction and link the new
 * island back. A final pass links some already-aligned pairs into the
 * solution too (cycles make numbers denser and solutions tighter).
 */
function growLayout(w: number, h: number, target: number, rnd: () => number): Layout | null {
  const idx = (r: number, c: number) => r * w + c;
  const islandAt = new Int16Array(w * h).fill(-1);
  const bridged = new Uint8Array(w * h); // interior cells of solution bridges
  const pos: { r: number; c: number }[] = [];
  const links: HashiLink[] = [];

  const adjacentIsland = (r: number, c: number): boolean => {
    for (const d of DIRS) {
      const rr = r + d.dr;
      const cc = c + d.dc;
      if (rr >= 0 && rr < h && cc >= 0 && cc < w && islandAt[idx(rr, cc)] !== -1) return true;
    }
    return false;
  };

  const r0 = 1 + Math.floor(rnd() * (h - 2));
  const c0 = 1 + Math.floor(rnd() * (w - 2));
  pos.push({ r: r0, c: c0 });
  islandAt[idx(r0, c0)] = 0;

  let fails = 0;
  while (pos.length < target && fails < 500) {
    const i = Math.floor(rnd() * pos.length);
    const { r, c } = pos[i];
    const d = DIRS[Math.floor(rnd() * 4)];
    const room = d.dr < 0 ? r : d.dr > 0 ? h - 1 - r : d.dc < 0 ? c : w - 1 - c;
    if (room < 2) {
      fails++;
      continue;
    }
    const len = pickLen(rnd, room);
    const nr = r + d.dr * len;
    const nc = c + d.dc * len;
    if (islandAt[idx(nr, nc)] !== -1 || bridged[idx(nr, nc)] || adjacentIsland(nr, nc)) {
      fails++;
      continue;
    }
    let clear = true;
    for (let k = 1; k < len; k++) {
      const cell = idx(r + d.dr * k, c + d.dc * k);
      if (islandAt[cell] !== -1 || bridged[cell]) {
        clear = false;
        break;
      }
    }
    if (!clear) {
      fails++;
      continue;
    }
    const j = pos.length;
    pos.push({ r: nr, c: nc });
    islandAt[idx(nr, nc)] = j;
    for (let k = 1; k < len; k++) bridged[idx(r + d.dr * k, c + d.dc * k)] = 1;
    links.push({ a: i, b: j }); // i < j always (j is new)
    fails = 0;
  }
  if (pos.length !== target) return null;

  // cycle pass: bridge some accidentally-aligned pairs (no crossings: their
  // interiors must be free of existing solution-bridge cells)
  const linked = new Set(links.map((l) => l.a * 4096 + l.b));
  for (let i = 0; i < pos.length; i++) {
    for (const d of [DIRS[1], DIRS[3]]) {
      // south + east only: each pair visited once
      let rr = pos[i].r + d.dr;
      let cc = pos[i].c + d.dc;
      const cells: number[] = [];
      while (rr >= 0 && rr < h && cc >= 0 && cc < w) {
        const j = islandAt[idx(rr, cc)];
        if (j !== -1) {
          if (
            cells.length >= 1 &&
            cells.every((cell) => !bridged[cell]) &&
            !linked.has(Math.min(i, j) * 4096 + Math.max(i, j)) &&
            rnd() < 0.35
          ) {
            links.push({ a: Math.min(i, j), b: Math.max(i, j) });
            linked.add(Math.min(i, j) * 4096 + Math.max(i, j));
            cells.forEach((cell) => (bridged[cell] = 1));
          }
          break;
        }
        cells.push(idx(rr, cc));
        rr += d.dr;
        cc += d.dc;
      }
    }
  }
  return { pos, links };
}

/** short spans dominate so boards stay dense and readable */
function pickLen(rnd: () => number, room: number): number {
  let total = 0;
  const weights: number[] = [];
  for (let len = 2; len <= room; len++) {
    const wgt = Math.pow(0.55, len - 2);
    weights.push(wgt);
    total += wgt;
  }
  let roll = rnd() * total;
  for (let k = 0; k < weights.length; k++) {
    roll -= weights[k];
    if (roll <= 0) return k + 2;
  }
  return room;
}

/**
 * Derive every playable pair from the island layout: walk east/south from
 * each island to the first island in sight (interiors are island-free by
 * construction of the walk). Also computes which links cross which.
 */
export function deriveCandidates(
  w: number,
  h: number,
  islands: { r: number; c: number }[]
): { links: HashiLink[]; crossings: number[][] } {
  const idx = (r: number, c: number) => r * w + c;
  const islandAt = new Int16Array(w * h).fill(-1);
  islands.forEach((p, i) => (islandAt[idx(p.r, p.c)] = i));

  const links: HashiLink[] = [];
  const cellLinks = new Map<number, number[]>();
  for (let i = 0; i < islands.length; i++) {
    for (const d of [DIRS[1], DIRS[3]]) {
      // south + east: each pair found exactly once
      let rr = islands[i].r + d.dr;
      let cc = islands[i].c + d.dc;
      const cells: number[] = [];
      while (rr >= 0 && rr < h && cc >= 0 && cc < w) {
        const j = islandAt[idx(rr, cc)];
        if (j !== -1) {
          if (cells.length >= 1) {
            const e = links.length;
            links.push({ a: Math.min(i, j), b: Math.max(i, j) });
            for (const cell of cells) {
              const list = cellLinks.get(cell);
              if (list) list.push(e);
              else cellLinks.set(cell, [e]);
            }
          }
          break;
        }
        cells.push(idx(rr, cc));
        rr += d.dr;
        cc += d.dc;
      }
    }
  }

  const crossings: number[][] = links.map(() => []);
  for (const list of cellLinks.values()) {
    // a cell holds at most one horizontal + one vertical corridor
    if (list.length === 2) {
      crossings[list[0]].push(list[1]);
      crossings[list[1]].push(list[0]);
    }
  }
  // a perpendicular pair shares exactly one cell, but dedupe defensively
  return { links, crossings: crossings.map((c) => [...new Set(c)].sort((x, y) => x - y)) };
}

/** Integrity check used by scripts/validate.ts and the test harness. */
export function verifyHashi(p: HashiPuzzle): string[] {
  const errs: string[] = [];
  const { w, h, islands, links, solution, crossings } = p;
  const cellOf = new Map<number, number>();

  islands.forEach((isl, i) => {
    if (isl.r < 0 || isl.r >= h || isl.c < 0 || isl.c >= w) errs.push(`island ${i} out of bounds`);
    if (isl.n < 1 || isl.n > 8) errs.push(`island ${i} bad number ${isl.n}`);
    const cell = isl.r * w + isl.c;
    if (cellOf.has(cell)) errs.push(`island ${i} overlaps island ${cellOf.get(cell)}`);
    cellOf.set(cell, i);
  });
  islands.forEach((isl, i) => {
    for (const d of DIRS) {
      const rr = isl.r + d.dr;
      const cc = isl.c + d.dc;
      if (rr < 0 || rr >= h || cc < 0 || cc >= w) continue;
      const j = cellOf.get(rr * w + cc);
      if (j !== undefined && j > i) errs.push(`islands ${i} and ${j} are adjacent`);
    }
  });

  // candidate links + crossings must match a fresh derivation exactly
  const derived = deriveCandidates(w, h, islands);
  if (
    derived.links.length !== links.length ||
    derived.links.some((l, e) => l.a !== links[e].a || l.b !== links[e].b)
  ) {
    errs.push('candidate links mismatch derivation');
  } else if (
    derived.crossings.some(
      (c, e) => c.length !== crossings[e].length || c.some((v, k) => v !== crossings[e][k])
    )
  ) {
    errs.push('crossings mismatch derivation');
  }

  // solution: value range, exact island sums, no crossings, connected
  if (solution.length !== links.length) errs.push('solution length mismatch');
  solution.forEach((v, e) => {
    if (v < 0 || v > 2) errs.push(`link ${e} solution count ${v}`);
  });
  const sum = new Array<number>(islands.length).fill(0);
  links.forEach((l, e) => {
    sum[l.a] += solution[e];
    sum[l.b] += solution[e];
  });
  islands.forEach((isl, i) => {
    if (sum[i] !== isl.n) errs.push(`island ${i} sums to ${sum[i]}, wants ${isl.n}`);
  });
  links.forEach((_, e) => {
    if (solution[e] > 0 && crossings[e].some((f) => solution[f] > 0 && f > e)) {
      errs.push(`solution bridges cross at link ${e}`);
    }
  });
  const seen = new Uint8Array(islands.length);
  const stack = [0];
  seen[0] = 1;
  let cnt = islands.length > 0 ? 1 : 0;
  while (stack.length) {
    const i = stack.pop()!;
    links.forEach((l, e) => {
      if (solution[e] < 1 || (l.a !== i && l.b !== i)) return;
      const j = l.a === i ? l.b : l.a;
      if (!seen[j]) {
        seen[j] = 1;
        cnt++;
        stack.push(j);
      }
    });
  }
  if (cnt !== islands.length) errs.push('solution network not connected');

  // uniqueness (the load-bearing invariant)
  const res = countHashiSolutions({ degrees: islands.map((i) => i.n), links, crossings }, 2);
  if (res.count !== 1) errs.push(`solver found ${res.count} solutions`);
  else if (!res.solution || res.solution.some((v, e) => v !== solution[e])) {
    errs.push('solver solution differs from stored solution');
  }
  return errs;
}
