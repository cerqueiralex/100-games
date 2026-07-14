/**
 * Binary Grid (Takuzu / Binairo) — seeded puzzle generation with a
 * uniqueness guarantee.
 *
 * Rules of a valid grid (even size, two symbols — sun/moon):
 *  1. no three identical symbols adjacent in any row or column
 *  2. every row and every column holds exactly size/2 of each symbol
 *  3. (uniqueLines variant, hard/pro/extreme) no two identical rows and
 *     no two identical columns
 *
 * Generation: backtracking-fill a complete valid grid, then remove cells in
 * point-symmetric pairs while a deduction solver still fully decides the
 * grid (depth 0 = forced moves only; depth 1 additionally rules out a
 * symbol when placing it leads to a contradiction — the pro/extreme tier).
 * Deduction-decided implies a UNIQUE solution; the final board is
 * re-proved unique with a count-to-2 backtracking solver anyway, and
 * `npm run validate` re-verifies both properties.
 */

export type CellValue = 0 | 1 | 2;
export const EMPTY = 0;
export const SUN = 1;
export const MOON = 2;

export interface BinaryPuzzle {
  seed: number;
  size: number;
  uniqueLines: boolean;
  /** 0 = cell for the player to fill; 1/2 = locked given */
  givens: number[];
  solution: number[];
}

/** The platform's standard tiny seeded RNG. */
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

/**
 * Can `v` legally sit at `idx` given the current partial grid? Checks the
 * three-in-a-row rule, the per-line count cap, and (when a line completes)
 * the unique-lines rule. `cells[idx]` is treated as `v` regardless of its
 * current content.
 */
export function canPlace(
  cells: number[],
  size: number,
  uniqueLines: boolean,
  idx: number,
  v: number
): boolean {
  const half = size / 2;
  const r = Math.floor(idx / size);
  const c = idx % size;
  const at = (i: number) => (i === idx ? v : cells[i]);

  // three-in-a-row: every window of 3 in this row/column containing idx
  for (let s = Math.max(0, c - 2); s <= Math.min(c, size - 3); s++) {
    const a = at(r * size + s);
    if (a !== 0 && a === at(r * size + s + 1) && a === at(r * size + s + 2)) return false;
  }
  for (let s = Math.max(0, r - 2); s <= Math.min(r, size - 3); s++) {
    const a = at(s * size + c);
    if (a !== 0 && a === at((s + 1) * size + c) && a === at((s + 2) * size + c)) return false;
  }

  // count cap + completeness bookkeeping for the unique-lines check
  let rowCount = 0;
  let rowFilled = 0;
  for (let i = 0; i < size; i++) {
    const x = at(r * size + i);
    if (x === v) rowCount++;
    if (x !== 0) rowFilled++;
  }
  if (rowCount > half) return false;
  let colCount = 0;
  let colFilled = 0;
  for (let i = 0; i < size; i++) {
    const x = at(i * size + c);
    if (x === v) colCount++;
    if (x !== 0) colFilled++;
  }
  if (colCount > half) return false;

  if (uniqueLines) {
    if (rowFilled === size) {
      for (let r2 = 0; r2 < size; r2++) {
        if (r2 === r) continue;
        let same = true;
        for (let i = 0; i < size; i++) {
          const other = cells[r2 * size + i];
          if (other === 0 || other !== at(r * size + i)) {
            same = false;
            break;
          }
        }
        if (same) return false;
      }
    }
    if (colFilled === size) {
      for (let c2 = 0; c2 < size; c2++) {
        if (c2 === c) continue;
        let same = true;
        for (let i = 0; i < size; i++) {
          const other = cells[i * size + c2];
          if (other === 0 || other !== at(i * size + c)) {
            same = false;
            break;
          }
        }
        if (same) return false;
      }
    }
  }

  return true;
}

/**
 * Queue-based forced-move propagation: apply every cell where exactly one
 * symbol is legal (covers the pair XX_, gap X_X and line-balance
 * techniques), cascading only through the rows/columns that changed.
 * `seeds` are the cells whose lines need (re-)examination — pass all filled
 * cells for a fresh grid, or just the newly set cell(s) when the rest of
 * the grid is already at fixpoint. Mutates `cells`; returns false on a
 * contradiction (some empty cell admits neither symbol).
 */
function propagateFrom(
  cells: number[],
  size: number,
  uniqueLines: boolean,
  seeds: number[]
): boolean {
  const queue = [...seeds];
  while (queue.length) {
    const idx = queue.pop()!;
    const r = Math.floor(idx / size);
    const c = idx % size;
    for (let k = 0; k < 2 * size; k++) {
      const j = k < size ? r * size + k : (k - size) * size + c;
      if (cells[j] !== 0) continue;
      const sunOk = canPlace(cells, size, uniqueLines, j, SUN);
      const moonOk = canPlace(cells, size, uniqueLines, j, MOON);
      if (!sunOk && !moonOk) return false;
      if (sunOk !== moonOk) {
        cells[j] = sunOk ? SUN : MOON;
        queue.push(j);
      }
    }
  }
  return true;
}

/**
 * Apply deductions until nothing changes. Mutates `cells`. Returns false on
 * a contradiction.
 *
 * depth 0: forced moves only (see propagateFrom).
 * depth 1: additionally, tentatively place a symbol and run depth-0
 * propagation; if that contradicts, the other symbol is forced ("what-if"
 * reasoning — the pro/extreme tier).
 */
function propagate(cells: number[], size: number, uniqueLines: boolean, depth = 0): boolean {
  const n = size * size;
  const all = Array.from({ length: n }, (_, i) => i);
  if (!propagateFrom(cells, size, uniqueLines, all)) return false;
  if (depth === 0) return true;

  const half = size / 2;
  for (let pass = 0; ; pass++) {
    // batch a what-if sweep: each applied value is truly forced (and stays
    // forced as more cells fill in), so applying several from one sweep is
    // sound. The grid is at depth-0 fixpoint before a sweep, so trial
    // propagation only needs to cascade from the trial cell. First passes
    // trial only cells in half-filled lines — where contradictions actually
    // cascade — and bail out early so cheap depth-0 propagation can take
    // over; a final unrestricted pass keeps the solver's full power.
    const applied: number[] = [];
    const restricted = pass < 4;
    for (let i = 0; i < n && applied.length < 4; i++) {
      if (cells[i] !== 0) continue;
      if (restricted) {
        const r = Math.floor(i / size);
        const c = i % size;
        let rowFilled = 0;
        let colFilled = 0;
        for (let k = 0; k < size; k++) {
          if (cells[r * size + k] !== 0) rowFilled++;
          if (cells[k * size + c] !== 0) colFilled++;
        }
        if (rowFilled < half && colFilled < half) continue;
      }
      for (const v of [SUN, MOON]) {
        if (!canPlace(cells, size, uniqueLines, i, v)) continue; // other already forced; next sweep picks it up
        const trial = cells.slice();
        trial[i] = v;
        if (!propagateFrom(trial, size, uniqueLines, [i])) {
          const other = 3 - v;
          if (!canPlace(cells, size, uniqueLines, i, other)) return false;
          cells[i] = other;
          applied.push(i);
          break;
        }
      }
    }
    if (applied.length === 0) {
      if (restricted) {
        pass = 4; // restricted sweep found nothing — try the full sweep
        continue;
      }
      return true; // fully stuck at this depth
    }
    if (!propagateFrom(cells, size, uniqueLines, applied)) return false;
  }
}

/**
 * Solve by pure deduction at the given depth. Returns the completed grid,
 * or null when deduction alone cannot decide it (or it contradicts).
 */
export function solveByDeduction(
  cells: number[],
  size: number,
  uniqueLines: boolean,
  depth: 0 | 1
): number[] | null {
  const g = cells.slice();
  if (!propagate(g, size, uniqueLines, depth)) return null;
  return g.includes(0) ? null : g;
}

/** The empty cell with the most filled row/column neighbours (fail-fast branching). */
function pickBranchCell(cells: number[], size: number): number {
  let best = -1;
  let bestScore = -1;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== 0) continue;
    const r = Math.floor(i / size);
    const c = i % size;
    let score = 0;
    for (let k = 0; k < size; k++) {
      if (cells[r * size + k] !== 0) score++;
      if (cells[k * size + c] !== 0) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/** Count completions of the partial grid, stopping at `limit` (usually 2). */
export function countSolutions(
  cells: number[],
  size: number,
  uniqueLines: boolean,
  limit = 2
): number {
  const g = cells.slice();
  if (!propagate(g, size, uniqueLines, 0)) return 0;
  const idx = g.indexOf(0) === -1 ? -1 : pickBranchCell(g, size);
  if (idx === -1) return 1; // every placement was legality-checked on the way in
  let total = 0;
  for (const v of [SUN, MOON]) {
    if (!canPlace(g, size, uniqueLines, idx, v)) continue;
    const g2 = g.slice();
    g2[idx] = v;
    total += countSolutions(g2, size, uniqueLines, limit - total);
    if (total >= limit) return total;
  }
  return total;
}

/** Backtracking-fill a complete valid grid (row-major, randomized order). */
function fillSolution(size: number, uniqueLines: boolean, rnd: () => number): number[] | null {
  const n = size * size;
  const cells = new Array<number>(n).fill(0);
  const solve = (idx: number): boolean => {
    if (idx === n) return true;
    const order = rnd() < 0.5 ? [SUN, MOON] : [MOON, SUN];
    for (const v of order) {
      if (!canPlace(cells, size, uniqueLines, idx, v)) continue;
      cells[idx] = v;
      if (solve(idx + 1)) return true;
      cells[idx] = 0;
    }
    return false;
  };
  return solve(0) ? cells : null;
}

/**
 * Generate a puzzle. Cells are removed in point-symmetric pairs (then a
 * single-cell sweep for finer control) down toward `targetGivens`, keeping
 * only removals after which the deduction solver at `depth` still fully
 * decides the grid — which makes every board guess-free at its tier AND
 * implies uniqueness. The final board is re-proved unique with the
 * count-to-2 backtracking solver as a belt-and-braces check.
 */
export function generateBinary(opts: {
  seed?: number;
  size: number;
  uniqueLines: boolean;
  targetGivens?: number;
  /** deduction depth boards must stay solvable at (1 = pro/extreme tier) */
  depth?: 0 | 1;
}): BinaryPuzzle {
  const seed = opts.seed ?? Math.floor(Math.random() * 0x7fffffff);
  const { size, uniqueLines } = opts;
  const depth = opts.depth ?? 0;
  const n = size * size;
  const target = opts.targetGivens ?? Math.floor(n * 0.3);
  const rnd = mulberry32(seed);

  let solution: number[] | null = null;
  for (let attempt = 0; attempt < 20 && !solution; attempt++) {
    solution = fillSolution(size, uniqueLines, rnd);
  }
  if (!solution) throw new Error(`binary-grid: could not fill a ${size}×${size} grid`);

  // cheap depth-0 check first — most early removals stay trivially solvable.
  // Depth-1 solves are the expensive path, so they get a hard budget: once
  // spent, removal continues on depth-0 checks only (worst-case generation
  // time stays bounded; the board just keeps a few more givens).
  let deepBudget = 36;
  const solvable = (g: number[]) => {
    if (solveByDeduction(g, size, uniqueLines, 0) !== null) return true;
    if (depth === 0 || deepBudget <= 0) return false;
    deepBudget--;
    return solveByDeduction(g, size, uniqueLines, 1) !== null;
  };
  const givens = solution.slice();
  let remaining = n;

  // Near the tier's floor every further attempt runs an expensive FAILING
  // deduction solve — a consecutive-miss budget cuts that tail off while
  // barely affecting how far removal gets.
  const MISS_BUDGET = depth === 1 ? 7 : 12;

  // pass 1: point-symmetric pairs (idx, n-1-idx) — even sizes, no center cell
  const pairs = shuffled(
    Array.from({ length: n / 2 }, (_, i) => i),
    rnd
  );
  let misses = 0;
  for (const a of pairs) {
    if (remaining <= target || misses >= MISS_BUDGET) break;
    const b = n - 1 - a;
    const va = givens[a];
    const vb = givens[b];
    givens[a] = 0;
    givens[b] = 0;
    if (solvable(givens)) {
      remaining -= 2;
      misses = 0;
    } else {
      givens[a] = va;
      givens[b] = vb;
      misses++;
    }
  }

  // pass 2: single cells, for tiers that want sparser boards
  if (remaining > target) {
    const singles = shuffled(
      Array.from({ length: n }, (_, i) => i).filter((i) => givens[i] !== 0),
      rnd
    );
    misses = 0;
    for (const i of singles) {
      if (remaining <= target || misses >= MISS_BUDGET) break;
      const v = givens[i];
      givens[i] = 0;
      if (solvable(givens)) {
        remaining--;
        misses = 0;
      } else {
        givens[i] = v;
        misses++;
      }
    }
  }

  if (countSolutions(givens, size, uniqueLines, 2) !== 1) {
    // deduction-decided boards are unique by construction; this is unreachable
    // in practice but keeps the guarantee explicit
    throw new Error(`binary-grid: seed ${seed} produced a non-unique board`);
  }

  return { seed, size, uniqueLines, givens, solution };
}

/**
 * Every cell currently taking part in a rule violation: a three-in-a-row
 * run, an over-quota line (all cells of the overflowing symbol), or a pair
 * of identical completed lines (uniqueLines variant).
 */
export function findViolations(cells: number[], size: number, uniqueLines: boolean): Set<number> {
  const half = size / 2;
  const out = new Set<number>();

  for (let r = 0; r < size; r++) {
    for (let c = 0; c + 2 < size; c++) {
      const a = cells[r * size + c];
      if (a !== 0 && a === cells[r * size + c + 1] && a === cells[r * size + c + 2]) {
        out.add(r * size + c);
        out.add(r * size + c + 1);
        out.add(r * size + c + 2);
      }
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r + 2 < size; r++) {
      const a = cells[r * size + c];
      if (a !== 0 && a === cells[(r + 1) * size + c] && a === cells[(r + 2) * size + c]) {
        out.add(r * size + c);
        out.add((r + 1) * size + c);
        out.add((r + 2) * size + c);
      }
    }
  }

  for (let r = 0; r < size; r++) {
    for (const v of [SUN, MOON]) {
      let count = 0;
      for (let c = 0; c < size; c++) if (cells[r * size + c] === v) count++;
      if (count > half) {
        for (let c = 0; c < size; c++) if (cells[r * size + c] === v) out.add(r * size + c);
      }
    }
  }
  for (let c = 0; c < size; c++) {
    for (const v of [SUN, MOON]) {
      let count = 0;
      for (let r = 0; r < size; r++) if (cells[r * size + c] === v) count++;
      if (count > half) {
        for (let r = 0; r < size; r++) if (cells[r * size + c] === v) out.add(r * size + c);
      }
    }
  }

  if (uniqueLines) {
    const rowKeys = new Map<string, number[]>();
    for (let r = 0; r < size; r++) {
      let key = '';
      let complete = true;
      for (let c = 0; c < size; c++) {
        const v = cells[r * size + c];
        if (v === 0) {
          complete = false;
          break;
        }
        key += v;
      }
      if (!complete) continue;
      const list = rowKeys.get(key) ?? [];
      list.push(r);
      rowKeys.set(key, list);
    }
    for (const rows of rowKeys.values()) {
      if (rows.length < 2) continue;
      for (const r of rows) for (let c = 0; c < size; c++) out.add(r * size + c);
    }

    const colKeys = new Map<string, number[]>();
    for (let c = 0; c < size; c++) {
      let key = '';
      let complete = true;
      for (let r = 0; r < size; r++) {
        const v = cells[r * size + c];
        if (v === 0) {
          complete = false;
          break;
        }
        key += v;
      }
      if (!complete) continue;
      const list = colKeys.get(key) ?? [];
      list.push(c);
      colKeys.set(key, list);
    }
    for (const cols of colKeys.values()) {
      if (cols.length < 2) continue;
      for (const c of cols) for (let r = 0; r < size; r++) out.add(r * size + c);
    }
  }

  return out;
}

export type HintRule = 'fix' | 'pair' | 'gap' | 'balance' | 'forced';

export interface Hint {
  idx: number;
  value: CellValue;
  rule: HintRule;
}

/**
 * One logically-forced move, with the rule that forces it — used by the
 * hint assist. Priority: fix a cell that contradicts the solution, then a
 * pair (XX_ / _XX), a gap (X_X), a balanced line, and finally a
 * solution-backed forced cell as fallback. When the grid is consistent with
 * the (unique) solution, every deduced value necessarily matches it.
 */
export function findHint(cells: number[], size: number, solution: number[]): Hint | null {
  const n = size * size;
  const half = size / 2;

  for (let i = 0; i < n; i++) {
    if (cells[i] !== 0 && cells[i] !== solution[i]) {
      return { idx: i, value: solution[i] as CellValue, rule: 'fix' };
    }
  }

  const lines: number[][] = [];
  for (let r = 0; r < size; r++) lines.push(Array.from({ length: size }, (_, c) => r * size + c));
  for (let c = 0; c < size; c++) lines.push(Array.from({ length: size }, (_, r) => r * size + c));

  // pair: XX_ or _XX
  for (const line of lines) {
    for (let i = 0; i + 2 < size; i++) {
      const [a, b, c] = [cells[line[i]], cells[line[i + 1]], cells[line[i + 2]]];
      if (a !== 0 && a === b && c === 0) {
        return { idx: line[i + 2], value: (3 - a) as CellValue, rule: 'pair' };
      }
      if (b !== 0 && b === c && a === 0) {
        return { idx: line[i], value: (3 - b) as CellValue, rule: 'pair' };
      }
    }
  }

  // gap: X_X
  for (const line of lines) {
    for (let i = 0; i + 2 < size; i++) {
      const [a, b, c] = [cells[line[i]], cells[line[i + 1]], cells[line[i + 2]]];
      if (a !== 0 && a === c && b === 0) {
        return { idx: line[i + 1], value: (3 - a) as CellValue, rule: 'gap' };
      }
    }
  }

  // balance: a line that already has all of one symbol
  for (const line of lines) {
    let suns = 0;
    let moons = 0;
    let firstEmpty = -1;
    for (const idx of line) {
      if (cells[idx] === SUN) suns++;
      else if (cells[idx] === MOON) moons++;
      else if (firstEmpty === -1) firstEmpty = idx;
    }
    if (firstEmpty === -1) continue;
    if (suns === half) return { idx: firstEmpty, value: MOON, rule: 'balance' };
    if (moons === half) return { idx: firstEmpty, value: SUN, rule: 'balance' };
  }

  // fallback: reveal one cell from the unique solution
  const empty = cells.indexOf(0);
  if (empty === -1) return null;
  return { idx: empty, value: solution[empty] as CellValue, rule: 'forced' };
}
