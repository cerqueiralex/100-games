import type { Difficulty } from '../../../platform/types';
import { GRID } from './fleet';

/** per-cell shot result: 0 untried · 1 miss · 2 hit */
export type ShotResult = 0 | 1 | 2;

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * Choose the enemy's next shot. Stateless — everything is derived from the
 * visible board each turn, which makes save/resume free.
 *
 * easy: random hunting, often loses interest in a wounded ship.
 * medium: parity hunting + orderly target mode around unresolved hits.
 * hard and above: probability-density over every placement of the remaining
 * ships (pro/extreme add multi-shot salvos in the game itself).
 */
export function pickShot(
  shots: ShotResult[],
  sunkCells: Set<number>,
  remainingSizes: number[],
  difficulty: Difficulty
): number {
  const untried: number[] = [];
  const unresolved: number[] = [];
  for (let i = 0; i < shots.length; i++) {
    if (shots[i] === 0) untried.push(i);
    else if (shots[i] === 2 && !sunkCells.has(i)) unresolved.push(i);
  }

  if (difficulty === 'hard' || difficulty === 'pro' || difficulty === 'extreme') {
    const t = densityShot(shots, sunkCells, remainingSizes, untried);
    if (t !== null) return t;
  }

  if (unresolved.length > 0 && (difficulty !== 'easy' || Math.random() > 0.35)) {
    const t = targetShot(shots, unresolved);
    if (t !== null) return t;
  }

  if (difficulty === 'medium') {
    const smallest = Math.min(...remainingSizes, 2);
    const parity = untried.filter((i) => (Math.floor(i / GRID) + (i % GRID)) % smallest === 0);
    if (parity.length > 0) return rand(parity);
  }

  return rand(untried);
}

/** finish off a wounded ship: extend an aligned run, else ring a lone hit */
function targetShot(shots: ShotResult[], unresolved: number[]): number | null {
  const untried = (i: number) => shots[i] === 0;
  // aligned run: walk out from both ends of any adjacent pair
  for (const a of unresolved) {
    for (const b of unresolved) {
      if (b === a + 1 && Math.floor(a / GRID) === Math.floor(b / GRID)) {
        const line = extendRun(shots, unresolved, a, 1);
        if (line !== null) return line;
      }
      if (b === a + GRID) {
        const line = extendRun(shots, unresolved, a, GRID);
        if (line !== null) return line;
      }
    }
  }
  // lone hit: try its orthogonal neighbours
  const candidates: number[] = [];
  for (const h of unresolved) {
    const r = Math.floor(h / GRID);
    const c = h % GRID;
    if (c > 0 && untried(h - 1)) candidates.push(h - 1);
    if (c < GRID - 1 && untried(h + 1)) candidates.push(h + 1);
    if (r > 0 && untried(h - GRID)) candidates.push(h - GRID);
    if (r < GRID - 1 && untried(h + GRID)) candidates.push(h + GRID);
  }
  return candidates.length > 0 ? rand(candidates) : null;
}

/** walk to both ends of the hit-run through `start` along `step` */
function extendRun(shots: ShotResult[], unresolved: number[], start: number, step: number): number | null {
  const hitSet = new Set(unresolved);
  const inRowIfH = (i: number, j: number) => step !== 1 || Math.floor(i / GRID) === Math.floor(j / GRID);
  let lo = start;
  while (hitSet.has(lo - step) && inRowIfH(lo - step, lo)) lo -= step;
  let hi = start;
  while (hitSet.has(hi + step) && inRowIfH(hi + step, hi)) hi += step;
  const ends: number[] = [];
  const before = lo - step;
  const after = hi + step;
  if (before >= 0 && shots[before] === 0 && inRowIfH(before, lo)) ends.push(before);
  if (after < GRID * GRID && shots[after] === 0 && inRowIfH(after, hi)) ends.push(after);
  return ends.length > 0 ? rand(ends) : null;
}

/** weight every untried cell by how many remaining-ship placements cover it */
function densityShot(
  shots: ShotResult[],
  sunkCells: Set<number>,
  remainingSizes: number[],
  untried: number[]
): number | null {
  if (untried.length === 0) return null;
  const weight = new Array<number>(GRID * GRID).fill(0);
  const blocked = (i: number) => shots[i] === 1 || sunkCells.has(i);
  const unresolvedHit = (i: number) => shots[i] === 2 && !sunkCells.has(i);

  for (const size of remainingSizes) {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        for (const dir of ['h', 'v'] as const) {
          if (dir === 'h' ? c + size > GRID : r + size > GRID) continue;
          const cells: number[] = [];
          let ok = true;
          let hits = 0;
          for (let k = 0; k < size; k++) {
            const i = dir === 'h' ? r * GRID + c + k : (r + k) * GRID + c;
            if (blocked(i)) {
              ok = false;
              break;
            }
            if (unresolvedHit(i)) hits++;
            else cells.push(i);
          }
          if (!ok) continue;
          const w = 1 + hits * 30;
          for (const i of cells) weight[i] += w;
        }
      }
    }
  }

  let best: number[] = [];
  let bestW = 0;
  for (const i of untried) {
    if (weight[i] > bestW) {
      bestW = weight[i];
      best = [i];
    } else if (weight[i] === bestW && bestW > 0) {
      best.push(i);
    }
  }
  return best.length > 0 ? rand(best) : null;
}
