/**
 * Connect Four AI — pure TypeScript. Negamax with alpha-beta pruning over a
 * positional heuristic (four-window potential + center-column preference).
 * Depth/strength scale by difficulty. Runtime is bounded by iterative
 * deepening under a shared node cap: if a depth would blow the budget the
 * search aborts and keeps the deepest fully-completed result, so a move can
 * never hang the UI. Connect Four is a solved first-player win, so the top
 * tiers play very strongly but not with literal endgame-perfection — a sharp
 * human can still find wins.
 *
 * The search runs on a fast numeric core (Int8Array board, 0=empty 1=red
 * 2=yellow, per-column height tracking, precomputed win/eval windows) so a
 * move stays well under the node cap's time budget even on a phone. The
 * public API converts to/from the game's `Cell[]` at the boundary.
 */

import type { Difficulty } from '../../../platform/types';
import { COLS, ROWS, legalCols, type Cell, type Disc } from './board';

const WIN = 1_000_000;
const CENTER = Math.floor(COLS / 2); // 3
/** center-out column ordering sharpens alpha-beta pruning */
const COL_ORDER = [3, 2, 4, 1, 5, 0, 6];
const CENTER_CELLS = Array.from({ length: ROWS }, (_, r) => r * COLS + CENTER);

/** every window of four collinear cells, flattened as [a,b,c,d, a,b,c,d, …] */
const WINDOWS: number[] = (() => {
  const out: number[] = [];
  const idx = (r: number, c: number) => r * COLS + c;
  // horizontal
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++) out.push(idx(r, c), idx(r, c + 1), idx(r, c + 2), idx(r, c + 3));
  // vertical
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r <= ROWS - 4; r++) out.push(idx(r, c), idx(r + 1, c), idx(r + 2, c), idx(r + 3, c));
  // diagonal down-right
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      out.push(idx(r, c), idx(r + 1, c + 1), idx(r + 2, c + 2), idx(r + 3, c + 3));
  // diagonal down-left
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 3; c < COLS; c++) out.push(idx(r, c), idx(r + 1, c - 1), idx(r + 2, c - 2), idx(r + 3, c - 3));
  return out;
})();

/** for each cell, the window offsets (multiples of 4 into WINDOWS) covering it */
const CELL_WINDOWS: number[][] = (() => {
  const map: number[][] = Array.from({ length: ROWS * COLS }, () => []);
  for (let w = 0; w < WINDOWS.length; w += 4) {
    for (let k = 0; k < 4; k++) map[WINDOWS[w + k]].push(w);
  }
  return map;
})();

const toNum = (board: Cell[]): Int8Array => {
  const a = new Int8Array(ROWS * COLS);
  for (let i = 0; i < a.length; i++) a[i] = board[i] === 'r' ? 1 : board[i] === 'y' ? 2 : 0;
  return a;
};

const heightsOf = (b: Int8Array): Int8Array => {
  const h = new Int8Array(COLS);
  for (let c = 0; c < COLS; c++) {
    let n = 0;
    for (let r = ROWS - 1; r >= 0; r--) if (b[r * COLS + c] !== 0) n++;
    h[c] = n;
  }
  return h;
};

/** true if placing `disc` at `cell` completes a four-run through it */
function winAtCell(b: Int8Array, cell: number, disc: number): boolean {
  const ws = CELL_WINDOWS[cell];
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i];
    if (b[WINDOWS[w]] === disc && b[WINDOWS[w + 1]] === disc && b[WINDOWS[w + 2]] === disc && b[WINDOWS[w + 3]] === disc)
      return true;
  }
  return false;
}

/** static heuristic from `disc`'s perspective (non-terminal), numeric core */
function evalNum(b: Int8Array, disc: number): number {
  const opp = disc === 1 ? 2 : 1;
  let score = 0;
  for (let i = 0; i < CENTER_CELLS.length; i++) {
    const v = b[CENTER_CELLS[i]];
    if (v === disc) score += 6;
    else if (v === opp) score -= 6;
  }
  for (let w = 0; w < WINDOWS.length; w += 4) {
    let me = 0;
    let op = 0;
    for (let k = 0; k < 4; k++) {
      const v = b[WINDOWS[w + k]];
      if (v === disc) me++;
      else if (v === opp) op++;
    }
    if (me > 0 && op > 0) continue; // contested window — no potential
    if (me === 3) score += 50;
    else if (me === 2) score += 10;
    else if (me === 1) score += 1;
    else if (op === 3) score -= 80; // defense weighted a touch heavier
    else if (op === 2) score -= 12;
    else if (op === 1) score -= 1;
  }
  return score;
}

interface Ctx {
  nodes: number;
  cap: number;
}

/** thrown to unwind the search when the node budget is exhausted */
class Abort extends Error {}

/** negamax with alpha-beta; mutates `b`/`heights` in place and restores them */
function negamax(b: Int8Array, heights: Int8Array, depth: number, alpha: number, beta: number, disc: number, ctx: Ctx): number {
  ctx.nodes++;
  if (ctx.nodes > ctx.cap) throw new Abort();

  let hasMove = false;
  for (let c = 0; c < COLS; c++)
    if (heights[c] < ROWS) {
      hasMove = true;
      break;
    }
  if (!hasMove) return 0; // board full → draw
  if (depth === 0) return evalNum(b, disc);

  const opp = disc === 1 ? 2 : 1;
  let best = -Infinity;
  for (let oi = 0; oi < COL_ORDER.length; oi++) {
    const c = COL_ORDER[oi];
    if (heights[c] >= ROWS) continue;
    const row = ROWS - 1 - heights[c];
    const cell = row * COLS + c;
    b[cell] = disc;
    heights[c]++;
    let score: number;
    if (winAtCell(b, cell, disc)) {
      score = WIN + depth; // a shallower win (more depth left) is worth more
    } else {
      score = -negamax(b, heights, depth - 1, -beta, -alpha, opp, ctx);
    }
    b[cell] = 0;
    heights[c]--;
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** root: pick the best column for `disc` at a fixed depth */
function rootSearch(b: Int8Array, heights: Int8Array, disc: number, depth: number, ctx: Ctx): { col: number; score: number } {
  const opp = disc === 1 ? 2 : 1;
  let bestCol = -1;
  let bestScore = -Infinity;
  let alpha = -Infinity;
  for (let oi = 0; oi < COL_ORDER.length; oi++) {
    const c = COL_ORDER[oi];
    if (heights[c] >= ROWS) continue;
    const row = ROWS - 1 - heights[c];
    const cell = row * COLS + c;
    b[cell] = disc;
    heights[c]++;
    let score: number;
    if (winAtCell(b, cell, disc)) score = WIN + depth;
    else score = -negamax(b, heights, depth - 1, -Infinity, -alpha, opp, ctx);
    b[cell] = 0;
    heights[c]--;
    if (bestCol === -1 || score > bestScore) {
      bestScore = score;
      bestCol = c;
    }
    if (bestScore > alpha) alpha = bestScore;
  }
  return { col: bestCol, score: bestScore };
}

/**
 * Iterative-deepening root search up to `maxDepth`, bounded by `cap` total
 * nodes. Returns the deepest fully-completed best move. Never throws.
 */
export function searchMove(board: Cell[], disc: Disc, maxDepth: number, cap: number): { col: number; score: number } {
  const legal = legalCols(board);
  if (legal.length === 0) return { col: -1, score: 0 };
  // the empty board is solved — center is the proven best opening; skip the
  // expensive full-branching search so the round's first move never lags
  if (board.every((v) => v === null)) return { col: CENTER, score: 0 };
  const me = disc === 'r' ? 1 : 2;
  const ctx: Ctx = { nodes: 0, cap };
  const preferred = COL_ORDER.find((c) => legal.includes(c)) ?? legal[0];
  let result = { col: preferred, score: 0 };
  for (let d = 1; d <= maxDepth; d++) {
    try {
      const b = toNum(board);
      const r = rootSearch(b, heightsOf(b), me, d, ctx);
      if (r.col >= 0) result = r;
      if (Math.abs(result.score) >= WIN) break; // forced result found
    } catch (e) {
      if (e instanceof Abort) break;
      throw e;
    }
  }
  return result;
}

/** exported for tests: static evaluation from `disc`'s perspective */
export function evaluate(board: Cell[], disc: Disc): number {
  return evalNum(toNum(board), disc === 'r' ? 1 : 2);
}

interface Tier {
  depth: number;
  /** chance the move is a pure random blunder (easy only) */
  random: number;
  cap: number;
}

const TIERS: Record<Difficulty, Tier> = {
  easy: { depth: 2, random: 0.5, cap: 60_000 },
  medium: { depth: 5, random: 0, cap: 180_000 },
  hard: { depth: 7, random: 0, cap: 400_000 },
  pro: { depth: 9, random: 0, cap: 700_000 },
  extreme: { depth: 12, random: 0, cap: 1_100_000 }
};

/**
 * Pick the robot's move. Always legal, never a full column. On easy it often
 * blunders (random move) though it still grabs a win that is one drop away;
 * the higher tiers search deeper and pick the minimax-best column.
 */
export function chooseMove(board: Cell[], disc: Disc, difficulty: Difficulty): number {
  const cols = legalCols(board);
  if (cols.length === 0) return -1;
  if (cols.length === 1) return cols[0];
  const tier = TIERS[difficulty];

  if (tier.random > 0 && Math.random() < tier.random) {
    // sloppy — but never pass up a disc that wins immediately
    const b = toNum(board);
    const h = heightsOf(b);
    const me = disc === 'r' ? 1 : 2;
    for (const c of cols) {
      const cell = (ROWS - 1 - h[c]) * COLS + c;
      b[cell] = me;
      const won = winAtCell(b, cell, me);
      b[cell] = 0;
      if (won) return c;
    }
    return cols[Math.floor(Math.random() * cols.length)];
  }

  const move = searchMove(board, disc, tier.depth, tier.cap).col;
  return move >= 0 ? move : cols[0];
}

/**
 * Shallow best-column search for the "suggest" assist — independent of the
 * chosen difficulty so the hint is always genuinely strong.
 */
export function suggestMove(board: Cell[], disc: Disc): number {
  const cols = legalCols(board);
  if (cols.length === 0) return -1;
  return searchMove(board, disc, 7, 500_000).col;
}
