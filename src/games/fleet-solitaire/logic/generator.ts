/**
 * Fleet Finder — seeded puzzle generator.
 *
 * Pipeline (deterministic per seed):
 *  1. place the tier's fleet at random (ships never touch, even diagonally)
 *  2. derive the row/column counts
 *  3. seed a few revealed cells, then ADD reveals until the puzzle is
 *     provably sound — easy/medium demand full propagation solvability
 *     (guess-free AND unique), hard/pro/extreme demand a unique solution
 *     (count-to-2 backtracking)
 *  4. MINIMIZE: drop redundant reveals (still sound without them) down to
 *     the tier's floor — pro/extreme keep only the bare minimum
 */

import type { Difficulty } from '../../../platform/types';
import { SHIP, UNKNOWN, type FleetPuzzle, type Reveal } from './board';
import { countSolutions, initialState, propagateFix, propagationSolves } from './solver';

export interface TierConfig {
  size: number;
  /** ship sizes, descending */
  fleet: number[];
  /** true: accept only propagation-solvable (guess-free) boards */
  guessFree: boolean;
  /** reveals seeded before growing to soundness */
  initialReveals: number;
  /** minimization never drops below this many reveals */
  minReveals: number;
}

export const TIERS: Record<Difficulty, TierConfig> = {
  easy: { size: 6, fleet: [3, 2, 2, 1, 1], guessFree: true, initialReveals: 6, minReveals: 6 },
  medium: { size: 8, fleet: [4, 3, 3, 2, 2, 1, 1], guessFree: true, initialReveals: 5, minReveals: 5 },
  hard: { size: 10, fleet: [4, 3, 3, 2, 2, 2, 1, 1, 1, 1], guessFree: true, initialReveals: 4, minReveals: 4 },
  pro: { size: 10, fleet: [4, 3, 3, 2, 2, 2, 1, 1, 1, 1], guessFree: false, initialReveals: 2, minReveals: 2 },
  extreme: { size: 10, fleet: [5, 4, 3, 2, 2, 1, 1], guessFree: false, initialReveals: 0, minReveals: 0 }
};

/** deterministic PRNG (mulberry32) */
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

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** random non-touching fleet layout as a 0/1 solution grid */
function placeFleet(rng: () => number, size: number, fleet: number[]): number[] | null {
  const n = size * size;
  const occ = new Int8Array(n); // 0 free · 1 ship · 2 halo
  const solution = new Array<number>(n).fill(0);
  for (const len of fleet) {
    let placed = false;
    for (let tries = 0; tries < 400 && !placed; tries++) {
      const vertical = rng() < 0.5;
      const r = Math.floor(rng() * (vertical ? size - len + 1 : size));
      const c = Math.floor(rng() * (vertical ? size : size - len + 1));
      let fits = true;
      for (let k = 0; k < len && fits; k++) {
        if (occ[(r + (vertical ? k : 0)) * size + (c + (vertical ? 0 : k))] !== 0) fits = false;
      }
      if (!fits) continue;
      for (let k = 0; k < len; k++) {
        const rr = r + (vertical ? k : 0);
        const cc = c + (vertical ? 0 : k);
        solution[rr * size + cc] = 1;
        occ[rr * size + cc] = 1;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const hr = rr + dr;
            const hc = cc + dc;
            if (hr >= 0 && hr < size && hc >= 0 && hc < size && occ[hr * size + hc] === 0) occ[hr * size + hc] = 2;
          }
        }
      }
      placed = true;
    }
    if (!placed) return null;
  }
  return solution;
}

/** ship-cell-biased sample of `k` reveal cells */
function seedReveals(rng: () => number, solution: number[], k: number): Reveal[] {
  if (k === 0) return [];
  const ships: number[] = [];
  const water: number[] = [];
  solution.forEach((v, i) => (v === 1 ? ships : water).push(i));
  shuffle(ships, rng);
  shuffle(water, rng);
  const nShips = Math.min(ships.length, Math.round(k * 0.6));
  const cells = [...ships.slice(0, nShips), ...water.slice(0, k - nShips)];
  return cells.map((cell) => ({ cell, ship: solution[cell] === 1 }));
}

const withReveals = (p: FleetPuzzle, reveals: Reveal[]): FleetPuzzle => ({ ...p, reveals });

/** is this reveal set sound for the tier? */
function sound(p: FleetPuzzle, guessFree: boolean): boolean {
  if (guessFree) return propagationSolves(p);
  return countSolutions(p, 2) === 1;
}

/**
 * Generate a Fleet Finder puzzle. Deterministic per seed; the solution is
 * guaranteed unique (easy/medium/hard additionally guess-free — pure
 * deduction alone decides every cell).
 */
export function generateFleet({ seed, difficulty }: { seed?: number; difficulty: Difficulty }): FleetPuzzle {
  const cfg = TIERS[difficulty];
  const s = (seed ?? Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  const rng = mulberry32(s);
  const { size } = cfg;
  const n = size * size;

  for (let attempt = 0; attempt < 60; attempt++) {
    const solution = placeFleet(rng, size, cfg.fleet);
    if (!solution) continue;
    const rowCounts = Array.from({ length: size }, (_, r) =>
      solution.slice(r * size, (r + 1) * size).reduce((a, v) => a + v, 0)
    );
    const colCounts = Array.from({ length: size }, (_, c) => {
      let t = 0;
      for (let r = 0; r < size; r++) t += solution[r * size + c];
      return t;
    });
    const base: FleetPuzzle = {
      size,
      fleet: [...cfg.fleet].sort((a, b) => b - a),
      solution,
      rowCounts,
      colCounts,
      reveals: [],
      seed: s
    };

    // --- grow reveals until sound ---------------------------------------
    let reveals = seedReveals(rng, solution, cfg.initialReveals);
    let isSound = false;
    for (let guard = 0; guard <= n && !isSound; guard++) {
      const p = withReveals(base, reveals);
      if (cfg.guessFree) {
        if (propagationSolves(p)) {
          isSound = true;
          break;
        }
        // reveal a cell propagation could not decide (ship cells carry
        // the most information — prefer them)
        const state = initialState(p);
        propagateFix(state, p);
        const undecided: number[] = [];
        for (let i = 0; i < n; i++) if (state[i] === UNKNOWN) undecided.push(i);
        if (undecided.length === 0) break; // decided but wrong ⇒ regenerate
        const shipsLeft = undecided.filter((i) => solution[i] === 1);
        const pool = shipsLeft.length > 0 && rng() < 0.75 ? shipsLeft : undecided;
        const cell = pool[Math.floor(rng() * pool.length)];
        reveals = [...reveals, { cell, ship: solution[cell] === 1 }];
      } else {
        const found: Int8Array[] = [];
        const count = countSolutions(p, 2, 150_000, found);
        if (count === 1) {
          isSound = true;
          break;
        }
        // pick a discriminating cell: where an alternative solution
        // disagrees with ours (or any unrevealed cell if the budget blew)
        const other = found.find((st) => st.some((v, i) => (v === SHIP) !== (solution[i] === 1)));
        const revealed = new Set(reveals.map((rv) => rv.cell));
        let candidates: number[] = [];
        if (other) {
          for (let i = 0; i < n; i++) {
            if ((other[i] === SHIP) !== (solution[i] === 1) && !revealed.has(i)) candidates.push(i);
          }
        }
        if (candidates.length === 0) {
          for (let i = 0; i < n; i++) if (!revealed.has(i)) candidates.push(i);
          const shipsLeft = candidates.filter((i) => solution[i] === 1);
          if (shipsLeft.length > 0) candidates = shipsLeft;
        }
        if (candidates.length === 0) break; // everything revealed ⇒ regenerate
        const cell = candidates[Math.floor(rng() * candidates.length)];
        reveals = [...reveals, { cell, ship: solution[cell] === 1 }];
      }
    }
    if (!isSound) continue;

    // --- minimize: drop reveals that stay sound without, down to floor ---
    const order = shuffle([...reveals], rng);
    for (const rv of order) {
      if (reveals.length <= cfg.minReveals) break;
      const trial = reveals.filter((q) => q.cell !== rv.cell);
      if (sound(withReveals(base, trial), cfg.guessFree)) reveals = trial;
    }

    const puzzle = withReveals(base, reveals);
    // belt and braces: never ship a puzzle that isn't provably unique
    if (countSolutions(puzzle, 2) === 1) return puzzle;
  }
  throw new Error(`fleet-solitaire: generation failed for ${difficulty} seed ${s}`);
}

/** quick consistency audit used by npm run validate */
export function auditPuzzle(p: FleetPuzzle): string[] {
  const issues: string[] = [];
  const { size, solution, rowCounts, colCounts, fleet, reveals } = p;
  // counts consistent
  for (let r = 0; r < size; r++) {
    const t = solution.slice(r * size, (r + 1) * size).reduce((a, v) => a + v, 0);
    if (t !== rowCounts[r]) issues.push(`row ${r} count mismatch`);
  }
  for (let c = 0; c < size; c++) {
    let t = 0;
    for (let r = 0; r < size; r++) t += solution[r * size + c];
    if (t !== colCounts[c]) issues.push(`col ${c} count mismatch`);
  }
  // total ship cells match the fleet
  const total = solution.reduce((a, v) => a + v, 0);
  if (total !== fleet.reduce((a, v) => a + v, 0)) issues.push('fleet size / ship cell total mismatch');
  // reveals consistent with the solution
  for (const rv of reveals) {
    if ((solution[rv.cell] === 1) !== rv.ship) issues.push(`reveal at ${rv.cell} contradicts solution`);
  }
  return issues;
}

// re-export for consumers that only import the generator module
export { UNKNOWN, WATER, SHIP } from './board';
export type { FleetPuzzle, Reveal } from './board';
