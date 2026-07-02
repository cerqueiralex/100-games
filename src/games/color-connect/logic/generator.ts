import type { Difficulty } from '../../../platform/types';

export interface FlowLevel {
  size: number;
  /** one solution path (list of cell indices) per color */
  paths: number[][];
}

const CONFIG: Record<Difficulty, { size: number; minPaths: number; maxPaths: number }> = {
  easy: { size: 5, minPaths: 4, maxPaths: 5 },
  medium: { size: 6, minPaths: 5, maxPaths: 7 },
  hard: { size: 7, minPaths: 6, maxPaths: 9 }
};

const MIN_LEN = 3;

/**
 * Generates a guaranteed-solvable Flow level by partitioning the grid into
 * random snake paths that cover every cell (the partition IS the solution).
 */
export function generateFlowLevel(difficulty: Difficulty): FlowLevel {
  const { size, minPaths, maxPaths } = CONFIG[difficulty];
  for (let attempt = 0; attempt < 400; attempt++) {
    const level = tryGenerate(size);
    if (level && level.paths.length >= minPaths && level.paths.length <= maxPaths) {
      return level;
    }
  }
  // practically unreachable; keep types safe with a trivial fallback
  return fallbackLevel(size);
}

function tryGenerate(size: number): FlowLevel | null {
  const n = size * size;
  const owner = new Array<number>(n).fill(-1);
  const paths: number[][] = [];
  const neighbors = (i: number): number[] => {
    const r = Math.floor(i / size);
    const c = i % size;
    const out: number[] = [];
    if (r > 0) out.push(i - size);
    if (r < size - 1) out.push(i + size);
    if (c > 0) out.push(i - 1);
    if (c < size - 1) out.push(i + 1);
    return out;
  };

  let remaining = n;
  while (remaining > 0) {
    const free: number[] = [];
    for (let i = 0; i < n; i++) if (owner[i] === -1) free.push(i);
    const start = free[Math.floor(Math.random() * free.length)];
    const path = [start];
    owner[start] = paths.length;
    // random walk through unclaimed cells
    for (;;) {
      const last = path[path.length - 1];
      const options = neighbors(last).filter((j) => owner[j] === -1);
      if (options.length === 0) break;
      // bias towards continuing (longer snakes look better)
      if (path.length >= MIN_LEN && Math.random() < 0.25) break;
      const next = options[Math.floor(Math.random() * options.length)];
      owner[next] = paths.length;
      path.push(next);
    }
    if (path.length < MIN_LEN) return null; // stranded stub — retry whole level
    paths.push(path);
    remaining -= path.length;
    if (paths.length > 12) return null;
  }
  return { size, paths };
}

function fallbackLevel(size: number): FlowLevel {
  // boustrophedon rows split into equal snakes — always valid
  const cells: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cells.push(r * size + (r % 2 === 0 ? c : size - 1 - c));
    }
  }
  const per = Math.max(MIN_LEN, Math.floor(cells.length / 4));
  const paths: number[][] = [];
  for (let i = 0; i < cells.length; i += per) {
    const slice = cells.slice(i, i + per);
    if (slice.length < MIN_LEN) paths[paths.length - 1].push(...slice);
    else paths.push(slice);
  }
  return { size, paths };
}
