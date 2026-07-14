import type { Difficulty } from '../../../platform/types';

/*
 * Aquarium puzzle generator — pure TS, no React.
 *
 * The board is partitioned into connected TANKS. The solution assigns each
 * tank a water LEVEL: a row threshold — every cell of the tank in a row at
 * or below the level is water, everything above is air (water obeys gravity
 * and levels out per tank). Clues are total water cells per row and column.
 *
 * A puzzle is only emitted when its clue set has a UNIQUE physics-consistent
 * solution, proven by enumerating per-tank levels with count-to-2
 * backtracking + row/column count pruning.
 */

export interface AquariumPuzzle {
  size: number;
  /** cell index -> tank id (0..tankCount-1); partition is exact */
  tankOf: number[];
  tankCount: number;
  /** solution level per tank: cell (r,c) is water iff r >= levels[tank] */
  levels: number[];
  /** derived solution water mask */
  water: boolean[];
  rowCounts: number[];
  colCounts: number[];
}

export interface AquariumOptions {
  seed?: number;
  size: number;
  /** tank size range for the seeded random growth (defaults per size) */
  minTank?: number;
  maxTank?: number;
}

/** Per-difficulty board configuration (also used by scripts/validate.ts). */
export const AQU_CONFIG: Record<Difficulty, { size: number; minTank: number; maxTank: number }> = {
  easy: { size: 6, minTank: 4, maxTank: 8 },
  medium: { size: 7, minTank: 4, maxTank: 8 },
  hard: { size: 8, minTank: 3, maxTank: 7 },
  pro: { size: 9, minTank: 3, maxTank: 7 },
  extreme: { size: 10, minTank: 3, maxTank: 6 }
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

function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function neighborsOf(i: number, size: number): number[] {
  const r = Math.floor(i / size);
  const c = i % size;
  const out: number[] = [];
  if (r > 0) out.push(i - size);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  if (c < size - 1) out.push(i + 1);
  return out;
}

/** Row span of each tank. A connected tank touches every row in its span. */
export function tankRowSpans(
  size: number,
  tankOf: number[],
  tankCount: number
): { rMin: number[]; rMax: number[] } {
  const rMin = new Array<number>(tankCount).fill(size);
  const rMax = new Array<number>(tankCount).fill(-1);
  for (let i = 0; i < tankOf.length; i++) {
    const r = Math.floor(i / size);
    const t = tankOf[i];
    if (r < rMin[t]) rMin[t] = r;
    if (r > rMax[t]) rMax[t] = r;
  }
  return { rMin, rMax };
}

/** Water mask for a level assignment: cell is water iff its row >= level. */
export function waterMask(size: number, tankOf: number[], levels: number[]): boolean[] {
  return tankOf.map((t, i) => Math.floor(i / size) >= levels[t]);
}

/**
 * Partition the grid into connected tanks by seeded random growth, then
 * merge any undersized leftovers into their smallest neighbour tank
 * (adjacent connected regions stay connected when merged).
 */
function buildPartition(
  size: number,
  minTank: number,
  maxTank: number,
  rnd: () => number
): { tankOf: number[]; tankCount: number } {
  const n = size * size;
  const tankOf = new Array<number>(n).fill(-1);
  const order = shuffled(Array.from({ length: n }, (_, i) => i), rnd);
  let tid = 0;

  for (const start of order) {
    if (tankOf[start] !== -1) continue;
    const target = minTank + Math.floor(rnd() * (maxTank - minTank + 1));
    tankOf[start] = tid;
    let count = 1;
    const frontier = neighborsOf(start, size).filter((j) => tankOf[j] === -1);
    while (count < target && frontier.length > 0) {
      const f = frontier.splice(Math.floor(rnd() * frontier.length), 1)[0];
      if (tankOf[f] !== -1) continue;
      tankOf[f] = tid;
      count++;
      for (const j of neighborsOf(f, size)) if (tankOf[j] === -1) frontier.push(j);
    }
    tid++;
  }

  // merge undersized tanks into their smallest adjacent tank
  const sizes = new Map<number, number>();
  for (const t of tankOf) sizes.set(t, (sizes.get(t) ?? 0) + 1);
  for (;;) {
    let small = -1;
    for (const [t, s] of sizes) {
      if (s < minTank) {
        small = t;
        break;
      }
    }
    if (small === -1 || sizes.size === 1) break;
    let best = -1;
    for (let i = 0; i < n; i++) {
      if (tankOf[i] !== small) continue;
      for (const j of neighborsOf(i, size)) {
        const other = tankOf[j];
        if (other !== small && (best === -1 || sizes.get(other)! < sizes.get(best)!)) best = other;
      }
    }
    for (let i = 0; i < n; i++) if (tankOf[i] === small) tankOf[i] = best;
    sizes.set(best, sizes.get(best)! + sizes.get(small)!);
    sizes.delete(small);
  }

  // renumber compactly in first-appearance order
  const remap = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    if (!remap.has(tankOf[i])) remap.set(tankOf[i], remap.size);
    tankOf[i] = remap.get(tankOf[i])!;
  }
  return { tankOf, tankCount: remap.size };
}

/**
 * Count physics-consistent solutions (per-tank level assignments) matching
 * the row/column counts, stopping at `limit`. Prunes on partial counts and
 * on remaining per-line water potential.
 */
export function countSolutions(
  size: number,
  tankOf: number[],
  tankCount: number,
  rowCounts: number[],
  colCounts: number[],
  limit = 2
): number {
  const n = size * size;
  const { rMin, rMax } = tankRowSpans(size, tankOf, tankCount);

  // per tank: cells grouped by row, and per-row / per-col cell counts
  const rowCells: number[][] = Array.from({ length: tankCount }, () => new Array<number>(size).fill(0));
  const cellsAt: number[][][] = Array.from({ length: tankCount }, () =>
    Array.from({ length: size }, () => [] as number[])
  );
  for (let i = 0; i < n; i++) {
    const t = tankOf[i];
    const r = Math.floor(i / size);
    rowCells[t][r]++;
    cellsAt[t][r].push(i % size);
  }

  // enumerate options per tank: level L adds all tank cells with row >= L.
  // Built bottom-up so each option extends the previous one.
  interface Opt {
    rows: number[];
    cols: number[];
  }
  const opts: Opt[][] = [];
  for (let t = 0; t < tankCount; t++) {
    const list: Opt[] = [];
    const rows = new Array<number>(size).fill(0);
    const cols = new Array<number>(size).fill(0);
    list.push({ rows: [...rows], cols: [...cols] }); // empty (level = rMax+1)
    for (let L = rMax[t]; L >= rMin[t]; L--) {
      rows[L] += rowCells[t][L];
      for (const c of cellsAt[t][L]) cols[c]++;
      list.push({ rows: [...rows], cols: [...cols] });
    }
    opts.push(list);
  }

  // order tanks top-down so row pruning bites early
  const ord = Array.from({ length: tankCount }, (_, t) => t).sort(
    (a, b) => rMin[a] - rMin[b] || rMax[a] - rMax[b]
  );

  // suffix potentials: max water tanks ord[k..] can still put in each line
  const potRow: number[][] = Array.from({ length: tankCount + 1 }, () => new Array<number>(size).fill(0));
  const potCol: number[][] = Array.from({ length: tankCount + 1 }, () => new Array<number>(size).fill(0));
  for (let k = tankCount - 1; k >= 0; k--) {
    const t = ord[k];
    const full = opts[t][opts[t].length - 1];
    for (let x = 0; x < size; x++) {
      potRow[k][x] = potRow[k + 1][x] + full.rows[x];
      potCol[k][x] = potCol[k + 1][x] + full.cols[x];
    }
  }

  const rowFill = new Array<number>(size).fill(0);
  const colFill = new Array<number>(size).fill(0);
  let count = 0;

  const dfs = (k: number): void => {
    if (count >= limit) return;
    if (k === tankCount) {
      count++;
      return;
    }
    const t = ord[k];
    for (const opt of opts[t]) {
      let feasible = true;
      for (let x = 0; x < size; x++) {
        rowFill[x] += opt.rows[x];
        colFill[x] += opt.cols[x];
      }
      for (let x = 0; x < size && feasible; x++) {
        if (rowFill[x] > rowCounts[x] || rowFill[x] + potRow[k + 1][x] < rowCounts[x]) feasible = false;
        else if (colFill[x] > colCounts[x] || colFill[x] + potCol[k + 1][x] < colCounts[x]) feasible = false;
      }
      if (feasible) dfs(k + 1);
      for (let x = 0; x < size; x++) {
        rowFill[x] -= opt.rows[x];
        colFill[x] -= opt.cols[x];
      }
      if (count >= limit) return;
    }
  };
  dfs(0);
  return count;
}

/** Generate a puzzle with a provably unique solution. Deterministic per seed. */
export function generateAquarium(options: AquariumOptions): AquariumPuzzle {
  const size = options.size;
  const minTank = options.minTank ?? (size <= 7 ? 4 : 3);
  const maxTank = options.maxTank ?? (size >= 10 ? 6 : size >= 8 ? 7 : 8);
  const rnd = mulberry32(options.seed ?? Math.floor(Math.random() * 4294967296));
  const n = size * size;

  for (let attempt = 0; attempt < 300; attempt++) {
    const { tankOf, tankCount } = buildPartition(size, minTank, maxTank, rnd);
    const { rMin, rMax } = tankRowSpans(size, tankOf, tankCount);
    for (let reroll = 0; reroll < 6; reroll++) {
      const levels: number[] = [];
      for (let t = 0; t < tankCount; t++) {
        levels.push(rMin[t] + Math.floor(rnd() * (rMax[t] - rMin[t] + 2)));
      }
      const water = waterMask(size, tankOf, levels);
      let total = 0;
      for (const w of water) if (w) total++;
      // avoid trivially empty/flooded boards
      if (total < Math.round(n * 0.2) || total > Math.round(n * 0.8)) continue;
      const rowCounts = new Array<number>(size).fill(0);
      const colCounts = new Array<number>(size).fill(0);
      for (let i = 0; i < n; i++) {
        if (!water[i]) continue;
        rowCounts[Math.floor(i / size)]++;
        colCounts[i % size]++;
      }
      if (countSolutions(size, tankOf, tankCount, rowCounts, colCounts, 2) === 1) {
        return { size, tankOf, tankCount, levels, water, rowCounts, colCounts };
      }
    }
  }
  throw new Error('aquarium: failed to generate a unique puzzle');
}

/** Integrity check used by npm run validate. Returns a list of problems. */
export function verifyAquarium(p: AquariumPuzzle): string[] {
  const errors: string[] = [];
  const n = p.size * p.size;

  if (p.tankOf.length !== n) errors.push(`tankOf has ${p.tankOf.length} cells, expected ${n}`);
  if (p.water.length !== n) errors.push(`water mask has ${p.water.length} cells, expected ${n}`);
  if (p.levels.length !== p.tankCount) errors.push('levels length != tankCount');
  if (p.rowCounts.length !== p.size || p.colCounts.length !== p.size) errors.push('clue arrays sized wrong');
  if (errors.length > 0) return errors;

  // partition exact: valid ids, every tank non-empty and connected
  const cellsOf: number[][] = Array.from({ length: p.tankCount }, () => []);
  for (let i = 0; i < n; i++) {
    const t = p.tankOf[i];
    if (t < 0 || t >= p.tankCount) {
      errors.push(`cell ${i} has invalid tank id ${t}`);
      return errors;
    }
    cellsOf[t].push(i);
  }
  for (let t = 0; t < p.tankCount; t++) {
    if (cellsOf[t].length === 0) {
      errors.push(`tank ${t} is empty`);
      continue;
    }
    const seen = new Set<number>([cellsOf[t][0]]);
    const queue = [cellsOf[t][0]];
    while (queue.length) {
      const cur = queue.pop()!;
      for (const j of neighborsOf(cur, p.size)) {
        if (p.tankOf[j] === t && !seen.has(j)) {
          seen.add(j);
          queue.push(j);
        }
      }
    }
    if (seen.size !== cellsOf[t].length) errors.push(`tank ${t} is not connected`);
  }

  // physics-consistent levels and matching water mask
  const { rMin, rMax } = tankRowSpans(p.size, p.tankOf, p.tankCount);
  for (let t = 0; t < p.tankCount; t++) {
    if (p.levels[t] < rMin[t] || p.levels[t] > rMax[t] + 1) {
      errors.push(`tank ${t} level ${p.levels[t]} outside [${rMin[t]}, ${rMax[t] + 1}]`);
    }
  }
  const mask = waterMask(p.size, p.tankOf, p.levels);
  for (let i = 0; i < n; i++) {
    if (mask[i] !== p.water[i]) {
      errors.push(`water mask inconsistent with levels at cell ${i}`);
      break;
    }
  }

  // clue counts consistent with the solution
  const rowCounts = new Array<number>(p.size).fill(0);
  const colCounts = new Array<number>(p.size).fill(0);
  for (let i = 0; i < n; i++) {
    if (!p.water[i]) continue;
    rowCounts[Math.floor(i / p.size)]++;
    colCounts[i % p.size]++;
  }
  for (let x = 0; x < p.size; x++) {
    if (rowCounts[x] !== p.rowCounts[x]) errors.push(`row ${x} count mismatch`);
    if (colCounts[x] !== p.colCounts[x]) errors.push(`col ${x} count mismatch`);
  }

  if (errors.length === 0) {
    const solutions = countSolutions(p.size, p.tankOf, p.tankCount, p.rowCounts, p.colCounts, 2);
    if (solutions !== 1) errors.push(`expected exactly 1 solution, solver found ${solutions === 2 ? '2+' : solutions}`);
  }
  return errors;
}
