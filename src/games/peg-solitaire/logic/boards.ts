/**
 * Peg Solitaire — pure board logic (no React).
 *
 * A board is a set of holes on a small grid. A move jumps a peg over an
 * adjacent peg (in one of the board's directions) into an empty hole two
 * steps away, removing the jumped peg. The cross boards (English, European)
 * jump in the 4 orthogonal directions; the Triangle board jumps along the 6
 * directions of the triangular lattice.
 *
 * Everything here is importable headlessly so it can be validated by
 * `npm run validate` and the build's headless test script.
 */

export type BoardId = 'triangle' | 'english' | 'european';
export type BoardKind = 'cross' | 'triangle';

export interface Move {
  /** grid index of the jumping peg */
  from: number;
  /** grid index of the jumped (removed) peg */
  over: number;
  /** grid index of the destination hole */
  to: number;
}

/** JSON-serializable game state: which holes currently hold a peg. */
export interface PegState {
  board: BoardId;
  /** length rows*cols, aligned with the board's holes; false where empty */
  pegs: boolean[];
}

export interface BoardDef {
  id: BoardId;
  kind: BoardKind;
  rows: number;
  cols: number;
  /** rows*cols mask — true where a hole exists */
  holes: boolean[];
  /** grid indices that are holes, ascending */
  holeList: number[];
  /** all geometrically possible moves on this board */
  moves: Move[];
  /** adjacency (distance-1 holes along the board's directions), by grid index */
  neighbors: number[][];
  /** grid index of the visual/logical centre hole */
  center: number;
  /** grid index of the standard starting empty hole */
  standardStart: number;
  /** display grid width (for normalized layout) */
  spanX: number;
  /** display grid height */
  spanY: number;
  /** display coordinate of a hole (top-left cell corner units) */
  coord: (i: number) => { gx: number; gy: number };
}

// ----- coordinate helpers -----

const idx = (cols: number, r: number, c: number) => r * cols + c;

function popcount(x: bigint): number {
  let n = 0;
  while (x > 0n) {
    x &= x - 1n;
    n++;
  }
  return n;
}

// ----- board builders -----

const CROSS_DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
] as const;

const TRI_DIRS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
  [-1, -1],
  [1, 1]
] as const;

function buildBoard(opts: {
  id: BoardId;
  kind: BoardKind;
  rows: number;
  cols: number;
  isHole: (r: number, c: number) => boolean;
  dirs: readonly (readonly [number, number])[];
  center: [number, number];
  standardStart: [number, number];
  spanX: number;
  spanY: number;
  coord: (r: number, c: number) => { gx: number; gy: number };
}): BoardDef {
  const { rows, cols } = opts;
  const holes = new Array<boolean>(rows * cols).fill(false);
  const holeList: number[] = [];
  const coordOf = new Array<{ gx: number; gy: number }>(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (opts.isHole(r, c)) {
        const i = idx(cols, r, c);
        holes[i] = true;
        holeList.push(i);
        coordOf[i] = opts.coord(r, c);
      }
    }
  }
  const moves: Move[] = [];
  const neighbors = new Array<number[]>(rows * cols);
  for (const i of holeList) neighbors[i] = [];
  for (const i of holeList) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    for (const [dr, dc] of opts.dirs) {
      const or = r + dr;
      const oc = c + dc;
      if (or >= 0 && or < rows && oc >= 0 && oc < cols && opts.isHole(or, oc)) {
        neighbors[i].push(idx(cols, or, oc));
      }
      const tr = r + 2 * dr;
      const tc = c + 2 * dc;
      if (tr < 0 || tr >= rows || tc < 0 || tc >= cols) continue;
      if (!opts.isHole(or, oc) || !opts.isHole(tr, tc)) continue;
      moves.push({ from: i, over: idx(cols, or, oc), to: idx(cols, tr, tc) });
    }
  }
  return {
    id: opts.id,
    kind: opts.kind,
    rows,
    cols,
    holes,
    holeList,
    moves,
    neighbors,
    center: idx(cols, opts.center[0], opts.center[1]),
    standardStart: idx(cols, opts.standardStart[0], opts.standardStart[1]),
    spanX: opts.spanX,
    spanY: opts.spanY,
    coord: (i: number) => coordOf[i] ?? { gx: 0, gy: 0 }
  };
}

/** English 33-hole cross: 7×7 with the 2×2 corners removed. */
const ENGLISH = buildBoard({
  id: 'english',
  kind: 'cross',
  rows: 7,
  cols: 7,
  isHole: (r, c) => !((r < 2 || r > 4) && (c < 2 || c > 4)),
  dirs: CROSS_DIRS,
  center: [3, 3],
  standardStart: [3, 3],
  spanX: 7,
  spanY: 7,
  coord: (r, c) => ({ gx: c, gy: r })
});

/** European/French 37-hole octagonal board (row widths 3-5-7-7-7-5-3). */
const EURO_INSET = [2, 1, 0, 0, 0, 1, 2];
const EUROPEAN = buildBoard({
  id: 'european',
  kind: 'cross',
  rows: 7,
  cols: 7,
  isHole: (r, c) => c >= EURO_INSET[r] && c <= 6 - EURO_INSET[r],
  dirs: CROSS_DIRS,
  center: [3, 3],
  // [3,5] is solver-verified reducible to a single peg (the European board
  // cannot be cleared to one peg from the central vacancy) — see validate.
  standardStart: [3, 5],
  spanX: 7,
  spanY: 7,
  coord: (r, c) => ({ gx: c, gy: r })
});

/** Triangle 15-hole (rows of 1..5), classic cracker-barrel geometry. */
const TRI_ROWS = 5;
const TRIANGLE = buildBoard({
  id: 'triangle',
  kind: 'triangle',
  rows: TRI_ROWS,
  cols: TRI_ROWS,
  isHole: (r, c) => c <= r,
  dirs: TRI_DIRS,
  center: [2, 1],
  standardStart: [0, 0],
  spanX: TRI_ROWS,
  spanY: TRI_ROWS,
  // centre each row so the board reads as an upright pyramid
  coord: (r, c) => ({ gx: (TRI_ROWS - 1 - r) / 2 + c, gy: r })
});

export const BOARDS: Record<BoardId, BoardDef> = {
  triangle: TRIANGLE,
  english: ENGLISH,
  european: EUROPEAN
};

// ----- core state operations -----

/** Build the single-vacancy starting state for a board and empty hole. */
export function initialState(board: BoardId, emptyHole: number): PegState {
  const def = BOARDS[board];
  return { board, pegs: def.holes.map((h, i) => h && i !== emptyHole) };
}

/** The empty hole of a single-vacancy state (its "start"), or -1. */
export function startHole(state: PegState): number {
  const def = BOARDS[state.board];
  for (const i of def.holeList) if (!state.pegs[i]) return i;
  return -1;
}

export function pegCount(state: PegState): number {
  let n = 0;
  const def = BOARDS[state.board];
  for (const i of def.holeList) if (state.pegs[i]) n++;
  return n;
}

/** All currently legal jumps. */
export function legalMoves(state: PegState): Move[] {
  const def = BOARDS[state.board];
  const out: Move[] = [];
  for (const mv of def.moves) {
    if (state.pegs[mv.from] && state.pegs[mv.over] && !state.pegs[mv.to]) out.push(mv);
  }
  return out;
}

/** Legal jumps that start from a specific peg. */
export function movesFrom(state: PegState, from: number): Move[] {
  return legalMoves(state).filter((m) => m.from === from);
}

/** Apply a move, returning a fresh state (does not mutate). */
export function applyMove(state: PegState, mv: Move): PegState {
  const pegs = state.pegs.slice();
  pegs[mv.from] = false;
  pegs[mv.over] = false;
  pegs[mv.to] = true;
  return { board: state.board, pegs };
}

/** Reverse a previously applied move (used by Undo). */
export function undoMove(state: PegState, mv: Move): PegState {
  const pegs = state.pegs.slice();
  pegs[mv.from] = true;
  pegs[mv.over] = true;
  pegs[mv.to] = false;
  return { board: state.board, pegs };
}

/**
 * Win = exactly one peg remaining. When `requireCenter` is set, that peg
 * must sit in the board's centre hole (the English "finish on centre" goal).
 */
export function isWin(state: PegState, requireCenter = false): boolean {
  if (pegCount(state) !== 1) return false;
  if (!requireCenter) return true;
  return state.pegs[BOARDS[state.board].center] === true;
}

// ----- solver -----

function maskOf(state: PegState): bigint {
  let m = 0n;
  const def = BOARDS[state.board];
  for (const i of def.holeList) if (state.pegs[i]) m |= 1n << BigInt(i);
  return m;
}

/**
 * DFS solver with a dead-position transposition table and a "keep the pegs
 * clustered" move order (try the jump whose resulting board has the most
 * adjacent peg pairs first). This density heuristic finds solutions on the
 * classic boards in tens of thousands of nodes where a static order needs
 * tens of millions. Returns a full move sequence reducing the state to one
 * peg (on the centre hole when `requireCenter`), or null if none is found
 * within the node budget. Finding a solution proves winnability.
 */
export function solve(
  state: PegState,
  requireCenter = false,
  budget = 3_000_000
): Move[] | null {
  const def = BOARDS[state.board];
  const centerBit = 1n << BigInt(def.center);
  const bits = def.moves.map((mv) => ({
    mv,
    fb: 1n << BigInt(mv.from),
    ob: 1n << BigInt(mv.over),
    tb: 1n << BigInt(mv.to)
  }));
  // adjacency as bitmasks for the density score
  const nbBits = new Array<{ i: number; mask: bigint }>();
  for (const i of def.holeList) {
    let mask = 0n;
    for (const j of def.neighbors[i]) if (j > i) mask |= 1n << BigInt(j);
    nbBits.push({ i, mask });
  }
  const density = (m: bigint): number => {
    let s = 0;
    for (const { i, mask } of nbBits) {
      if ((m & (1n << BigInt(i))) === 0n) continue;
      let x = m & mask;
      while (x > 0n) {
        x &= x - 1n;
        s++;
      }
    }
    return s;
  };

  const dead = new Set<bigint>();
  let nodes = 0;

  const dfs = (m: bigint, count: number): Move[] | null => {
    if (count === 1) {
      if (!requireCenter) return [];
      return m === centerBit ? [] : null;
    }
    if (nodes++ > budget) return null;
    if (dead.has(m)) return null;
    const cand: { b: (typeof bits)[number]; sc: number }[] = [];
    for (const b of bits) {
      if ((m & b.fb) !== 0n && (m & b.ob) !== 0n && (m & b.tb) === 0n) {
        cand.push({ b, sc: density((m & ~b.fb & ~b.ob) | b.tb) });
      }
    }
    cand.sort((a, b) => b.sc - a.sc);
    for (const { b } of cand) {
      const res = dfs((m & ~b.fb & ~b.ob) | b.tb, count - 1);
      if (res) return [b.mv, ...res];
    }
    dead.add(m);
    return null;
  };

  const start = maskOf(state);
  return dfs(start, popcount(start));
}

/** Convenience: is this state winnable (to one peg, optionally on centre)? */
export function isSolvable(state: PegState, requireCenter = false, budget?: number): boolean {
  return solve(state, requireCenter, budget) !== null;
}

// ----- difficulty / generation -----

import type { Difficulty } from '../../../platform/types';

export const BOARD_FOR: Record<Difficulty, BoardId> = {
  easy: 'triangle',
  medium: 'english',
  hard: 'european',
  pro: 'english',
  extreme: 'english'
};

/** Only the extreme tier demands the final peg land on the centre hole. */
export function requiresCenter(d: Difficulty): boolean {
  return d === 'extreme';
}

/**
 * Baked, solver-verified single-vacancy start holes for the random-start
 * tiers. Every entry has been proven winnable by `solve` (see the headless
 * test and the validate payload). English grid indices (7×7).
 *  - PRO: solvable to a single peg (anywhere).
 *  - EXTREME: solvable to a single peg ON THE CENTRE hole (harder), and all
 *    off-centre so the finish-on-centre goal is a real journey.
 */
export const PRO_STARTS: number[] = [3, 10, 14, 18, 20, 22, 25, 26, 29, 33, 37, 39, 44, 45];
export const EXTREME_STARTS: number[] = [3, 21, 27, 45];

// small deterministic PRNG so generation is reproducible per seed
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically generate a starting state for a difficulty and seed.
 * Fixed-board tiers ignore the seed; the random-start tiers pick a
 * pre-verified start hole so every offered puzzle is winnable.
 */
export function generateGame(difficulty: Difficulty, seed: number): PegState {
  const board = BOARD_FOR[difficulty];
  const def = BOARDS[board];
  let start = def.standardStart;
  if (difficulty === 'pro') {
    const rng = mulberry32(seed);
    start = PRO_STARTS[Math.floor(rng() * PRO_STARTS.length)];
  } else if (difficulty === 'extreme') {
    const rng = mulberry32(seed);
    start = EXTREME_STARTS[Math.floor(rng() * EXTREME_STARTS.length)];
  }
  return initialState(board, start);
}
