/**
 * Block Drop — the falling-tetromino rules, dependency-free so
 * `npm run validate` can drive them.
 *
 * A 10-wide well with 20 visible rows and 2 hidden rows above them (rows
 * 0 and 1) where pieces spawn. The seven tetrominoes rotate with the
 * Super Rotation System: four states each, and when a turn does not fit
 * the piece tries the SRS wall kicks in order (a separate table for the
 * I piece). Pieces come from a 7-bag — every seven pieces contain each
 * tetromino exactly once, so a drought can never last longer than twelve
 * pieces. Full rows clear and everything above falls.
 *
 * Tiers change the starting gravity and the line target that wins the run;
 * every ten lines is a level, and each level is faster (`gravityFor`).
 */
import type { Difficulty } from '../../../platform/types';

export const COLS = 10;
export const ROWS = 20;
/** spawn rows above the visible well */
export const HIDDEN = 2;
export const H = ROWS + HIDDEN;

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export const PIECES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
/** the board stores `PIECES.indexOf(type) + 1` per cell, 0 when empty */
export const colorOf = (type: PieceType): number => PIECES.indexOf(type) + 1;

/** SRS spawn orientations; the matrix size decides the rotation box */
const BASE: Record<PieceType, string[]> = {
  I: ['....', '####', '....', '....'],
  O: ['##', '##'],
  T: ['.#.', '###', '...'],
  S: ['.##', '##.', '...'],
  Z: ['##.', '.##', '...'],
  J: ['#..', '###', '...'],
  L: ['..#', '###', '...']
};

export type Cell = [number, number];

function cellsOf(rows: string[]): Cell[] {
  const out: Cell[] = [];
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && out.push([x, y])));
  return out;
}

/** clockwise turn inside an n×n box: (x, y) → (n−1−y, x) */
function turn(cells: Cell[], n: number): Cell[] {
  return cells.map(([x, y]) => [n - 1 - y, x] as Cell).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

/** every piece's four rotation states, generated from the spawn shape */
export const SHAPES: Record<PieceType, Cell[][]> = Object.fromEntries(
  PIECES.map((type) => {
    const n = BASE[type].length;
    const states: Cell[][] = [cellsOf(BASE[type])];
    for (let r = 1; r < 4; r++) states.push(turn(states[r - 1], n));
    return [type, states];
  })
) as Record<PieceType, Cell[][]>;

/** rotation box size per piece (the I turns in a 4×4, the O in a 2×2) */
export const BOX: Record<PieceType, number> = Object.fromEntries(PIECES.map((t) => [t, BASE[t].length])) as Record<
  PieceType,
  number
>;

/*
 * SRS wall kicks, (dx, dy) with y UP as the guideline tables write them —
 * `rotate` flips dy because the well's rows grow downward. Keyed
 * "<from><to>"; every transition tries five offsets in order.
 */
const KICKS_JLSTZ: Record<string, Cell[]> = {
  '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '10': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '12': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '21': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '23': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '32': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '30': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
};
const KICKS_I: Record<string, Cell[]> = {
  '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '10': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '12': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '21': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '23': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '32': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '30': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
};
export const KICKS = { JLSTZ: KICKS_JLSTZ, I: KICKS_I };

export type Rot = 0 | 1 | 2 | 3;

export interface Piece {
  type: PieceType;
  rot: Rot;
  /** the rotation box's top-left corner on the board */
  x: number;
  y: number;
}

/** absolute cells of a piece */
export function cells(p: Piece): Cell[] {
  return SHAPES[p.type][p.rot].map(([x, y]) => [p.x + x, p.y + y]);
}

/** centred over the well, its lowest cell on the first visible row */
export function spawn(type: PieceType): Piece {
  const n = BOX[type];
  const maxY = Math.max(...SHAPES[type][0].map(([, y]) => y));
  return { type, rot: 0, x: Math.floor((COLS - n) / 2), y: HIDDEN - maxY };
}

export type Board = number[];
export const emptyBoard = (): Board => new Array<number>(COLS * H).fill(0);

export function fits(board: Board, p: Piece): boolean {
  for (const [x, y] of cells(p)) {
    if (x < 0 || x >= COLS || y < 0 || y >= H) return false;
    if (board[y * COLS + x] !== 0) return false;
  }
  return true;
}

export function move(board: Board, p: Piece, dx: number, dy: number): Piece | null {
  const q = { ...p, x: p.x + dx, y: p.y + dy };
  return fits(board, q) ? q : null;
}

/** turn with SRS kicks; null when no kick fits */
export function rotate(board: Board, p: Piece, dir: 1 | -1): Piece | null {
  if (p.type === 'O') return p; // a square is its own rotation
  const to = (((p.rot + dir) % 4) + 4) % 4 as Rot;
  const table = p.type === 'I' ? KICKS_I : KICKS_JLSTZ;
  for (const [kx, ky] of table[`${p.rot}${to}`]) {
    const q: Piece = { ...p, rot: to, x: p.x + kx, y: p.y - ky };
    if (fits(board, q)) return q;
  }
  return null;
}

/** rows the piece can still fall */
export function dropDistance(board: Board, p: Piece): number {
  let d = 0;
  while (fits(board, { ...p, y: p.y + d + 1 })) d++;
  return d;
}

/** the piece written into the board (a new array) */
export function lock(board: Board, p: Piece): Board {
  const next = board.slice();
  const c = colorOf(p.type);
  for (const [x, y] of cells(p)) next[y * COLS + x] = c;
  return next;
}

/** a piece that locks entirely above the visible well ends the game */
export function isLockOut(p: Piece): boolean {
  return cells(p).every(([, y]) => y < HIDDEN);
}

export function fullRows(board: Board): number[] {
  const rows: number[] = [];
  for (let y = 0; y < H; y++) {
    let full = true;
    for (let x = 0; x < COLS; x++) {
      if (board[y * COLS + x] === 0) {
        full = false;
        break;
      }
    }
    if (full) rows.push(y);
  }
  return rows;
}

/** remove `rows` and let everything above fall; new empty rows appear at the top */
export function clearRows(board: Board, rows: number[]): Board {
  const drop = new Set(rows);
  const kept: number[][] = [];
  for (let y = 0; y < H; y++) if (!drop.has(y)) kept.push(board.slice(y * COLS, y * COLS + COLS));
  const blank = new Array<number>(COLS).fill(0);
  const out: number[] = [];
  for (let i = 0; i < rows.length; i++) out.push(...blank);
  for (const row of kept) out.push(...row);
  return out;
}

/** a shuffled bag of the seven pieces */
export function bag(rng: () => number = Math.random): PieceType[] {
  const b = PIECES.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** points for clearing 1–4 lines at once, before the level multiplier */
export const LINE_SCORE = [0, 100, 300, 500, 800] as const;
/** per row of soft / hard drop */
export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;
export const LINES_PER_LEVEL = 10;

export interface DropTier {
  /** ms per row at level 1 */
  gravityMs: number;
  /** lines that win the run */
  target: number;
  label: string;
}

export const TIERS: Record<Difficulty, DropTier> = {
  easy: { gravityMs: 850, target: 10, label: 'relaxed · 10 lines' },
  medium: { gravityMs: 650, target: 20, label: 'steady · 20 lines' },
  hard: { gravityMs: 480, target: 30, label: 'quick · 30 lines' },
  pro: { gravityMs: 360, target: 40, label: 'fast · 40 lines' },
  extreme: { gravityMs: 260, target: 50, label: 'frantic · 50 lines' }
};

export const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };

export const levelFor = (lines: number): number => 1 + Math.floor(lines / LINES_PER_LEVEL);

/** each level is 18% faster than the last; never below 70 ms a row */
export function gravityFor(tier: DropTier, level: number, slow: boolean): number {
  const ms = Math.max(70, tier.gravityMs * Math.pow(0.82, level - 1));
  return ms * (slow ? 1.5 : 1);
}
