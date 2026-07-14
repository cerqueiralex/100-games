/**
 * Slitherlink solver — constraint propagation on edges (cell counts,
 * dot degree 0/2) plus count-to-2 backtracking with early loop-validity
 * pruning. Pure TS, no React — importable headlessly for validation.
 *
 * The generator only ships a puzzle when this solver proves the clue set
 * has EXACTLY ONE solution, which also guarantees any player loop that
 * satisfies all clues is the intended one.
 */
import { geometry, type Geometry } from './geometry';

export const UNKNOWN = -1;
export const OFF = 0;
export const ON = 1;

export interface SolveOptions {
  /** stop counting once this many solutions are found (default 2) */
  limit?: number;
  /** backtracking node budget — exceeded means "undecided" (default 30k) */
  budget?: number;
}

export interface SolveResult {
  /** number of solutions found (capped at limit) */
  solutions: number;
  /** first solution found: per-edge 0/1, or null */
  solution: number[] | null;
  nodes: number;
  budgetExceeded: boolean;
}

interface Ctx {
  g: Geometry;
  clues: (number | null)[];
  limit: number;
  budget: number;
  nodes: number;
  exceeded: boolean;
  solutions: number;
  solution: number[] | null;
}

/**
 * Worklist propagation to fixpoint. `seedEdges` restricts the initial
 * frontier to the cells/dots around those edges (null = everything).
 * Returns false on contradiction. Mutates `state`.
 */
function propagate(ctx: Ctx, state: Int8Array, seedEdges: number[] | null): boolean {
  const { g, clues } = ctx;
  const nCells = g.rows * g.cols;
  const nDots = (g.rows + 1) * (g.cols + 1);
  const cellQ: number[] = [];
  const dotQ: number[] = [];
  const cellIn = new Uint8Array(nCells);
  const dotIn = new Uint8Array(nDots);

  const pushCell = (i: number) => {
    if (!cellIn[i]) {
      cellIn[i] = 1;
      cellQ.push(i);
    }
  };
  const pushDot = (i: number) => {
    if (!dotIn[i]) {
      dotIn[i] = 1;
      dotQ.push(i);
    }
  };
  const touchEdge = (e: number) => {
    for (const cell of g.edgeCells[e]) pushCell(cell);
    pushDot(g.edgeDots[e][0]);
    pushDot(g.edgeDots[e][1]);
  };

  if (seedEdges) {
    for (const e of seedEdges) touchEdge(e);
  } else {
    for (let i = 0; i < nCells; i++) pushCell(i);
    for (let i = 0; i < nDots; i++) pushDot(i);
  }

  /** assign an unknown edge; contradiction if already fixed differently */
  const set = (e: number, v: number): boolean => {
    if (state[e] === v) return true;
    if (state[e] !== UNKNOWN) return false;
    state[e] = v;
    touchEdge(e);
    return true;
  };

  while (cellQ.length || dotQ.length) {
    if (dotQ.length) {
      const dot = dotQ.pop()!;
      dotIn[dot] = 0;
      const edges = g.dotEdges[dot];
      let on = 0;
      let unk = 0;
      for (const e of edges) {
        if (state[e] === ON) on++;
        else if (state[e] === UNKNOWN) unk++;
      }
      if (on > 2) return false;
      if (on === 2) {
        if (unk > 0) {
          for (const e of edges) if (state[e] === UNKNOWN && !set(e, OFF)) return false;
        }
      } else if (on === 1) {
        if (unk === 0) return false; // dangling end — degree 1 impossible
        if (unk === 1) {
          for (const e of edges) if (state[e] === UNKNOWN && !set(e, ON)) return false;
        }
      } else if (unk === 1) {
        // a lone unknown edge at an empty dot would end there — force off
        for (const e of edges) if (state[e] === UNKNOWN && !set(e, OFF)) return false;
      }
    } else {
      const cell = cellQ.pop()!;
      cellIn[cell] = 0;
      const k = clues[cell];
      if (k == null) continue;
      const edges = g.cellEdges[cell];
      let on = 0;
      let unk = 0;
      for (const e of edges) {
        if (state[e] === ON) on++;
        else if (state[e] === UNKNOWN) unk++;
      }
      if (on > k || on + unk < k) return false;
      if (unk > 0) {
        if (on === k) {
          for (const e of edges) if (state[e] === UNKNOWN && !set(e, OFF)) return false;
        } else if (on + unk === k) {
          for (const e of edges) if (state[e] === UNKNOWN && !set(e, ON)) return false;
        }
      }
    }
  }
  return true;
}

/**
 * Early loop-validity check on a propagated state.
 * - 'fail': some ON component is a closed cycle but either other ON edges
 *   exist outside it or some clue is not exactly satisfied — since ON
 *   edges are permanent, this branch can never reach a single valid loop.
 * - 'solved': all ON edges form ONE closed cycle and every clue is exactly
 *   satisfied — remaining unknowns are forced OFF (any extra line would
 *   have to form a second loop), so this state is exactly one solution.
 * - 'open': no closed cycle yet.
 */
function analyzeLoops(ctx: Ctx, state: Int8Array): 'fail' | 'solved' | 'open' {
  const { g, clues } = ctx;
  const nDots = (g.rows + 1) * (g.cols + 1);
  const deg = new Uint8Array(nDots);
  let totalOn = 0;
  for (let e = 0; e < g.E; e++) {
    if (state[e] === ON) {
      totalOn++;
      deg[g.edgeDots[e][0]]++;
      deg[g.edgeDots[e][1]]++;
    }
  }
  if (totalOn === 0) return 'open';

  const visited = new Uint8Array(g.E);
  for (let e0 = 0; e0 < g.E; e0++) {
    if (state[e0] !== ON || visited[e0]) continue;
    // walk this connected component of ON edges
    let compEdges = 0;
    let isCycle = true;
    const stack = [e0];
    visited[e0] = 1;
    while (stack.length) {
      const e = stack.pop()!;
      compEdges++;
      for (const dot of g.edgeDots[e]) {
        if (deg[dot] !== 2) isCycle = false;
        for (const e2 of g.dotEdges[dot]) {
          if (state[e2] === ON && !visited[e2]) {
            visited[e2] = 1;
            stack.push(e2);
          }
        }
      }
    }
    if (isCycle) {
      if (compEdges < totalOn) return 'fail'; // closed loop + stray lines
      // one cycle holding every line — solved iff all clues exactly met
      for (let cell = 0; cell < clues.length; cell++) {
        const k = clues[cell];
        if (k == null) continue;
        let on = 0;
        for (const e of g.cellEdges[cell]) if (state[e] === ON) on++;
        if (on !== k) return 'fail'; // loop closed too early
      }
      return 'solved';
    }
  }
  return 'open';
}

/** binomial C(n, k) for n ≤ 4 — legal completions of a clue cell */
const CHOOSE = [
  [1],
  [1, 1],
  [1, 2, 1],
  [1, 3, 3, 1],
  [1, 4, 6, 4, 1]
];

/** Branch on a path end first (strongest pruning), then the tightest clue. */
function pickBranch(ctx: Ctx, state: Int8Array): number {
  const { g, clues } = ctx;
  const nDots = (g.rows + 1) * (g.cols + 1);
  for (let dot = 0; dot < nDots; dot++) {
    let on = 0;
    let firstUnk = -1;
    for (const e of g.dotEdges[dot]) {
      if (state[e] === ON) on++;
      else if (state[e] === UNKNOWN && firstUnk === -1) firstUnk = e;
    }
    if (on === 1 && firstUnk !== -1) return firstUnk;
  }
  // else the clue cell with the fewest legal edge completions
  let bestEdge = -1;
  let bestWays = Infinity;
  for (let cell = 0; cell < clues.length; cell++) {
    const k = clues[cell];
    if (k == null) continue;
    let unk = 0;
    let on = 0;
    let firstUnk = -1;
    for (const e of g.cellEdges[cell]) {
      if (state[e] === UNKNOWN) {
        unk++;
        if (firstUnk === -1) firstUnk = e;
      } else if (state[e] === ON) on++;
    }
    if (unk === 0) continue;
    const need = Math.max(0, Math.min(unk, k - on));
    const ways = CHOOSE[unk][need];
    if (ways < bestWays) {
      bestWays = ways;
      bestEdge = firstUnk;
    }
  }
  if (bestEdge !== -1) return bestEdge;
  for (let e = 0; e < g.E; e++) if (state[e] === UNKNOWN) return e;
  return -1;
}

function search(ctx: Ctx, state: Int8Array): void {
  if (ctx.solutions >= ctx.limit || ctx.exceeded) return;
  const shape = analyzeLoops(ctx, state);
  if (shape === 'fail') return;
  if (shape === 'solved') {
    ctx.solutions++;
    if (!ctx.solution) ctx.solution = Array.from(state, (v) => (v === ON ? 1 : 0));
    return;
  }
  const e = pickBranch(ctx, state);
  if (e === -1) return; // fully assigned but no loop at all — not a solution
  for (const v of [ON, OFF]) {
    if (ctx.solutions >= ctx.limit || ctx.exceeded) return;
    if (++ctx.nodes > ctx.budget) {
      ctx.exceeded = true;
      return;
    }
    const next = state.slice();
    next[e] = v;
    if (propagate(ctx, next, [e])) search(ctx, next);
  }
}

/**
 * Count solutions of a clue set (up to `limit`). `solutions === 1` with
 * `budgetExceeded === false` is a PROOF of uniqueness.
 */
export function solveSlitherlink(
  rows: number,
  cols: number,
  clues: (number | null)[],
  opts: SolveOptions = {}
): SolveResult {
  const g = geometry(rows, cols);
  const ctx: Ctx = {
    g,
    clues,
    limit: opts.limit ?? 2,
    budget: opts.budget ?? 30000,
    nodes: 0,
    exceeded: false,
    solutions: 0,
    solution: null
  };
  const state = new Int8Array(g.E).fill(UNKNOWN);
  if (propagate(ctx, state, null)) search(ctx, state);
  return {
    solutions: ctx.solutions,
    solution: ctx.solution,
    nodes: ctx.nodes,
    budgetExceeded: ctx.exceeded
  };
}
