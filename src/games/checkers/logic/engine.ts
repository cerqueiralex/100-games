/**
 * Checkers (English draughts) engine — pure, React-free, headlessly testable.
 *
 * Board: 8×8, index = row*8 + col (row 0 = top). Only dark squares
 * ((row+col) odd) are ever occupied. Red starts at the bottom (rows 5–7) and
 * moves UP (decreasing row); Black starts at the top (rows 0–2) and moves DOWN.
 * Men move one step diagonally forward; a King moves/jumps both directions.
 * Captures (jumps) are MANDATORY when any exist (English forced-capture rule),
 * multi-jumps must be completed, and a man that reaches the far row is crowned
 * — a promotion during a jump ENDS the move (standard English rule).
 */

export type Side = 'r' | 'b';

export interface Piece {
  side: Side;
  king: boolean;
}

export type Cell = Piece | null;
export type Board = Cell[]; // length 64

/** A single jump step from the currently-selected piece. */
export interface Hop {
  /** landing square */
  to: number;
  /** square of the jumped opponent piece */
  captured: number;
  /** the man is crowned on landing (jump then ends) */
  promotes: boolean;
}

/** A complete legal move (simple slide or full jump chain). */
export interface Move {
  from: number;
  /** final landing square */
  to: number;
  /** landing squares in order (length ≥ 1) */
  path: number[];
  /** captured squares in order (empty for a simple move) */
  captures: number[];
  /** the piece is crowned at the end of this move */
  promoted: boolean;
}

const RED_DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 1]
];
const BLACK_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, -1],
  [1, 1]
];
const KING_DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1]
];

export const otherSide = (s: Side): Side => (s === 'r' ? 'b' : 'r');

const rowOf = (i: number) => Math.floor(i / 8);
const colOf = (i: number) => i % 8;
const isDark = (i: number) => (rowOf(i) + colOf(i)) % 2 === 1;

/** step one diagonal from `i`; returns -1 if it leaves the board */
function step(i: number, dr: number, dc: number): number {
  const r = rowOf(i) + dr;
  const c = colOf(i) + dc;
  if (r < 0 || r > 7 || c < 0 || c > 7) return -1;
  return r * 8 + c;
}

const dirsFor = (p: Piece) => (p.king ? KING_DIRS : p.side === 'r' ? RED_DIRS : BLACK_DIRS);

/** a man of `side` promotes when it reaches the opponent's home row */
const isPromoRow = (sq: number, side: Side) => (side === 'r' ? rowOf(sq) === 0 : rowOf(sq) === 7);

/** the classic starting position — 12 pieces per side on the dark squares */
export function initialBoard(): Board {
  const board: Board = new Array(64).fill(null);
  for (let i = 0; i < 64; i++) {
    if (!isDark(i)) continue;
    const r = rowOf(i);
    if (r <= 2) board[i] = { side: 'b', king: false };
    else if (r >= 5) board[i] = { side: 'r', king: false };
  }
  return board;
}

/** single jump steps available from the piece on `from` (no chaining) */
export function captureHopsFrom(board: Board, from: number): Hop[] {
  const p = board[from];
  if (!p) return [];
  const out: Hop[] = [];
  for (const [dr, dc] of dirsFor(p)) {
    const mid = step(from, dr, dc);
    if (mid < 0) continue;
    const mp = board[mid];
    if (!mp || mp.side === p.side) continue;
    const land = step(mid, dr, dc);
    if (land < 0 || board[land]) continue;
    out.push({ to: land, captured: mid, promotes: !p.king && isPromoRow(land, p.side) });
  }
  return out;
}

/** simple (non-capturing) landing squares from the piece on `from` */
export function simpleTargetsFrom(board: Board, from: number): { to: number; promotes: boolean }[] {
  const p = board[from];
  if (!p) return [];
  const out: { to: number; promotes: boolean }[] = [];
  for (const [dr, dc] of dirsFor(p)) {
    const to = step(from, dr, dc);
    if (to < 0 || board[to]) continue;
    out.push({ to, promotes: !p.king && isPromoRow(to, p.side) });
  }
  return out;
}

/** does `side` have any capture available (drives the forced-capture rule)? */
export function sideHasCapture(board: Board, side: Side): boolean {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.side === side && captureHopsFrom(board, i).length > 0) return true;
  }
  return false;
}

/** any legal move at all (used for stalemate / loss detection) */
export function hasAnyMove(board: Board, side: Side): boolean {
  if (sideHasCapture(board, side)) return true;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.side === side && simpleTargetsFrom(board, i).length > 0) return true;
  }
  return false;
}

/** squares of `side` that currently have at least one capture available */
export function capturingPieces(board: Board, side: Side): number[] {
  const out: number[] = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.side === side && captureHopsFrom(board, i).length > 0) out.push(i);
  }
  return out;
}

/** enumerate all maximal jump chains from `from` (remove-at-end semantics) */
function captureChains(board: Board, from: number): Move[] {
  const piece = board[from];
  if (!piece) return [];
  // lift the moving piece; captured pieces stay on the scratch board so they
  // block landings and can't be jumped twice (tracked via `captured`)
  const scratch = board.slice();
  scratch[from] = null;
  const out: Move[] = [];

  const rec = (cur: number, path: number[], captured: number[]) => {
    for (const [dr, dc] of dirsFor(piece)) {
      const mid = step(cur, dr, dc);
      if (mid < 0) continue;
      const mp = scratch[mid];
      if (!mp || mp.side === piece.side || captured.includes(mid)) continue;
      const land = step(mid, dr, dc);
      if (land < 0 || scratch[land]) continue;
      const promote = !piece.king && isPromoRow(land, piece.side);
      const np = [...path, land];
      const nc = [...captured, mid];
      if (promote) {
        // crowning ends the move — no further chaining
        out.push({ from, to: land, path: np, captures: nc, promoted: true });
      } else {
        const before = out.length;
        rec(land, np, nc);
        // if the landing offered no continuation this chain ends here
        if (out.length === before) {
          out.push({ from, to: land, path: np, captures: nc, promoted: false });
        }
      }
    }
  };

  rec(from, [], []);
  return out;
}

/** every legal move for `side`; captures only when a capture exists */
export function generateMoves(board: Board, side: Side): Move[] {
  const caps: Move[] = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.side === side) caps.push(...captureChains(board, i));
  }
  if (caps.length > 0) return caps;

  const simple: Move[] = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.side !== side) continue;
    for (const t of simpleTargetsFrom(board, i)) {
      simple.push({ from: i, to: t.to, path: [t.to], captures: [], promoted: t.promotes });
    }
  }
  return simple;
}

/** apply a full move, returning a fresh board */
export function applyMove(board: Board, move: Move): Board {
  const nb = board.slice();
  const p = nb[move.from];
  nb[move.from] = null;
  for (const c of move.captures) nb[c] = null;
  nb[move.to] = { side: p!.side, king: p!.king || move.promoted };
  return nb;
}

/** apply a single jump hop, returning a fresh board */
export function applyHop(board: Board, from: number, hop: Hop): Board {
  const nb = board.slice();
  const p = nb[from];
  nb[from] = null;
  nb[hop.captured] = null;
  nb[hop.to] = { side: p!.side, king: p!.king || hop.promotes };
  return nb;
}

/** apply a simple slide, returning a fresh board */
export function applySimple(board: Board, from: number, to: number): Board {
  const nb = board.slice();
  const p = nb[from];
  nb[from] = null;
  nb[to] = { side: p!.side, king: p!.king || isPromoRow(to, p!.side) };
  return nb;
}

/**
 * Who has won given `sideToMove` is on the clock: the side to move loses if it
 * has no pieces or no legal move. Returns the winning side, or null if play
 * continues.
 */
export function winnerOf(board: Board, sideToMove: Side): Side | null {
  return hasAnyMove(board, sideToMove) ? null : otherSide(sideToMove);
}

export interface PieceCount {
  rMen: number;
  rKings: number;
  bMen: number;
  bKings: number;
}

export function countPieces(board: Board): PieceCount {
  const c: PieceCount = { rMen: 0, rKings: 0, bMen: 0, bKings: 0 };
  for (const p of board) {
    if (!p) continue;
    if (p.side === 'r') p.king ? c.rKings++ : c.rMen++;
    else p.king ? c.bKings++ : c.bMen++;
  }
  return c;
}
