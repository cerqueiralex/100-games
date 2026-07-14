/**
 * Letter Hunt board generator — pure TS, no React.
 *
 * A square grid is filled from an English-like letter-frequency bag (seeded
 * mulberry32, so every board is reproducible). Q is always emitted as the
 * single "QU" tile so Q-words remain spellable. Each candidate board is then
 * fully solved by a trie-pruned DFS (`HUNT_PREFIXES` / `HUNT_WORDS`) and only
 * accepted when it yields at least the tier's minimum of findable words and
 * points — so every board handed to the player is comfortably winnable. The
 * complete solution list (word + one representative path) is returned for the
 * end-screen "missed words" list and the hint assist.
 */

import type { Difficulty } from '../../../platform/types';
import { HUNT_PREFIXES, HUNT_WORDS } from './words';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface HuntSolution {
  word: string;
  /** tile indices, in order, that spell `word` (one representative path) */
  path: number[];
}

export interface HuntBoard {
  seed: number;
  difficulty: Difficulty;
  size: number;
  /** size*size tiles, row-major. Each is "A".."Z" or the two-letter "QU". */
  tiles: string[];
  /** minimum letters a submitted word must have on this tier */
  minLen: number;
  /** round length in seconds */
  timeSec: number;
  /** every findable word, longest-first then alphabetical */
  solutions: HuntSolution[];
  availableWords: number;
  /** total raw points of every findable word (pre difficulty multiplier) */
  availablePoints: number;
  /** raw-points score the player must reach to win (pre multiplier) */
  target: number;
}

interface TierConfig {
  size: number;
  timeSec: number;
  minLen: number;
  /** board is regenerated until it beats these floors */
  minWords: number;
  minPoints: number;
  /** target = round(availablePoints * targetPct) */
  targetPct: number;
}

export const HUNT_CONFIG: Record<Difficulty, TierConfig> = {
  easy: { size: 4, timeSec: 90, minLen: 3, minWords: 16, minPoints: 260, targetPct: 0.12 },
  medium: { size: 4, timeSec: 80, minLen: 3, minWords: 22, minPoints: 360, targetPct: 0.16 },
  hard: { size: 5, timeSec: 75, minLen: 3, minWords: 45, minPoints: 700, targetPct: 0.16 },
  pro: { size: 5, timeSec: 70, minLen: 4, minWords: 26, minPoints: 620, targetPct: 0.19 },
  extreme: { size: 6, timeSec: 60, minLen: 4, minWords: 55, minPoints: 1150, targetPct: 0.22 }
};

/** Points a word is worth, by its LETTER length (Qu counts as two letters). */
export function wordPoints(len: number): number {
  if (len <= 3) return 10;
  if (len === 4) return 20;
  if (len === 5) return 40;
  if (len === 6) return 70;
  if (len === 7) return 110;
  return 160; // 8+
}

/**
 * Letter-frequency bag tuned toward Boggle fairness: vowels are ~43% of the
 * bag so most boards spell plenty of words; Q is rare and always becomes "QU".
 */
const LETTER_WEIGHTS: [string, number][] = [
  ['E', 12], ['A', 9], ['I', 9], ['O', 8], ['N', 6], ['R', 6], ['T', 6],
  ['L', 4], ['S', 4], ['U', 4], ['D', 4], ['G', 3], ['B', 2], ['C', 2],
  ['M', 2], ['P', 2], ['F', 2], ['H', 2], ['V', 2], ['W', 2], ['Y', 2],
  ['K', 1], ['J', 1], ['X', 1], ['Z', 1], ['Q', 1]
];

const BAG: string[] = (() => {
  const out: string[] = [];
  for (const [ch, w] of LETTER_WEIGHTS) for (let i = 0; i < w; i++) out.push(ch);
  return out;
})();

function drawTile(rnd: () => number): string {
  const ch = BAG[Math.floor(rnd() * BAG.length)];
  return ch === 'Q' ? 'QU' : ch;
}

/** 8-direction neighbours of every cell, precomputed per board size. */
function buildNeighbors(size: number): number[][] {
  const nb: number[][] = [];
  for (let i = 0; i < size * size; i++) {
    const r = Math.floor(i / size);
    const c = i % size;
    const list: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const ncc = c + dc;
        if (nr >= 0 && nr < size && ncc >= 0 && ncc < size) list.push(nr * size + ncc);
      }
    }
    nb.push(list);
  }
  return nb;
}

/**
 * Trie-pruned DFS over the whole board. Returns one representative path per
 * distinct findable word of length >= minLen.
 */
export function solveBoard(tiles: string[], size: number, minLen: number): HuntSolution[] {
  const neighbors = buildNeighbors(size);
  const n = size * size;
  const visited = new Array<boolean>(n).fill(false);
  const found = new Map<string, number[]>();

  const dfs = (cell: number, word: string, path: number[]) => {
    const next = word + tiles[cell];
    if (!HUNT_PREFIXES.has(next)) return; // dead branch — prune
    path.push(cell);
    visited[cell] = true;
    if (next.length >= minLen && HUNT_WORDS.has(next) && !found.has(next)) {
      found.set(next, path.slice());
    }
    for (const nb of neighbors[cell]) {
      if (!visited[nb]) dfs(nb, next, path);
    }
    path.pop();
    visited[cell] = false;
  };

  for (let i = 0; i < n; i++) dfs(i, '', []);

  const list: HuntSolution[] = [...found.entries()].map(([word, path]) => ({ word, path }));
  // longest first, then alphabetical — nicest for the chip list & missed-words
  list.sort((a, b) => b.word.length - a.word.length || (a.word < b.word ? -1 : 1));
  return list;
}

function pointsOf(solutions: HuntSolution[]): number {
  let total = 0;
  for (const s of solutions) total += wordPoints(s.word.length);
  return total;
}

/**
 * Generates a seeded, solver-verified board for the difficulty. If a `seed`
 * is given the result is deterministic; otherwise a random seed is chosen.
 */
export function generateHuntBoard({
  seed,
  difficulty
}: {
  seed?: number;
  difficulty: Difficulty;
}): HuntBoard {
  const cfg = HUNT_CONFIG[difficulty];
  const baseSeed = seed ?? Math.floor(Math.random() * 0x7fffffff);
  const n = cfg.size * cfg.size;

  let best: { tiles: string[]; solutions: HuntSolution[]; points: number; seed: number } | null =
    null;

  for (let attempt = 0; attempt < 300; attempt++) {
    const trySeed = (baseSeed + attempt * 0x9e3779b1) >>> 0;
    const rnd = mulberry32(trySeed);
    const tiles: string[] = [];
    for (let i = 0; i < n; i++) tiles.push(drawTile(rnd));
    const solutions = solveBoard(tiles, cfg.size, cfg.minLen);
    const points = pointsOf(solutions);

    if (!best || points > best.points) best = { tiles, solutions, points, seed: trySeed };

    if (solutions.length >= cfg.minWords && points >= cfg.minPoints) {
      return finalize(tiles, cfg, difficulty, trySeed, solutions, points);
    }
  }

  // Practically unreachable (random boards clear the floors easily); fall back
  // to the richest board we saw so the game is still fully playable.
  const b = best!;
  return finalize(b.tiles, cfg, difficulty, b.seed, b.solutions, b.points);
}

function finalize(
  tiles: string[],
  cfg: TierConfig,
  difficulty: Difficulty,
  seed: number,
  solutions: HuntSolution[],
  points: number
): HuntBoard {
  const target = Math.max(wordPoints(cfg.minLen), Math.round(points * cfg.targetPct));
  return {
    seed,
    difficulty,
    size: cfg.size,
    tiles,
    minLen: cfg.minLen,
    timeSec: cfg.timeSec,
    solutions,
    availableWords: solutions.length,
    availablePoints: points,
    target
  };
}

/** Display form of a tile ("QU" → "Qu"), for the board and previews. */
export function tileLabel(tile: string): string {
  return tile === 'QU' ? 'Qu' : tile;
}
