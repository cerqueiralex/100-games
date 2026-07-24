import type { Difficulty } from '../../../platform/types';

export interface FlowLevel {
  size: number;
  /** one solution path (list of cell indices) per color */
  paths: number[][];
}

// every tier grows BOTH the grid and the palette: one extra color per step
// up, so harder boards read as busier, not just bigger (the board paints at
// most 9 distinct pipe colors — extreme stays within that)
export const FLOW_CONFIG: Record<Difficulty, { size: number; colors: number }> = {
  easy: { size: 5, colors: 4 },
  medium: { size: 6, colors: 5 },
  hard: { size: 7, colors: 6 },
  pro: { size: 8, colors: 7 },
  extreme: { size: 9, colors: 8 }
};

const MIN_LEN = 3;

/**
 * Generates a guaranteed-solvable Flow level with an EXACT color count:
 * a random Hamiltonian path over the grid (backbite walk) is cut into
 * `colors` segments — the partition covers every cell and IS the solution,
 * so generation can never miss its target or fall back to fewer colors.
 */
export function generateFlowLevel(difficulty: Difficulty): FlowLevel {
  const { size, colors } = FLOW_CONFIG[difficulty];
  const ham = randomHamiltonianPath(size);
  const paths = splitPath(ham, colors);
  // shuffle so segment order along the snake doesn't map to color order
  for (let i = paths.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [paths[i], paths[j]] = [paths[j], paths[i]];
  }
  return { size, paths };
}

/** random Hamiltonian path via the backbite algorithm (always succeeds) */
function randomHamiltonianPath(size: number): number[] {
  const n = size * size;
  // seed with a boustrophedon sweep, then randomize
  let path: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      path.push(r * size + (r % 2 === 0 ? c : size - 1 - c));
    }
  }
  const pos = new Array<number>(n);
  const reindex = () => path.forEach((cell, i) => (pos[cell] = i));
  reindex();

  const iterations = 12 * n;
  for (let it = 0; it < iterations; it++) {
    if (Math.random() < 0.5) {
      path.reverse();
      reindex();
    }
    const tail = path[n - 1];
    const r = Math.floor(tail / size);
    const c = tail % size;
    const nbs: number[] = [];
    if (r > 0) nbs.push(tail - size);
    if (r < size - 1) nbs.push(tail + size);
    if (c > 0) nbs.push(tail - 1);
    if (c < size - 1) nbs.push(tail + 1);
    const candidates = nbs.filter((u) => u !== path[n - 2]);
    if (candidates.length === 0) continue;
    const u = candidates[Math.floor(Math.random() * candidates.length)];
    const j = pos[u];
    // reverse the suffix after u: the path stays Hamiltonian
    path = path.slice(0, j + 1).concat(path.slice(j + 1).reverse());
    reindex();
  }
  return path;
}

/** cut the path into exactly k contiguous segments, each at least MIN_LEN */
function splitPath(path: number[], k: number): number[][] {
  const n = path.length;
  const lengths = new Array<number>(k).fill(MIN_LEN);
  let extra = n - MIN_LEN * k;
  while (extra > 0) {
    lengths[Math.floor(Math.random() * k)]++;
    extra--;
  }
  const out: number[][] = [];
  let at = 0;
  for (const len of lengths) {
    out.push(path.slice(at, at + len));
    at += len;
  }
  return out;
}
