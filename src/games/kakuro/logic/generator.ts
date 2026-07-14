import type { Difficulty } from '../../../platform/types';

/*
 * Kakuro generator — pure TS, fully seeded and deterministic.
 *
 * Pipeline (see generateKakuro):
 *   1. layout   — random block pattern with 180° symmetry, repaired until
 *                 every maximal run is 2..maxRun long in BOTH directions
 *                 (so every entry cell sits in one across AND one down run)
 *                 and all entry cells are orthogonally connected.
 *   2. fill     — backtracking digit fill: 1–9, all-different per run.
 *   3. sums     — each run's clue is the sum of its solution digits.
 *   4. unique   — count-to-2 backtracking solver with run-sum partition
 *                 pruning; the puzzle is only accepted when exactly one
 *                 solution exists.
 */

export interface KakuroRun {
  dir: 'a' | 'd';
  sum: number;
  /** entry-cell indexes in reading order */
  cells: number[];
  /** the block cell carrying this clue (left of / above the run) */
  clue: number;
}

export interface KakuroPuzzle {
  rows: number;
  cols: number;
  /** flat rows×cols; 1 = block cell, 0 = entry cell */
  blocks: number[];
  /** solution digit per cell (0 on blocks) */
  solution: number[];
  runs: KakuroRun[];
  seed: number;
}

export interface KakuroConfig {
  /** grid side including the clue border (row 0 / col 0 are always blocks) */
  size: number;
  maxRun: number;
  minEntries: number;
  maxEntries: number;
  /** target fraction of interior cells that become block cells */
  blockFrac: number;
  /**
   * cap on fully-open 2×2 entry squares. Every open square admits a
   * sum-preserving digit shift unless the digits happen to block it, so
   * open-square-heavy layouts are almost never uniquely solvable.
   */
  maxOpenSquares: number;
}

export const KAKURO_CONFIGS: Record<Difficulty, KakuroConfig> = {
  easy: { size: 5, maxRun: 4, minEntries: 7, maxEntries: 13, blockFrac: 0.3, maxOpenSquares: 6 },
  medium: { size: 6, maxRun: 4, minEntries: 12, maxEntries: 20, blockFrac: 0.34, maxOpenSquares: 4 },
  hard: { size: 7, maxRun: 5, minEntries: 16, maxEntries: 28, blockFrac: 0.36, maxOpenSquares: 6 },
  pro: { size: 8, maxRun: 6, minEntries: 20, maxEntries: 38, blockFrac: 0.4, maxOpenSquares: 8 },
  extreme: { size: 9, maxRun: 8, minEntries: 26, maxEntries: 48, blockFrac: 0.42, maxOpenSquares: 12 }
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

const FULL_MASK = 0b1111111110; // bits 1..9

function shuffled<T>(arr: readonly T[], rnd: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ---------------------------------------------------------------- layout */

/** length of the maximal horizontal entry segment through (r,c) */
function hSeg(n: number, blocks: number[], r: number, c: number): number {
  let a = c;
  while (a - 1 >= 0 && !blocks[r * n + a - 1]) a--;
  let b = c;
  while (b + 1 < n && !blocks[r * n + b + 1]) b++;
  return b - a + 1;
}

function vSeg(n: number, blocks: number[], r: number, c: number): number {
  let a = r;
  while (a - 1 >= 0 && !blocks[(a - 1) * n + c]) a--;
  let b = r;
  while (b + 1 < n && !blocks[(b + 1) * n + c]) b++;
  return b - a + 1;
}

/** every entry cell still has both its runs ≥2 (no length-1 stubs anywhere) */
function noStubs(n: number, blocks: number[]): boolean {
  for (let r = 1; r < n; r++) {
    for (let c = 1; c < n; c++) {
      if (blocks[r * n + c]) continue;
      if (hSeg(n, blocks, r, c) < 2 || vSeg(n, blocks, r, c) < 2) return false;
    }
  }
  return true;
}

/** all interior entry cells are orthogonally connected */
function connected(n: number, blocks: number[]): boolean {
  let start = -1;
  let total = 0;
  for (let r = 1; r < n; r++) {
    for (let c = 1; c < n; c++) {
      if (!blocks[r * n + c]) {
        total++;
        if (start === -1) start = r * n + c;
      }
    }
  }
  if (start === -1) return false;
  const seen = new Set<number>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.pop()!;
    const r = Math.floor(cur / n);
    const c = cur % n;
    for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
      if (nr < 1 || nc < 1 || nr >= n || nc >= n) continue;
      const ni = nr * n + nc;
      if (!blocks[ni] && !seen.has(ni)) {
        seen.add(ni);
        queue.push(ni);
      }
    }
  }
  return seen.size === total;
}

function layoutValid(cfg: KakuroConfig, blocks: number[]): boolean {
  const n = cfg.size;
  const entries: number[] = [];
  for (let r = 1; r < n; r++) {
    for (let c = 1; c < n; c++) {
      if (!blocks[r * n + c]) entries.push(r * n + c);
    }
  }
  if (entries.length < cfg.minEntries || entries.length > cfg.maxEntries) return false;

  // open 2×2 squares are ambiguity bombs — keep them rare
  let openSquares = 0;
  for (let r = 1; r < n - 1; r++) {
    for (let c = 1; c < n - 1; c++) {
      if (
        !blocks[r * n + c] &&
        !blocks[r * n + c + 1] &&
        !blocks[(r + 1) * n + c] &&
        !blocks[(r + 1) * n + c + 1]
      ) {
        openSquares++;
      }
    }
  }
  if (openSquares > cfg.maxOpenSquares) return false;

  // run lengths 2..maxRun in both directions (repair guarantees this, but
  // re-verify to be safe)
  for (const cell of entries) {
    const r = Math.floor(cell / n);
    const c = cell % n;
    const h = hSeg(n, blocks, r, c);
    const v = vSeg(n, blocks, r, c);
    if (h < 2 || h > cfg.maxRun || v < 2 || v > cfg.maxRun) return false;
  }

  // orthogonal connectivity across all entry cells
  const seen = new Set<number>([entries[0]]);
  const queue = [entries[0]];
  while (queue.length > 0) {
    const cur = queue.pop()!;
    const r = Math.floor(cur / n);
    const c = cur % n;
    for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
      if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
      const ni = nr * n + nc;
      if (!blocks[ni] && !seen.has(ni)) {
        seen.add(ni);
        queue.push(ni);
      }
    }
  }
  return seen.size === entries.length;
}

/**
 * Constructive layout: start from an all-entry interior, then place
 * symmetric block pairs one at a time. A pair is only kept when it leaves
 * NO length-1 run and keeps the interior connected, so every accepted state
 * satisfies the core invariant (each entry cell in one across + one down run
 * of length ≥2). Blocks are placed until the target fraction is reached and
 * no run exceeds maxRun; over-long runs left over are cut by the same safe
 * rule. Far higher yield than random-fill-plus-repair — most calls succeed.
 */
function buildLayout(cfg: KakuroConfig, rnd: () => number): number[] | null {
  const n = cfg.size;
  const blocks = new Array(n * n).fill(0);
  for (let c = 0; c < n; c++) blocks[c] = 1;
  for (let r = 0; r < n; r++) blocks[r * n] = 1;

  const interior = (n - 1) * (n - 1);
  const target = Math.round(interior * cfg.blockFrac);

  const twin = (i: number): number => {
    const r = Math.floor(i / n);
    const c = i % n;
    return (n - r) * n + (n - c);
  };

  /** try to set block at i (+ twin); keep only if still stub-free & connected */
  const tryBlock = (i: number): boolean => {
    const t = twin(i);
    if (blocks[i] && blocks[t]) return false;
    const wasI = blocks[i];
    const wasT = blocks[t];
    blocks[i] = 1;
    blocks[t] = 1;
    if (noStubs(n, blocks) && connected(n, blocks)) return true;
    blocks[i] = wasI;
    blocks[t] = wasT;
    return false;
  };

  let placed = 0;
  const cells: number[] = [];
  for (let r = 1; r < n; r++) for (let c = 1; c < n; c++) cells.push(r * n + c);
  const order = shuffled(cells, rnd);

  const anyTooLong = (): boolean => {
    for (let r = 1; r < n; r++) {
      for (let c = 1; c < n; c++) {
        if (blocks[r * n + c]) continue;
        if (hSeg(n, blocks, r, c) > cfg.maxRun || vSeg(n, blocks, r, c) > cfg.maxRun) return true;
      }
    }
    return false;
  };

  for (const i of order) {
    if (placed >= target && !anyTooLong()) break;
    if (tryBlock(i)) placed += i === twin(i) ? 1 : 2;
  }

  // any run still over maxRun gets a safe cut; give up if none exists
  let guard = n * n;
  while (anyTooLong()) {
    if (--guard < 0) return null;
    let cut = false;
    outer: for (let r = 1; r < n && !cut; r++) {
      for (let c = 1; c < n; c++) {
        if (blocks[r * n + c]) continue;
        const h = hSeg(n, blocks, r, c);
        if (h > cfg.maxRun && tryBlock(r * n + c)) {
          cut = true;
          break outer;
        }
        const v = vSeg(n, blocks, r, c);
        if (v > cfg.maxRun && tryBlock(r * n + c)) {
          cut = true;
          break outer;
        }
      }
    }
    if (!cut) return null;
  }

  return layoutValid(cfg, blocks) ? blocks : null;
}

/* ------------------------------------------------------------------ runs */

export function extractRuns(rows: number, cols: number, blocks: number[]): KakuroRun[] {
  const runs: KakuroRun[] = [];
  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      const i = r * cols + c;
      if (blocks[i]) continue;
      if (blocks[i - 1]) {
        const cells: number[] = [];
        for (let cc = c; cc < cols && !blocks[r * cols + cc]; cc++) cells.push(r * cols + cc);
        if (cells.length >= 2) runs.push({ dir: 'a', sum: 0, cells, clue: i - 1 });
      }
      if (blocks[i - cols]) {
        const cells: number[] = [];
        for (let rr = r; rr < rows && !blocks[rr * cols + c]; rr++) cells.push(rr * cols + c);
        if (cells.length >= 2) runs.push({ dir: 'd', sum: 0, cells, clue: i - cols });
      }
    }
  }
  return runs;
}

/* ------------------------------------------------------------------ fill */

/**
 * Digit-order bias toward the extremes (1, 9, 2, 8 …). Extreme digits force
 * narrow clue combinations and block the rectangle digit-shifts that make
 * random kakuro fills ambiguous — this is what keeps the uniqueness search
 * fast on the larger boards.
 */
const BIAS_WEIGHT = [0, 7, 3.5, 2, 1.3, 1, 1.3, 2, 3.5, 7];

function biasedOrder(rnd: () => number): number[] {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const out: number[] = [];
  while (pool.length > 0) {
    let total = 0;
    for (const d of pool) total += BIAS_WEIGHT[d];
    let x = rnd() * total;
    let idx = pool.length - 1;
    for (let k = 0; k < pool.length; k++) {
      x -= BIAS_WEIGHT[pool[k]];
      if (x <= 0) {
        idx = k;
        break;
      }
    }
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

function buildCellRuns(runs: KakuroRun[]): Map<number, number[]> {
  const cellRuns = new Map<number, number[]>();
  runs.forEach((run, ri) => {
    for (const cell of run.cells) {
      const list = cellRuns.get(cell) ?? [];
      list.push(ri);
      cellRuns.set(cell, list);
    }
  });
  return cellRuns;
}

/**
 * Backtracking (re)fill of `targets` inside a partially filled solution:
 * digits 1–9, all-different per run, extreme-biased digit order. Mutates
 * `sol` on success; restores it on failure.
 */
function fillCells(
  targets: number[],
  sol: number[],
  runs: KakuroRun[],
  cellRuns: Map<number, number[]>,
  rnd: () => number
): boolean {
  const backup = targets.map((c) => sol[c]);
  for (const c of targets) sol[c] = 0;

  const used = runs.map((run) => {
    let mask = 0;
    for (const cell of run.cells) if (sol[cell] !== 0) mask |= 1 << sol[cell];
    return mask;
  });

  let budget = 40000;
  const bt = (i: number): boolean => {
    if (i === targets.length) return true;
    if (--budget < 0) return false;
    const cell = targets[i];
    const [ra, rb] = cellRuns.get(cell)!;
    for (const d of biasedOrder(rnd)) {
      const bit = 1 << d;
      if ((used[ra] | used[rb]) & bit) continue;
      used[ra] |= bit;
      used[rb] |= bit;
      sol[cell] = d;
      if (bt(i + 1)) return true;
      used[ra] &= ~bit;
      used[rb] &= ~bit;
      sol[cell] = 0;
    }
    return false;
  };

  if (bt(0)) return true;
  targets.forEach((c, k) => {
    sol[c] = backup[k];
  });
  return false;
}

/* ------------------------------------------------------- uniqueness solver */

/**
 * Counts solutions of the puzzle up to `limit` (default 2) with a
 * backtracking solver: MRV cell choice + run-sum partition pruning (a digit
 * is only tried when the run's remaining cells can still reach the remaining
 * sum with distinct unused digits). Returns -1 if the node budget is
 * exceeded (callers must treat that as "not proven unique"). When `capture`
 * is provided, each found solution is pushed into it as a flat
 * rows×cols digit array — the generator diffs them to repair ambiguity.
 */
export function countSolutions(
  p: Pick<KakuroPuzzle, 'rows' | 'cols' | 'blocks' | 'runs'>,
  limit = 2,
  capture?: number[][]
): number {
  const { runs } = p;
  const cellRuns = new Map<number, [number, number]>();
  runs.forEach((run, ri) => {
    for (const cell of run.cells) {
      const pair = cellRuns.get(cell) ?? ([-1, -1] as [number, number]);
      if (pair[0] === -1) pair[0] = ri;
      else pair[1] = ri;
      cellRuns.set(cell, pair);
    }
  });

  const cells = [...cellRuns.keys()];
  // a valid kakuro requires every entry cell in exactly two runs
  for (const cell of cells) {
    if (cellRuns.get(cell)![1] === -1) return 0;
  }

  const used = new Array(runs.length).fill(0);
  const left = runs.map((r) => r.cells.length);
  const rem = runs.map((r) => r.sum);
  const value = new Map<number, number>(cells.map((c) => [c, 0]));

  const fits = (ri: number, d: number): boolean => {
    const m = left[ri] - 1;
    const s = rem[ri] - d;
    if (m === 0) return s === 0;
    if (s <= 0) return false;
    const avail = FULL_MASK & ~(used[ri] | (1 << d));
    let got = 0;
    let mn = 0;
    for (let v = 1; v <= 9 && got < m; v++) {
      if (avail & (1 << v)) {
        mn += v;
        got++;
      }
    }
    if (got < m || mn > s) return false;
    got = 0;
    let mx = 0;
    for (let v = 9; v >= 1 && got < m; v--) {
      if (avail & (1 << v)) {
        mx += v;
        got++;
      }
    }
    return mx >= s;
  };

  let nodes = 0;
  let overBudget = false;
  const NODE_BUDGET = 60000;

  const search = (unassigned: number): number => {
    if (unassigned === 0) {
      if (capture) {
        const flat = new Array(p.rows * p.cols).fill(0);
        for (const [cell, d] of value) flat[cell] = d;
        capture.push(flat);
      }
      return 1;
    }
    if (++nodes > NODE_BUDGET) {
      overBudget = true;
      return limit;
    }

    // MRV: the unassigned cell with the fewest candidate digits
    let bestCell = -1;
    let bestCands: number[] | null = null;
    for (const cell of cells) {
      if (value.get(cell) !== 0) continue;
      const [ra, rb] = cellRuns.get(cell)!;
      const cands: number[] = [];
      for (let d = 1; d <= 9; d++) {
        const bit = 1 << d;
        if ((used[ra] | used[rb]) & bit) continue;
        if (fits(ra, d) && fits(rb, d)) cands.push(d);
      }
      if (cands.length === 0) return 0;
      if (!bestCands || cands.length < bestCands.length) {
        bestCell = cell;
        bestCands = cands;
        if (cands.length === 1) break;
      }
    }

    let count = 0;
    const [ra, rb] = cellRuns.get(bestCell)!;
    for (const d of bestCands!) {
      const bit = 1 << d;
      used[ra] |= bit;
      used[rb] |= bit;
      left[ra]--;
      left[rb]--;
      rem[ra] -= d;
      rem[rb] -= d;
      value.set(bestCell, d);
      count += search(unassigned - 1);
      used[ra] &= ~bit;
      used[rb] &= ~bit;
      left[ra]++;
      left[rb]++;
      rem[ra] += d;
      rem[rb] += d;
      value.set(bestCell, 0);
      if (count >= limit || overBudget) break;
    }
    return count;
  };

  const result = search(cells.length);
  return overBudget ? -1 : result;
}

/* -------------------------------------------------------------- generate */

export interface KakuroGenOptions {
  difficulty?: Difficulty;
  seed?: number;
}

/** optional out-param for tests: where generation attempts were spent */
export interface KakuroGenDiag {
  layoutTries: number;
  layoutOk: number;
  fillFails: number;
  uniqueFails: number;
  repairs: number;
}

export function generateKakuro(opts: KakuroGenOptions = {}, diag?: KakuroGenDiag): KakuroPuzzle {
  const difficulty = opts.difficulty ?? 'medium';
  const seed = (opts.seed ?? Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  const cfg = KAKURO_CONFIGS[difficulty];
  const rnd = mulberry32(seed);

  for (let attempt = 0; attempt < 400; attempt++) {
    if (diag) diag.layoutTries++;
    const blocks = buildLayout(cfg, rnd);
    if (!blocks) continue;
    if (diag) diag.layoutOk++;
    const runs = extractRuns(cfg.size, cfg.size, blocks);
    const cellRuns = buildCellRuns(runs);
    const allCells = [...cellRuns.keys()].sort((a, b) => a - b);

    const solution = new Array(cfg.size * cfg.size).fill(0);
    if (!fillCells(allCells, solution, runs, cellRuns, rnd)) {
      if (diag) diag.fillFails++;
      continue;
    }

    // Ambiguity-guided repair: when two solutions exist, resample exactly
    // the runs covering the cells where they disagree, then re-check.
    for (let round = 0; round < 24; round++) {
      const sized = runs.map((run) => ({
        ...run,
        cells: [...run.cells],
        sum: run.cells.reduce((acc, c) => acc + solution[c], 0)
      }));
      const capture: number[][] = [];
      const count = countSolutions(
        { rows: cfg.size, cols: cfg.size, blocks, runs: sized },
        2,
        capture
      );
      if (count === 1) {
        return { rows: cfg.size, cols: cfg.size, blocks, solution, runs: sized, seed };
      }
      if (count !== 2 || capture.length < 2) break; // budget blown — new layout
      if (diag) diag.uniqueFails++;

      const region = new Set<number>();
      for (const cell of allCells) {
        if (capture[0][cell] !== capture[1][cell]) {
          for (const ri of cellRuns.get(cell)!) {
            for (const cc of runs[ri].cells) region.add(cc);
          }
        }
      }
      if (region.size === 0) break;
      if (diag) diag.repairs++;
      if (!fillCells([...region], solution, runs, cellRuns, rnd)) break;
    }
  }

  throw new Error(`kakuro: generation failed for ${difficulty} (seed ${seed})`);
}

/* ------------------------------------------------------------ verification */

/** Full soundness check used by npm run validate and the headless tests. */
export function verifyKakuro(p: KakuroPuzzle, cfg?: KakuroConfig): string[] {
  const errs: string[] = [];
  const { rows, cols, blocks, solution, runs } = p;
  const n = rows;
  if (rows !== cols) errs.push(`grid not square: ${rows}x${cols}`);
  if (blocks.length !== rows * cols || solution.length !== rows * cols) {
    errs.push('blocks/solution length mismatch');
    return errs;
  }
  for (let c = 0; c < cols; c++) if (!blocks[c]) errs.push(`row 0 col ${c} not a block`);
  for (let r = 0; r < rows; r++) if (!blocks[r * cols]) errs.push(`col 0 row ${r} not a block`);

  // 180° symmetry of the playfield block pattern
  for (let r = 1; r < n; r++) {
    for (let c = 1; c < n; c++) {
      if (blocks[r * n + c] !== blocks[(n - r) * n + (n - c)]) {
        errs.push(`symmetry broken at (${r},${c})`);
      }
    }
  }

  // runs: contiguous, clued, distinct digits, matching sums
  const acrossOf = new Map<number, number>();
  const downOf = new Map<number, number>();
  runs.forEach((run, ri) => {
    if (run.cells.length < 2) errs.push(`run ${ri} shorter than 2`);
    if (cfg && run.cells.length > cfg.maxRun) errs.push(`run ${ri} longer than maxRun`);
    const step = run.dir === 'a' ? 1 : cols;
    for (let k = 1; k < run.cells.length; k++) {
      if (run.cells[k] !== run.cells[k - 1] + step) errs.push(`run ${ri} not contiguous`);
    }
    if (run.clue !== run.cells[0] - step) errs.push(`run ${ri} clue cell misplaced`);
    if (!blocks[run.clue]) errs.push(`run ${ri} clue not on a block`);
    let sum = 0;
    let mask = 0;
    for (const cell of run.cells) {
      const d = solution[cell];
      if (blocks[cell]) errs.push(`run ${ri} crosses a block`);
      if (d < 1 || d > 9) errs.push(`run ${ri} has digit ${d}`);
      if (mask & (1 << d)) errs.push(`run ${ri} repeats digit ${d}`);
      mask |= 1 << d;
      sum += d;
      const map = run.dir === 'a' ? acrossOf : downOf;
      if (map.has(cell)) errs.push(`cell ${cell} in two ${run.dir} runs`);
      map.set(cell, ri);
    }
    if (sum !== run.sum) errs.push(`run ${ri} sum ${run.sum} != digits ${sum}`);
  });

  // every entry cell belongs to exactly one across AND one down run
  const entries: number[] = [];
  for (let r = 1; r < n; r++) {
    for (let c = 1; c < n; c++) {
      const i = r * n + c;
      if (blocks[i]) continue;
      entries.push(i);
      if (!acrossOf.has(i)) errs.push(`entry ${i} not in an across run`);
      if (!downOf.has(i)) errs.push(`entry ${i} not in a down run`);
    }
  }
  if (cfg && (entries.length < cfg.minEntries || entries.length > cfg.maxEntries)) {
    errs.push(`entry count ${entries.length} outside [${cfg.minEntries}, ${cfg.maxEntries}]`);
  }

  // connectivity
  if (entries.length > 0) {
    const seen = new Set<number>([entries[0]]);
    const queue = [entries[0]];
    while (queue.length > 0) {
      const cur = queue.pop()!;
      const r = Math.floor(cur / n);
      const c = cur % n;
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
        const ni = nr * n + nc;
        if (!blocks[ni] && !seen.has(ni)) {
          seen.add(ni);
          queue.push(ni);
        }
      }
    }
    if (seen.size !== entries.length) errs.push('entry cells not connected');
  }

  if (errs.length === 0 && countSolutions(p) !== 1) errs.push('solution is not unique');
  return errs;
}

/* ------------------------------------------------- combos assist helper */

/**
 * All digit sets of `len` distinct digits 1–9 summing to `sum` that include
 * every digit in `placed` (the digits already entered in the run). Returns
 * ascending digit arrays; used by the in-game "Combos" assist.
 */
export function runCombinations(sum: number, len: number, placed: number[] = []): number[][] {
  let placedMask = 0;
  for (const d of placed) {
    if (d >= 1 && d <= 9) placedMask |= 1 << d;
  }
  const out: number[][] = [];
  const pick: number[] = [];
  const rec = (from: number, count: number, remaining: number) => {
    if (count === len) {
      if (remaining === 0) {
        // must contain every placed digit
        let mask = 0;
        for (const d of pick) mask |= 1 << d;
        if ((mask & placedMask) === placedMask) out.push([...pick]);
      }
      return;
    }
    for (let d = from; d <= 9; d++) {
      if (d > remaining) break;
      pick.push(d);
      rec(d + 1, count + 1, remaining - d);
      pick.pop();
    }
  };
  rec(1, 0, sum);
  return out;
}
