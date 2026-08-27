/**
 * Chess robot — negamax + alpha-beta over the 0x88 engine, with MVV-LVA
 * move ordering, quiescence on the higher tiers and a hard node budget so
 * a long think can never freeze the phone. Difficulty scales BOTH the
 * search depth and how sloppily the root move is picked: easy plays a
 * near-random reasonable move, extreme plays the best it can find.
 *
 * Evaluation is material + piece-square tables (the classic "simplified
 * evaluation" shape: knights to the center, rooks to open files by way of
 * the 7th, king tucked in the corner until the endgame flips its table).
 */
import {
  B,
  F_CAPTURE,
  F_PROMO,
  inCheck,
  K,
  legalMoves,
  make,
  N,
  P,
  pseudoMoves,
  Q,
  R,
  unmake,
  type Move,
  type Position
} from './engine';
import type { Difficulty } from '../../../platform/types';

const VALUE: Record<number, number> = { [P]: 100, [N]: 320, [B]: 330, [R]: 500, [Q]: 900, [K]: 20000 };

/* piece-square tables, WHITE's view, a1 bottom-left; index = rank*8+file */
// prettier-ignore
const PST_P = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10,-20,-20, 10, 10,  5,
   5, -5,-10,  0,  0,-10, -5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5,  5, 10, 25, 25, 10,  5,  5,
  10, 10, 20, 30, 30, 20, 10, 10,
  50, 50, 50, 50, 50, 50, 50, 50,
   0,  0,  0,  0,  0,  0,  0,  0
];
// prettier-ignore
const PST_N = [
 -50,-40,-30,-30,-30,-30,-40,-50,
 -40,-20,  0,  5,  5,  0,-20,-40,
 -30,  5, 10, 15, 15, 10,  5,-30,
 -30,  0, 15, 20, 20, 15,  0,-30,
 -30,  5, 15, 20, 20, 15,  5,-30,
 -30,  0, 10, 15, 15, 10,  0,-30,
 -40,-20,  0,  0,  0,  0,-20,-40,
 -50,-40,-30,-30,-30,-30,-40,-50
];
// prettier-ignore
const PST_B = [
 -20,-10,-10,-10,-10,-10,-10,-20,
 -10,  5,  0,  0,  0,  0,  5,-10,
 -10, 10, 10, 10, 10, 10, 10,-10,
 -10,  0, 10, 10, 10, 10,  0,-10,
 -10,  5,  5, 10, 10,  5,  5,-10,
 -10,  0,  5, 10, 10,  5,  0,-10,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -20,-10,-10,-10,-10,-10,-10,-20
];
// prettier-ignore
const PST_R = [
   0,  0,  0,  5,  5,  0,  0,  0,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   5, 10, 10, 10, 10, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];
// prettier-ignore
const PST_Q = [
 -20,-10,-10, -5, -5,-10,-10,-20,
 -10,  0,  5,  0,  0,  0,  0,-10,
 -10,  5,  5,  5,  5,  5,  0,-10,
   0,  0,  5,  5,  5,  5,  0, -5,
  -5,  0,  5,  5,  5,  5,  0, -5,
 -10,  0,  5,  5,  5,  5,  0,-10,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -20,-10,-10, -5, -5,-10,-10,-20
];
// prettier-ignore
const PST_K_MID = [
  20, 30, 10,  0,  0, 10, 30, 20,
  20, 20,  0,  0,  0,  0, 20, 20,
 -10,-20,-20,-20,-20,-20,-20,-10,
 -20,-30,-30,-40,-40,-30,-30,-20,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30
];
// prettier-ignore
const PST_K_END = [
 -50,-30,-30,-30,-30,-30,-30,-50,
 -30,-30,  0,  0,  0,  0,-30,-30,
 -30,-10, 20, 30, 30, 20,-10,-30,
 -30,-10, 30, 40, 40, 30,-10,-30,
 -30,-10, 30, 40, 40, 30,-10,-30,
 -30,-10, 20, 30, 30, 20,-10,-30,
 -30,-20,-10,  0,  0,-10,-20,-30,
 -50,-40,-30,-20,-20,-30,-40,-50
];

const PST: Record<number, number[]> = { [P]: PST_P, [N]: PST_N, [B]: PST_B, [R]: PST_R, [Q]: PST_Q };

/** static eval in centipawns from the side-to-move's view */
function evaluate(pos: Position): number {
  const { board } = pos;
  let score = 0;
  let nonPawnMaterial = 0;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    const p = board[sq];
    if (p === 0) continue;
    const kind = Math.abs(p);
    if (kind !== P && kind !== K) nonPawnMaterial += VALUE[kind];
  }
  const endgame = nonPawnMaterial < 2600; // roughly: queens off, or heavy trades done
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    const p = board[sq];
    if (p === 0) continue;
    const kind = Math.abs(p);
    const idx64 = p > 0 ? (sq >> 4) * 8 + (sq & 15) : (7 - (sq >> 4)) * 8 + (sq & 15);
    const table = kind === K ? (endgame ? PST_K_END : PST_K_MID) : PST[kind];
    const v = VALUE[kind] + table[idx64];
    score += p > 0 ? v : -v;
  }
  return pos.turn === 'w' ? score : -score;
}

const MATE = 100000;

interface SearchCtx {
  nodes: number;
  budget: number;
  qDepth: number;
}

/** captures/promos first, most valuable victim × least valuable attacker */
function orderMoves(moves: Move[]): Move[] {
  return moves.sort((a, b) => scoreMove(b) - scoreMove(a));
}
function scoreMove(m: Move): number {
  let s = 0;
  if (m.flags & F_CAPTURE) s += 1000 + VALUE[Math.abs(m.captured)] - VALUE[Math.abs(m.piece)] / 100;
  if (m.flags & F_PROMO) s += 900 + (m.promo === Q ? 100 : 0);
  return s;
}

/** captures-only search so the horizon never chops a recapture in half */
function quiesce(pos: Position, alpha: number, beta: number, ctx: SearchCtx, depth: number): number {
  ctx.nodes++;
  const stand = evaluate(pos);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  if (depth <= 0 || ctx.nodes > ctx.budget) return alpha;
  const mine = pos.turn;
  const caps = orderMoves(pseudoMoves(pos).filter((m) => m.flags & (F_CAPTURE | F_PROMO)));
  for (const move of caps) {
    const undo = make(pos, move);
    if (inCheck(pos, mine)) {
      unmake(pos, move, undo);
      continue;
    }
    const score = -quiesce(pos, -beta, -alpha, ctx, depth - 1);
    unmake(pos, move, undo);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function negamax(pos: Position, depth: number, alpha: number, beta: number, ctx: SearchCtx): number {
  if (depth === 0) {
    return ctx.qDepth > 0 ? quiesce(pos, alpha, beta, ctx, ctx.qDepth) : evaluate(pos);
  }
  ctx.nodes++;
  const mine = pos.turn;
  let any = false;
  for (const move of orderMoves(pseudoMoves(pos))) {
    const undo = make(pos, move);
    if (inCheck(pos, mine)) {
      unmake(pos, move, undo);
      continue;
    }
    any = true;
    const score = -negamax(pos, depth - 1, -beta, -alpha, ctx);
    unmake(pos, move, undo);
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
    if (ctx.nodes > ctx.budget) break;
  }
  if (!any) return inCheck(pos, mine) ? -MATE + (100 - depth) : 0; // mate prefers the short road
  return alpha;
}

interface BotConfig {
  depth: number;
  qDepth: number;
  budget: number;
  /** root moves within this many centipawns of the best are all candidates */
  slack: number;
}

export const BOT: Record<Difficulty, BotConfig> = {
  easy: { depth: 1, qDepth: 0, budget: 20000, slack: 220 },
  medium: { depth: 2, qDepth: 2, budget: 60000, slack: 80 },
  hard: { depth: 3, qDepth: 4, budget: 150000, slack: 25 },
  pro: { depth: 4, qDepth: 6, budget: 300000, slack: 0 },
  extreme: { depth: 5, qDepth: 8, budget: 500000, slack: 0 }
};

/**
 * Pick the robot's move. Deterministic given `rng` — the game passes
 * Math.random; validate passes a seeded stream.
 */
export function chooseMove(
  position: Position,
  difficulty: Difficulty,
  rng: () => number = Math.random
): Move | null {
  const cfg = BOT[difficulty];
  const pos = { ...position, board: new Int8Array(position.board) };
  const roots = legalMoves(pos);
  if (roots.length === 0) return null;
  if (roots.length === 1) return roots[0];

  const ctx: SearchCtx = { nodes: 0, budget: cfg.budget, qDepth: cfg.qDepth };
  // iterative deepening: every completed pass overwrites the scores, so a
  // budget bail mid-pass still leaves the previous full pass standing
  let scored = roots.map((move) => ({ move, score: 0 }));
  for (let d = 1; d <= cfg.depth; d++) {
    const pass: { move: Move; score: number }[] = [];
    let alpha = -Infinity;
    for (const { move } of scored) {
      const undo = make(pos, move);
      const score = -negamax(pos, d - 1, -Infinity, -alpha, ctx);
      unmake(pos, move, undo);
      pass.push({ move, score });
      if (score > alpha) alpha = score;
      if (ctx.nodes > ctx.budget) break;
    }
    if (pass.length === scored.length) {
      scored = pass.sort((a, b) => b.score - a.score);
    }
    if (ctx.nodes > ctx.budget) break;
  }

  const best = scored[0].score;
  const candidates = scored.filter((s) => s.score >= best - cfg.slack);
  return candidates[Math.floor(rng() * candidates.length)].move;
}
