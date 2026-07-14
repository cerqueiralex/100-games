import type { Difficulty } from '../../../platform/types';

/*
 * Skyscrapers puzzle generator.
 *
 * An N×N Latin square of tower heights 1..N. Edge clues around the border
 * say how many towers are VISIBLE looking down that row/column (taller
 * towers hide every shorter tower behind them). Generation is seeded and
 * deterministic: build a random Latin square, compute all 4N visibility
 * clues, then greedily hide clues (and prune any helper given cells) while
 * a budgeted backtracking solver keeps confirming the solution is UNIQUE.
 */

/** deterministic PRNG (same convention as house-puzzles/logic-grid) */
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

export interface SkyPuzzle {
  n: number;
  seed: number;
  /** row-major n×n solved heights, 1..n */
  solution: number[];
  /** clues per side, 0 = hidden. top[c] looks DOWN column c, left[r] looks RIGHT along row r, … */
  top: number[];
  bottom: number[];
  left: number[];
  right: number[];
  /** row-major n×n pre-filled heights (0 = empty) — only added when clues alone can't pin uniqueness */
  givens: number[];
}

/** How many towers are visible scanning a line front-to-back. */
export function visibleCount(line: number[]): number {
  let max = 0;
  let count = 0;
  for (const v of line) {
    if (v > max) {
      max = v;
      count++;
    }
  }
  return count;
}

/** Random Latin square via randomized backtracking (uniform enough for play). */
function randomLatin(n: number, rnd: () => number): number[] {
  const grid = new Array<number>(n * n).fill(0);
  const rowUsed = new Array<number>(n).fill(0);
  const colUsed = new Array<number>(n).fill(0);
  const values = Array.from({ length: n }, (_, i) => i + 1);

  const fill = (idx: number): boolean => {
    if (idx === n * n) return true;
    const r = Math.floor(idx / n);
    const c = idx % n;
    for (const v of shuffled(values, rnd)) {
      const bit = 1 << v;
      if (rowUsed[r] & bit || colUsed[c] & bit) continue;
      grid[idx] = v;
      rowUsed[r] |= bit;
      colUsed[c] |= bit;
      if (fill(idx + 1)) return true;
      grid[idx] = 0;
      rowUsed[r] &= ~bit;
      colUsed[c] &= ~bit;
    }
    return false;
  };
  fill(0);
  return grid;
}

export interface SolveResult {
  count: number;
  /** true when the node budget ran out before the search finished */
  aborted: boolean;
}

/**
 * Count solutions of a clue/given set with a backtracking solver, stopping
 * at `limit`. Prunes with static clue bounds (for a clue c, the cell at
 * distance d from its edge can hold at most n−c+1+d) plus incremental
 * visibility tracking for the left/top clues, exact checks on completed
 * lines for the right/bottom ones. `budget` caps explored nodes so a
 * single check can never hang — an aborted result is treated as "unknown".
 */
export function countSolutions(
  p: Pick<SkyPuzzle, 'n' | 'top' | 'bottom' | 'left' | 'right' | 'givens'>,
  limit = 2,
  budget = 500_000
): SolveResult {
  const { n, top, bottom, left, right, givens } = p;
  const full = (1 << (n + 1)) - 2; // bits 1..n

  // static candidate masks from the clue bounds
  const cand = new Array<number>(n * n).fill(full);
  const capTo = (idx: number, maxV: number) => {
    cand[idx] &= (1 << (Math.max(0, Math.min(n, maxV)) + 1)) - 2;
  };
  for (let c = 0; c < n; c++) {
    if (top[c] > 0) {
      for (let r = 0; r < n; r++) capTo(r * n + c, n - top[c] + 1 + r);
      if (top[c] === 1) cand[c] &= 1 << n;
    }
    if (bottom[c] > 0) {
      for (let r = 0; r < n; r++) capTo(r * n + c, n - bottom[c] + 1 + (n - 1 - r));
      if (bottom[c] === 1) cand[(n - 1) * n + c] &= 1 << n;
    }
  }
  for (let r = 0; r < n; r++) {
    if (left[r] > 0) {
      for (let c = 0; c < n; c++) capTo(r * n + c, n - left[r] + 1 + c);
      if (left[r] === 1) cand[r * n] &= 1 << n;
    }
    if (right[r] > 0) {
      for (let c = 0; c < n; c++) capTo(r * n + c, n - right[r] + 1 + (n - 1 - c));
      if (right[r] === 1) cand[r * n + n - 1] &= 1 << n;
    }
  }
  for (let i = 0; i < n * n; i++) {
    if (givens[i] > 0) cand[i] &= 1 << givens[i];
  }

  const grid = new Array<number>(n * n).fill(0);
  const rowUsed = new Array<number>(n).fill(0);
  const colUsed = new Array<number>(n).fill(0);
  // incremental visibility (count + running max) per row from the left and per column from the top
  const rowVisCnt = new Array<number>(n).fill(0);
  const rowVisMax = new Array<number>(n).fill(0);
  const colVisCnt = new Array<number>(n).fill(0);
  const colVisMax = new Array<number>(n).fill(0);

  let nodes = 0;
  let count = 0;
  let aborted = false;

  const rowVisFromRight = (r: number): number => {
    let mx = 0;
    let cnt = 0;
    for (let c = n - 1; c >= 0; c--) {
      const v = grid[r * n + c];
      if (v > mx) {
        mx = v;
        cnt++;
      }
    }
    return cnt;
  };
  const colVisFromBottom = (c: number): number => {
    let mx = 0;
    let cnt = 0;
    for (let r = n - 1; r >= 0; r--) {
      const v = grid[r * n + c];
      if (v > mx) {
        mx = v;
        cnt++;
      }
    }
    return cnt;
  };

  const dfs = (idx: number): void => {
    if (aborted || count >= limit) return;
    if (idx === n * n) {
      count++;
      return;
    }
    const r = Math.floor(idx / n);
    const c = idx % n;
    let mask = cand[idx] & ~rowUsed[r] & ~colUsed[c];
    while (mask) {
      const bit = mask & -mask;
      mask ^= bit;
      nodes++;
      if (nodes > budget) {
        aborted = true;
        return;
      }
      const v = 31 - Math.clz32(bit);

      // incremental left-clue pruning
      const L = left[r];
      const newRowCnt = v > rowVisMax[r] ? rowVisCnt[r] + 1 : rowVisCnt[r];
      const newRowMax = v > rowVisMax[r] ? v : rowVisMax[r];
      if (L > 0) {
        if (newRowCnt > L) continue;
        const futureNew = Math.min(n - 1 - c, n - newRowMax);
        if (newRowCnt + futureNew < L) continue;
      }
      // incremental top-clue pruning
      const T = top[c];
      const newColCnt = v > colVisMax[c] ? colVisCnt[c] + 1 : colVisCnt[c];
      const newColMax = v > colVisMax[c] ? v : colVisMax[c];
      if (T > 0) {
        if (newColCnt > T) continue;
        const futureNew = Math.min(n - 1 - r, n - newColMax);
        if (newColCnt + futureNew < T) continue;
      }

      grid[idx] = v;
      // exact checks when a line completes
      if (c === n - 1) {
        if (L > 0 && newRowCnt !== L) {
          grid[idx] = 0;
          continue;
        }
        if (right[r] > 0 && rowVisFromRight(r) !== right[r]) {
          grid[idx] = 0;
          continue;
        }
      }
      if (r === n - 1) {
        if (T > 0 && newColCnt !== T) {
          grid[idx] = 0;
          continue;
        }
        if (bottom[c] > 0 && colVisFromBottom(c) !== bottom[c]) {
          grid[idx] = 0;
          continue;
        }
      }

      const orc = rowVisCnt[r];
      const orm = rowVisMax[r];
      const occ = colVisCnt[c];
      const ocm = colVisMax[c];
      rowUsed[r] |= bit;
      colUsed[c] |= bit;
      rowVisCnt[r] = newRowCnt;
      rowVisMax[r] = newRowMax;
      colVisCnt[c] = newColCnt;
      colVisMax[c] = newColMax;

      dfs(idx + 1);

      rowUsed[r] &= ~bit;
      colUsed[c] &= ~bit;
      rowVisCnt[r] = orc;
      rowVisMax[r] = orm;
      colVisCnt[c] = occ;
      colVisMax[c] = ocm;
      grid[idx] = 0;
      if (aborted || count >= limit) return;
    }
  };

  dfs(0);
  return { count, aborted };
}

export interface SkyGenOptions {
  seed?: number;
  n: number;
  /** stop hiding clues once this many remain visible (0 = strip to the minimum) */
  minClues?: number;
}

/** node budgets per size — keeps every uniqueness check (and so generation) bounded */
const CHECK_BUDGET: Record<number, number> = { 4: 60_000, 5: 160_000, 6: 400_000, 7: 450_000 };

export function generateSkyscrapers(opts: SkyGenOptions): SkyPuzzle {
  const seed = opts.seed ?? Math.floor(Math.random() * 0x7fffffff);
  const { n } = opts;
  const minClues = opts.minClues ?? 0;
  const rnd = mulberry32(seed);
  const budget = CHECK_BUDGET[n] ?? 900_000;

  const solution = randomLatin(n, rnd);
  const top: number[] = [];
  const bottom: number[] = [];
  const left: number[] = [];
  const right: number[] = [];
  for (let c = 0; c < n; c++) {
    const col = Array.from({ length: n }, (_, r) => solution[r * n + c]);
    top[c] = visibleCount(col);
    bottom[c] = visibleCount([...col].reverse());
  }
  for (let r = 0; r < n; r++) {
    const row = solution.slice(r * n, r * n + n);
    left[r] = visibleCount(row);
    right[r] = visibleCount([...row].reverse());
  }

  const givens = new Array<number>(n * n).fill(0);
  const puzzle: SkyPuzzle = { n, seed, solution, top, bottom, left, right, givens };
  const isUnique = (): boolean => {
    const res = countSolutions(puzzle, 2, budget);
    return res.count === 1 && !res.aborted;
  };

  // With every clue visible the solution is almost always already unique;
  // when it isn't (or the check blows the budget), reveal solution cells
  // until it is — each given strictly shrinks the search space, so this
  // always terminates.
  const cellOrder = shuffled(Array.from({ length: n * n }, (_, i) => i), rnd);
  for (let gi = 0; !isUnique(); gi++) {
    givens[cellOrder[gi]] = solution[cellOrder[gi]];
  }

  // greedily hide clues while the puzzle stays verifiably unique
  type Side = 'top' | 'bottom' | 'left' | 'right';
  const refs: { side: Side; i: number }[] = [];
  for (const side of ['top', 'bottom', 'left', 'right'] as Side[]) {
    for (let i = 0; i < n; i++) refs.push({ side, i });
  }
  let visible = 4 * n;
  for (const ref of shuffled(refs, rnd)) {
    if (visible <= minClues) break;
    const arr = puzzle[ref.side];
    const kept = arr[ref.i];
    arr[ref.i] = 0;
    if (isUnique()) visible--;
    else arr[ref.i] = kept;
  }

  // prune helper givens to the minimum that stays unique
  for (const idx of shuffled(Array.from({ length: n * n }, (_, i) => i), rnd)) {
    if (givens[idx] === 0) continue;
    const kept = givens[idx];
    givens[idx] = 0;
    if (!isUnique()) givens[idx] = kept;
  }

  return puzzle;
}

/** board size + how many of the 4N clues stay visible, per difficulty */
export const SKY_CONFIGS: Record<Difficulty, { n: number; minClues: number }> = {
  easy: { n: 4, minClues: 12 },
  medium: { n: 5, minClues: 13 },
  hard: { n: 5, minClues: 0 },
  pro: { n: 6, minClues: 10 },
  extreme: { n: 7, minClues: 16 }
};

export function generateSkyPuzzle(difficulty: Difficulty, seed?: number): SkyPuzzle {
  const cfg = SKY_CONFIGS[difficulty];
  return generateSkyscrapers({ seed, n: cfg.n, minClues: cfg.minClues });
}
