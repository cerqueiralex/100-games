/**
 * Word Search board generator — pure TS, no React.
 *
 * Seeded (mulberry32) and provably sound: words are placed with
 * backtracking (overlaps encouraged, denser on pro/extreme), the fill is
 * biased toward the placed words' letters to defeat letter-frequency
 * scanning, and the finished grid is re-scanned so every listed word is
 * findable in EXACTLY one spot along the tier's selectable rays (forward
 * or reversed reading). Accidental extra copies created by the fill are
 * repaired by mutating a fill letter and re-scanning.
 */

import type { Difficulty } from '../../../platform/types';
import { THEMES } from './themes';

export interface WordPlacement {
  word: string;
  row: number;
  col: number;
  dr: number;
  dc: number;
}

export interface WordSearchPuzzle {
  seed: number;
  difficulty: Difficulty;
  size: number;
  themeId: string;
  theme: string;
  /** size*size uppercase letters, row-major */
  grid: string[];
  /** the target list, alphabetical, with the intended placements */
  words: WordPlacement[];
  /** directions words may run in this tier (for the direction-arrows assist) */
  placeDirs: [number, number][];
}

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

const E: [number, number] = [0, 1];
const S: [number, number] = [1, 0];
const SE: [number, number] = [1, 1];
const NE: [number, number] = [-1, 1];
const ALL8: [number, number][] = [E, S, SE, NE, [0, -1], [-1, 0], [-1, -1], [1, -1]];

export const WS_CONFIG: Record<
  Difficulty,
  { size: number; count: number; dirs: [number, number][]; overlapBias: number }
> = {
  easy: { size: 7, count: 6, dirs: [E, S], overlapBias: 2 },
  medium: { size: 9, count: 8, dirs: [E, S, NE, SE], overlapBias: 2 },
  hard: { size: 11, count: 10, dirs: ALL8, overlapBias: 3 },
  pro: { size: 12, count: 12, dirs: ALL8, overlapBias: 7 },
  extreme: { size: 14, count: 14, dirs: ALL8, overlapBias: 7 }
};

/**
 * Canonical scan axes per tier: every ray the player can select reads as
 * either a forward or reversed string along one of these axes, so scanning
 * them with fwd+rev matching counts every findable instance exactly once.
 * (easy snaps to orthogonal rays only; medium+ snap to all 8.)
 */
export function scanAxesFor(difficulty: Difficulty): [number, number][] {
  return difficulty === 'easy' ? [E, S] : [E, S, SE, NE];
}

const reverse = (w: string): string => [...w].reverse().join('');

/** All findable instances of `word` (forward or reversed) along `axes`. */
export function findAllOccurrences(
  grid: string[],
  size: number,
  word: string,
  axes: [number, number][]
): number[][] {
  const rev = reverse(word);
  const L = word.length;
  const found: number[][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const [dr, dc] of axes) {
        const rEnd = r + dr * (L - 1);
        const cEnd = c + dc * (L - 1);
        if (rEnd < 0 || rEnd >= size || cEnd < 0 || cEnd >= size) continue;
        const cells: number[] = [];
        let str = '';
        for (let i = 0; i < L; i++) {
          const idx = (r + dr * i) * size + (c + dc * i);
          cells.push(idx);
          str += grid[idx];
        }
        if (str === word || str === rev) found.push(cells);
      }
    }
  }
  return found;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Candidate {
  row: number;
  col: number;
  dr: number;
  dc: number;
  score: number;
}

function placeAll(
  grid: string[],
  size: number,
  words: string[],
  idx: number,
  dirs: [number, number][],
  bias: number,
  rng: () => number,
  out: WordPlacement[]
): boolean {
  if (idx === words.length) return true;
  const word = words[idx];
  const L = word.length;
  const candidates: Candidate[] = [];
  for (const [dr, dc] of dirs) {
    const rMin = dr === -1 ? L - 1 : 0;
    const rMax = dr === 1 ? size - L : size - 1;
    const cMin = dc === -1 ? L - 1 : 0;
    const cMax = dc === 1 ? size - L : size - 1;
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        let overlap = 0;
        let fits = true;
        for (let i = 0; i < L; i++) {
          const cell = grid[(r + dr * i) * size + (c + dc * i)];
          if (cell === '') continue;
          if (cell !== word[i]) {
            fits = false;
            break;
          }
          overlap++;
        }
        if (fits) candidates.push({ row: r, col: c, dr, dc, score: overlap * bias + rng() });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  // trying every candidate makes worst-case backtracking explode; the top
  // slice is plenty on these board sizes
  const cap = Math.min(candidates.length, 60);
  for (let k = 0; k < cap; k++) {
    const cand = candidates[k];
    const written: number[] = [];
    for (let i = 0; i < L; i++) {
      const at = (cand.row + cand.dr * i) * size + (cand.col + cand.dc * i);
      if (grid[at] === '') {
        grid[at] = word[i];
        written.push(at);
      }
    }
    out.push({ word, row: cand.row, col: cand.col, dr: cand.dr, dc: cand.dc });
    if (placeAll(grid, size, words, idx + 1, dirs, bias, rng, out)) return true;
    out.pop();
    for (const at of written) grid[at] = '';
  }
  return false;
}

function tryBuild(
  seed: number,
  attempt: number,
  difficulty: Difficulty
): WordSearchPuzzle | null {
  const cfg = WS_CONFIG[difficulty];
  const rng = mulberry32((seed + attempt * 7919) >>> 0 || 1);
  const size = cfg.size;
  const n = size * size;

  const theme = THEMES[Math.floor(rng() * THEMES.length)];
  const pool = theme.words.filter((w) => w.length <= size);
  if (pool.length < cfg.count) return null;
  const picked = shuffle(pool, rng).slice(0, cfg.count);

  // place longest words first — they constrain the board the most
  const order = [...picked].sort((a, b) => b.length - a.length);
  const grid: string[] = new Array(n).fill('');
  const placements: WordPlacement[] = [];
  if (!placeAll(grid, size, order, 0, cfg.dirs, cfg.overlapBias, rng, placements)) return null;

  const placedCells = new Set<number>();
  for (const p of placements) {
    for (let i = 0; i < p.word.length; i++) {
      placedCells.add((p.row + p.dr * i) * size + (p.col + p.dc * i));
    }
  }

  // fill biased toward the hidden words' letters — harder to scan visually
  const letterPool = picked.join('');
  const randomLetter = (): string =>
    rng() < 0.6
      ? letterPool[Math.floor(rng() * letterPool.length)]
      : String.fromCharCode(65 + Math.floor(rng() * 26));
  for (let i = 0; i < n; i++) {
    if (grid[i] === '') grid[i] = randomLetter();
  }

  // repair pass: every word must be findable in exactly one spot along the
  // tier's rays. Extra copies (created by the fill) get one of their
  // fill-owned letters mutated; copies made purely of placed letters are
  // unfixable, so the whole attempt is retried.
  const axes = scanAxesFor(difficulty);
  const intended = new Map<string, string>();
  for (const p of placements) {
    const cells: number[] = [];
    for (let i = 0; i < p.word.length; i++) {
      cells.push((p.row + p.dr * i) * size + (p.col + p.dc * i));
    }
    intended.set(p.word, [...cells].sort((a, b) => a - b).join(','));
  }
  for (let iter = 0; iter < 400; iter++) {
    let dirty = false;
    for (const p of placements) {
      const occs = findAllOccurrences(grid, size, p.word, axes);
      if (occs.length === 1) continue;
      if (occs.length === 0) return null; // placement direction not scannable — config bug guard
      const extra = occs.find(
        (cells) => [...cells].sort((a, b) => a - b).join(',') !== intended.get(p.word)
      );
      if (!extra) return null;
      const mutable = extra.filter((cell) => !placedCells.has(cell));
      if (mutable.length === 0) return null;
      const at = mutable[Math.floor(rng() * mutable.length)];
      let repl = randomLetter();
      while (repl === grid[at]) repl = randomLetter();
      grid[at] = repl;
      dirty = true;
      break; // re-scan from scratch — a mutation can affect other words
    }
    if (!dirty) {
      // clean — final verification sweep before returning
      for (const p of placements) {
        if (findAllOccurrences(grid, size, p.word, axes).length !== 1) return null;
      }
      const words = [...placements].sort((a, b) => a.word.localeCompare(b.word));
      return {
        seed,
        difficulty,
        size,
        themeId: theme.id,
        theme: theme.name,
        grid,
        words,
        placeDirs: cfg.dirs
      };
    }
  }
  return null;
}

export function generateWordSearch(opts: {
  seed?: number;
  difficulty: Difficulty;
}): WordSearchPuzzle {
  const seed = opts.seed ?? Math.floor(Math.random() * 0x7fffffff);
  for (let attempt = 0; attempt < 50; attempt++) {
    const puzzle = tryBuild(seed, attempt, opts.difficulty);
    if (puzzle) return puzzle;
  }
  // never observed across the validation sweeps; kept as a hard guard
  throw new Error(`word-search: could not build a sound ${opts.difficulty} board for seed ${seed}`);
}
