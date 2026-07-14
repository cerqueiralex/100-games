/*
 * Word Ladder — seeded puzzle generation.
 *
 * A puzzle is a START/END pair whose shortest ladder (BFS distance in the
 * tier's dictionary) equals a target "par" inside the difficulty's band.
 * Strategy: pick a random connected START, BFS to build its distance map,
 * collect every word sitting exactly `par` rungs away, and choose one END
 * from that ring — this guarantees a ladder exists AND that its true par is
 * the target (BFS distance is by definition the shortest). We prefer pairs
 * whose START/END share at most half their letters so the puzzle feels like
 * a real transformation rather than a near-anagram.
 *
 * Pure TS, no React — validated headlessly by `npm run validate`.
 */

import type { Difficulty } from '../../../platform/types';
import {
  DICTS,
  buildGraph,
  distanceMap,
  shortestPath,
  type LadderLength
} from './words';

/** mulberry32 — small seeded PRNG (same family used across the platform). */
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

export interface LadderConfig {
  length: LadderLength;
  parMin: number;
  parMax: number;
  label: string;
}

export const LADDER_CONFIG: Record<Difficulty, LadderConfig> = {
  easy: { length: 3, parMin: 3, parMax: 4, label: '3-letter words' },
  medium: { length: 4, parMin: 4, parMax: 5, label: '4-letter words' },
  hard: { length: 4, parMin: 6, parMax: 7, label: '4-letter words' },
  pro: { length: 5, parMin: 5, parMax: 6, label: '5-letter words' },
  extreme: { length: 5, parMin: 7, parMax: 8, label: '5-letter words' }
};

export interface Ladder {
  difficulty: Difficulty;
  length: LadderLength;
  start: string;
  end: string;
  /** shortest ladder start…end; length-1 rungs = par. */
  optimalPath: string[];
  par: number;
  seed: number;
}

/** Fraction of positions where two equal-length words share the same letter. */
function overlap(a: string, b: string): number {
  let same = 0;
  for (let i = 0; i < a.length; i++) if (a[i] === b[i]) same++;
  return same / a.length;
}

function pick<T>(arr: readonly T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

/**
 * Generate one seeded ladder for a difficulty. Guarantees: start & end are
 * distinct dictionary words, a ladder exists, and its BFS par lands inside
 * the tier's band.
 */
export function generateLadder({
  seed,
  difficulty
}: {
  seed?: number;
  difficulty: Difficulty;
}): Ladder {
  const cfg = LADDER_CONFIG[difficulty];
  const dict = DICTS[cfg.length];
  const graph = buildGraph(dict);
  const baseSeed = seed ?? ((Math.random() * 2 ** 32) >>> 0);
  const rnd = mulberry32(baseSeed);

  // Words that actually have neighbours — valid ladder starts.
  const connected = dict.filter((w) => (graph.get(w) ?? []).length > 0);

  // Target par: pick within band, rotating by seed for variety.
  const bandSize = cfg.parMax - cfg.parMin + 1;
  const targetPar = cfg.parMin + Math.floor(rnd() * bandSize);

  // Best fallback in case no low-overlap end is found within the attempts.
  let fallback: { start: string; end: string; par: number } | null = null;

  const ATTEMPTS = 900;
  for (let t = 0; t < ATTEMPTS; t++) {
    const start = pick(connected, rnd);
    const dist = distanceMap(start, dict);
    // Words exactly `targetPar` rungs from start.
    const ring: string[] = [];
    for (const [w, d] of dist) if (d === targetPar) ring.push(w);
    if (ring.length === 0) continue;
    const end = pick(ring, rnd);
    if (fallback === null) fallback = { start, end, par: targetPar };
    // Prefer a genuine transformation: ≤ half the letters shared.
    if (overlap(start, end) <= 0.5) {
      fallback = { start, end, par: targetPar };
      break;
    }
  }

  // Guaranteed non-null: connected is non-empty and every connected word has
  // words at some ring depths; but keep a hard safety net just in case.
  const chosen = fallback ?? forceAnyPair(connected, dict, cfg, rnd);
  const path = shortestPath(chosen.start, chosen.end, dict)!;
  return {
    difficulty,
    length: cfg.length,
    start: chosen.start,
    end: chosen.end,
    optimalPath: path,
    par: path.length - 1,
    seed: baseSeed
  };
}

/** Last-resort pair search: any start whose distance map has a ring in band. */
function forceAnyPair(
  connected: string[],
  dict: readonly string[],
  cfg: LadderConfig,
  rnd: () => number
): { start: string; end: string; par: number } {
  for (const start of connected) {
    const dist = distanceMap(start, dict);
    for (const [w, d] of dist) {
      if (d >= cfg.parMin && d <= cfg.parMax) return { start, end: w, par: d };
    }
  }
  // Absolute fallback — a start and its first neighbour (par 1).
  const s = connected[Math.floor(rnd() * connected.length)];
  const n = buildGraph(dict).get(s)![0];
  return { start: s, end: n, par: 1 };
}
