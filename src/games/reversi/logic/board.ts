/**
 * Reversi (Othello-style) board logic — pure, React-free, headlessly
 * testable. A board is a plain `number[]` of length 64 (row-major, index
 * = row*8 + col) so it is trivially JSON-serializable for save/resume.
 * Cell values: 0 = empty, 1 = Dark, 2 = Light. Dark always moves first.
 */

export const SIZE = 8;
export const CELLS = SIZE * SIZE;

export type Player = 1 | 2;
export type Cell = 0 | 1 | 2;
export type Board = number[];

export const DARK: Player = 1;
export const LIGHT: Player = 2;

export function opponent(p: Player): Player {
  return p === DARK ? LIGHT : DARK;
}

/** the eight ray directions as [dRow, dCol] */
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
];

const idx = (r: number, c: number): number => r * SIZE + c;
const inBounds = (r: number, c: number): boolean => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

/** the standard opening: four discs in the centre, diagonals same colour. */
export function initialBoard(): Board {
  const b = new Array<number>(CELLS).fill(0);
  b[idx(3, 3)] = LIGHT;
  b[idx(4, 4)] = LIGHT;
  b[idx(3, 4)] = DARK;
  b[idx(4, 3)] = DARK;
  return b;
}

/**
 * The captured discs a move would flip, grouped per direction and each
 * ordered from the placed disc outward (nearest first). Empty when the
 * move is illegal. Used both by `applyMove` and by the UI's staggered
 * flip animation (delay scales with a disc's distance from the move).
 */
export function flipLines(board: Board, move: number, player: Player): number[][] {
  if (board[move] !== 0) return [];
  const opp = opponent(player);
  const r0 = Math.floor(move / SIZE);
  const c0 = move % SIZE;
  const lines: number[][] = [];
  for (const [dr, dc] of DIRS) {
    const line: number[] = [];
    let r = r0 + dr;
    let c = c0 + dc;
    while (inBounds(r, c) && board[idx(r, c)] === opp) {
      line.push(idx(r, c));
      r += dr;
      c += dc;
    }
    // a run of ≥1 opponent discs must be closed by one of the player's discs
    if (line.length > 0 && inBounds(r, c) && board[idx(r, c)] === player) {
      lines.push(line);
    }
  }
  return lines;
}

/** flat list of every disc a move flips (excludes the placed square). */
export function flipsForMove(board: Board, move: number, player: Player): number[] {
  const out: number[] = [];
  for (const line of flipLines(board, move, player)) for (const i of line) out.push(i);
  return out;
}

export function isLegal(board: Board, move: number, player: Player): boolean {
  return board[move] === 0 && flipLines(board, move, player).length > 0;
}

/** every empty square where `player` outflanks at least one line. */
export function legalMoves(board: Board, player: Player): number[] {
  const moves: number[] = [];
  for (let i = 0; i < CELLS; i++) {
    if (board[i] !== 0) continue;
    if (flipLines(board, i, player).length > 0) moves.push(i);
  }
  return moves;
}

export function hasMove(board: Board, player: Player): boolean {
  for (let i = 0; i < CELLS; i++) {
    if (board[i] === 0 && flipLines(board, i, player).length > 0) return true;
  }
  return false;
}

/**
 * A NEW board with `move` placed for `player` and every outflanked disc
 * flipped. An illegal move (no flips) leaves the board unchanged.
 */
export function applyMove(board: Board, move: number, player: Player): Board {
  const flips = flipsForMove(board, move, player);
  const nb = board.slice();
  if (flips.length === 0) return nb;
  nb[move] = player;
  for (const f of flips) nb[f] = player;
  return nb;
}

export function countDiscs(board: Board): { dark: number; light: number; empty: number } {
  let dark = 0;
  let light = 0;
  let empty = 0;
  for (let i = 0; i < CELLS; i++) {
    const v = board[i];
    if (v === DARK) dark++;
    else if (v === LIGHT) light++;
    else empty++;
  }
  return { dark, light, empty };
}

/** the game ends when neither side has a legal move (board full or blocked). */
export function isGameOver(board: Board): boolean {
  return !hasMove(board, DARK) && !hasMove(board, LIGHT);
}
