import type { Difficulty } from '../../../platform/types';

/**
 * MathDoku (KenKen-style) generator — pure TS, fully seeded.
 *
 * A puzzle is an N×N Latin square (1..N once per row and column) whose grid
 * is partitioned into CAGES. Each cage carries a target and an operation;
 * the digits inside the cage must produce the target ("12×", "3−", "2÷",
 * "7+"). Single-cell cages are givens. Digits MAY repeat inside a cage as
 * long as they don't share a row or column (possible in L-shaped cages).
 *
 * Soundness contract: `generateMathdoku` only returns a puzzle whose clue
 * set admits EXACTLY ONE grid, verified by `countSolutions` (count-to-2
 * backtracking with per-cage feasibility pruning). In `noOps` mode the clue
 * shows the target only — any operation may apply — and uniqueness is
 * verified under that looser rule too.
 */

export type Op = '+' | '-' | 'x' | '/';

export interface Cage {
  /** flat cell indices (row * n + col), sorted ascending */
  cells: number[];
  /** null on single-cell cages — the clue is the value itself (a given) */
  op: Op | null;
  target: number;
}

export interface MathdokuPuzzle {
  n: number;
  seed: number;
  /** hidden-operations mode: clues show the target only, any op may apply */
  noOps: boolean;
  cages: Cage[];
  /** cell index -> index into `cages` */
  cageOf: number[];
  /** the unique solution, flat n*n array of 1..n */
  solution: number[];
}

export interface GenerateOptions {
  seed?: number;
  n: number;
  /** hide operations on every clue (verified unique under any-op rules) */
  noOps?: boolean;
  /** larger cages and no single-cell givens (the pro tier) */
  bigCages?: boolean;
}

/** Board size / mode per difficulty tier. */
export const DIFF_CONFIG: Record<Difficulty, { n: number; noOps: boolean; bigCages: boolean }> = {
  easy: { n: 4, noOps: false, bigCages: false },
  medium: { n: 5, noOps: false, bigCages: false },
  hard: { n: 6, noOps: false, bigCages: false },
  pro: { n: 6, noOps: false, bigCages: true },
  extreme: { n: 7, noOps: true, bigCages: false }
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

/* ---------------- Latin square ---------------- */

/** Randomized backtracking fill — n ≤ 7, so this is instant. */
function fillLatin(n: number, rnd: () => number): number[] {
  const g: number[] = new Array(n * n).fill(0);
  const digits = Array.from({ length: n }, (_, i) => i + 1);
  const ok = (idx: number, v: number): boolean => {
    const r = Math.floor(idx / n);
    const c = idx % n;
    for (let k = 0; k < n; k++) {
      if (g[r * n + k] === v || g[k * n + c] === v) return false;
    }
    return true;
  };
  const fill = (idx: number): boolean => {
    if (idx === n * n) return true;
    for (const v of shuffled(digits, rnd)) {
      if (ok(idx, v)) {
        g[idx] = v;
        if (fill(idx + 1)) return true;
        g[idx] = 0;
      }
    }
    return false;
  };
  fill(0);
  return g;
}

/* ---------------- cage partition ---------------- */

function neighborsOf(idx: number, n: number): number[] {
  const r = Math.floor(idx / n);
  const c = idx % n;
  const out: number[] = [];
  if (r > 0) out.push(idx - n);
  if (r < n - 1) out.push(idx + n);
  if (c > 0) out.push(idx - 1);
  if (c < n - 1) out.push(idx + 1);
  return out;
}

/**
 * Seeded random-growth partition into cages of size 1–4. Returns null when
 * the layout ends up with more single-cell cages than allowed, so the
 * caller retries (growth dead-ends naturally create a few 1s and 2s).
 */
function partitionGrid(
  n: number,
  rnd: () => number,
  bigCages: boolean,
  noOps: boolean
): number[][] | null {
  const cageOf: number[] = new Array(n * n).fill(-1);
  const cages: number[][] = [];
  const order = shuffled(
    Array.from({ length: n * n }, (_, i) => i),
    rnd
  );
  // target-size pools: normal skews to 2–3 with the occasional 4;
  // bigCages (pro) skews to 3–4 and forbids singles entirely; noOps
  // (hidden operations) skews smaller — any-op clues constrain less, so
  // smaller cages keep the puzzle unique (and generation fast).
  const sizePool = bigCages
    ? [3, 3, 4, 4, 4, 3, 2]
    : noOps
      ? [2, 2, 2, 2, 3, 3, 3, 4]
      : [2, 2, 2, 3, 3, 3, 4, 2, 4];
  for (const start of order) {
    if (cageOf[start] !== -1) continue;
    const want = sizePool[Math.floor(rnd() * sizePool.length)];
    const cage = [start];
    cageOf[start] = cages.length;
    while (cage.length < want) {
      const frontier: number[] = [];
      for (const cell of cage) {
        for (const nb of neighborsOf(cell, n)) {
          if (cageOf[nb] === -1) frontier.push(nb);
        }
      }
      if (frontier.length === 0) break;
      const pick = frontier[Math.floor(rnd() * frontier.length)];
      cageOf[pick] = cages.length;
      cage.push(pick);
    }
    cages.push(cage);
  }
  const singles = cages.filter((c) => c.length === 1).length;
  const maxSingles = bigCages ? 0 : Math.max(1, Math.floor(n / 3));
  if (singles > maxSingles) return null;
  return cages;
}

/* ---------------- operation assignment ---------------- */

function assignOps(cells: number[][], solution: number[], rnd: () => number): Cage[] {
  return cells.map((raw) => {
    const cageCells = [...raw].sort((a, b) => a - b);
    const vals = cageCells.map((c) => solution[c]);
    if (vals.length === 1) {
      return { cells: cageCells, op: null, target: vals[0] };
    }
    if (vals.length === 2) {
      // 2-cell cages are orthogonally adjacent, so the values are distinct
      const [a, b] = vals;
      const hi = Math.max(a, b);
      const lo = Math.min(a, b);
      const options: { op: Op; target: number; weight: number }[] = [
        { op: '-', target: hi - lo, weight: 3 },
        { op: '+', target: a + b, weight: 2 },
        { op: 'x', target: a * b, weight: 2 }
      ];
      if (hi % lo === 0) options.push({ op: '/', target: hi / lo, weight: 3 });
      const total = options.reduce((s, o) => s + o.weight, 0);
      let roll = rnd() * total;
      for (const o of options) {
        roll -= o.weight;
        if (roll <= 0) return { cells: cageCells, op: o.op, target: o.target };
      }
      const last = options[options.length - 1];
      return { cells: cageCells, op: last.op, target: last.target };
    }
    // 3–4 cells: sum or product
    if (rnd() < 0.55) {
      return { cells: cageCells, op: '+' as Op, target: vals.reduce((s, v) => s + v, 0) };
    }
    return { cells: cageCells, op: 'x' as Op, target: vals.reduce((s, v) => s * v, 1) };
  });
}

/* ---------------- cage arithmetic ---------------- */

function plusOk(target: number, size: number, k: number, sum: number, n: number): boolean {
  if (k === size) return sum === target;
  return sum + (size - k) <= target && target <= sum + (size - k) * n;
}

function timesOk(target: number, size: number, k: number, prod: number, n: number): boolean {
  if (k === size) return prod === target;
  return prod <= target && target % prod === 0 && target / prod <= Math.pow(n, size - k);
}

/** vals = filled values of a 2-cell cage (0, 1 or 2 of them). */
function minusOk(target: number, vals: number[], n: number): boolean {
  if (vals.length === 2) return Math.abs(vals[0] - vals[1]) === target;
  if (vals.length === 1) return vals[0] + target <= n || vals[0] - target >= 1;
  return true;
}

function divOk(target: number, vals: number[], n: number): boolean {
  if (vals.length === 2) {
    const hi = Math.max(vals[0], vals[1]);
    const lo = Math.min(vals[0], vals[1]);
    return lo > 0 && hi % lo === 0 && hi / lo === target;
  }
  if (vals.length === 1) {
    return vals[0] * target <= n || (vals[0] % target === 0 && vals[0] / target >= 1);
  }
  return true;
}

/**
 * Can the cage still be completed (partial) / is it correct (complete),
 * given the filled values? Under `noOps`, ANY applicable op may match.
 */
function cageFeasible(
  cage: Cage,
  noOps: boolean,
  n: number,
  k: number,
  sum: number,
  prod: number,
  filledVals: number[]
): boolean {
  const size = cage.cells.length;
  if (cage.op === null) return k === 0 || sum === cage.target;
  if (noOps) {
    if (plusOk(cage.target, size, k, sum, n)) return true;
    if (timesOk(cage.target, size, k, prod, n)) return true;
    if (size === 2 && minusOk(cage.target, filledVals, n)) return true;
    if (size === 2 && divOk(cage.target, filledVals, n)) return true;
    return false;
  }
  switch (cage.op) {
    case '+':
      return plusOk(cage.target, size, k, sum, n);
    case 'x':
      return timesOk(cage.target, size, k, prod, n);
    case '-':
      return minusOk(cage.target, filledVals, n);
    case '/':
      return divOk(cage.target, filledVals, n);
  }
}

/**
 * Is a fully-filled cage arithmetically correct? (UI cage-check + win test.)
 * Returns false when any cell is still empty.
 */
export function cageSatisfied(cage: Cage, values: number[], noOps: boolean): boolean {
  const vals = cage.cells.map((c) => values[c]);
  if (vals.some((v) => v === 0)) return false;
  const sum = vals.reduce((s, v) => s + v, 0);
  const prod = vals.reduce((s, v) => s * v, 1);
  return cageFeasible(cage, noOps, Number.MAX_SAFE_INTEGER, vals.length, sum, prod, vals);
}

/* ---------------- uniqueness solver ---------------- */

/**
 * Counts grids satisfying the clues, stopping at `limit`. Backtracking with
 * row/column bitmasks, most-constrained-cell ordering and per-cage
 * feasibility pruning. A blown node budget reports `limit` (treated as
 * "not proven unique" by the generator, which then regenerates).
 */
export function countSolutions(
  p: Pick<MathdokuPuzzle, 'n' | 'cages' | 'cageOf' | 'noOps'>,
  limit = 2,
  nodeBudget = 400000
): number {
  const { n, cages, cageOf, noOps } = p;
  const N = n * n;
  const grid: number[] = new Array(N).fill(0);
  const rowMask: number[] = new Array(n).fill(0);
  const colMask: number[] = new Array(n).fill(0);
  const kIn: number[] = new Array(cages.length).fill(0);
  const sumIn: number[] = new Array(cages.length).fill(0);
  const prodIn: number[] = new Array(cages.length).fill(1);
  const full = ((1 << n) - 1) << 1;
  let nodes = 0;
  let count = 0;
  let aborted = false;

  const filledVals = (ci: number): number[] => {
    const out: number[] = [];
    for (const c of cages[ci].cells) if (grid[c] !== 0) out.push(grid[c]);
    return out;
  };

  const search = (): void => {
    if (aborted || count >= limit) return;
    if (++nodes > nodeBudget) {
      aborted = true;
      return;
    }
    // most-constrained empty cell (fewest row/col-legal digits)
    let best = -1;
    let bestMask = 0;
    let bestCount = 99;
    for (let i = 0; i < N; i++) {
      if (grid[i] !== 0) continue;
      const mask = ~(rowMask[Math.floor(i / n)] | colMask[i % n]) & full;
      let cnt = 0;
      for (let m = mask; m !== 0; m &= m - 1) cnt++;
      if (cnt === 0) return; // dead end
      if (cnt < bestCount) {
        bestCount = cnt;
        best = i;
        bestMask = mask;
        if (cnt === 1) break;
      }
    }
    if (best === -1) {
      count++;
      return;
    }
    const r = Math.floor(best / n);
    const c = best % n;
    const ci = cageOf[best];
    for (let v = 1; v <= n; v++) {
      const bit = 1 << v;
      if ((bestMask & bit) === 0) continue;
      grid[best] = v;
      rowMask[r] |= bit;
      colMask[c] |= bit;
      kIn[ci]++;
      sumIn[ci] += v;
      prodIn[ci] *= v;
      if (cageFeasible(cages[ci], noOps, n, kIn[ci], sumIn[ci], prodIn[ci], filledVals(ci))) {
        search();
      }
      grid[best] = 0;
      rowMask[r] &= ~bit;
      colMask[c] &= ~bit;
      kIn[ci]--;
      sumIn[ci] -= v;
      prodIn[ci] /= v;
      if (aborted || count >= limit) return;
    }
  };

  search();
  return aborted ? limit : count;
}

/* ---------------- generation ---------------- */

export function generateMathdoku(opts: GenerateOptions): MathdokuPuzzle {
  const seed = (opts.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const n = opts.n;
  const noOps = opts.noOps ?? false;
  const bigCages = opts.bigCages ?? false;
  const rnd = mulberry32(seed);

  for (let attempt = 0; attempt < 600; attempt++) {
    const solution = fillLatin(n, rnd);
    let cells: number[][] | null = null;
    for (let t = 0; t < 60 && !cells; t++) cells = partitionGrid(n, rnd, bigCages, noOps);
    if (!cells) continue;
    const cages = assignOps(cells, solution, rnd);
    const cageOf: number[] = new Array(n * n).fill(-1);
    cages.forEach((cage, i) => cage.cells.forEach((c) => (cageOf[c] = i)));
    const puzzle: MathdokuPuzzle = { n, seed, noOps, cages, cageOf, solution };
    if (countSolutions(puzzle, 2) === 1) return puzzle;
  }
  throw new Error(`mathdoku: failed to generate a unique ${n}×${n} puzzle (seed ${seed})`);
}

/* ---------------- display + integrity helpers ---------------- */

export const OP_GLYPH: Record<Op, string> = { '+': '+', '-': '−', x: '×', '/': '÷' };

/** The text shown in the cage's corner label. */
export function cageClue(cage: Cage, noOps: boolean): string {
  if (cage.op === null || noOps) return String(cage.target);
  return `${cage.target}${OP_GLYPH[cage.op]}`;
}

/** The cell that carries the cage label (topmost, then leftmost). */
export function labelCellOf(cage: Cage): number {
  return cage.cells[0]; // cells are kept sorted ascending
}

/**
 * Structural integrity check used by `npm run validate`: Latin solution,
 * exact-cover partition, connected cages of size 1–4, op rules respected,
 * every cage arithmetic consistent with the solution.
 */
export function validateIntegrity(p: MathdokuPuzzle): string[] {
  const errors: string[] = [];
  const { n, cages, cageOf, solution } = p;
  const N = n * n;

  if (solution.length !== N) errors.push(`solution has ${solution.length} cells, expected ${N}`);
  for (let r = 0; r < n; r++) {
    const rowSet = new Set<number>();
    const colSet = new Set<number>();
    for (let c = 0; c < n; c++) {
      rowSet.add(solution[r * n + c]);
      colSet.add(solution[c * n + r]);
    }
    for (let v = 1; v <= n; v++) {
      if (!rowSet.has(v)) errors.push(`row ${r} is missing ${v}`);
      if (!colSet.has(v)) errors.push(`col ${r} is missing ${v}`);
    }
  }

  // exact cover
  const seen = new Array(N).fill(0);
  cages.forEach((cage, i) => {
    cage.cells.forEach((c) => {
      if (c < 0 || c >= N) errors.push(`cage ${i} has out-of-range cell ${c}`);
      else seen[c]++;
      if (cageOf[c] !== i) errors.push(`cageOf[${c}] does not point to cage ${i}`);
    });
  });
  seen.forEach((count, c) => {
    if (count !== 1) errors.push(`cell ${c} belongs to ${count} cages`);
  });

  for (const [i, cage] of cages.entries()) {
    const size = cage.cells.length;
    if (size < 1 || size > 4) errors.push(`cage ${i} has size ${size}`);
    if ((cage.op === null) !== (size === 1)) errors.push(`cage ${i}: op/size mismatch`);
    if ((cage.op === '-' || cage.op === '/') && size !== 2)
      errors.push(`cage ${i}: ${cage.op} on a ${size}-cell cage`);
    if (cage.target < 1) errors.push(`cage ${i}: target ${cage.target}`);
    // connectivity
    const inCage = new Set(cage.cells);
    const stack = [cage.cells[0]];
    const reached = new Set<number>([cage.cells[0]]);
    while (stack.length > 0) {
      const cur = stack.pop()!;
      for (const nb of neighborsOf(cur, n)) {
        if (inCage.has(nb) && !reached.has(nb)) {
          reached.add(nb);
          stack.push(nb);
        }
      }
    }
    if (reached.size !== size) errors.push(`cage ${i} is not connected`);
    // arithmetic consistent with the solution under the EXACT op
    if (!cageSatisfied(cage, solution, false)) {
      errors.push(`cage ${i} (${cageClue(cage, false)}) is not satisfied by the solution`);
    }
  }

  return errors;
}
