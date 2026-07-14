import type { Difficulty } from '../../../platform/types';

/** A magic-square grid: a flat array of n*n numbers, 0 = empty. */
export type Grid = number[];

export interface MagicPuzzle {
  n: number;
  /** A fully-filled, valid magic square (one canonical solution). */
  solution: Grid;
  /** The board shown to the player: given values, 0 where empty. */
  givens: Grid;
}

/** Grid size + number of pre-filled givens for each difficulty tier. */
export const MAGIC_CONFIG: Record<Difficulty, { n: number; clues: number }> = {
  easy: { n: 3, clues: 5 },
  medium: { n: 3, clues: 3 },
  hard: { n: 4, clues: 8 },
  pro: { n: 4, clues: 5 },
  extreme: { n: 5, clues: 10 }
};

/** The magic constant M = n(n²+1)/2 — the sum every line must reach. */
export function magicConstant(n: number): number {
  return (n * (n * n + 1)) / 2;
}

/** Deterministic seeded PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- base constructions ---------- */

/** Siamese (De la Loubère) method — a magic square for any ODD n. */
function siamese(n: number): Grid {
  const g = new Array<number>(n * n).fill(0);
  let r = 0;
  let c = (n / 2) | 0;
  for (let k = 1; k <= n * n; k++) {
    g[r * n + c] = k;
    const nr = (r - 1 + n) % n;
    const nc = (c + 1) % n;
    if (g[nr * n + nc] !== 0) {
      r = (r + 1) % n; // blocked → drop straight down
    } else {
      r = nr;
      c = nc;
    }
  }
  return g;
}

/**
 * Doubly-even construction for n divisible by 4 (used for n=4). Number the
 * cells 1..n² in reading order, then complement (v → n²+1−v) every cell that
 * sits on a diagonal of its 4×4 block.
 */
function doublyEven(n: number): Grid {
  const g = new Array<number>(n * n);
  const m = n * n + 1;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let v = r * n + c + 1;
      if (r % 4 === c % 4 || (r % 4) + (c % 4) === 3) v = m - v;
      g[r * n + c] = v;
    }
  }
  return g;
}

/** A canonical magic square for n ∈ {3, 5} (odd) or n = 4 (doubly even). */
export function baseSquare(n: number): Grid {
  if (n % 2 === 1) return siamese(n);
  if (n % 4 === 0) return doublyEven(n);
  throw new Error(`magic-square: unsupported size n=${n}`);
}

/* ---------- symmetry / value transforms (all preserve magic-ness) ---------- */

function rotate90(g: Grid, n: number): Grid {
  const o = new Array<number>(n * n);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) o[c * n + (n - 1 - r)] = g[r * n + c];
  return o;
}

function flipHorizontal(g: Grid, n: number): Grid {
  const o = new Array<number>(n * n);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) o[r * n + (n - 1 - c)] = g[r * n + c];
  return o;
}

/** v → n²+1−v : leaves every row/column/diagonal summing to M. */
function complement(g: Grid, n: number): Grid {
  const m = n * n + 1;
  return g.map((v) => m - v);
}

/* ---------- line sums & validation ---------- */

export interface LineSums {
  rows: number[];
  cols: number[];
  diag: number;
  anti: number;
}

/** Sum of the PLACED values along every row, column and both diagonals. */
export function lineSums(grid: Grid, n: number): LineSums {
  const rows = new Array<number>(n).fill(0);
  const cols = new Array<number>(n).fill(0);
  let diag = 0;
  let anti = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r * n + c];
      rows[r] += v;
      cols[c] += v;
    }
  }
  for (let i = 0; i < n; i++) {
    diag += grid[i * n + i];
    anti += grid[i * n + (n - 1 - i)];
  }
  return { rows, cols, diag, anti };
}

export interface Line {
  id: string;
  kind: 'row' | 'col' | 'diag' | 'anti';
  cells: number[];
}

/** Every scored line: n rows, n columns, main ↘ diagonal, anti ↗ diagonal. */
export function allLines(n: number): Line[] {
  const lines: Line[] = [];
  for (let r = 0; r < n; r++)
    lines.push({ id: `r${r}`, kind: 'row', cells: Array.from({ length: n }, (_, c) => r * n + c) });
  for (let c = 0; c < n; c++)
    lines.push({ id: `c${c}`, kind: 'col', cells: Array.from({ length: n }, (_, r) => r * n + c) });
  lines.push({ id: 'd', kind: 'diag', cells: Array.from({ length: n }, (_, i) => i * n + i) });
  lines.push({ id: 'a', kind: 'anti', cells: Array.from({ length: n }, (_, i) => i * n + (n - 1 - i) ) });
  return lines;
}

/**
 * A grid is a magic square when it is a permutation of 1..n² and every row,
 * column and both main diagonals sum to the magic constant. This is the WIN
 * check — ANY valid arrangement is accepted, not just the source solution.
 */
export function isMagic(grid: Grid, n: number): boolean {
  if (grid.length !== n * n) return false;
  const seen = new Set<number>();
  for (const v of grid) {
    if (!Number.isInteger(v) || v < 1 || v > n * n || seen.has(v)) return false;
    seen.add(v);
  }
  const M = magicConstant(n);
  const s = lineSums(grid, n);
  return s.rows.every((x) => x === M) && s.cols.every((x) => x === M) && s.diag === M && s.anti === M;
}

/** The numbers 1..n² not yet present in the grid — the tray contents. */
export function remainingNumbers(grid: Grid, n: number): number[] {
  const present = new Set(grid.filter((v) => v !== 0));
  const out: number[] = [];
  for (let v = 1; v <= n * n; v++) if (!present.has(v)) out.push(v);
  return out;
}

/* ---------- puzzle generation ---------- */

/**
 * Build a magic-square puzzle: a canonical full solution (randomised by a
 * symmetry + value transform) plus a subset of `clues` cells kept as givens.
 * Because larger boards have many valid completions, the win check is
 * `isMagic` — this solution is only ONE accepted answer.
 */
export function generateMagic({
  seed,
  n,
  clues
}: {
  seed?: number;
  n: number;
  clues?: number;
}): MagicPuzzle {
  const rng = mulberry32(((seed ?? Math.floor(Math.random() * 2 ** 31)) | 0) >>> 0);

  let solution = baseSquare(n);
  const rot = Math.floor(rng() * 4);
  for (let i = 0; i < rot; i++) solution = rotate90(solution, n);
  if (rng() < 0.5) solution = flipHorizontal(solution, n);
  if (rng() < 0.5) solution = complement(solution, n);

  const total = n * n;
  const keep = Math.max(0, Math.min(clues ?? Math.round(total * 0.4), total));
  const keptCells = new Set(shuffle(Array.from({ length: total }, (_, i) => i), rng).slice(0, keep));
  const givens = solution.map((v, i) => (keptCells.has(i) ? v : 0));

  return { n, solution, givens };
}
