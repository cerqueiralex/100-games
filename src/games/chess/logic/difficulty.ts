/**
 * Difficulty → robot strength. Five REAL, perceptibly different opponents,
 * from a genuine beginner to a club player, all from one engine:
 *
 *   easy     ≈300 Elo   no search at all — a weighted lottery over the legal
 *                       moves (captures favoured, walking into a free capture
 *                       shunned), because modern Stockfish cannot play this
 *                       badly on purpose: its UCI_Elo floor is ~1320
 *   medium   ≈750 Elo   a shallow engine search asked for its 4 best lines,
 *                       then a lottery weighted TOWARD the worse ones
 *   hard     ≈1200 Elo  a moderate search, 2 lines, slight lean to the 2nd
 *   pro      ≈1600 Elo  the engine's own strength limiter (UCI_LimitStrength
 *                       + UCI_Elo), no error injection
 *   extreme  2000+ Elo  full strength on a time budget — enough to test a
 *                       1600 player, far short of tournament depth
 *
 * The error injection on medium/hard is exactly how commercial sites fake a
 * weak opponent: Stockfish playing WRONG ON PURPOSE with a controlled
 * probability, not a naturally weak engine (none exists at that level).
 * `maxDrop` keeps the lottery honest — a candidate more than that many
 * centipawns behind the best is dropped, so a 750-Elo robot may hang a
 * knight but never walks past its own mate in one. The weights and drops
 * are the tuning knob; `npm run validate` pins the ladder's ORDER (no tier
 * may be configured weaker than the one below it) and the lottery's math.
 *
 * Rules are never the engine's job: every engine move is resolved against
 * our own perft-proven move generator (`moveFromUci`) before it touches the
 * board. This module has no DOM dependency so validate can import it.
 */
import type { Difficulty } from '../../../platform/types';
import {
  applyMove,
  B,
  F_CAPTURE,
  F_PROMO,
  isAttacked,
  K,
  legalMoves,
  N,
  other,
  P,
  Q,
  R,
  type Move,
  type Position
} from './engine';

/* ---------- the engine build the ladder was tuned against ---------- */

/** under public/ — served beside the app, never bundled (GPLv3 stays a separate program) */
export const ENGINE_DIR = 'stockfish/';
export const ENGINE_JS = 'stockfish-18-lite-single.js';
/** the loader resolves the binary from its own file name (.js → .wasm) */
export const ENGINE_WASM = 'stockfish-18-lite-single.wasm';
export const ENGINE_LICENSE = 'LICENSE-STOCKFISH.txt';
export const ENGINE_NAME = 'Stockfish 18 Lite';
/** UCI_Elo bounds of this build — a tier outside them would be silently clamped */
export const UCI_ELO_RANGE: [number, number] = [1320, 3190];

/* ---------- the ladder ---------- */

export interface TierPlan {
  /** `lottery` never loads the engine; `engine` searches with Stockfish */
  brain: 'lottery' | 'engine';
  /** the Elo band the tier is meant to play at (documentation + validate ordering) */
  band: [number, number];
  /** what the HUD prints beside the robot's name */
  label: string;
  /** search ceiling in ms — ALWAYS set, so a slow phone still gets an answer */
  movetime: number;
  /** optional depth cap; the search stops at whichever limit comes first */
  depth?: number;
  /** candidate lines asked from the engine (UCI MultiPV) */
  multipv: number;
  /** lottery weights over those lines, best first; renormalized over what came back */
  weights: number[];
  /** a line more than this many centipawns behind the best is dropped (0 = best only) */
  maxDrop: number;
  /** UCI_LimitStrength + UCI_Elo when set; full strength when absent */
  uciElo?: number;
}

export const TIER_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'pro', 'extreme'];

export const TIERS: Record<Difficulty, TierPlan> = {
  easy: {
    brain: 'lottery',
    band: [250, 400],
    label: '≈300 Elo',
    movetime: 0,
    multipv: 1,
    weights: [1],
    maxDrop: 0
  },
  medium: {
    brain: 'engine',
    band: [600, 900],
    label: '≈750 Elo',
    movetime: 120,
    depth: 2,
    multipv: 4,
    weights: [10, 25, 30, 35],
    maxDrop: 300
  },
  hard: {
    brain: 'engine',
    band: [1100, 1300],
    label: '≈1200 Elo',
    movetime: 250,
    depth: 4,
    multipv: 2,
    weights: [40, 60],
    maxDrop: 200
  },
  pro: {
    brain: 'engine',
    band: [1500, 1650],
    label: '≈1600 Elo',
    movetime: 700,
    multipv: 1,
    weights: [1],
    maxDrop: 0,
    uciElo: 1600
  },
  extreme: {
    brain: 'engine',
    band: [1800, 2200],
    label: '2000+ Elo',
    movetime: 1200,
    multipv: 1,
    weights: [1],
    maxDrop: 0
  }
};

/** the Hint assist: the engine at FULL strength, whatever tier the robot plays */
export const HINT_SEARCH = { movetime: 800, multipv: 1 } as const;

/* ---------- the error-injection layer ---------- */

/** one ranked engine line: the move and its score from the robot's view */
export interface Candidate {
  move: string;
  /** centipawns; a forced mate folds to ±(MATE_SCORE − plies) */
  score: number;
}

export const MATE_SCORE = 100000;

/** UCI `score cp N` / `score mate N` → one comparable number */
export function foldScore(kind: 'cp' | 'mate', value: number): number {
  if (kind === 'cp') return value;
  return value > 0 ? MATE_SCORE - value : -MATE_SCORE - value;
}

/**
 * Pick the robot's move from the engine's ranked lines: keep the lines
 * within `maxDrop` of the best (the best itself always qualifies), then a
 * lottery over the tier's weights. Deterministic given `rng`.
 */
export function pickCandidate(lines: Candidate[], plan: TierPlan, rng: () => number = Math.random): string | null {
  if (lines.length === 0) return null;
  const ranked = [...lines].sort((a, b) => b.score - a.score);
  const best = ranked[0].score;
  const pool = ranked
    .slice(0, plan.weights.length)
    .filter((line, i) => i === 0 || best - line.score <= plan.maxDrop);
  const weights = plan.weights.slice(0, pool.length);
  return pool[weightedIndex(weights, rng)].move;
}

/* ---------- the easy tier: no engine ---------- */

const VALUE: Record<number, number> = { [P]: 100, [N]: 320, [B]: 330, [R]: 500, [Q]: 900, [K]: 0 };

/**
 * A beginner's instincts, nothing more: every legal move is a ticket,
 * captures get extra tickets by the value of what they take, promotion to a
 * queen is tempting, and a move that parks a piece where it can be taken
 * for free loses most of its tickets. No look-ahead — that is the point.
 */
export function lotteryWeights(pos: Position): { move: Move; weight: number }[] {
  const mine = pos.turn;
  return legalMoves(pos).map((move) => {
    let weight = 1;
    if (move.flags & F_CAPTURE) weight += (2 * VALUE[Math.abs(move.captured)]) / 100;
    if (move.flags & F_PROMO) weight = move.promo === Q ? weight + 8 : weight * 0.05;
    const after = applyMove(pos, move);
    if (isAttacked(after.board, move.to, other(mine)) && !isAttacked(after.board, move.to, mine)) weight *= 0.25;
    return { move, weight };
  });
}

export function lotteryMove(pos: Position, rng: () => number = Math.random): Move | null {
  const tickets = lotteryWeights(pos);
  if (tickets.length === 0) return null;
  return tickets[weightedIndex(tickets.map((t) => t.weight), rng)].move;
}

function weightedIndex(weights: number[], rng: () => number): number {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}
