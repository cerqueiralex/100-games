import type { Difficulty } from '../../../platform/types';

/**
 * Futoshiki generator + solver. Boards are flat n×n arrays (0 = empty,
 * values 1..n). The generation contract: a puzzle is only returned when a
 * backtracking solver (counting to 2) confirms exactly ONE solution, and
 * both the inequality signs and the given digits are minimized against that
 * check — every kept constraint is load-bearing (except deliberately re-added
 * extras on the 'open' flavor and a small minimum sign count that keeps the
 * board reading as futoshiki). Deterministic per seed via mulberry32.
 */

/** One inequality sign between two orthogonally adjacent cells: value[a] < value[b]. */
export interface Ineq {
  a: number;
  b: number;
}

export interface FutoshikiPuzzle {
  n: number;
  seed: number;
  /** the unique solution, n*n values 1..n (a Latin square) */
  solution: number[];
  /** starting digits, n*n values, 0 = empty */
  givens: number[];
  ineqs: Ineq[];
}

/**
 * Constraint-mix bias. 'open' keeps extra givens for a gentle start (easy);
 * 'standard' minimizes both; 'lean' is inequality-heavy with minimal givens.
 */
export type Flavor = 'open' | 'standard' | 'lean';

export interface FutoshikiOptions {
  seed?: number;
  n: number;
  flavor?: Flavor;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, { n: number; flavor: Flavor }> = {
  easy: { n: 4, flavor: 'open' },
  medium: { n: 5, flavor: 'standard' },
  hard: { n: 6, flavor: 'standard' },
  pro: { n: 6, flavor: 'lean' },
  extreme: { n: 7, flavor: 'standard' }
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

/** Backtracking fill with shuffled candidates — always finds a Latin square. */
function randomLatin(n: number, rnd: () => number): number[] {
  const g = new Array<number>(n * n).fill(0);
  const digits = Array.from({ length: n }, (_, k) => k + 1);
  const fill = (idx: number): boolean => {
    if (idx === n * n) return true;
    const r = (idx / n) | 0;
    const c = idx % n;
    for (const v of shuffled(digits, rnd)) {
      let ok = true;
      for (let k = 0; k < n; k++) {
        if (g[r * n + k] === v || g[k * n + c] === v) {
          ok = false;
          break;
        }
      }
      if (ok) {
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

/** Every adjacent pair, oriented so solution[a] < solution[b]. */
function allEdges(n: number, solution: number[]): Ineq[] {
  const edges: Ineq[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const i = r * n + c;
      if (c + 1 < n) {
        const j = i + 1;
        edges.push(solution[i] < solution[j] ? { a: i, b: j } : { a: j, b: i });
      }
      if (r + 1 < n) {
        const j = i + n;
        edges.push(solution[i] < solution[j] ? { a: i, b: j } : { a: j, b: i });
      }
    }
  }
  return edges;
}

interface ConsTables {
  /** less[i] = cells j with value[i] < value[j] */
  less: number[][];
  /** greater[i] = cells j with value[j] < value[i] */
  greater: number[][];
  /** static per-cell bounds from inequality chains (a<b<c ⇒ c ≥ 3) */
  lo: number[];
  hi: number[];
}

function buildCons(n: number, ineqs: Ineq[]): ConsTables {
  const N = n * n;
  const less: number[][] = Array.from({ length: N }, () => []);
  const greater: number[][] = Array.from({ length: N }, () => []);
  for (const { a, b } of ineqs) {
    less[a].push(b);
    greater[b].push(a);
  }
  // longest chain strictly below/above each cell (the sign graph is a DAG —
  // every edge follows the solution's ordering; the pre-set 0 guards anyway)
  const below = new Array<number>(N).fill(-1);
  const above = new Array<number>(N).fill(-1);
  const chainBelow = (i: number): number => {
    if (below[i] >= 0) return below[i];
    below[i] = 0;
    let m = 0;
    for (const j of greater[i]) m = Math.max(m, chainBelow(j) + 1);
    below[i] = m;
    return m;
  };
  const chainAbove = (i: number): number => {
    if (above[i] >= 0) return above[i];
    above[i] = 0;
    let m = 0;
    for (const j of less[i]) m = Math.max(m, chainAbove(j) + 1);
    above[i] = m;
    return m;
  };
  const lo = new Array<number>(N);
  const hi = new Array<number>(N);
  for (let i = 0; i < N; i++) {
    lo[i] = 1 + chainBelow(i);
    hi[i] = n - chainAbove(i);
  }
  return { less, greater, lo, hi };
}

/** Counts solutions up to `limit` (early exit) with MRV backtracking. */
export function countSolutions(n: number, givens: number[], ineqs: Ineq[], limit = 2): number {
  const N = n * n;
  const grid = [...givens];
  const { less, greater, lo, hi } = buildCons(n, ineqs);
  const rowMask = new Array<number>(n).fill(0);
  const colMask = new Array<number>(n).fill(0);
  for (let i = 0; i < N; i++) {
    const v = grid[i];
    if (v === 0) continue;
    const bit = 1 << v;
    const r = (i / n) | 0;
    const c = i % n;
    if (rowMask[r] & bit || colMask[c] & bit) return 0;
    rowMask[r] |= bit;
    colMask[c] |= bit;
  }
  for (const { a, b } of ineqs) {
    if (grid[a] !== 0 && grid[b] !== 0 && grid[a] >= grid[b]) return 0;
  }

  const tmp = new Array<number>(n);
  const candsAt = (i: number): number => {
    const r = (i / n) | 0;
    const c = i % n;
    let cnt = 0;
    for (let v = lo[i]; v <= hi[i]; v++) {
      const bit = 1 << v;
      if (rowMask[r] & bit || colMask[c] & bit) continue;
      let ok = true;
      for (const j of less[i]) {
        if (grid[j] !== 0 && v >= grid[j]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        for (const j of greater[i]) {
          if (grid[j] !== 0 && v <= grid[j]) {
            ok = false;
            break;
          }
        }
      }
      if (ok) tmp[cnt++] = v;
    }
    return cnt;
  };

  let count = 0;
  const search = (): void => {
    let bi = -1;
    let bcands: number[] | null = null;
    for (let i = 0; i < N; i++) {
      if (grid[i] !== 0) continue;
      const cnt = candsAt(i);
      if (cnt === 0) return;
      if (!bcands || cnt < bcands.length) {
        bi = i;
        bcands = tmp.slice(0, cnt);
        if (cnt === 1) break;
      }
    }
    if (bi === -1 || !bcands) {
      count++;
      return;
    }
    const r = (bi / n) | 0;
    const c = bi % n;
    for (const v of bcands) {
      const bit = 1 << v;
      grid[bi] = v;
      rowMask[r] |= bit;
      colMask[c] |= bit;
      search();
      grid[bi] = 0;
      rowMask[r] &= ~bit;
      colMask[c] &= ~bit;
      if (count >= limit) return;
    }
  };
  search();
  return count;
}

export function generateFutoshiki(opts: FutoshikiOptions): FutoshikiPuzzle {
  const { n } = opts;
  const flavor = opts.flavor ?? 'standard';
  const seed = (opts.seed ?? Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  const rnd = mulberry32(seed);

  const solution = randomLatin(n, rnd);
  const edges = allEdges(n, solution);

  // --- chain-biased sign sampling: edges that extend a monotone chain
  // (x < a and we add a < b, or a < b and we add b < y) are strongly
  // preferred — chains make the prettiest deductions.
  const picked = new Array<boolean>(edges.length).fill(false);
  let pickedCount = 0;
  const smallEnd = new Set<number>();
  const largeEnd = new Set<number>();
  const weights = new Array<number>(edges.length);
  const pickEdge = (): number => {
    let total = 0;
    for (let k = 0; k < edges.length; k++) {
      if (picked[k]) {
        weights[k] = 0;
        continue;
      }
      const e = edges[k];
      let w = 1;
      if (largeEnd.has(e.a)) w += 3; // extends chain upward
      if (smallEnd.has(e.b)) w += 3; // extends chain downward
      if (smallEnd.has(e.a) || largeEnd.has(e.b)) w += 1; // fan at a shared cell
      weights[k] = w;
      total += w;
    }
    if (total === 0) return -1;
    let roll = rnd() * total;
    for (let k = 0; k < edges.length; k++) {
      roll -= weights[k];
      if (weights[k] > 0 && roll <= 0) return k;
    }
    return -1;
  };
  const takeEdge = (k: number): void => {
    picked[k] = true;
    pickedCount++;
    smallEnd.add(edges[k].a);
    largeEnd.add(edges[k].b);
  };

  const initialFrac = flavor === 'lean' ? 0.5 : flavor === 'open' ? 0.28 : 0.38;
  const targetSigns = Math.round(edges.length * initialFrac);
  while (pickedCount < targetSigns) {
    const k = pickEdge();
    if (k < 0) break;
    takeEdge(k);
  }

  // --- seed a few givens (none on 'lean'), then grow constraints until the
  // solver confirms uniqueness.
  const givens = new Array<number>(n * n).fill(0);
  const cellOrder = shuffled(Array.from({ length: n * n }, (_, i) => i), rnd);
  let cellPtr = 0;
  const addGiven = (): boolean => {
    while (cellPtr < cellOrder.length && givens[cellOrder[cellPtr]] !== 0) cellPtr++;
    if (cellPtr >= cellOrder.length) return false;
    const cell = cellOrder[cellPtr++];
    givens[cell] = solution[cell];
    return true;
  };
  const seedGivens = flavor === 'lean' ? 0 : flavor === 'open' ? Math.ceil(n * 0.75) : Math.max(1, n - 4);
  for (let k = 0; k < seedGivens; k++) addGiven();

  const currentIneqs = (): Ineq[] => edges.filter((_, k) => picked[k]);
  let ineqs = currentIneqs();
  while (countSolutions(n, givens, ineqs) !== 1) {
    const preferSign = rnd() < (flavor === 'lean' ? 0.8 : flavor === 'open' ? 0.35 : 0.55);
    let added = false;
    if (preferSign) {
      const k = pickEdge();
      if (k >= 0) {
        takeEdge(k);
        added = true;
      }
    }
    if (!added) added = addGiven();
    if (!added) {
      const k = pickEdge();
      if (k >= 0) {
        takeEdge(k);
        added = true;
      }
    }
    if (!added) break; // fully constrained — trivially unique
    ineqs = currentIneqs();
  }

  // --- minimize while the solver keeps confirming uniqueness. A small
  // minimum sign count keeps the board reading as futoshiki (extra
  // constraints can never break uniqueness).
  const minSigns = n;
  const tryRemoveGiven = (i: number): void => {
    const v = givens[i];
    if (v === 0) return;
    givens[i] = 0;
    if (countSolutions(n, givens, ineqs) !== 1) givens[i] = v;
  };
  const tryRemoveSign = (k: number): void => {
    if (!picked[k] || pickedCount <= minSigns) return;
    picked[k] = false;
    const trial = currentIneqs();
    if (countSolutions(n, givens, trial) !== 1) {
      picked[k] = true;
    } else {
      pickedCount--;
      ineqs = trial;
    }
  };
  const givenIdxs = shuffled(
    Array.from({ length: n * n }, (_, i) => i).filter((i) => givens[i] !== 0),
    rnd
  );
  const signIdxs = shuffled(
    Array.from({ length: edges.length }, (_, k) => k).filter((k) => picked[k]),
    rnd
  );
  if (flavor === 'lean') {
    // strip givens first (signs still abundant), then redundant signs
    for (const i of givenIdxs) tryRemoveGiven(i);
    for (const k of signIdxs) tryRemoveSign(k);
  } else if (flavor === 'open') {
    // strip signs first (fewer signs = simpler board), then givens
    for (const k of signIdxs) tryRemoveSign(k);
    for (const i of givenIdxs) tryRemoveGiven(i);
  } else {
    const ops = shuffled(
      [
        ...givenIdxs.map((i) => ({ t: 'g' as const, i })),
        ...signIdxs.map((k) => ({ t: 's' as const, i: k }))
      ],
      rnd
    );
    for (const op of ops) {
      if (op.t === 'g') tryRemoveGiven(op.i);
      else tryRemoveSign(op.i);
    }
  }

  // --- 'open' hands back a few extra givens for a gentler start
  if (flavor === 'open') {
    const empty = shuffled(
      Array.from({ length: n * n }, (_, i) => i).filter((i) => givens[i] === 0),
      rnd
    );
    const extra = Math.min(empty.length, 2 + Math.floor(n / 4));
    for (let k = 0; k < extra; k++) givens[empty[k]] = solution[empty[k]];
  }

  return { n, seed, solution, givens, ineqs: currentIneqs() };
}

/**
 * Finds a cell whose value is logically forced by the current CORRECT
 * entries (wrong entries are ignored so deductions stay sound): row/column
 * exclusions + inequality signs + chain bounds leave a single candidate.
 * The returned value always equals the solution's.
 */
export function findForcedCell(
  p: FutoshikiPuzzle,
  values: number[]
): { idx: number; val: number } | null {
  const { n, solution, ineqs } = p;
  const N = n * n;
  const effective = values.map((v, i) => (v === solution[i] ? v : 0));
  const { less, greater, lo, hi } = buildCons(n, ineqs);
  const rowMask = new Array<number>(n).fill(0);
  const colMask = new Array<number>(n).fill(0);
  for (let i = 0; i < N; i++) {
    if (effective[i] !== 0) {
      rowMask[(i / n) | 0] |= 1 << effective[i];
      colMask[i % n] |= 1 << effective[i];
    }
  }
  for (let i = 0; i < N; i++) {
    if (effective[i] !== 0) continue;
    let only = 0;
    let cnt = 0;
    for (let v = lo[i]; v <= hi[i]; v++) {
      const bit = 1 << v;
      if (rowMask[(i / n) | 0] & bit || colMask[i % n] & bit) continue;
      let ok = true;
      for (const j of less[i]) {
        if (effective[j] !== 0 && v >= effective[j]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        for (const j of greater[i]) {
          if (effective[j] !== 0 && v <= effective[j]) {
            ok = false;
            break;
          }
        }
      }
      if (ok) {
        only = v;
        cnt++;
        if (cnt > 1) break;
      }
    }
    if (cnt === 1) return { idx: i, val: only };
  }
  return null;
}

/** Integrity check used by npm run validate and the headless tests. */
export function verifyFutoshiki(p: FutoshikiPuzzle): string[] {
  const errs: string[] = [];
  const { n, solution, givens, ineqs } = p;
  const N = n * n;
  if (solution.length !== N) errs.push(`solution has ${solution.length} cells, expected ${N}`);
  if (givens.length !== N) errs.push(`givens has ${givens.length} cells, expected ${N}`);
  if (errs.length > 0) return errs;
  const want = (1 << (n + 1)) - 2; // bits 1..n
  for (let k = 0; k < n; k++) {
    let rm = 0;
    let cm = 0;
    for (let j = 0; j < n; j++) {
      rm |= 1 << solution[k * n + j];
      cm |= 1 << solution[j * n + k];
    }
    if (rm !== want) errs.push(`row ${k} is not a permutation of 1..${n}`);
    if (cm !== want) errs.push(`col ${k} is not a permutation of 1..${n}`);
  }
  for (let i = 0; i < N; i++) {
    if (givens[i] !== 0 && givens[i] !== solution[i]) errs.push(`given at cell ${i} contradicts the solution`);
  }
  if (ineqs.length === 0) errs.push('puzzle has no inequality signs');
  const seen = new Set<string>();
  for (const { a, b } of ineqs) {
    const ra = (a / n) | 0;
    const ca = a % n;
    const rb = (b / n) | 0;
    const cb = b % n;
    if (Math.abs(ra - rb) + Math.abs(ca - cb) !== 1) errs.push(`sign ${a}<${b} joins non-adjacent cells`);
    if (solution[a] >= solution[b]) errs.push(`sign ${a}<${b} contradicts the solution`);
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) errs.push(`duplicate sign on edge ${key}`);
    seen.add(key);
  }
  if (errs.length === 0 && countSolutions(n, givens, ineqs, 2) !== 1) {
    errs.push('solution is not unique');
  }
  return errs;
}
