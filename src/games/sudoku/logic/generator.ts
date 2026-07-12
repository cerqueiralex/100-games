import type { Difficulty } from '../../../platform/types';

/** Grids are flat arrays of 81 numbers, 0 = empty. */
export type Grid = number[];

export interface SudokuPuzzle {
  puzzle: Grid;
  solution: Grid;
}

const CLUES: Record<Difficulty, number> = {
  easy: 40,
  medium: 32,
  hard: 27,
  pro: 25,
  extreme: 23
};

export const rowOf = (i: number) => Math.floor(i / 9);
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValid(grid: Grid, idx: number, val: number): boolean {
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

function fillGrid(grid: Grid, idx = 0): boolean {
  if (idx === 81) return true;
  if (grid[idx] !== 0) return fillGrid(grid, idx + 1);
  for (const val of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (isValid(grid, idx, val)) {
      grid[idx] = val;
      if (fillGrid(grid, idx + 1)) return true;
      grid[idx] = 0;
    }
  }
  return false;
}

/** Counts solutions up to `limit` (early exit), used to guarantee uniqueness. */
function countSolutions(grid: Grid, limit = 2): number {
  // pick the empty cell with fewest candidates for speed
  let best = -1;
  let bestCands: number[] | null = null;
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    const cands: number[] = [];
    for (let v = 1; v <= 9; v++) if (isValid(grid, i, v)) cands.push(v);
    if (cands.length === 0) return 0;
    if (!bestCands || cands.length < bestCands.length) {
      best = i;
      bestCands = cands;
      if (cands.length === 1) break;
    }
  }
  if (best === -1) return 1; // full grid
  let count = 0;
  for (const v of bestCands!) {
    grid[best] = v;
    count += countSolutions(grid, limit - count);
    grid[best] = 0;
    if (count >= limit) break;
  }
  return count;
}

/** Dig clues out of a copy of `solution` while keeping the solution unique. */
function dig(solution: Grid, targetClues: number): Grid {
  const puzzle = [...solution];
  let clues = 81;

  // Pass 1: remove symmetric pairs while the puzzle keeps a unique solution.
  const order = shuffled(Array.from({ length: 81 }, (_, i) => i));
  for (const idx of order) {
    if (clues <= targetClues) break;
    const mirror = 80 - idx;
    const removed: [number, number][] = [];
    for (const i of idx === mirror ? [idx] : [idx, mirror]) {
      if (puzzle[i] !== 0) {
        removed.push([i, puzzle[i]]);
        puzzle[i] = 0;
      }
    }
    if (removed.length === 0) continue;
    if (countSolutions([...puzzle]) !== 1) {
      for (const [i, v] of removed) puzzle[i] = v; // restore, not uniquely solvable
    } else {
      clues -= removed.length;
    }
  }

  // Pass 2: symmetric digging plateaus around 28 clues — the pro/extreme
  // targets need a single-cell sweep to squeeze the last few out.
  for (const idx of shuffled(order)) {
    if (clues <= targetClues) break;
    if (puzzle[idx] === 0) continue;
    const v = puzzle[idx];
    puzzle[idx] = 0;
    if (countSolutions([...puzzle]) !== 1) puzzle[idx] = v;
    else clues--;
  }

  return puzzle;
}

export function generatePuzzle(difficulty: Difficulty): SudokuPuzzle {
  const targetClues = CLUES[difficulty];
  let best: SudokuPuzzle | null = null;
  let bestClues = 82;

  // a few fresh grids + digs, keeping the leanest — low targets aren't
  // reachable from every filled grid
  for (let attempt = 0; attempt < 6; attempt++) {
    const solution: Grid = new Array(81).fill(0);
    fillGrid(solution);
    const puzzle = dig(solution, targetClues);
    const clues = puzzle.filter((v) => v !== 0).length;
    if (clues < bestClues) {
      bestClues = clues;
      best = { puzzle, solution };
    }
    if (bestClues <= targetClues) break;
  }

  return best!;
}

/** Finds a cell that currently has exactly one valid candidate ("naked single"). */
export function findNakedSingle(current: Grid): { idx: number; val: number } | null {
  for (let i = 0; i < 81; i++) {
    if (current[i] !== 0) continue;
    let only = 0;
    let n = 0;
    for (let v = 1; v <= 9; v++) {
      if (isValid(current, i, v)) {
        only = v;
        n++;
        if (n > 1) break;
      }
    }
    if (n === 1) return { idx: i, val: only };
  }
  return null;
}
