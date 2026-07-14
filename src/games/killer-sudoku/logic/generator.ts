import type { Difficulty } from '../../../platform/types';

/*
 * Killer Sudoku generation — pure TS, seeded, self-contained (games never
 * import from other game folders; the classic-sudoku helpers here are a
 * deliberate duplicate of that convention).
 *
 * Pipeline: randomized backtracking fills a full solution → seeded random
 * growth partitions the grid into cages (digits inside a cage are distinct
 * by construction) → a few cells are revealed per tier → a count-to-2
 * backtracking solver with cage-sum combination pruning + naked/hidden
 * singles proves the puzzle has exactly one solution. Non-unique boards are
 * re-partitioned; each check runs under a node budget (a board whose
 * uniqueness can't be proven cheaply is simply rejected — that keeps every
 * check fast AND guarantees accepted boards are deduction-friendly), and
 * unlucky seeds step down a ladder of smaller cage-size pools, which
 * converges fast (2-cell cages are extremely constraining).
 */

/** Grids are flat arrays of 81 numbers, 0 = empty. */
export type Grid = number[];

export interface Cage {
  /** Cell indices, sorted ascending — cells[0] anchors the sum label. */
  cells: number[];
  sum: number;
}

export interface KillerPuzzle {
  seed: number;
  difficulty: Difficulty;
  solution: Grid;
  /** Revealed cells (0 = hidden). Pro/extreme reveal nothing. */
  givens: Grid;
  cages: Cage[];
  /** cell index -> index into cages */
  cageOf: number[];
}

export interface GenerateOptions {
  seed?: number;
  difficulty: Difficulty;
}

export const rowOf = (i: number) => Math.floor(i / 9);
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

/** Deterministic PRNG (32-bit state) — the standard seeded generator here. */
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

/**
 * Tier tuning: revealed givens + a LADDER of cage-size pools. Cage targets
 * are drawn from the ladder's first pool; a seed whose partitions keep
 * failing the uniqueness proof steps down to smaller (more constraining)
 * cages, which converges fast — 2-cell cages pin their digits hard.
 * Pro/extreme reveal NO givens: every deduction comes from the cage sums,
 * and extreme's bigger cages each say less, which is what makes it harder.
 */
const CONFIG: Record<Difficulty, { givens: number; pools: number[][] }> = {
  easy: { givens: 30, pools: [[2, 2, 3, 3], [2, 2, 3]] },
  medium: { givens: 18, pools: [[2, 3, 3, 4], [2, 2, 3]] },
  hard: { givens: 8, pools: [[2, 3, 3, 4], [2, 2, 3]] },
  pro: { givens: 0, pools: [[2, 2, 3, 3, 4], [2, 2, 3, 3], [2, 2, 3]] },
  extreme: {
    givens: 0,
    pools: [[3, 3, 4, 4], [2, 3, 3, 4, 4], [2, 3, 3, 4], [2, 2, 3, 3]]
  }
};

function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------- solution

function isValidPlain(grid: Grid, idx: number, val: number): boolean {
  const r = rowOf(idx);
  const c = colOf(idx);
  for (let k = 0; k < 9; k++) {
    if (grid[r * 9 + k] === val) return false;
    if (grid[k * 9 + c] === val) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      if (grid[(br + dr) * 9 + (bc + dc)] === val) return false;
    }
  }
  return true;
}

function fillGrid(grid: Grid, rnd: () => number, idx = 0): boolean {
  if (idx === 81) return true;
  if (grid[idx] !== 0) return fillGrid(grid, rnd, idx + 1);
  for (const val of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rnd)) {
    if (isValidPlain(grid, idx, val)) {
      grid[idx] = val;
      if (fillGrid(grid, rnd, idx + 1)) return true;
      grid[idx] = 0;
    }
  }
  return false;
}

// ------------------------------------------------------------------- cages

const ORTHO: number[][] = Array.from({ length: 81 }, (_, i) => {
  const out: number[] = [];
  const r = rowOf(i);
  const c = colOf(i);
  if (r > 0) out.push(i - 9);
  if (r < 8) out.push(i + 9);
  if (c > 0) out.push(i - 1);
  if (c < 8) out.push(i + 1);
  return out;
});

/**
 * Partition the 81 cells into orthogonally-connected cages by seeded random
 * growth. A neighbor only joins a cage when its solution digit is not
 * already inside (killer cages never repeat a digit), so partitions are
 * distinct-by-construction. Leftover 1-cell cages are merged into a
 * neighboring cage when possible; when `allowSingles` is false any
 * remaining singleton fails the partition (a 1-cell cage is a free given,
 * which the no-given tiers must not leak).
 */
function buildCages(
  solution: Grid,
  sizes: number[],
  rnd: () => number,
  allowSingles: boolean
): { cages: Cage[]; cageOf: number[] } | null {
  const maxSize = Math.max(...sizes);
  const cageOf = new Array<number>(81).fill(-1);
  const groups: number[][] = [];

  for (const start of shuffled(Array.from({ length: 81 }, (_, i) => i), rnd)) {
    if (cageOf[start] !== -1) continue;
    const target = sizes[Math.floor(rnd() * sizes.length)];
    const id = groups.length;
    const cells = [start];
    let digits = 1 << solution[start];
    cageOf[start] = id;
    while (cells.length < target) {
      const options: number[] = [];
      for (const c of cells) {
        for (const nb of ORTHO[c]) {
          if (cageOf[nb] === -1 && !(digits & (1 << solution[nb])) && !options.includes(nb)) {
            options.push(nb);
          }
        }
      }
      if (options.length === 0) break;
      const pick = options[Math.floor(rnd() * options.length)];
      cells.push(pick);
      digits |= 1 << solution[pick];
      cageOf[pick] = id;
    }
    groups.push(cells);
  }

  // merge singleton cages into an adjacent cage with room and no digit clash
  for (const cells of groups) {
    if (cells.length !== 1) continue;
    const cell = cells[0];
    const candidates = shuffled(ORTHO[cell], rnd);
    for (const nb of candidates) {
      const g = groups[cageOf[nb]];
      if (g === cells || g.length >= maxSize) continue;
      if (g.some((c) => solution[c] === solution[cell])) continue;
      g.push(cell);
      cageOf[cell] = cageOf[nb];
      cells.length = 0;
      break;
    }
  }

  const survivors = groups.filter((g) => g.length > 0);
  if (!allowSingles && survivors.some((g) => g.length === 1)) return null;

  const cages: Cage[] = survivors.map((g) => {
    const cellsSorted = [...g].sort((a, b) => a - b);
    return { cells: cellsSorted, sum: cellsSorted.reduce((s, c) => s + solution[c], 0) };
  });
  cages.sort((a, b) => a.cells[0] - b.cells[0]);
  const finalCageOf = new Array<number>(81).fill(-1);
  cages.forEach((cage, k) => cage.cells.forEach((c) => (finalCageOf[c] = k)));
  return { cages, cageOf: finalCageOf };
}

// ------------------------------------------------------- uniqueness solver

const ALL = 0x1ff; // bits 0..8 = digits 1..9

const POP = new Uint8Array(512);
for (let m = 0; m < 512; m++) {
  let p = 0;
  for (let d = 1; d <= 9; d++) {
    if (m & (1 << (d - 1))) p++;
  }
  POP[m] = p;
}

/** rows, cols, boxes — the 27 classic sudoku units. */
const UNITS: number[][] = (() => {
  const out: number[][] = [];
  for (let r = 0; r < 9; r++) out.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) out.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;
    const cells: number[] = [];
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) cells.push((br + dr) * 9 + bc + dc);
    out.push(cells);
  }
  return out;
})();

const PEERS_RCB: number[][] = Array.from({ length: 81 }, (_, i) => {
  const set = new Set<number>();
  for (let k = 0; k < 9; k++) {
    set.add(rowOf(i) * 9 + k);
    set.add(k * 9 + colOf(i));
  }
  const br = Math.floor(rowOf(i) / 3) * 3;
  const bc = Math.floor(colOf(i) / 3) * 3;
  for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) set.add((br + dr) * 9 + bc + dc);
  set.delete(i);
  return [...set];
});

/**
 * All k-subsets of distinct digits from `avail` summing to `sum`, as digit
 * bitmasks. Memoized globally — the key space is tiny (k, sum, 9-bit mask)
 * and generation + validation hit the same entries constantly.
 */
const comboMemo = new Map<number, number[]>();
function combosFor(k: number, sum: number, avail: number): number[] {
  const key = (k << 15) | (sum << 9) | avail;
  const hit = comboMemo.get(key);
  if (hit) return hit;
  const out: number[] = [];
  const rec = (minDigit: number, left: number, need: number, cur: number) => {
    if (left === 0) {
      if (need === 0) out.push(cur);
      return;
    }
    for (let d = minDigit; d <= 9; d++) {
      const bit = 1 << (d - 1);
      if (!(avail & bit)) continue;
      if (d > need) break;
      rec(d + 1, left - 1, need - d, cur | bit);
    }
  };
  rec(1, k, sum, 0);
  comboMemo.set(key, out);
  return out;
}

interface SolverCtx {
  cages: Cage[];
  /** row/col/box peers + same-cage peers, deduped, per cell */
  peers: number[][];
}

function makeCtx(puzzle: Pick<KillerPuzzle, 'cages' | 'cageOf'>): SolverCtx {
  const peers = PEERS_RCB.map((base, i) => {
    const set = new Set(base);
    for (const c of puzzle.cages[puzzle.cageOf[i]].cells) if (c !== i) set.add(c);
    return [...set];
  });
  return { cages: puzzle.cages, peers };
}

function assign(grid: Uint8Array, cand: Int32Array, ctx: SolverCtx, i: number, d: number): boolean {
  const bit = 1 << (d - 1);
  if (!(cand[i] & bit)) return false;
  grid[i] = d;
  cand[i] = bit;
  for (const p of ctx.peers[i]) {
    if (p === i) continue;
    if (cand[p] & bit) {
      if (grid[p] !== 0) return false;
      cand[p] &= ~bit;
      if (cand[p] === 0) return false;
    }
  }
  return true;
}

/**
 * Constraint propagation to fixpoint: naked singles, hidden singles in
 * rows/cols/boxes, and per-cage sum-combination filtering (candidates are
 * cut to the union of feasible distinct-digit combos; digits present in
 * every combo with a single home get placed). Returns false on
 * contradiction. This is what keeps count-to-2 fast on 0-given boards.
 */
function propagate(grid: Uint8Array, cand: Int32Array, ctx: SolverCtx): boolean {
  let changed = true;
  while (changed) {
    changed = false;

    // naked singles
    for (let i = 0; i < 81; i++) {
      if (grid[i] === 0 && POP[cand[i]] === 1) {
        const d = 1 + Math.log2(cand[i]);
        if (!assign(grid, cand, ctx, i, d)) return false;
        changed = true;
      }
    }

    // hidden singles in rows / cols / boxes
    for (const unit of UNITS) {
      for (let d = 1; d <= 9; d++) {
        const bit = 1 << (d - 1);
        let spot = -1;
        let count = 0;
        let placed = false;
        for (const c of unit) {
          if (grid[c] === d) {
            placed = true;
            break;
          }
          if (grid[c] === 0 && cand[c] & bit) {
            spot = c;
            count++;
            if (count > 1) break;
          }
        }
        if (placed) continue;
        if (count === 0) return false;
        if (count === 1) {
          if (!assign(grid, cand, ctx, spot, d)) return false;
          changed = true;
        }
      }
    }

    // cage sum feasibility
    for (const cage of ctx.cages) {
      let usedMask = 0;
      let placedSum = 0;
      let unionCands = 0;
      let unfilledCount = 0;
      for (const c of cage.cells) {
        if (grid[c] !== 0) {
          usedMask |= 1 << (grid[c] - 1);
          placedSum += grid[c];
        } else {
          unionCands |= cand[c];
          unfilledCount++;
        }
      }
      if (unfilledCount === 0) {
        if (placedSum !== cage.sum) return false;
        continue;
      }
      const remSum = cage.sum - placedSum;
      if (remSum < 1) return false;
      const avail = ~usedMask & ALL & unionCands;
      const combos = combosFor(unfilledCount, remSum, avail);
      if (combos.length === 0) return false;
      let allowed = 0;
      let required = ALL;
      for (const m of combos) {
        allowed |= m;
        required &= m;
      }
      for (const c of cage.cells) {
        if (grid[c] !== 0) continue;
        if (cand[c] & ~allowed) {
          cand[c] &= allowed;
          if (cand[c] === 0) return false;
          changed = true;
        }
      }
      // a digit in EVERY combo must live somewhere in the cage
      let req = required;
      while (req) {
        const bit = req & -req;
        req &= req - 1;
        let spot = -1;
        let count = 0;
        for (const c of cage.cells) {
          if (grid[c] === 0 && cand[c] & bit) {
            spot = c;
            count++;
            if (count > 1) break;
          }
        }
        if (count === 0) return false;
        if (count === 1) {
          if (!assign(grid, cand, ctx, spot, 1 + Math.log2(bit))) return false;
          changed = true;
        }
      }
    }
  }
  return true;
}

/** mutable search-node budget; -1 result = ran out before a verdict */
interface Budget {
  nodes: number;
}

function search(
  grid: Uint8Array,
  cand: Int32Array,
  ctx: SolverCtx,
  limit: number,
  budget: Budget
): number {
  if (--budget.nodes < 0) return -1;
  if (!propagate(grid, cand, ctx)) return 0;
  let best = -1;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (grid[i] === 0) {
      const n = POP[cand[i]];
      if (n < bestCount) {
        bestCount = n;
        best = i;
        if (n === 2) break;
      }
    }
  }
  if (best === -1) return 1; // fully decided and consistent
  let count = 0;
  let opts = cand[best];
  while (opts && count < limit) {
    const bit = opts & -opts;
    opts &= opts - 1;
    const g2 = grid.slice();
    const c2 = cand.slice();
    if (assign(g2, c2, ctx, best, 1 + Math.log2(bit))) {
      const sub = search(g2, c2, ctx, limit - count, budget);
      if (sub === -1) return -1;
      count += sub;
    }
  }
  return count;
}

/**
 * Counts solutions up to `limit` (default 2 — enough to prove uniqueness).
 * With a finite `maxNodes`, returns -1 when the search ran out of budget
 * before reaching a verdict — generation treats that as a rejection, which
 * both caps the check's cost and keeps accepted boards deduction-friendly.
 */
export function countSolutions(
  puzzle: Pick<KillerPuzzle, 'cages' | 'cageOf' | 'givens'>,
  limit = 2,
  maxNodes = Infinity
): number {
  const ctx = makeCtx(puzzle);
  const grid = new Uint8Array(81);
  const cand = new Int32Array(81).fill(ALL);
  for (let i = 0; i < 81; i++) {
    if (puzzle.givens[i] !== 0) {
      if (!assign(grid, cand, ctx, i, puzzle.givens[i])) return 0;
    }
  }
  return search(grid, cand, ctx, limit, { nodes: maxNodes });
}

// -------------------------------------------------------------- generation

function revealGivens(solution: Grid, count: number, rnd: () => number): Grid {
  const givens = new Array<number>(81).fill(0);
  const order = shuffled(Array.from({ length: 81 }, (_, i) => i), rnd);
  for (let k = 0; k < count; k++) givens[order[k]] = solution[order[k]];
  return givens;
}

/** node budget per uniqueness check during generation — caps the cost of a
 *  single check and rejects proof-resistant boards, which both bounds
 *  worst-case time and keeps accepted boards deduction-friendly */
const GEN_MAX_NODES = 1200;

/**
 * Generate a killer sudoku with a PROVEN unique solution. Seeded runs are
 * fully deterministic. Typical cost is a handful of partition attempts —
 * well under the 2s budget even on the 0-given tiers (see npm run validate).
 */
export function generateKiller(opts: GenerateOptions): KillerPuzzle {
  const seed = opts.seed ?? Math.floor(Math.random() * 0x7fffffff);
  const cfg = CONFIG[opts.difficulty];
  const rnd = mulberry32(seed);
  const allowSingles = cfg.givens > 0;

  for (let attempt = 0; attempt < 400; attempt++) {
    const solution: Grid = new Array(81).fill(0);
    fillGrid(solution, rnd);
    // several partitions per solution; unlucky seeds walk down the tier's
    // pool ladder toward smaller (more constraining) cages
    const pool = cfg.pools[Math.min(Math.floor(attempt / 3), cfg.pools.length - 1)];
    for (let p = 0; p < 12; p++) {
      const parts = buildCages(solution, pool, rnd, allowSingles);
      if (!parts) continue;
      const givens = revealGivens(solution, cfg.givens, rnd);
      const puzzle: KillerPuzzle = {
        seed,
        difficulty: opts.difficulty,
        solution,
        givens,
        cages: parts.cages,
        cageOf: parts.cageOf
      };
      if (countSolutions(puzzle, 2, GEN_MAX_NODES) === 1) return puzzle;
    }
  }
  // unreachable in practice: the ladder's smallest pools verify unique
  // within a couple of tries
  throw new Error('killer-sudoku: could not generate a unique puzzle');
}

// ------------------------------------------------------------ hint support

/**
 * The most constrained unsolved cell given the player's CORRECT entries
 * (wrong entries are ignored) — candidates are cut by row/col/box digits
 * and by cage sum combos. Used to aim the hint button somewhere teachable.
 */
export function findEasiestCell(puzzle: KillerPuzzle, values: Grid): number | null {
  const effective = values.map((v, i) => (v !== 0 && v === puzzle.solution[i] ? v : 0));
  let best: number | null = null;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (effective[i] !== 0) continue;
    let mask = ALL;
    for (const p of PEERS_RCB[i]) {
      if (effective[p] !== 0) mask &= ~(1 << (effective[p] - 1));
    }
    // cage feasibility for this cell
    const cage = puzzle.cages[puzzle.cageOf[i]];
    let usedMask = 0;
    let placedSum = 0;
    let unfilled = 0;
    for (const c of cage.cells) {
      if (effective[c] !== 0) {
        usedMask |= 1 << (effective[c] - 1);
        placedSum += effective[c];
      } else {
        unfilled++;
      }
    }
    const combos = combosFor(unfilled, cage.sum - placedSum, ~usedMask & ALL);
    let allowed = 0;
    for (const m of combos) allowed |= m;
    mask &= allowed;
    const n = POP[mask];
    if (n > 0 && n < bestCount) {
      bestCount = n;
      best = i;
      if (n === 1) break;
    }
  }
  return best;
}
