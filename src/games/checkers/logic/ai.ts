/**
 * Checkers robot — negamax with alpha-beta pruning, iterative deepening, a
 * node cap and a wall-clock deadline so it always answers in bounded time.
 * Move generation already respects forced captures, so the search inherits
 * the rules for free. All work is synchronous and pure; the component runs it
 * off the render path (inside a timeout) so the board can paint first.
 */
import type { Difficulty } from '../../../platform/types';
import {
  applyMove,
  generateMoves,
  otherSide,
  type Board,
  type Move,
  type Side
} from './engine';

const MAN_VAL = 100;
const KING_VAL = 170; // ~1.7× a man
const ADV = 4; // per row a man has advanced toward promotion
const BACK = 12; // a man still guarding its own home row (blocks kings)
const CENTER = 3; // a piece on a central file
const MOB = 2; // per net legal move (mobility)
const WIN = 1_000_000;

interface SearchState {
  nodes: number;
  cap: number;
  deadline: number;
  aborted: boolean;
}

const rowOf = (i: number) => Math.floor(i / 8);
const colOf = (i: number) => i % 8;

/** static evaluation from `side`'s perspective (positive = good for side) */
export function evaluate(board: Board, side: Side): number {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    const r = rowOf(i);
    const c = colOf(i);
    let v = p.king ? KING_VAL : MAN_VAL;
    if (!p.king) {
      const adv = p.side === 'r' ? 7 - r : r; // distance travelled toward crown
      v += adv * ADV;
      if ((p.side === 'r' && r === 7) || (p.side === 'b' && r === 0)) v += BACK;
    }
    if (c >= 2 && c <= 5) v += CENTER;
    score += p.side === side ? v : -v;
  }
  const myMob = generateMoves(board, side).length;
  const opMob = generateMoves(board, otherSide(side)).length;
  score += (myMob - opMob) * MOB;
  return score;
}

function negamax(
  board: Board,
  side: Side,
  depth: number,
  alpha: number,
  beta: number,
  st: SearchState,
  ply: number
): number {
  st.nodes++;
  if (st.nodes > st.cap || Date.now() > st.deadline) {
    st.aborted = true;
    return evaluate(board, side);
  }
  const moves = generateMoves(board, side);
  if (moves.length === 0) return -(WIN - ply); // side to move is stuck → it loses
  if (depth === 0) return evaluate(board, side);

  // order captures (and longer chains) first — better pruning
  moves.sort((a, b) => b.captures.length - a.captures.length);

  let best = -Infinity;
  let a = alpha;
  for (const m of moves) {
    const val = -negamax(applyMove(board, m), otherSide(side), depth - 1, -beta, -a, st, ply + 1);
    if (val > best) best = val;
    if (best > a) a = best;
    if (a >= beta) break;
    if (st.aborted) break;
  }
  return best;
}

interface AiConfig {
  depth: number;
  /** chance of ignoring the search and playing a random legal move */
  blunder: number;
  timeMs: number;
  nodeCap: number;
}

export const AI_CONFIG: Record<Difficulty, AiConfig> = {
  easy: { depth: 2, blunder: 0.45, timeMs: 300, nodeCap: 20_000 },
  medium: { depth: 4, blunder: 0.12, timeMs: 500, nodeCap: 60_000 },
  hard: { depth: 6, blunder: 0, timeMs: 800, nodeCap: 150_000 },
  pro: { depth: 8, blunder: 0, timeMs: 1_100, nodeCap: 400_000 },
  extreme: { depth: 11, blunder: 0, timeMs: 1_500, nodeCap: 900_000 }
};

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** the best move for `side` at a fixed strength (used for the search core) */
function searchBest(board: Board, side: Side, cfg: AiConfig): Move | null {
  const moves = generateMoves(board, side);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const st: SearchState = {
    nodes: 0,
    cap: cfg.nodeCap,
    deadline: Date.now() + cfg.timeMs,
    aborted: false
  };

  // shuffle so equal-value moves vary between games (no two identical matches)
  const ordered = shuffle(moves);
  let best = ordered[0];

  // iterative deepening: keep the best move from the last fully-searched depth
  for (let d = 1; d <= cfg.depth; d++) {
    let bestVal = -Infinity;
    let bestMove = ordered[0];
    let alpha = -Infinity;
    const beta = Infinity;
    let aborted = false;
    for (const m of ordered) {
      const val = -negamax(applyMove(board, m), otherSide(side), d - 1, -beta, -alpha, st, 1);
      if (st.aborted) {
        aborted = true;
        break;
      }
      if (val > bestVal) {
        bestVal = val;
        bestMove = m;
      }
      if (val > alpha) alpha = val;
    }
    if (!aborted) best = bestMove;
    if (st.aborted || Date.now() > st.deadline || st.nodes > st.cap) break;
  }
  return best;
}

/** the robot's move for the given difficulty (may blunder on low tiers) */
export function chooseMove(board: Board, side: Side, difficulty: Difficulty): Move | null {
  const cfg = AI_CONFIG[difficulty];
  const moves = generateMoves(board, side);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0]; // forced (often a single capture)
  if (cfg.blunder > 0 && Math.random() < cfg.blunder) {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  return searchBest(board, side, cfg);
}

/** a strong suggestion for the human's hint — solid depth, never blunders */
export function suggestMove(board: Board, side: Side): Move | null {
  return searchBest(board, side, { depth: 7, blunder: 0, timeMs: 900, nodeCap: 250_000 });
}
