/**
 * Slitherlink generation — pure TS, seeded, no React.
 *
 * 1. Grow a random simply-connected cell region (add/remove boundary cells
 *    while keeping the region connected, its complement connected, and no
 *    diagonal "pinch" contacts). Its boundary is then ONE simple closed loop.
 * 2. Derive every cell's edge count as its clue.
 * 3. Greedily remove clues in seeded order while the solver still proves a
 *    UNIQUE solution (see solver.ts). `removeFrac` caps how many clues a
 *    difficulty tier may blank out (easy keeps most numbers).
 */
import { geometry } from './geometry';
import { solveSlitherlink } from './solver';

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

export interface SlitherlinkPuzzle {
  seed: number;
  rows: number;
  cols: number;
  /** per cell (row-major): 0–4, or null for a blank (unconstrained) cell */
  clues: (number | null)[];
  /** the unique solution: per-edge 0/1 (see geometry.ts for edge indexing) */
  solution: number[];
  /** number of edges in the solution loop */
  loopLen: number;
  /** cell indices enclosed by the loop (used for the win tint) */
  inside: number[];
}

export interface GenerateOptions {
  seed?: number;
  rows: number;
  cols: number;
  /** max fraction of cells whose clue may be removed (default 1 = as many as possible) */
  removeFrac?: number;
}

/**
 * Check a 0/1 edge assignment is one single closed loop (every dot degree
 * 0 or 2, all lines in one cycle, length ≥ 4).
 */
export function validateLoop(
  rows: number,
  cols: number,
  edges: ArrayLike<number>
): { ok: boolean; length: number } {
  const g = geometry(rows, cols);
  const nDots = (rows + 1) * (cols + 1);
  const deg = new Uint8Array(nDots);
  let total = 0;
  let start = -1;
  for (let e = 0; e < g.E; e++) {
    if (edges[e]) {
      total++;
      if (start === -1) start = e;
      deg[g.edgeDots[e][0]]++;
      deg[g.edgeDots[e][1]]++;
    }
  }
  if (total < 4) return { ok: false, length: total };
  for (let d = 0; d < nDots; d++) {
    if (deg[d] !== 0 && deg[d] !== 2) return { ok: false, length: total };
  }
  // walk from the first line — a single loop visits every line exactly once
  let count = 0;
  let cur = start;
  let from = g.edgeDots[start][0];
  do {
    count++;
    const [a, b] = g.edgeDots[cur];
    const to = a === from ? b : a;
    let next = -1;
    for (const e2 of g.dotEdges[to]) {
      if (edges[e2] && e2 !== cur) {
        next = e2;
        break;
      }
    }
    if (next === -1) return { ok: false, length: total };
    from = to;
    cur = next;
  } while (cur !== start && count <= total);
  return { ok: count === total, length: total };
}

/** boundary edges of a cell region: edges with region on exactly one side */
export function loopFromRegion(rows: number, cols: number, inRegion: Uint8Array): number[] {
  const g = geometry(rows, cols);
  const edges = new Array<number>(g.E).fill(0);
  for (let e = 0; e < g.E; e++) {
    const cells = g.edgeCells[e];
    const a = inRegion[cells[0]] === 1;
    const b = cells.length > 1 ? inRegion[cells[1]] === 1 : false;
    if (a !== b) edges[e] = 1;
  }
  return edges;
}

/** diagonal 2×2 contact at a dot — would make the boundary cross itself */
function pinchAt(rows: number, cols: number, inR: Uint8Array, dr: number, dc: number): boolean {
  const at = (r: number, c: number) =>
    r >= 0 && r < rows && c >= 0 && c < cols ? inR[r * cols + c] === 1 : false;
  const a = at(dr - 1, dc - 1);
  const b = at(dr - 1, dc);
  const c = at(dr, dc - 1);
  const d = at(dr, dc);
  return (a && d && !b && !c) || (b && c && !a && !d);
}

function regionConnected(rows: number, cols: number, inR: Uint8Array, size: number): boolean {
  if (size === 0) return false;
  const n = rows * cols;
  let start = -1;
  for (let i = 0; i < n; i++) {
    if (inR[i]) {
      start = i;
      break;
    }
  }
  const seen = new Uint8Array(n);
  const stack = [start];
  seen[start] = 1;
  let count = 0;
  while (stack.length) {
    const i = stack.pop()!;
    count++;
    const r = Math.floor(i / cols);
    const c = i % cols;
    const nbs = [
      r > 0 ? i - cols : -1,
      r < rows - 1 ? i + cols : -1,
      c > 0 ? i - 1 : -1,
      c < cols - 1 ? i + 1 : -1
    ];
    for (const j of nbs) {
      if (j >= 0 && inR[j] && !seen[j]) {
        seen[j] = 1;
        stack.push(j);
      }
    }
  }
  return count === size;
}

/** every out-of-region cell must reach the border (no holes in the region) */
function complementConnected(rows: number, cols: number, inR: Uint8Array): boolean {
  const n = rows * cols;
  const seen = new Uint8Array(n);
  const stack: number[] = [];
  for (let c = 0; c < cols; c++) {
    for (const i of [c, (rows - 1) * cols + c]) {
      if (!inR[i] && !seen[i]) {
        seen[i] = 1;
        stack.push(i);
      }
    }
  }
  for (let r = 0; r < rows; r++) {
    for (const i of [r * cols, r * cols + cols - 1]) {
      if (!inR[i] && !seen[i]) {
        seen[i] = 1;
        stack.push(i);
      }
    }
  }
  while (stack.length) {
    const i = stack.pop()!;
    const r = Math.floor(i / cols);
    const c = i % cols;
    const nbs = [
      r > 0 ? i - cols : -1,
      r < rows - 1 ? i + cols : -1,
      c > 0 ? i - 1 : -1,
      c < cols - 1 ? i + 1 : -1
    ];
    for (const j of nbs) {
      if (j >= 0 && !inR[j] && !seen[j]) {
        seen[j] = 1;
        stack.push(j);
      }
    }
  }
  for (let i = 0; i < n; i++) if (!inR[i] && !seen[i]) return false;
  return true;
}

/** random simply-connected region via boundary add/remove walk */
function growRegion(rows: number, cols: number, rnd: () => number): Uint8Array | null {
  const n = rows * cols;
  const inR = new Uint8Array(n);
  const target = Math.max(4, Math.round(n * (0.4 + rnd() * 0.2)));
  const sr = rows > 2 ? 1 + Math.floor(rnd() * (rows - 2)) : Math.floor(rnd() * rows);
  const sc = cols > 2 ? 1 + Math.floor(rnd() * (cols - 2)) : Math.floor(rnd() * cols);
  inR[sr * cols + sc] = 1;
  let size = 1;

  const cellOk = (idx: number): boolean => {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    return (
      !pinchAt(rows, cols, inR, r, c) &&
      !pinchAt(rows, cols, inR, r, c + 1) &&
      !pinchAt(rows, cols, inR, r + 1, c) &&
      !pinchAt(rows, cols, inR, r + 1, c + 1)
    );
  };

  let attempts = n * 40;
  while (size < target && attempts-- > 0) {
    if (size > 4 && rnd() < 0.1) {
      // wobble: remove a random boundary cell to vary the outline
      const boundary: number[] = [];
      for (let i = 0; i < n; i++) {
        if (!inR[i]) continue;
        const r = Math.floor(i / cols);
        const c = i % cols;
        const out =
          (r === 0 || !inR[i - cols]) ||
          (r === rows - 1 || !inR[i + cols]) ||
          (c === 0 || !inR[i - 1]) ||
          (c === cols - 1 || !inR[i + 1]);
        if (out) boundary.push(i);
      }
      if (boundary.length) {
        const pick = boundary[Math.floor(rnd() * boundary.length)];
        inR[pick] = 0;
        if (cellOk(pick) && regionConnected(rows, cols, inR, size - 1)) size--;
        else inR[pick] = 1;
      }
      continue;
    }
    // grow: add a random frontier cell
    const frontier: number[] = [];
    for (let i = 0; i < n; i++) {
      if (inR[i]) continue;
      const r = Math.floor(i / cols);
      const c = i % cols;
      if (
        (r > 0 && inR[i - cols]) ||
        (r < rows - 1 && inR[i + cols]) ||
        (c > 0 && inR[i - 1]) ||
        (c < cols - 1 && inR[i + 1])
      ) {
        frontier.push(i);
      }
    }
    if (frontier.length === 0) break;
    const pick = frontier[Math.floor(rnd() * frontier.length)];
    inR[pick] = 1;
    if (cellOk(pick) && complementConnected(rows, cols, inR)) size++;
    else inR[pick] = 0;
  }

  if (size < Math.max(4, Math.round(n * 0.3))) return null;
  // belt and braces: full validity sweep before deriving the loop
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) if (pinchAt(rows, cols, inR, r, c)) return null;
  }
  if (!regionConnected(rows, cols, inR, size)) return null;
  if (!complementConnected(rows, cols, inR)) return null;
  return inR;
}

export function generateSlitherlink(opts: GenerateOptions): SlitherlinkPuzzle {
  const { rows, cols } = opts;
  const removeFrac = opts.removeFrac ?? 1;
  const baseSeed = (opts.seed ?? Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  const g = geometry(rows, cols);
  const n = rows * cols;

  for (let attempt = 0; attempt < 60; attempt++) {
    const rnd = mulberry32((baseSeed + attempt * 0x9e3779b9) >>> 0);
    const region = growRegion(rows, cols, rnd);
    if (!region) continue;
    const solution = loopFromRegion(rows, cols, region);
    const lv = validateLoop(rows, cols, solution);
    if (!lv.ok) continue;

    const clues: (number | null)[] = [];
    for (let cell = 0; cell < n; cell++) {
      let k = 0;
      for (const e of g.cellEdges[cell]) k += solution[e];
      clues.push(k);
    }

    // full-clue grids are almost always unique; verify before removing
    const full = solveSlitherlink(rows, cols, clues, { limit: 2, budget: 20000 });
    if (full.budgetExceeded || full.solutions !== 1) continue;

    // Greedy clue removal in seeded order, uniqueness re-proved per removal.
    // The budget is size-scaled so a removal that would need deep search on
    // big boards fails fast (the clue is simply kept — still sound), and a
    // run of consecutive misses stops the loop once density has plateaued:
    // this keeps runtime generation well under a second even at 10×10.
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const maxRemove = Math.floor(n * removeFrac);
    const removalBudget = n >= 100 ? 1500 : n >= 64 ? 5000 : 25000;
    const missCutoff = n >= 100 ? 16 : n >= 64 ? 9 : 12;
    let removed = 0;
    let misses = 0;
    for (const cell of order) {
      if (removed >= maxRemove || misses >= missCutoff) break;
      const keep = clues[cell];
      clues[cell] = null;
      const res = solveSlitherlink(rows, cols, clues, { limit: 2, budget: removalBudget });
      if (res.solutions === 1 && !res.budgetExceeded) {
        removed++;
        misses = 0;
      } else {
        clues[cell] = keep;
        misses++;
      }
    }

    // final proof: unique and identical to the constructed loop
    const fin = solveSlitherlink(rows, cols, clues, { limit: 2, budget: removalBudget * 6 });
    if (fin.budgetExceeded || fin.solutions !== 1 || !fin.solution) continue;
    if (fin.solution.some((v, e) => v !== solution[e])) continue;

    const inside: number[] = [];
    for (let i = 0; i < n; i++) if (region[i]) inside.push(i);
    return { seed: baseSeed, rows, cols, clues, solution, loopLen: lv.length, inside };
  }
  throw new Error(`slitherlink generation failed for ${rows}x${cols} seed ${baseSeed}`);
}
