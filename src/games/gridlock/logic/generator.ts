import type { Difficulty } from '../../../platform/types';
import { BANK } from './puzzles';

/*
 * Gridlock — a sliding-block traffic jam (Rush Hour style). Pure TS, no
 * React, so the generator/solver can be validated headlessly.
 *
 * Board is a fixed SIZE×SIZE grid. Each piece is a car (len 2) or truck
 * (len 3) locked to one axis: horizontal pieces only slide left/right,
 * vertical pieces only up/down. The RED car (id 0) is horizontal on the
 * exit row and wins by reaching the exit gap on the right edge.
 *
 * A "move" = sliding ONE piece any number of empty cells in one direction
 * (classic Rush Hour move counting). The BFS below and the UI both use this
 * exact definition, so par (minMoves) always matches what the player counts.
 */

export const SIZE = 6;
export const EXIT_ROW = 2;

export type Orientation = 'h' | 'v';

export interface Piece {
  id: number;
  /** top-left cell of the piece in its start layout */
  row: number;
  col: number;
  /** 2 = car, 3 = truck */
  len: number;
  orient: Orientation;
}

export interface GridlockPuzzle {
  seed: number;
  difficulty: Difficulty;
  pieces: Piece[];
  redId: number;
  minMoves: number;
}

/** Deterministic RNG so generation + validation are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The variable coordinate of each piece (col if horizontal, row if vertical). */
export function startPositions(pieces: Piece[]): number[] {
  return pieces.map((p) => (p.orient === 'h' ? p.col : p.row));
}

/** Cell indices a piece covers given its variable-axis position. */
export function cellsOf(p: Piece, pos: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < p.len; k++) {
    if (p.orient === 'h') out.push(p.row * SIZE + (pos + k));
    else out.push((pos + k) * SIZE + p.col);
  }
  return out;
}

/** Board occupancy grid (cell -> piece index, or -1). */
function occupancy(pieces: Piece[], pos: number[]): Int8Array {
  const grid = new Int8Array(SIZE * SIZE).fill(-1);
  for (let i = 0; i < pieces.length; i++) {
    for (const c of cellsOf(pieces[i], pos[i])) grid[c] = i;
  }
  return grid;
}

/** Legal [min, max] variable-axis positions a single piece can slide to. */
export function slideRange(pieces: Piece[], pos: number[], id: number): [number, number] {
  const grid = occupancy(pieces, pos);
  const p = pieces[id];
  const cur = pos[id];
  let lo = cur;
  let hi = cur;
  if (p.orient === 'h') {
    while (lo - 1 >= 0 && grid[p.row * SIZE + (lo - 1)] === -1) lo--;
    while (hi + p.len <= SIZE - 1 && grid[p.row * SIZE + (hi + p.len)] === -1) hi++;
  } else {
    while (lo - 1 >= 0 && grid[(lo - 1) * SIZE + p.col] === -1) lo--;
    while (hi + p.len <= SIZE - 1 && grid[(hi + p.len) * SIZE + p.col] === -1) hi++;
  }
  return [lo, hi];
}

const encode = (pos: number[]): string => String.fromCharCode(...pos);

/*
 * State keys for BFS are packed integers: each piece's variable-axis position
 * is 0..5 (3 bits), up to 12 pieces → 36 bits, safely within a JS double int.
 * Integer keys make the Maps/Sets far faster than string keys.
 */
function pack(pos: number[]): number {
  let k = 0;
  for (let i = 0; i < pos.length; i++) k += pos[i] * PACK_BASE[i];
  return k;
}
function unpack(key: number, n: number): number[] {
  // division (not bit-shift): keys can exceed 32 bits for 11–12 pieces
  const pos = new Array<number>(n);
  for (let i = 0; i < n; i++) pos[i] = Math.floor(key / PACK_BASE[i]) % 8;
  return pos;
}
const PACK_BASE: number[] = Array.from({ length: 12 }, (_, i) => 2 ** (3 * i));

interface Move {
  pieceId: number;
  toPos: number;
}

/** All one-move neighbour states (each a full position array) of `pos`. */
function neighborStates(pieces: Piece[], pos: number[]): number[][] {
  const grid = occupancy(pieces, pos);
  const out: number[][] = [];
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    const cur = pos[i];
    if (p.orient === 'h') {
      for (let c = cur - 1; c >= 0 && grid[p.row * SIZE + c] === -1; c--) {
        const np = pos.slice();
        np[i] = c;
        out.push(np);
      }
      for (let h = cur + p.len; h <= SIZE - 1 && grid[p.row * SIZE + h] === -1; h++) {
        const np = pos.slice();
        np[i] = h - p.len + 1;
        out.push(np);
      }
    } else {
      for (let r = cur - 1; r >= 0 && grid[r * SIZE + p.col] === -1; r--) {
        const np = pos.slice();
        np[i] = r;
        out.push(np);
      }
      for (let t = cur + p.len; t <= SIZE - 1 && grid[t * SIZE + p.col] === -1; t++) {
        const np = pos.slice();
        np[i] = t - p.len + 1;
        out.push(np);
      }
    }
  }
  return out;
}

interface SolveResult {
  minMoves: number; // -1 if unsolved within cap
  /** First move on a shortest path out of the start state (for hints). */
  firstMove: Move | null;
  states: number; // states expanded (for perf tuning)
}

/**
 * Breadth-first search over board states. Returns the minimum move count to
 * bring the red car to the exit and the first move on a shortest path.
 * Bounded by `cap` expanded states so a pathological board can't hang.
 */
export function solve(
  pieces: Piece[],
  startPos: number[],
  redId: number,
  cap = 250_000
): SolveResult {
  const redLen = pieces[redId].len;
  const winPos = SIZE - redLen; // red's left col when its head touches the exit
  const isWin = (pos: number[]): boolean => pos[redId] === winPos;

  if (isWin(startPos)) return { minMoves: 0, firstMove: null, states: 0 };

  const startKey = encode(startPos);
  // parent bookkeeping so we can recover the first move of a shortest path
  const parent = new Map<string, { key: string; move: Move } | null>();
  parent.set(startKey, null);
  const dist = new Map<string, number>();
  dist.set(startKey, 0);
  let frontier: { pos: number[]; key: string }[] = [{ pos: startPos, key: startKey }];
  let depth = 0;
  let expanded = 0;

  while (frontier.length > 0) {
    const next: { pos: number[]; key: string }[] = [];
    for (const node of frontier) {
      expanded++;
      if (expanded > cap) return { minMoves: -1, firstMove: null, states: expanded };
      const grid = occupancy(pieces, node.pos);
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        const cur = node.pos[i];
        const targets: number[] = [];
        if (p.orient === 'h') {
          for (let c = cur - 1; c >= 0 && grid[p.row * SIZE + c] === -1; c--) targets.push(c);
          for (let h = cur + p.len; h <= SIZE - 1 && grid[p.row * SIZE + h] === -1; h++)
            targets.push(h - p.len + 1);
        } else {
          for (let r = cur - 1; r >= 0 && grid[r * SIZE + p.col] === -1; r--) targets.push(r);
          for (let t = cur + p.len; t <= SIZE - 1 && grid[t * SIZE + p.col] === -1; t++)
            targets.push(t - p.len + 1);
        }
        for (const to of targets) {
          const np = node.pos.slice();
          np[i] = to;
          const key = encode(np);
          if (dist.has(key)) continue;
          dist.set(key, depth + 1);
          parent.set(key, { key: node.key, move: { pieceId: i, toPos: to } });
          if (isWin(np)) {
            // walk back to the start to find the first move taken
            let k = key;
            let first: Move | null = parent.get(k)!.move;
            for (;;) {
              const rec = parent.get(k);
              if (!rec) break;
              if (rec.key === startKey) {
                first = rec.move;
                break;
              }
              first = rec.move;
              k = rec.key;
            }
            return { minMoves: depth + 1, firstMove: first, states: expanded };
          }
          next.push({ pos: np, key });
        }
      }
    }
    frontier = next;
    depth++;
  }
  return { minMoves: -1, firstMove: null, states: expanded };
}

/** The optimal next move from the given live state (used by the hint tool). */
export function nextBestMove(pieces: Piece[], pos: number[], redId: number): Move | null {
  return solve(pieces, pos, redId).firstMove;
}

/**
 * Difficulty bands (inclusive min-moves-to-solve). Disjoint and ascending so
 * a solved-distance maps to exactly one tier. The runtime picks pre-baked
 * puzzles from these bands (see logic/puzzles.ts); baking these on the fly is
 * far too slow (a 30-move board's full BFS explores >100k states), so the
 * expensive component analysis runs offline and only its results ship.
 */
export const BANDS: Record<Difficulty, [number, number]> = {
  easy: [4, 8],
  medium: [9, 14],
  hard: [15, 21],
  pro: [22, 26],
  extreme: [27, 48]
};

/** The tier a solved-distance belongs to (null if below the easiest band). */
export function tierOf(moves: number): Difficulty | null {
  for (const d of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const [lo, hi] = BANDS[d];
    if (moves >= lo && moves <= hi) return d;
  }
  return null;
}

/** Cap on reachable-component size — a board bigger than this is skipped. */
const COMPONENT_CAP = 200_000;

const rint = (rng: () => number, n: number): number => Math.floor(rng() * n);

/**
 * Place a random legal piece layout: the red car (id 0) horizontal on the exit
 * row away from the exit, `blockers` vertical cars crossing the exit lane to
 * its right, then random fillers up to the target piece count. Returns null if
 * it can't reach `minPieces`. Used offline by the bake script.
 */
export function randomLayout(
  rng: () => number,
  opts: { pieces: number; minPieces: number; blockers: number; redMaxCol: number }
): Piece[] | null {
  const grid = new Int8Array(SIZE * SIZE).fill(-1);
  const pieces: Piece[] = [];

  const fits = (row: number, col: number, len: number, orient: Orientation): boolean => {
    for (let k = 0; k < len; k++) {
      const r = orient === 'h' ? row : row + k;
      const c = orient === 'h' ? col + k : col;
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
      if (grid[r * SIZE + c] !== -1) return false;
    }
    return true;
  };
  const add = (row: number, col: number, len: number, orient: Orientation): boolean => {
    if (!fits(row, col, len, orient)) return false;
    const id = pieces.length;
    for (let k = 0; k < len; k++) {
      const r = orient === 'h' ? row : row + k;
      const c = orient === 'h' ? col + k : col;
      grid[r * SIZE + c] = id;
    }
    pieces.push({ id, row, col, len, orient });
    return true;
  };

  const redCol = rint(rng, opts.redMaxCol + 1);
  add(EXIT_ROW, redCol, 2, 'h');
  const redHead = redCol + 1;

  let placedBlockers = 0;
  for (let a = 0; a < 60 && placedBlockers < opts.blockers; a++) {
    if (redHead + 1 > SIZE - 1) break;
    const col = redHead + 1 + rint(rng, SIZE - 1 - redHead);
    const len = rng() < 0.35 ? 3 : 2;
    const minTop = Math.max(0, EXIT_ROW - (len - 1));
    const maxTop = Math.min(SIZE - len, EXIT_ROW);
    if (maxTop < minTop) continue;
    const top = minTop + rint(rng, maxTop - minTop + 1);
    if (add(top, col, len, 'v')) placedBlockers++;
  }

  let guard = 0;
  while (pieces.length < opts.pieces && guard < 500) {
    guard++;
    const orient: Orientation = rng() < 0.5 ? 'h' : 'v';
    const len = rng() < 0.3 ? 3 : 2;
    if (orient === 'h') {
      const row = rint(rng, SIZE);
      if (row === EXIT_ROW) continue; // keep the exit lane clear of extra h-cars
      add(row, rint(rng, SIZE - len + 1), len, orient);
    } else {
      add(rint(rng, SIZE - len + 1), rint(rng, SIZE), len, orient);
    }
  }
  return pieces.length >= opts.minPieces ? pieces : null;
}

/** Rebuild the immutable piece list so its start layout matches `pos`. */
function repositioned(pieces: Piece[], pos: number[]): Piece[] {
  return pieces.map((p, i) =>
    p.orient === 'h' ? { ...p, col: pos[i] } : { ...p, row: pos[i] }
  );
}

export interface Component {
  /** minMoves-to-solve for every reachable state (packed key -> moves). */
  dist: Map<number, number>;
  /** Turn a packed state key into a concrete piece layout (start = that state). */
  materialize: (key: number) => Piece[];
}

/**
 * Enumerate a piece set's full reachable component, then multi-source BFS from
 * every solved state so each reachable state's exact minMoves-to-solve is
 * known. Returns null if the set is unsolvable or its component exceeds the
 * cap (so a truncated graph can never yield a wrong par). Offline / validation
 * use only — never called at runtime.
 */
export function analyzeComponent(pieces: Piece[]): Component | null {
  const n = pieces.length;
  const startPos = startPositions(pieces);
  const winPos = SIZE - pieces[0].len;
  const visited = new Set<number>();
  const won: number[] = [];
  let frontier = [startPos];
  visited.add(pack(startPos));
  if (startPos[0] === winPos) won.push(pack(startPos));
  while (frontier.length > 0) {
    const next: number[][] = [];
    for (const pos of frontier) {
      for (const np of neighborStates(pieces, pos)) {
        const key = pack(np);
        if (visited.has(key)) continue;
        visited.add(key);
        if (np[0] === winPos) won.push(key);
        next.push(np);
        if (visited.size > COMPONENT_CAP) return null;
      }
    }
    frontier = next;
  }
  if (won.length === 0) return null; // red can never reach the exit

  const dist = new Map<number, number>();
  let layer = won;
  for (const k of won) dist.set(k, 0);
  let d = 0;
  while (layer.length > 0) {
    const next: number[] = [];
    for (const key of layer) {
      for (const np of neighborStates(pieces, unpack(key, n))) {
        const nk = pack(np);
        if (dist.has(nk)) continue;
        dist.set(nk, d + 1);
        next.push(nk);
      }
    }
    layer = next;
    d++;
  }
  return { dist, materialize: (key: number) => repositioned(pieces, unpack(key, n)) };
}

/** Serialized puzzle stored in the pre-baked bank. p = [row, col, len, orientBit]. */
export interface RawPuzzle {
  m: number;
  p: [number, number, number, 0 | 1][];
}

export function rawToPieces(raw: RawPuzzle): Piece[] {
  return raw.p.map(([row, col, len, o], id) => ({
    id,
    row,
    col,
    len,
    orient: o === 0 ? ('h' as const) : ('v' as const)
  }));
}

export function piecesToRaw(pieces: Piece[], minMoves: number): RawPuzzle {
  return {
    m: minMoves,
    p: pieces.map((p) => [p.row, p.col, p.len, p.orient === 'h' ? 0 : 1] as [number, number, number, 0 | 1])
  };
}

/**
 * Return a Gridlock puzzle for the given difficulty. Puzzles are pre-baked
 * (logic/puzzles.ts) and provably sound; this picks one deterministically from
 * the tier's bank by seed, so the same seed always yields the same board and
 * runtime is instant.
 */
export function generateGridlock(opts: { seed?: number; difficulty: Difficulty }): GridlockPuzzle {
  const { difficulty } = opts;
  const bank = BANK[difficulty];
  const seed = opts.seed ?? (Math.floor(Math.random() * 0xffffffff) >>> 0);
  const raw = bank[(seed >>> 0) % bank.length];
  return {
    seed,
    difficulty,
    pieces: rawToPieces(raw),
    redId: 0,
    minMoves: raw.m
  };
}
