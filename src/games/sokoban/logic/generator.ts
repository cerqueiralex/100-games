/**
 * Sokoban level generator — ALWAYS-SOLVABLE by reverse construction.
 *
 * We start from the SOLVED state (every crate resting on its target) and then
 * do a reverse walk in which the player *pulls* crates around for a while.
 * Pulling is the exact inverse of a push, so replaying the reverse move list
 * backwards (with every direction flipped) is a legal forward push sequence
 * that solves the scrambled state — solvability is guaranteed, no search
 * needed. On the small tiers a push-optimal A* then tightens the par; on the
 * big tiers the reverse-pull count is the par.
 */

import { OPP, mulberry32, step, tryMove, isSolved, type SokobanPuzzle } from './engine';
import { solve } from './solver';
import type { Difficulty } from '../../../platform/types';

interface Cfg {
  /** full grid dimension including the wall border */
  size: number;
  crates: number;
  /** interior wall blocks to sprinkle in */
  walls: number;
  /** how many crate-pulls to aim for while scrambling */
  pulls: number;
  /** A* expansion budget when tightening par (0 = skip, use pull count) */
  budget: number;
}

// Scrambles are kept moderate on purpose: a push-optimal A* sets the par on
// EVERY tier (deep reverse walks only wander and inflate the fallback), so the
// par is the true minimum pushes and grows tier to tier (~4/6/8/10/13). More
// interior walls give the harder tiers real structure AND keep the solver fast.
const CFG: Record<Difficulty, Cfg> = {
  easy: { size: 6, crates: 2, walls: 0, pulls: 16, budget: 60000 },
  medium: { size: 7, crates: 3, walls: 2, pulls: 24, budget: 90000 },
  hard: { size: 8, crates: 4, walls: 3, pulls: 24, budget: 120000 },
  pro: { size: 9, crates: 4, walls: 5, pulls: 26, budget: 110000 },
  extreme: { size: 10, crates: 5, walls: 8, pulls: 22, budget: 90000 }
};

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Are all non-wall cells one connected region? */
function floorConnected(walls: boolean[], w: number, h: number): boolean {
  let startCell = -1;
  let floorCount = 0;
  for (let i = 0; i < w * h; i++)
    if (!walls[i]) {
      floorCount++;
      if (startCell < 0) startCell = i;
    }
  if (startCell < 0) return false;
  const seen = new Uint8Array(w * h);
  const queue = [startCell];
  seen[startCell] = 1;
  let reached = 1;
  for (let qi = 0; qi < queue.length; qi++) {
    for (let d = 0; d < 4; d++) {
      const nb = step(queue[qi], d, w, h);
      if (nb < 0 || walls[nb] || seen[nb]) continue;
      seen[nb] = 1;
      reached++;
      queue.push(nb);
    }
  }
  return reached === floorCount;
}

function buildBoard(rng: () => number, cfg: Cfg): { walls: boolean[]; floor: number[] } {
  const w = cfg.size;
  const h = cfg.size;
  const walls = new Array<boolean>(w * h).fill(false);
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w; c++)
      if (r === 0 || r === h - 1 || c === 0 || c === w - 1) walls[r * w + c] = true;

  // sprinkle interior wall blocks that keep the floor fully connected
  const interior: number[] = [];
  for (let r = 2; r < h - 2; r++) for (let c = 2; c < w - 2; c++) interior.push(r * w + c);
  shuffle(interior, rng);
  let placed = 0;
  for (const cell of interior) {
    if (placed >= cfg.walls) break;
    walls[cell] = true;
    if (floorConnected(walls, w, h)) placed++;
    else walls[cell] = false;
  }

  const floor: number[] = [];
  for (let i = 0; i < w * h; i++) if (!walls[i]) floor.push(i);
  return { walls, floor };
}

/** One generation attempt; null when it fails a quality gate (caller retries). */
function attempt(rng: () => number, cfg: Cfg): SokobanPuzzle | null {
  const w = cfg.size;
  const h = cfg.size;
  const { walls, floor } = buildBoard(rng, cfg);
  if (floor.length < cfg.crates + 4) return null;

  // solved state: crates rest on freshly chosen targets
  const pool = shuffle(floor.slice(), rng);
  const targets = pool.slice(0, cfg.crates);
  const crateSet = new Set(targets);
  let player = pool[cfg.crates]; // any other floor cell

  // reverse walk: mostly pull crates, walk to reposition, record every move
  const revMoves: number[] = [];
  let pulls = 0;
  const cap = cfg.pulls * 14;
  for (let iter = 0; iter < cap && pulls < cfg.pulls; iter++) {
    const wantPull = rng() < 0.72;

    // gather legal pulls: motion dir e, crate at player-e drags into player,
    // player advances to player+e (must be empty floor)
    const pullDirs: number[] = [];
    for (let e = 0; e < 4; e++) {
      const dest = step(player, e, w, h);
      if (dest < 0 || walls[dest] || crateSet.has(dest)) continue;
      const cratePos = step(player, OPP[e], w, h);
      if (cratePos < 0 || !crateSet.has(cratePos)) continue;
      pullDirs.push(e);
    }
    const walkDirs: number[] = [];
    for (let e = 0; e < 4; e++) {
      const dest = step(player, e, w, h);
      if (dest >= 0 && !walls[dest] && !crateSet.has(dest)) walkDirs.push(e);
    }

    if (wantPull && pullDirs.length) {
      const e = pullDirs[Math.floor(rng() * pullDirs.length)];
      const cratePos = step(player, OPP[e], w, h);
      crateSet.delete(cratePos);
      crateSet.add(player);
      player = step(player, e, w, h);
      revMoves.push(e);
      pulls++;
    } else if (walkDirs.length) {
      const e = walkDirs[Math.floor(rng() * walkDirs.length)];
      player = step(player, e, w, h);
      revMoves.push(e);
    } else break;
  }

  const crates = [...crateSet];
  if (pulls === 0) return null;
  if (isSolved(crates, targets)) return null;
  // demand a decent fraction of crates actually shifted off their target
  const targetSet = new Set(targets);
  const offTarget = crates.filter((c) => !targetSet.has(c)).length;
  if (offTarget < Math.max(1, Math.ceil(cfg.crates * 0.6))) return null;

  // forward solution = reverse the reverse-move list, flipping each direction
  const solution: number[] = [];
  for (let i = revMoves.length - 1; i >= 0; i--) solution.push(OPP[revMoves[i]]);

  // verify the forward solution really solves the start state (defensive)
  const board = { width: w, height: h, walls };
  let pc = crates.slice();
  let pp = player;
  for (const dir of solution) {
    const res = tryMove(board, pc, pp, dir);
    if (!res) return null;
    pc = res.crates;
    pp = res.player;
  }
  if (!isSolved(pc, targets)) return null;

  // par: push-optimal A* on the small tiers, else the reverse-pull count
  let parPushes = pulls;
  if (cfg.budget > 0) {
    const opt = solve({ width: w, height: h, walls, targets, player, crates, parPushes: 0, solution: [] }, crates, player, cfg.budget);
    if (opt && opt.pushes > 0) parPushes = opt.pushes;
  }
  if (parPushes <= 0) return null;

  return { width: w, height: h, walls, targets, player, crates, parPushes, solution };
}

/**
 * Generate an always-solvable Sokoban puzzle. Deterministic per `seed`; an
 * omitted seed draws a fresh random board. `difficulty` picks board size,
 * crate count, interior walls and scramble depth.
 */
export function generateSokoban({
  seed,
  difficulty
}: {
  seed?: number;
  difficulty: Difficulty;
}): SokobanPuzzle {
  const cfg = CFG[difficulty];
  const base = (seed ?? Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  for (let a = 0; a < 240; a++) {
    const rng = mulberry32((base + a * 0x9e3779b1) >>> 0);
    const p = attempt(rng, cfg);
    if (p) return p;
  }
  // extremely defensive fallback: an open room with no interior walls
  const open: Cfg = { ...cfg, walls: 0 };
  for (let a = 0; a < 240; a++) {
    const rng = mulberry32((base + 1013 + a) >>> 0);
    const p = attempt(rng, open);
    if (p) return p;
  }
  throw new Error('sokoban: generation failed');
}
