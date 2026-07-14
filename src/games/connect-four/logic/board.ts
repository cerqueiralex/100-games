/**
 * Connect Four board logic — pure TypeScript, no React, so it can be
 * validated headlessly. Board is a flat `Cell[]` of length COLS*ROWS, index
 * `row * COLS + col`, row 0 at the TOP. Discs fall to the lowest empty cell
 * (largest row index) of a column.
 */

export const COLS = 7;
export const ROWS = 6;
export const SIZE = COLS * ROWS;

export type Disc = 'r' | 'y';
export type Cell = Disc | null;

export const other = (d: Disc): Disc => (d === 'r' ? 'y' : 'r');
export const idx = (row: number, col: number): number => row * COLS + col;
export const emptyBoard = (): Cell[] => new Array<Cell>(SIZE).fill(null);

/** columns that still have room (top cell empty) */
export function legalCols(board: Cell[]): number[] {
  const out: number[] = [];
  for (let c = 0; c < COLS; c++) if (board[c] === null) out.push(c);
  return out;
}

/** the row a disc dropped into `col` would land on, or -1 if the column is full */
export function dropRow(board: Cell[], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[idx(r, col)] === null) return r;
  }
  return -1;
}

/** drop a disc into a column, returning a NEW board + the landing row (null if full) */
export function drop(board: Cell[], col: number, disc: Disc): { board: Cell[]; row: number } | null {
  const r = dropRow(board, col);
  if (r < 0) return null;
  const next = board.slice();
  next[idx(r, col)] = disc;
  return { board: next, row: r };
}

/** board full iff every top-row cell is occupied (columns fill bottom-up) */
export const isFull = (board: Cell[]): boolean => {
  for (let c = 0; c < COLS; c++) if (board[c] === null) return false;
  return true;
};

/** the four line directions, expressed as (dRow, dCol) half-vectors */
const DIRS: readonly [number, number][] = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal down-right
  [1, -1] // diagonal down-left
];

/**
 * Fast win test around a single just-placed cell. Returns the connected run
 * of `disc` (length >= 4) through (row,col) if it makes four in a row, else
 * null. Used by the AI, where checking only the last move each node is far
 * cheaper than a full scan.
 */
export function winsAt(board: Cell[], row: number, col: number, disc: Disc): number[] | null {
  for (const [dr, dc] of DIRS) {
    const run = [idx(row, col)];
    for (const sign of [1, -1] as const) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[idx(r, c)] === disc) {
        run.push(idx(r, c));
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (run.length >= 4) return run;
  }
  return null;
}

/**
 * Full-board winner scan. Returns the winning disc and the first four
 * collinear cells found (in scan order), or null. Detects all four
 * orientations. Used by the game for display; cheap on a 42-cell board.
 */
export function checkWinner(board: Cell[]): { disc: Disc; cells: number[] } | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[idx(r, c)];
      if (!cell) continue;
      for (const [dr, dc] of DIRS) {
        const cells = [idx(r, c)];
        let rr = r + dr;
        let cc = c + dc;
        while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[idx(rr, cc)] === cell) {
          cells.push(idx(rr, cc));
          rr += dr;
          cc += dc;
        }
        if (cells.length >= 4) return { disc: cell, cells: cells.slice(0, 4) };
      }
    }
  }
  return null;
}

/** columns where `disc` has an immediate winning drop (used by threat-warn) */
export function immediateWins(board: Cell[], disc: Disc): number[] {
  const out: number[] = [];
  for (const c of legalCols(board)) {
    const r = dropRow(board, c);
    const test = board.slice();
    test[idx(r, c)] = disc;
    if (winsAt(test, r, c, disc)) out.push(c);
  }
  return out;
}
