/**
 * Laser Mirrors — seeded, always-solvable puzzle generation + beam tracer.
 *
 * SOLVABLE BY CONSTRUCTION: we build the SOLUTION first — lay a beam path
 * from the source that bends through chosen mirror cells and passes through
 * target cells, drop mirrors at the bends in their correct orientation, put
 * the targets on the pass-through cells — then SCRAMBLE mirror orientations
 * (and, on place-tiers, lift a couple of mirrors into a tray). Because the
 * path never crosses itself (the walk never steps onto an occupied cell) and
 * targets/mirrors all sit on that occupied path while walls only go on
 * OFF-path cells, tracing the correct configuration always reproduces the
 * built path and hits every target. Uniqueness is not required — only
 * existence, which we guarantee.
 *
 * Pure TS, no React — importable headlessly for validation.
 */

import type { Difficulty } from '../../../platform/types';

/** Deterministic RNG so validation is reproducible. */
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

export type Dir = 'N' | 'E' | 'S' | 'W';
/** '/' = bottom-left→top-right · '\\' = top-left→bottom-right */
export type Orient = '/' | '\\';

/** [dcol, drow] per direction (screen coords: +row is down). */
const DELTA: Record<Dir, [number, number]> = {
  N: [0, -1],
  E: [1, 0],
  S: [0, 1],
  W: [-1, 0]
};
const DIR_IDX: Record<Dir, number> = { N: 0, E: 1, S: 2, W: 3 };

/** Reflect a travel direction off a mirror. */
export function reflect(dir: Dir, m: Orient): Dir {
  if (m === '/') {
    // E→N, N→E, W→S, S→W
    return dir === 'E' ? 'N' : dir === 'N' ? 'E' : dir === 'W' ? 'S' : 'W';
  }
  // '\\' : E→S, S→E, W→N, N→W
  return dir === 'E' ? 'S' : dir === 'S' ? 'E' : dir === 'W' ? 'N' : 'N';
}

/** The two directions perpendicular to `dir`. */
function perpendicular(dir: Dir): Dir[] {
  return dir === 'N' || dir === 'S' ? ['E', 'W'] : ['N', 'S'];
}

/** The mirror orientation that turns `inDir` into `outDir` (perpendicular). */
function orientFor(inDir: Dir, outDir: Dir): Orient {
  return reflect(inDir, '/') === outDir ? '/' : '\\';
}

export interface Source {
  cell: number;
  dir: Dir;
}

export interface Mirror {
  cell: number;
  orient: Orient;
}

/** Everything the tracer needs — a snapshot of the board. */
export interface BeamGrid {
  rows: number;
  cols: number;
  /** length rows*cols, mirror orientation or null. */
  mirrors: (Orient | null)[];
  /** length rows*cols. */
  walls: boolean[];
  /** length rows*cols. */
  targets: boolean[];
}

export interface BeamTrace {
  /** Polyline in cell units: x = col + 0.5, y = row + 0.5. */
  points: [number, number][];
  /** Target cells the beam passed through. */
  targetsHit: number[];
  /** True when every target present on the grid is hit. */
  hitAll: boolean;
  /** False only if the loop-guard cap tripped (never in valid puzzles). */
  terminated: boolean;
  steps: number;
}

/**
 * Marches the beam cell by cell from the source, reflecting off mirrors,
 * stopping at walls / the source / grid edges. Guarded against mirror
 * cycles by a visited (cell, direction) set plus a hard step cap.
 */
export function traceBeam(grid: BeamGrid, source: Source): BeamTrace {
  const { rows, cols, mirrors, walls, targets } = grid;
  const n = rows * cols;

  let dir = source.dir;
  let col = source.cell % cols;
  let row = (source.cell - col) / cols;

  const points: [number, number][] = [[col + 0.5, row + 0.5]];
  const hit = new Set<number>();
  const seen = new Set<number>();
  const cap = n * 4 + 8;
  let steps = 0;
  let terminated = true;

  for (;;) {
    if (steps++ > cap) {
      terminated = false;
      break;
    }
    const key = (row * cols + col) * 4 + DIR_IDX[dir];
    if (seen.has(key)) break; // mirror cycle — stop cleanly
    seen.add(key);

    const [dc, dr] = DELTA[dir];
    const nc = col + dc;
    const nr = row + dr;
    if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) {
      points.push([col + 0.5 + dc * 0.5, row + 0.5 + dr * 0.5]); // exit edge
      break;
    }
    const ncell = nr * cols + nc;
    if (walls[ncell] || ncell === source.cell) {
      points.push([col + 0.5 + dc * 0.5, row + 0.5 + dr * 0.5]); // stop at blocker
      break;
    }

    col = nc;
    row = nr;
    if (targets[ncell]) hit.add(ncell);
    const m = mirrors[ncell];
    if (m) {
      points.push([col + 0.5, row + 0.5]); // bend point
      dir = reflect(dir, m);
    }
  }

  let totalTargets = 0;
  for (let i = 0; i < n; i++) if (targets[i]) totalTargets++;
  return { points, targetsHit: [...hit], hitAll: totalTargets > 0 && hit.size === totalTargets, terminated, steps };
}

export interface Puzzle {
  seed: number;
  difficulty: Difficulty;
  rows: number;
  cols: number;
  source: Source;
  targets: number[];
  walls: number[];
  /** The correct mirror configuration (proves solvability). */
  solutionMirrors: Mirror[];
  /** Pre-placed, rotate-in-place mirrors at their SCRAMBLED start orientation. */
  fixedMirrors: Mirror[];
  /** Loose mirrors that start in the tray (place-tiers). */
  trayCount: number;
  /** 'rotate' = orient pre-placed mirrors · 'place' = also drag from a tray. */
  mode: 'rotate' | 'place';
}

interface TierConfig {
  rows: number;
  cols: number;
  bends: number; // mirror count in the solution
  targets: number;
  walls: number;
  tray: number; // mirrors lifted into the tray (0 = rotate-only)
}

const CONFIG: Record<Difficulty, TierConfig> = {
  easy: { rows: 6, cols: 6, bends: 2, targets: 1, walls: 0, tray: 0 },
  medium: { rows: 7, cols: 7, bends: 3, targets: 2, walls: 0, tray: 0 },
  hard: { rows: 8, cols: 8, bends: 4, targets: 3, walls: 3, tray: 0 },
  pro: { rows: 8, cols: 8, bends: 5, targets: 3, walls: 2, tray: 2 },
  extreme: { rows: 10, cols: 10, bends: 6, targets: 4, walls: 5, tray: 3 }
};

interface Solution {
  rows: number;
  cols: number;
  source: Source;
  mirrorCells: Mirror[];
  targets: number[];
  walls: number[];
}

/** Build one board snapshot from a mirror list. */
function gridFrom(rows: number, cols: number, mirrorList: Mirror[], walls: number[], targets: number[]): BeamGrid {
  const n = rows * cols;
  const mirrors = new Array<Orient | null>(n).fill(null);
  for (const m of mirrorList) mirrors[m.cell] = m.orient;
  const wallsArr = new Array<boolean>(n).fill(false);
  for (const w of walls) wallsArr[w] = true;
  const targetsArr = new Array<boolean>(n).fill(false);
  for (const t of targets) targetsArr[t] = true;
  return { rows, cols, mirrors, walls: wallsArr, targets: targetsArr };
}

const flip = (o: Orient): Orient => (o === '/' ? '\\' : '/');

/** Construct the solved beam path; returns null on a stranded attempt. */
function buildSolution(rng: () => number, cfg: TierConfig): Solution | null {
  const { rows, cols, bends, targets: tCount } = cfg;
  const n = rows * cols;
  const randInt = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
  const shuffle = <T>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const inBounds = (c: number, r: number) => c >= 0 && c < cols && r >= 0 && r < rows;

  const occ = new Uint8Array(n);
  const side = (['N', 'E', 'S', 'W'] as Dir[])[randInt(0, 3)];
  let scol: number, srow: number, dir: Dir;
  switch (side) {
    case 'N':
      srow = 0;
      scol = randInt(0, cols - 1);
      dir = 'S';
      break;
    case 'S':
      srow = rows - 1;
      scol = randInt(0, cols - 1);
      dir = 'N';
      break;
    case 'W':
      scol = 0;
      srow = randInt(0, rows - 1);
      dir = 'E';
      break;
    default:
      scol = cols - 1;
      srow = randInt(0, rows - 1);
      dir = 'W';
      break;
  }
  const sourceCell = srow * cols + scol;
  occ[sourceCell] = 1;
  let col = scol;
  let row = srow;

  const pathCells: number[] = []; // pass-through empties (target candidates)
  const mirrorCells: Mirror[] = [];

  const probeForward = (): { cell: number; col: number; row: number }[] => {
    const out: { cell: number; col: number; row: number }[] = [];
    let pc = col;
    let pr = row;
    for (;;) {
      const [dc, dr] = DELTA[dir];
      const nc = pc + dc;
      const nr = pr + dr;
      if (!inBounds(nc, nr)) break;
      const cell = nr * cols + nc;
      if (occ[cell]) break;
      out.push({ cell, col: nc, row: nr });
      pc = nc;
      pr = nr;
    }
    return out;
  };

  for (let b = 0; b < bends; b++) {
    const fwd = probeForward();
    if (fwd.length < 2) return null; // need >=1 pass cell + a mirror cell
    const idxs = shuffle(Array.from({ length: fwd.length - 1 }, (_, i) => i + 1));
    let placed = false;
    for (const bi of idxs) {
      const mc = fwd[bi];
      for (const nd of shuffle(perpendicular(dir))) {
        const [dc, dr] = DELTA[nd];
        const tc = mc.col + dc;
        const tr = mc.row + dr;
        if (!inBounds(tc, tr)) continue;
        if (occ[tr * cols + tc]) continue;
        for (let k = 0; k < bi; k++) {
          occ[fwd[k].cell] = 1;
          pathCells.push(fwd[k].cell);
        }
        occ[mc.cell] = 1;
        mirrorCells.push({ cell: mc.cell, orient: orientFor(dir, nd) });
        col = mc.col;
        row = mc.row;
        dir = nd;
        placed = true;
        break;
      }
      if (placed) break;
    }
    if (!placed) return null;
  }

  // final straight run to the edge
  const finalFwd = probeForward();
  if (finalFwd.length < 1) return null;
  for (const f of finalFwd) {
    occ[f.cell] = 1;
    pathCells.push(f.cell);
  }

  if (pathCells.length < tCount) return null;

  // spread targets across disjoint buckets of the path
  const targets: number[] = [];
  const bucket = pathCells.length / tCount;
  for (let i = 0; i < tCount; i++) {
    const lo = Math.floor(i * bucket);
    const hi = Math.min(pathCells.length - 1, Math.floor((i + 1) * bucket) - 1);
    targets.push(pathCells[lo + Math.floor(rng() * (hi - lo + 1))]);
  }

  const empties: number[] = [];
  for (let i = 0; i < n; i++) if (!occ[i]) empties.push(i);
  shuffle(empties);
  const walls = empties.slice(0, Math.min(cfg.walls, empties.length));

  return { rows, cols, source: { cell: sourceCell, dir }, mirrorCells, targets, walls };
}

function fallbackPuzzle(difficulty: Difficulty, seed: number): Puzzle {
  const cfg = CONFIG[difficulty];
  const { rows, cols } = cfg;
  // source top-left going E, one mirror turning it S, one target below
  const source: Source = { cell: 0, dir: 'E' };
  const mCell = 2; // (row 0, col 2)
  const solutionMirrors: Mirror[] = [{ cell: mCell, orient: '\\' }];
  const targets = [2 * cols + 2]; // (row 2, col 2)
  return {
    seed,
    difficulty,
    rows,
    cols,
    source,
    targets,
    walls: [],
    solutionMirrors,
    fixedMirrors: [{ cell: mCell, orient: '/' }],
    trayCount: 0,
    mode: 'rotate'
  };
}

export interface GenerateOptions {
  seed?: number;
  difficulty: Difficulty;
}

/** Generate a solvable Laser Mirrors puzzle. Deterministic per seed. */
export function generatePuzzle({ seed, difficulty }: GenerateOptions): Puzzle {
  const realSeed = seed ?? Math.floor(Math.random() * 0x7fffffff);
  const rng = mulberry32(realSeed);
  const cfg = CONFIG[difficulty];

  for (let attempt = 0; attempt < 600; attempt++) {
    const sol = buildSolution(rng, cfg);
    if (!sol) continue;

    // sanity: the built solution must light every target
    const solGrid = gridFrom(sol.rows, sol.cols, sol.mirrorCells, sol.walls, sol.targets);
    if (!traceBeam(solGrid, sol.source).hitAll) continue;

    // scramble → start configuration
    const shuffleIdx = (len: number): number[] => {
      const a = Array.from({ length: len }, (_, i) => i);
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const scrambleOrient = (): Orient => (rng() < 0.5 ? '/' : '\\');

    let fixedMirrors: Mirror[];
    let trayCount: number;
    if (cfg.tray > 0) {
      const order = shuffleIdx(sol.mirrorCells.length);
      const keep = Math.max(1, sol.mirrorCells.length - cfg.tray);
      const remove = new Set(order.slice(keep));
      fixedMirrors = sol.mirrorCells
        .filter((_, i) => !remove.has(i))
        .map((m) => ({ cell: m.cell, orient: scrambleOrient() }));
      trayCount = remove.size;
    } else {
      fixedMirrors = sol.mirrorCells.map((m) => ({ cell: m.cell, orient: scrambleOrient() }));
      trayCount = 0;
    }

    // guarantee the start is not already solved
    const startGrid = gridFrom(sol.rows, sol.cols, fixedMirrors, sol.walls, sol.targets);
    if (fixedMirrors.length > 0 && traceBeam(startGrid, sol.source).hitAll) {
      fixedMirrors[0] = { cell: fixedMirrors[0].cell, orient: flip(fixedMirrors[0].orient) };
    }

    return {
      seed: realSeed,
      difficulty,
      rows: sol.rows,
      cols: sol.cols,
      source: sol.source,
      targets: sol.targets,
      walls: sol.walls,
      solutionMirrors: sol.mirrorCells,
      fixedMirrors,
      trayCount,
      mode: cfg.tray > 0 ? 'place' : 'rotate'
    };
  }

  return fallbackPuzzle(difficulty, realSeed);
}

/** Convenience: assemble a BeamGrid from a live orientation array. */
export function gridFromOrients(
  puzzle: Pick<Puzzle, 'rows' | 'cols' | 'walls' | 'targets'>,
  orients: (Orient | null)[]
): BeamGrid {
  const n = puzzle.rows * puzzle.cols;
  const walls = new Array<boolean>(n).fill(false);
  for (const w of puzzle.walls) walls[w] = true;
  const targets = new Array<boolean>(n).fill(false);
  for (const t of puzzle.targets) targets[t] = true;
  return { rows: puzzle.rows, cols: puzzle.cols, mirrors: orients.slice(), walls, targets };
}
