import type { Difficulty } from '../../../platform/types';

export interface WheelEntry {
  answer: string;
  row: number;
  col: number;
  dir: 'across' | 'down';
}

export interface WheelLevel {
  id: string;
  letters: string[]; // the wheel
  entries: WheelEntry[];
}

/**
 * Hand-crafted levels. Every answer must be spellable from the wheel letters
 * (each wheel letter used at most once per word) and the grid must be a valid
 * criss-cross — `npm run validate` checks both after edits.
 */
export const LEVELS: Record<Difficulty, WheelLevel[]> = {
  easy: [
    {
      id: 'ww-easy-1',
      letters: ['E', 'A', 'S', 'T'],
      entries: [
        { answer: 'EAST', row: 0, col: 0, dir: 'across' },
        { answer: 'SEA', row: 0, col: 2, dir: 'down' },
        { answer: 'TEA', row: 2, col: 0, dir: 'across' }
      ]
    },
    {
      id: 'ww-easy-2',
      letters: ['T', 'O', 'N', 'E'],
      entries: [
        { answer: 'TONE', row: 0, col: 0, dir: 'across' },
        { answer: 'NOTE', row: 0, col: 2, dir: 'down' },
        { answer: 'TEN', row: 2, col: 2, dir: 'across' },
        { answer: 'ONE', row: 1, col: 4, dir: 'down' }
      ]
    }
  ],
  medium: [
    {
      id: 'ww-medium-1',
      letters: ['P', 'A', 'L', 'E', 'S'],
      entries: [
        { answer: 'PALES', row: 0, col: 0, dir: 'across' },
        { answer: 'PEAS', row: 0, col: 0, dir: 'down' },
        { answer: 'SEAL', row: 3, col: 0, dir: 'across' },
        { answer: 'SEA', row: 0, col: 4, dir: 'down' }
      ]
    },
    {
      id: 'ww-medium-2',
      letters: ['R', 'A', 'T', 'E', 'S'],
      entries: [
        { answer: 'STARE', row: 0, col: 0, dir: 'across' },
        { answer: 'TEARS', row: 0, col: 1, dir: 'down' },
        { answer: 'SEAT', row: 4, col: 1, dir: 'across' },
        { answer: 'RAT', row: 0, col: 3, dir: 'down' }
      ]
    }
  ],
  hard: [
    {
      id: 'ww-hard-1',
      letters: ['M', 'A', 'S', 'T', 'E', 'R'],
      entries: [
        { answer: 'MASTER', row: 0, col: 0, dir: 'across' },
        { answer: 'MEATS', row: 0, col: 0, dir: 'down' },
        { answer: 'STEAM', row: 0, col: 2, dir: 'down' },
        { answer: 'ATE', row: 2, col: 0, dir: 'across' },
        { answer: 'MATES', row: 4, col: 2, dir: 'across' }
      ]
    },
    {
      id: 'ww-hard-2',
      letters: ['G', 'A', 'R', 'D', 'E', 'N'],
      entries: [
        { answer: 'GARDEN', row: 0, col: 0, dir: 'across' },
        { answer: 'GRADE', row: 0, col: 0, dir: 'down' },
        { answer: 'DANGER', row: 0, col: 3, dir: 'down' },
        { answer: 'RANGE', row: 5, col: 3, dir: 'across' },
        { answer: 'NAG', row: 0, col: 5, dir: 'down' }
      ]
    }
  ]
};

export interface BuiltWheel {
  rows: number;
  cols: number;
  /** row-major solution letters; null = block */
  grid: (string | null)[];
  /** per entry: the cell indices it occupies */
  entryCells: number[][];
}

export function buildWheelLevel(level: WheelLevel): BuiltWheel {
  let rows = 0;
  let cols = 0;
  for (const e of level.entries) {
    rows = Math.max(rows, e.dir === 'down' ? e.row + e.answer.length : e.row + 1);
    cols = Math.max(cols, e.dir === 'across' ? e.col + e.answer.length : e.col + 1);
  }
  const grid: (string | null)[] = new Array(rows * cols).fill(null);
  const entryCells: number[][] = [];
  for (const e of level.entries) {
    const cells: number[] = [];
    for (let k = 0; k < e.answer.length; k++) {
      const r = e.dir === 'down' ? e.row + k : e.row;
      const c = e.dir === 'across' ? e.col + k : e.col;
      const idx = r * cols + c;
      const ch = e.answer[k].toUpperCase();
      if (grid[idx] !== null && grid[idx] !== ch) {
        throw new Error(`${level.id}: conflict at (${r},${c})`);
      }
      grid[idx] = ch;
      cells.push(idx);
    }
    entryCells.push(cells);
  }
  return { rows, cols, grid, entryCells };
}

/** Used by scripts/validate.ts. */
export function validateWheelLevel(level: WheelLevel): string[] {
  const errors: string[] = [];
  let built: BuiltWheel;
  try {
    built = buildWheelLevel(level);
  } catch (e) {
    return [(e as Error).message];
  }
  // every word spellable from the wheel (each letter once)
  for (const e of level.entries) {
    const pool = [...level.letters];
    for (const ch of e.answer.toUpperCase()) {
      const i = pool.indexOf(ch);
      if (i === -1) {
        errors.push(`${level.id}: "${e.answer}" is not spellable from the wheel`);
        break;
      }
      pool.splice(i, 1);
    }
  }
  // no accidental words: every run of 2+ letters must match an entry
  const { rows, cols, grid } = built;
  const has = (r: number, c: number) =>
    r >= 0 && r < rows && c >= 0 && c < cols && grid[r * cols + c] !== null;
  let runs = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!has(r, c)) continue;
      for (const [dir, dr, dc] of [
        ['across', 0, 1],
        ['down', 1, 0]
      ] as const) {
        if (has(r - dr, c - dc) || !has(r + dr, c + dc)) continue;
        runs++;
        let len = 0;
        while (has(r + dr * len, c + dc * len)) len++;
        const match = level.entries.find(
          (e) => e.dir === dir && e.row === r && e.col === c && e.answer.length === len
        );
        if (!match) errors.push(`${level.id}: accidental ${dir} run at (${r},${c}) len ${len}`);
      }
    }
  }
  if (runs !== level.entries.length) {
    errors.push(`${level.id}: ${level.entries.length} entries but ${runs} runs`);
  }
  return errors;
}

export function pickLevel(difficulty: Difficulty): WheelLevel {
  const list = LEVELS[difficulty];
  return list[Math.floor(Math.random() * list.length)];
}
