/**
 * Reversi AI — pure and React-free. Minimax with alpha-beta pruning over a
 * positional weight matrix (corners very high, the X/C squares next to them
 * penalised), plus mobility, corner control, frontier discs and, in the
 * endgame, raw disc parity. Depth scales with difficulty; a node cap keeps
 * every search bounded so it can run off the render path without freezing
 * the UI. Passes are handled correctly inside the search.
 *
 * Internally the search runs on a flat Int8Array with pre-computed rays for
 * speed; the public API takes and returns the `board.ts` `number[]` board.
 */

import type { Difficulty } from '../../../platform/types';
import { legalMoves, flipsForMove, countDiscs, opponent, type Board, type Player } from './board';

const SIZE = 8;
const CELLS = 64;

/** classic Othello static weights — corners rule, X/C squares are traps. */
const WEIGHTS: readonly number[] = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120
];

const CORNERS = [0, 7, 56, 63];

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

/** RAYS[i] = for cell i, one ordered list of cell indices per on-board direction */
const RAYS: number[][][] = (() => {
  const out: number[][][] = [];
  for (let i = 0; i < CELLS; i++) {
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    const rays: number[][] = [];
    for (const [dr, dc] of DIRS) {
      const ray: number[] = [];
      let rr = r + dr;
      let cc = c + dc;
      while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) {
        ray.push(rr * SIZE + cc);
        rr += dr;
        cc += dc;
      }
      if (ray.length) rays.push(ray);
    }
    out.push(rays);
  }
  return out;
})();

/** NEIGHBORS[i] = the on-board cells adjacent to i (for frontier detection) */
const NEIGHBORS: number[][] = (() => {
  const out: number[][] = [];
  for (let i = 0; i < CELLS; i++) {
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    const ns: number[] = [];
    for (const [dr, dc] of DIRS) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) ns.push(rr * SIZE + cc);
    }
    out.push(ns);
  }
  return out;
})();

/* ---- fast Int8Array board ops used inside the search ---- */

function fLegalMoves(b: Int8Array, me: number): number[] {
  const opp = me === 1 ? 2 : 1;
  const res: number[] = [];
  for (let i = 0; i < CELLS; i++) {
    if (b[i] !== 0) continue;
    const rays = RAYS[i];
    for (let d = 0; d < rays.length; d++) {
      const ray = rays[d];
      let k = 0;
      while (k < ray.length && b[ray[k]] === opp) k++;
      if (k > 0 && k < ray.length && b[ray[k]] === me) {
        res.push(i);
        break;
      }
    }
  }
  return res;
}

function fHasMove(b: Int8Array, me: number): boolean {
  const opp = me === 1 ? 2 : 1;
  for (let i = 0; i < CELLS; i++) {
    if (b[i] !== 0) continue;
    const rays = RAYS[i];
    for (let d = 0; d < rays.length; d++) {
      const ray = rays[d];
      let k = 0;
      while (k < ray.length && b[ray[k]] === opp) k++;
      if (k > 0 && k < ray.length && b[ray[k]] === me) return true;
    }
  }
  return false;
}

function fApply(b: Int8Array, move: number, me: number): Int8Array {
  const opp = me === 1 ? 2 : 1;
  const nb = b.slice();
  nb[move] = me;
  const rays = RAYS[move];
  for (let d = 0; d < rays.length; d++) {
    const ray = rays[d];
    let k = 0;
    while (k < ray.length && b[ray[k]] === opp) k++;
    if (k > 0 && k < ray.length && b[ray[k]] === me) {
      for (let j = 0; j < k; j++) nb[ray[j]] = me;
    }
  }
  return nb;
}

function isFrontier(b: Int8Array, i: number): boolean {
  const ns = NEIGHBORS[i];
  for (let k = 0; k < ns.length; k++) if (b[ns[k]] === 0) return true;
  return false;
}

/** static evaluation from `me`'s perspective; `strong` adds frontier & corner emphasis. */
function evaluate(b: Int8Array, me: number, strong: boolean): number {
  const opp = me === 1 ? 2 : 1;
  let myPos = 0;
  let oppPos = 0;
  let myCnt = 0;
  let oppCnt = 0;
  let myFront = 0;
  let oppFront = 0;
  for (let i = 0; i < CELLS; i++) {
    const v = b[i];
    if (v === 0) continue;
    if (v === me) {
      myPos += WEIGHTS[i];
      myCnt++;
      if (strong && isFrontier(b, i)) myFront++;
    } else {
      oppPos += WEIGHTS[i];
      oppCnt++;
      if (strong && isFrontier(b, i)) oppFront++;
    }
  }
  const empty = CELLS - myCnt - oppCnt;

  const myMob = fLegalMoves(b, me).length;
  const oppMob = fLegalMoves(b, opp).length;
  const mobDiff = myMob + oppMob > 0 ? (100 * (myMob - oppMob)) / (myMob + oppMob) : 0;

  const discDiff = myCnt + oppCnt > 0 ? (100 * (myCnt - oppCnt)) / (myCnt + oppCnt) : 0;

  // fewer frontier discs is better (they expose you to captures)
  const frontDiff = myFront + oppFront > 0 ? (100 * (oppFront - myFront)) / (myFront + oppFront) : 0;

  let cMe = 0;
  let cOpp = 0;
  for (const cc of CORNERS) {
    if (b[cc] === me) cMe++;
    else if (b[cc] === opp) cOpp++;
  }
  const cornerDiff = cMe - cOpp;

  // disc parity barely matters early but decides the endgame
  const endgameW = empty <= 12 ? (strong ? 3 : 2) : 0;

  return (
    (myPos - oppPos) +
    mobDiff * (strong ? 2.2 : 1.6) +
    cornerDiff * 200 +
    discDiff * (1 + endgameW) +
    (strong ? frontDiff * 0.9 : 0)
  );
}

/** terminal (game-over) score — huge magnitude by disc difference. */
function terminalScore(b: Int8Array, me: number): number {
  let myCnt = 0;
  let oppCnt = 0;
  for (let i = 0; i < CELLS; i++) {
    if (b[i] === me) myCnt++;
    else if (b[i] !== 0) oppCnt++;
  }
  const diff = myCnt - oppCnt;
  if (diff > 0) return 100000 + diff;
  if (diff < 0) return -100000 + diff;
  return 0;
}

interface Ctx {
  nodes: number;
  cap: number;
  me: number;
  strong: boolean;
}

function search(
  b: Int8Array,
  toMove: number,
  depth: number,
  alpha: number,
  beta: number,
  prevPassed: boolean,
  ctx: Ctx
): number {
  ctx.nodes++;
  const moves = fLegalMoves(b, toMove);
  if (moves.length === 0) {
    // no move → pass; two passes in a row (or opponent also stuck) ends the game
    if (prevPassed || !fHasMove(b, toMove === 1 ? 2 : 1)) return terminalScore(b, ctx.me);
    return search(b, toMove === 1 ? 2 : 1, depth, alpha, beta, true, ctx);
  }
  if (depth <= 0 || ctx.nodes > ctx.cap) return evaluate(b, ctx.me, ctx.strong);

  // move ordering: corners/edges first sharpens alpha-beta pruning
  moves.sort((x, y) => WEIGHTS[y] - WEIGHTS[x]);
  const next = toMove === 1 ? 2 : 1;

  if (toMove === ctx.me) {
    let best = -Infinity;
    for (const m of moves) {
      const s = search(fApply(b, m, toMove), next, depth - 1, alpha, beta, false, ctx);
      if (s > best) best = s;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    const s = search(fApply(b, m, toMove), next, depth - 1, alpha, beta, false, ctx);
    if (s < best) best = s;
    if (best < beta) beta = best;
    if (alpha >= beta) break;
  }
  return best;
}

export interface AiParams {
  depth: number;
  strong: boolean;
  cap: number;
  /** at or below this many empty squares, search deeper toward the end. */
  endgame: number;
}

const PARAMS: Record<Difficulty, AiParams> = {
  easy: { depth: 1, strong: false, cap: 20000, endgame: 0 },
  medium: { depth: 3, strong: false, cap: 60000, endgame: 0 },
  hard: { depth: 5, strong: false, cap: 130000, endgame: 8 },
  pro: { depth: 7, strong: true, cap: 220000, endgame: 10 },
  extreme: { depth: 8, strong: true, cap: 320000, endgame: 12 }
};

function bestOfSearch(board: Board, player: Player, depth: number, cap: number, strong: boolean): number {
  const moves = legalMoves(board, player);
  const b = Int8Array.from(board);
  const ctx: Ctx = { nodes: 0, cap, me: player as number, strong };
  const ordered = [...moves].sort((x, y) => WEIGHTS[y] - WEIGHTS[x]);
  let bestMove = ordered[0];
  let best = -Infinity;
  let alpha = -Infinity;
  for (const m of ordered) {
    const s = search(fApply(b, m, player), opponent(player), depth - 1, alpha, Infinity, false, ctx);
    if (s > best) {
      best = s;
      bestMove = m;
    }
    if (best > alpha) alpha = best;
  }
  return bestMove;
}

/**
 * The robot's move for the given difficulty. Returns a legal cell index, or
 * `null` when the player has no legal move (the caller passes). Never returns
 * an illegal move.
 */
export function chooseMove(board: Board, player: Player, difficulty: Difficulty): number | null {
  const moves = legalMoves(board, player);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  if (difficulty === 'easy') {
    // deliberately sloppy: often a random legal move, otherwise a greedy
    // max-flip grab — the classic beginner blunder of chasing early discs
    if (Math.random() < 0.5) return moves[Math.floor(Math.random() * moves.length)];
    let best = moves[0];
    let bestFlips = -1;
    for (const m of moves) {
      const f = flipsForMove(board, m, player).length;
      if (f > bestFlips) {
        bestFlips = f;
        best = m;
      }
    }
    return best;
  }

  const p = PARAMS[difficulty];
  const { empty } = countDiscs(board);
  const depth = p.endgame > 0 && empty <= p.endgame ? empty : p.depth;
  return bestOfSearch(board, player, depth, p.cap, p.strong);
}

/**
 * A strong-but-shallow suggestion for the human's Hint assist (vs Robot).
 * Returns a good legal move, or `null` when there is none.
 */
export function suggestMove(board: Board, player: Player): number | null {
  const moves = legalMoves(board, player);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];
  return bestOfSearch(board, player, 4, 60000, true);
}
