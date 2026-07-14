/*
 * Tents & Trees — seeded puzzle generation (pure TS, deterministic per
 * seed). Tents-first: sample a non-touching tent layout, attach one tree
 * orthogonally to each tent (1:1 by construction), derive the row/column
 * clues, then keep only layouts the solver proves have a UNIQUE solution.
 */

import {
  countSolutions,
  kingNeighbors,
  maxMatching,
  orthNeighbors,
  type TentsPuzzle
} from './solver';

export type { TentsPuzzle } from './solver';

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

function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** density: ~1 tent per 5 cells — the classic Tents & Trees feel */
export function tentTarget(size: number): number {
  return Math.ceil((size * size) / 5);
}

/**
 * Sample `count` cells with no two touching (king moves). Two cells of the
 * same 2×2 block always touch, so every valid layout uses distinct blocks:
 * pick `count` random blocks, then backtrack a position inside each. This
 * stays fast even at maximum density (12×12 needs 29 of 36 blocks).
 */
function placeTents(size: number, count: number, rnd: () => number): number[] | null {
  const nb = Math.ceil(size / 2);
  const blocks: number[][] = [];
  for (let br = 0; br < nb; br++) {
    for (let bc = 0; bc < nb; bc++) {
      const cells: number[] = [];
      for (const r of [br * 2, br * 2 + 1]) {
        if (r >= size) continue;
        for (const c of [bc * 2, bc * 2 + 1]) {
          if (c >= size) continue;
          cells.push(r * size + c);
        }
      }
      blocks.push(cells);
    }
  }
  if (count > blocks.length) return null;
  const chosen = shuffled(blocks.map((_, i) => i), rnd)
    .slice(0, count)
    .sort((a, b) => a - b) // row-major order keeps adjacency checks local
    .map((i) => shuffled(blocks[i], rnd));

  const occupied = new Set<number>();
  const picked: number[] = [];
  let nodes = 0;
  const backtrack = (k: number): boolean => {
    if (k === chosen.length) return true;
    if (nodes++ > 3000) return false;
    for (const cell of chosen[k]) {
      if (kingNeighbors(cell, size).some((q) => occupied.has(q))) continue;
      occupied.add(cell);
      picked.push(cell);
      if (backtrack(k + 1)) return true;
      occupied.delete(cell);
      picked.pop();
    }
    return false;
  };
  return backtrack(0) ? picked : null;
}

/**
 * Attach one tree orthogonally to each tent on distinct free cells (trees
 * may touch anything). Bipartite matching guarantees the 1:1 pairing.
 */
function attachTrees(size: number, tents: number[], rnd: () => number): number[] | null {
  const tentSet = new Set(tents);
  const cands = tents.map((t) =>
    shuffled(orthNeighbors(t, size).filter((c) => !tentSet.has(c)), rnd)
  );
  const { size: matched, owner } = maxMatching(cands);
  if (matched !== tents.length) return null;
  const trees = new Array<number>(tents.length).fill(-1);
  owner.forEach((ti, cell) => {
    trees[ti] = cell;
  });
  return trees;
}

export interface TentsGenOptions {
  seed?: number;
  size: number;
}

/** Generate a Tents & Trees puzzle with a solver-verified unique solution. */
export function generateTents(opts: TentsGenOptions): TentsPuzzle {
  const { size } = opts;
  const seed = (opts.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const rnd = mulberry32(seed);
  const count = tentTarget(size);

  for (let attempt = 0; attempt < 600; attempt++) {
    const tents = placeTents(size, count, rnd);
    if (!tents) continue;
    const trees = attachTrees(size, tents, rnd);
    if (!trees) continue;
    const rowCounts = new Array(size).fill(0);
    const colCounts = new Array(size).fill(0);
    for (const t of tents) {
      rowCounts[(t / size) | 0]++;
      colCounts[t % size]++;
    }
    const puzzle: TentsPuzzle = {
      size,
      seed,
      trees: [...trees].sort((a, b) => a - b),
      solution: [...tents].sort((a, b) => a - b),
      rowCounts,
      colCounts
    };
    if (countSolutions(puzzle, 2) === 1) return puzzle;
  }
  throw new Error(`tents: could not build a unique ${size}×${size} puzzle (seed ${seed})`);
}
