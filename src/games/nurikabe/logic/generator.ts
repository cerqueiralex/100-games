/**
 * Nurikabe generation + solver.
 *
 * A puzzle is accepted only when the SOLVER — sound constraint propagation
 * (clue reachability, island growth forcing, island merge prevention,
 * 2×2-sea prevention, sea-connectivity forcing via articulation points,
 * cell counting) plus count-to-2 backtracking — proves the solution UNIQUE.
 * Because propagation only ever makes forced deductions and the search
 * enumerates complete assignments, `countSolutions(...) === 1` is a proof.
 *
 * Pure TS, no React — importable headlessly for validation.
 */

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

export interface NurikabeClue {
  /** cell index (row-major) */
  cell: number;
  /** island size — the number printed on the board */
  value: number;
}

export interface NurikabePuzzle {
  seed: number;
  size: number;
  /** solution per cell, row-major: 1 = sea, 0 = island */
  solution: number[];
  clues: NurikabeClue[];
}

/** Cell states shared by the solver and the game. */
export const UNKNOWN = 0;
export const SEA = 1;
export const ISLAND = 2;

function buildNeighbors(size: number): number[][] {
  const n = size * size;
  const out: number[][] = new Array(n);
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / size);
    const c = i % size;
    const nb: number[] = [];
    if (r > 0) nb.push(i - size);
    if (r < size - 1) nb.push(i + size);
    if (c > 0) nb.push(i - 1);
    if (c < size - 1) nb.push(i + 1);
    out[i] = nb;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Solver                                                              */
/* ------------------------------------------------------------------ */

interface Ctx {
  size: number;
  n: number;
  clues: NurikabeClue[];
  /** cell -> clue index, -1 when unnumbered */
  clueIdxAt: Int32Array;
  neighbors: number[][];
  islandTotal: number;
  seaTotal: number;
}

function makeCtx(size: number, clues: NurikabeClue[]): Ctx {
  const n = size * size;
  const clueIdxAt = new Int32Array(n).fill(-1);
  let islandTotal = 0;
  clues.forEach((c, i) => {
    clueIdxAt[c.cell] = i;
    islandTotal += c.value;
  });
  return { size, n, clues, clueIdxAt, neighbors: buildNeighbors(size), islandTotal, seaTotal: n - islandTotal };
}

interface IslandComp {
  cells: number[];
  /** clue index when the component contains exactly one clue, -1 none, -2 several */
  clueIdx: number;
  /** unknown orthogonal neighbors (unique) */
  liberties: number[];
}

function islandComps(g: Uint8Array, ctx: Ctx, compOf: Int32Array): IslandComp[] {
  compOf.fill(-1);
  const comps: IslandComp[] = [];
  for (let i = 0; i < ctx.n; i++) {
    if (g[i] !== ISLAND || compOf[i] !== -1) continue;
    const cells: number[] = [i];
    compOf[i] = comps.length;
    let clueIdx = ctx.clueIdxAt[i];
    const liberties = new Set<number>();
    for (let k = 0; k < cells.length; k++) {
      for (const nb of ctx.neighbors[cells[k]]) {
        if (g[nb] === ISLAND && compOf[nb] === -1) {
          compOf[nb] = comps.length;
          cells.push(nb);
          const ci = ctx.clueIdxAt[nb];
          if (ci !== -1) clueIdx = clueIdx === -1 ? ci : -2;
        } else if (g[nb] === UNKNOWN) {
          liberties.add(nb);
        }
      }
    }
    comps.push({ cells, clueIdx, liberties: [...liberties] });
  }
  return comps;
}

/**
 * Run every propagation rule to fixpoint. Mutates `g` with forced cells.
 * Returns false on contradiction.
 */
function propagate(g: Uint8Array, ctx: Ctx): boolean {
  const { n, size, neighbors, clues } = ctx;
  const compOf = new Int32Array(n);

  outer: for (;;) {
    /* -- counting ---------------------------------------------------- */
    let seaCount = 0;
    let islCount = 0;
    for (let i = 0; i < n; i++) {
      if (g[i] === SEA) seaCount++;
      else if (g[i] === ISLAND) islCount++;
    }
    if (seaCount > ctx.seaTotal || islCount > ctx.islandTotal) return false;
    if (seaCount === ctx.seaTotal && seaCount + islCount < n) {
      for (let i = 0; i < n; i++) if (g[i] === UNKNOWN) g[i] = ISLAND;
      continue outer;
    }
    if (islCount === ctx.islandTotal && seaCount + islCount < n) {
      for (let i = 0; i < n; i++) if (g[i] === UNKNOWN) g[i] = SEA;
      continue outer;
    }

    /* -- island components: size, liberties -------------------------- */
    const comps = islandComps(g, ctx, compOf);
    let changed = false;
    for (const comp of comps) {
      if (comp.clueIdx === -2) return false; // two numbers in one island
      if (comp.clueIdx >= 0) {
        const v = clues[comp.clueIdx].value;
        if (comp.cells.length > v) return false;
        if (comp.cells.length === v) {
          for (const lib of comp.liberties) {
            g[lib] = SEA; // complete island: surround with sea
            changed = true;
          }
        } else {
          if (comp.liberties.length === 0) return false; // starved island
          if (comp.liberties.length === 1) {
            g[comp.liberties[0]] = ISLAND; // only way to grow
            changed = true;
          }
        }
      } else {
        // unnumbered island patch: must still connect to some clue
        if (comp.liberties.length === 0) return false;
        if (comp.liberties.length === 1) {
          g[comp.liberties[0]] = ISLAND;
          changed = true;
        }
      }
    }
    if (changed) continue outer;

    /* -- merge prevention: an unknown that would join two numbered
          islands, or overflow the one it joins, must be sea ---------- */
    for (let i = 0; i < n; i++) {
      if (g[i] !== UNKNOWN) continue;
      // a component can touch i from several sides — dedupe by comp id
      let mergedSize = 1;
      let clueCount = 0;
      let clueValue = 0;
      let c0 = -1;
      let c1 = -1;
      let c2 = -1;
      let c3 = -1;
      for (const nb of neighbors[i]) {
        if (g[nb] !== ISLAND) continue;
        const c = compOf[nb];
        if (c === c0 || c === c1 || c === c2 || c === c3) continue;
        if (c0 === -1) c0 = c;
        else if (c1 === -1) c1 = c;
        else if (c2 === -1) c2 = c;
        else c3 = c;
        mergedSize += comps[c].cells.length;
        if (comps[c].clueIdx >= 0) {
          clueCount++;
          clueValue = clues[comps[c].clueIdx].value;
        }
      }
      if (clueCount >= 2 || (clueCount === 1 && mergedSize > clueValue)) {
        g[i] = SEA;
        changed = true;
      }
    }
    if (changed) continue outer;

    /* -- reachability: a cell no clue can still reach must be sea ---- */
    const reach = new Uint8Array(n);
    for (let ci = 0; ci < clues.length; ci++) {
      const comp = comps[compOf[clues[ci].cell]];
      const budget = clues[ci].value - comp.cells.length;
      // multi-source BFS from the clue's component; unknown steps cost 1,
      // island steps (unnumbered patches that could join) cost 0
      const dist = new Int32Array(n).fill(-1);
      const queue: number[] = [];
      for (const c of comp.cells) {
        dist[c] = 0;
        reach[c] = 1;
        queue.push(c);
      }
      // 0-1 BFS via bucket queue: process cost layers in order
      const buckets: number[][] = [queue];
      for (let d = 0; d < buckets.length && d <= budget; d++) {
        const layer = buckets[d];
        if (!layer) continue;
        for (let qi = 0; qi < layer.length; qi++) {
          const cur = layer[qi];
          if (dist[cur] < d) continue;
          for (const nb of neighbors[cur]) {
            if (g[nb] === SEA) continue;
            // may not stand next to a DIFFERENT numbered island
            let touchesOther = false;
            for (const nb2 of neighbors[nb]) {
              if (g[nb2] === ISLAND) {
                const oc = compOf[nb2];
                if (comps[oc].clueIdx >= 0 && comps[oc].clueIdx !== ci) {
                  touchesOther = true;
                  break;
                }
              }
            }
            if (touchesOther) continue;
            const cost = g[nb] === ISLAND ? 0 : 1;
            const nd = d + cost;
            if (nd > budget) continue;
            if (dist[nb] !== -1 && dist[nb] <= nd) continue;
            dist[nb] = nd;
            reach[nb] = 1;
            (buckets[nd] ??= []).push(nb);
          }
        }
      }
    }
    for (let i = 0; i < n; i++) {
      if (reach[i]) continue;
      if (g[i] === ISLAND) return false; // stranded island cell
      if (g[i] === UNKNOWN) {
        g[i] = SEA;
        changed = true;
      }
    }
    if (changed) continue outer;

    /* -- 2×2 sea prevention ------------------------------------------ */
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const i = r * size + c;
        const quad = [i, i + 1, i + size, i + size + 1];
        let sea = 0;
        let unk = -1;
        for (const q of quad) {
          if (g[q] === SEA) sea++;
          else if (g[q] === UNKNOWN) unk = q;
        }
        if (sea === 4) return false;
        if (sea === 3 && unk !== -1) {
          g[unk] = ISLAND;
          changed = true;
        }
      }
    }
    if (changed) continue outer;

    /* -- sea connectivity: articulation forcing ----------------------- */
    const force = seaConnectivity(g, ctx);
    if (force === -1) return false;
    if (force === 1) continue outer;

    return true; // fixpoint, no contradiction
  }
}

/**
 * All confirmed sea must stay one mass inside the non-island graph.
 * Returns -1 contradiction, 1 when unknown cut-vertices were forced to
 * sea, 0 when nothing changed.
 */
function seaConnectivity(g: Uint8Array, ctx: Ctx): -1 | 0 | 1 {
  const { n, neighbors } = ctx;
  let root = -1;
  let totalSea = 0;
  for (let i = 0; i < n; i++) {
    if (g[i] === SEA) {
      totalSea++;
      if (root === -1) root = i;
    }
  }
  if (root === -1) return 0;

  const disc = new Int32Array(n).fill(-1);
  const low = new Int32Array(n);
  const seaSub = new Int32Array(n);
  const forced: number[] = [];
  let timer = 0;

  const dfs = (u: number, parent: number): void => {
    disc[u] = low[u] = timer++;
    seaSub[u] = g[u] === SEA ? 1 : 0;
    for (const v of neighbors[u]) {
      if (g[v] === ISLAND) continue;
      if (disc[v] === -1) {
        dfs(v, u);
        seaSub[u] += seaSub[v];
        if (low[v] < low[u]) low[u] = low[v];
        // u separates v's subtree: if sea lives on both sides, u must be sea
        if (parent !== -1 && low[v] >= disc[u] && g[u] === UNKNOWN && seaSub[v] > 0 && totalSea - seaSub[v] > 0) {
          forced.push(u);
        }
      } else if (v !== parent && disc[v] < low[u]) {
        low[u] = disc[v];
      }
    }
  };
  dfs(root, -1);

  // any confirmed sea outside the DFS tree is already cut off
  for (let i = 0; i < n; i++) {
    if (g[i] === SEA && disc[i] === -1) return -1;
  }
  if (forced.length === 0) return 0;
  for (const u of forced) g[u] = SEA;
  return 1;
}

/** Full rule validation of a complete assignment (1 = sea, 0 = island). */
export function validateNurikabeSolution(size: number, solution: ArrayLike<number>, clues: NurikabeClue[]): string[] {
  const errors: string[] = [];
  const n = size * size;
  const neighbors = buildNeighbors(size);
  const clueValueAt = new Map<number, number>();
  for (const c of clues) {
    clueValueAt.set(c.cell, c.value);
    if (solution[c.cell] !== 0) errors.push(`clue at ${c.cell} is not on an island cell`);
  }
  if (clueValueAt.size !== clues.length) errors.push('duplicate clue cells');

  // island components: exactly one clue each, size must match
  const compOf = new Int32Array(n).fill(-1);
  let comps = 0;
  for (let i = 0; i < n; i++) {
    if (solution[i] !== 0 || compOf[i] !== -1) continue;
    const cells = [i];
    compOf[i] = comps;
    for (let k = 0; k < cells.length; k++) {
      for (const nb of neighbors[cells[k]]) {
        if (solution[nb] === 0 && compOf[nb] === -1) {
          compOf[nb] = comps;
          cells.push(nb);
        }
      }
    }
    const inComp = cells.filter((c) => clueValueAt.has(c));
    if (inComp.length !== 1) errors.push(`island at ${i} has ${inComp.length} numbers`);
    else if (clueValueAt.get(inComp[0]) !== cells.length) {
      errors.push(`island at ${i} has ${cells.length} cells but its number is ${clueValueAt.get(inComp[0])}`);
    }
    comps++;
  }
  if (comps !== clues.length) errors.push(`expected ${clues.length} islands, found ${comps}`);

  // sea: nonempty, connected, no 2×2
  let seaStart = -1;
  let seaCount = 0;
  for (let i = 0; i < n; i++) {
    if (solution[i] === 1) {
      seaCount++;
      if (seaStart === -1) seaStart = i;
    }
  }
  if (seaCount === 0) errors.push('no sea at all');
  else {
    const seen = new Set<number>([seaStart]);
    const queue = [seaStart];
    for (let k = 0; k < queue.length; k++) {
      for (const nb of neighbors[queue[k]]) {
        if (solution[nb] === 1 && !seen.has(nb)) {
          seen.add(nb);
          queue.push(nb);
        }
      }
    }
    if (seen.size !== seaCount) errors.push('sea is not one connected mass');
  }
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const i = r * size + c;
      if (solution[i] === 1 && solution[i + 1] === 1 && solution[i + size] === 1 && solution[i + size + 1] === 1) {
        errors.push(`2×2 sea block at row ${r + 1}, col ${c + 1}`);
      }
    }
  }
  return errors;
}

function finalCheck(g: Uint8Array, ctx: Ctx): boolean {
  const sol = new Array<number>(ctx.n);
  for (let i = 0; i < ctx.n; i++) sol[i] = g[i] === SEA ? 1 : 0;
  return validateNurikabeSolution(ctx.size, sol, ctx.clues).length === 0;
}

/**
 * Count solutions of a clue set, stopping at `limit`. `=== 1` proves the
 * puzzle unique AND solvable. `nodeBudget` bounds the search: when it is
 * exhausted the function returns `limit` (treated as "not provably
 * unique"), so generation simply rejects hard-to-prove candidates.
 */
export function countSolutions(size: number, clues: NurikabeClue[], limit = 2, nodeBudget = 2500): number {
  const ctx = makeCtx(size, clues);
  if (ctx.seaTotal < 0) return 0;
  const g0 = new Uint8Array(ctx.n); // all UNKNOWN
  for (const c of clues) g0[c.cell] = ISLAND;
  const compOf = new Int32Array(ctx.n);
  let count = 0;
  let nodes = 0;
  let aborted = false;

  const search = (g: Uint8Array): void => {
    if (count >= limit || aborted) return;
    if (++nodes > nodeBudget) {
      aborted = true;
      return;
    }
    if (!propagate(g, ctx)) return;

    // branch on a liberty of the tightest incomplete island — every island
    // must keep growing, so this is the scarcest decision. When no island
    // is incomplete, no unknown can ever become island → the rest is sea.
    const comps = islandComps(g, ctx, compOf);
    let best: IslandComp | null = null;
    for (const comp of comps) {
      const incomplete = comp.clueIdx >= 0 ? comp.cells.length < ctx.clues[comp.clueIdx].value : true;
      if (!incomplete) continue;
      if (!best || comp.liberties.length < best.liberties.length) best = comp;
    }
    if (!best) {
      for (let i = 0; i < ctx.n; i++) if (g[i] === UNKNOWN) g[i] = SEA;
      if (finalCheck(g, ctx)) count++;
      return;
    }

    const cell = best.liberties[0];
    const g1 = g.slice();
    g1[cell] = ISLAND;
    search(g1);
    if (count >= limit || aborted) return;
    g[cell] = SEA;
    search(g);
  };

  search(g0);
  return aborted ? limit : count;
}

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

/**
 * Islands-per-board range by size. Classic Nurikabe uses MANY small
 * islands (lots of 1s–3s); that both matches the genre and keeps every
 * board strongly constrained so a unique solution is found quickly.
 * Difficulty scales chiefly by board size, with larger boards packing
 * more islands and a slightly higher size cap.
 */
const ISLAND_COUNT: Record<number, [number, number]> = {
  5: [4, 5],
  6: [5, 7],
  7: [7, 9],
  8: [9, 11],
  10: [15, 19]
};

/** largest island number we allow — keeps boards readable and human-fun */
function maxIslandSize(size: number): number {
  return size <= 6 ? 5 : 6;
}

function seaConnected(owner: Int16Array, size: number): boolean {
  const n = size * size;
  let start = -1;
  let seaCount = 0;
  for (let i = 0; i < n; i++) {
    if (owner[i] === -1) {
      seaCount++;
      if (start === -1) start = i;
    }
  }
  if (seaCount === 0) return false;
  const seen = new Uint8Array(n);
  seen[start] = 1;
  const queue = [start];
  let reached = 1;
  for (let k = 0; k < queue.length; k++) {
    const cur = queue[k];
    const r = Math.floor(cur / size);
    const c = cur % size;
    const nbs = [cur - size, cur + size, cur - 1, cur + 1];
    const oks = [r > 0, r < size - 1, c > 0, c < size - 1];
    for (let d = 0; d < 4; d++) {
      const nb = nbs[d];
      if (oks[d] && owner[nb] === -1 && !seen[nb]) {
        seen[nb] = 1;
        reached++;
        queue.push(nb);
      }
    }
  }
  return reached === seaCount;
}

function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Partition the grid into K non-adjacent islands and a connected,
 * 2×2-free sea. Returns owner array (-1 sea, else island id) or null.
 */
function tryPartition(rnd: () => number, size: number, minK: number, maxK: number): Int16Array | null {
  const n = size * size;
  const neighbors = buildNeighbors(size);
  const K = minK + Math.floor(rnd() * (maxK - minK + 1));
  const owner = new Int16Array(n).fill(-1);

  // island seeds, pairwise non-adjacent
  let planted = 0;
  for (const c of shuffled(Array.from({ length: n }, (_, i) => i), rnd)) {
    if (planted === K) break;
    if (owner[c] !== -1) continue;
    let free = true;
    for (const nb of neighbors[c]) {
      if (owner[nb] !== -1) {
        free = false;
        break;
      }
    }
    if (free) owner[c] = planted++;
  }
  if (planted < K) return null;

  // grow islands toward a total island area, keeping the sea connected
  const target = Math.round(n * (0.36 + rnd() * 0.1));
  let total = K;
  let stall = 0;
  while (total < target && stall < 50) {
    const isl = Math.floor(rnd() * K);
    const cands: number[] = [];
    for (let i = 0; i < n; i++) {
      if (owner[i] !== -1) continue;
      let self = false;
      let other = false;
      for (const nb of neighbors[i]) {
        if (owner[nb] === isl) self = true;
        else if (owner[nb] !== -1) other = true;
      }
      if (self && !other) cands.push(i);
    }
    let placed = false;
    for (let tries = 0; tries < 4 && cands.length > 0; tries++) {
      const at = Math.floor(rnd() * cands.length);
      const cell = cands[at];
      cands.splice(at, 1);
      owner[cell] = isl;
      if (seaConnected(owner, size)) {
        placed = true;
        break;
      }
      owner[cell] = -1;
    }
    if (placed) {
      total++;
      stall = 0;
    } else stall++;
  }

  // repair every all-sea 2×2 block by growing an adjacent island into it
  for (let guard = 0; guard <= n; guard++) {
    let block = -1;
    for (let r = 0; r < size - 1 && block === -1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const i = r * size + c;
        if (owner[i] === -1 && owner[i + 1] === -1 && owner[i + size] === -1 && owner[i + size + 1] === -1) {
          block = i;
          break;
        }
      }
    }
    if (block === -1) break;
    if (guard === n) return null;
    let fixed = false;
    for (const cell of shuffled([block, block + 1, block + size, block + size + 1], rnd)) {
      let adj = -1;
      let multi = false;
      for (const nb of neighbors[cell]) {
        if (owner[nb] === -1) continue;
        if (adj === -1 || adj === owner[nb]) adj = owner[nb];
        else multi = true;
      }
      if (adj === -1 || multi) continue;
      owner[cell] = adj;
      if (seaConnected(owner, size)) {
        fixed = true;
        break;
      }
      owner[cell] = -1;
    }
    if (!fixed) return null;
  }

  // final sanity: exactly K non-adjacent islands within the size cap
  const sizes = new Array<number>(K).fill(0);
  for (let i = 0; i < n; i++) if (owner[i] !== -1) sizes[owner[i]]++;
  const cap = maxIslandSize(size);
  for (const s of sizes) if (s === 0 || s > cap) return null;
  const compOf = new Int32Array(n).fill(-1);
  let comps = 0;
  for (let i = 0; i < n; i++) {
    if (owner[i] === -1 || compOf[i] !== -1) continue;
    const queue = [i];
    compOf[i] = comps;
    for (let k = 0; k < queue.length; k++) {
      for (const nb of neighbors[queue[k]]) {
        if (owner[nb] === owner[queue[k]] && compOf[nb] === -1) {
          compOf[nb] = comps;
          queue.push(nb);
        } else if (owner[nb] !== -1 && owner[nb] !== owner[queue[k]]) {
          return null; // two islands touch — never happens by construction
        }
      }
    }
    comps++;
  }
  if (comps !== K) return null;
  if (!seaConnected(owner, size)) return null;
  return owner;
}

function placeClues(rnd: () => number, owner: Int16Array, size: number): NurikabeClue[] {
  const n = size * size;
  const byIsland = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    if (owner[i] === -1) continue;
    const list = byIsland.get(owner[i]);
    if (list) list.push(i);
    else byIsland.set(owner[i], [i]);
  }
  const clues: NurikabeClue[] = [];
  for (const cells of byIsland.values()) {
    clues.push({ cell: cells[Math.floor(rnd() * cells.length)], value: cells.length });
  }
  clues.sort((a, b) => a.cell - b.cell);
  return clues;
}

/** Deterministic, provably-valid comb layout — the never-in-practice fallback. */
function combFallback(size: number): NurikabePuzzle {
  const n = size * size;
  const solution = new Array<number>(n).fill(1);
  const clues: NurikabeClue[] = [];
  for (let c = 1; c < size; c += 2) {
    for (let r = 1; r < size; r++) solution[r * size + c] = 0;
    clues.push({ cell: Math.floor((size + 1) / 2) * size + c, value: size - 1 });
  }
  return { seed: 0, size, solution, clues };
}

/**
 * Generate a Nurikabe puzzle with a UNIQUE solution. Deterministic for a
 * given seed. Partition → clue placement → uniqueness proof, retried
 * until the solver accepts.
 */
export function generateNurikabe(opts: { seed?: number; size: number }): NurikabePuzzle {
  const size = opts.size;
  const seed = (opts.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const rnd = mulberry32(seed);
  const n = size * size;
  const [minK, maxK] = ISLAND_COUNT[size] ?? [
    Math.max(3, Math.round((n * 0.42) / 4.5)),
    Math.max(4, Math.round((n * 0.46) / 3.2))
  ];

  for (let attempt = 0; attempt < 2000; attempt++) {
    const owner = tryPartition(rnd, size, minK, maxK);
    if (!owner) continue;
    // several clue placements per partition — placement often decides uniqueness
    for (let t = 0; t < 4; t++) {
      const clues = placeClues(rnd, owner, size);
      if (countSolutions(size, clues, 2) === 1) {
        const solution = Array.from(owner, (v) => (v === -1 ? 1 : 0));
        return { seed, size, solution, clues };
      }
    }
  }
  return combFallback(size); // practically unreachable; keeps types safe
}

/* ------------------------------------------------------------------ */
/* Play-state helpers (player grid: 0 unknown, 1 sea, 2 island mark)   */
/* ------------------------------------------------------------------ */

/**
 * Rule violations visible in a PARTIAL player grid, for the rule-check
 * assist: 2×2 sea blocks, islands holding two numbers or overflowing
 * their number, and painted-sea patches cut off from the main sea.
 * Returns the offending cell indices. Never consults the solution.
 */
export function findViolations(size: number, grid: ArrayLike<number>, clues: NurikabeClue[]): number[] {
  const n = size * size;
  const neighbors = buildNeighbors(size);
  const bad = new Set<number>();
  const clueValueAt = new Map<number, number>();
  for (const c of clues) clueValueAt.set(c.cell, c.value);

  // 2×2 sea blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const i = r * size + c;
      const quad = [i, i + 1, i + size, i + size + 1];
      if (quad.every((q) => grid[q] === SEA)) quad.forEach((q) => bad.add(q));
    }
  }

  // island regions: two numbers (touching islands) or more cells than the number
  const seen = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (grid[i] !== ISLAND || seen[i]) continue;
    const cells = [i];
    seen[i] = 1;
    for (let k = 0; k < cells.length; k++) {
      for (const nb of neighbors[cells[k]]) {
        if (grid[nb] === ISLAND && !seen[nb]) {
          seen[nb] = 1;
          cells.push(nb);
        }
      }
    }
    const clueCells = cells.filter((c) => clueValueAt.has(c));
    const oversize = clueCells.length === 1 && cells.length > clueValueAt.get(clueCells[0])!;
    if (clueCells.length >= 2 || oversize) cells.forEach((c) => bad.add(c));
  }

  // sea patches that can no longer reach the rest of the sea
  const compAt = new Int32Array(n).fill(-1);
  const seaPerComp: number[][] = [];
  for (let i = 0; i < n; i++) {
    if (grid[i] === ISLAND || compAt[i] !== -1) continue;
    const compId = seaPerComp.length;
    const seaCells: number[] = [];
    const queue = [i];
    compAt[i] = compId;
    for (let k = 0; k < queue.length; k++) {
      const cur = queue[k];
      if (grid[cur] === SEA) seaCells.push(cur);
      for (const nb of neighbors[cur]) {
        if (grid[nb] !== ISLAND && compAt[nb] === -1) {
          compAt[nb] = compId;
          queue.push(nb);
        }
      }
    }
    seaPerComp.push(seaCells);
  }
  const withSea = seaPerComp.filter((s) => s.length > 0);
  if (withSea.length > 1) {
    withSea.sort((a, b) => b.length - a.length);
    for (let k = 1; k < withSea.length; k++) withSea[k].forEach((c) => bad.add(c));
  }

  return [...bad];
}

/**
 * Cells of islands that exactly match their number (one number, exact
 * size) — the complete-islands assist outlines and dims these.
 */
export function completeIslands(size: number, grid: ArrayLike<number>, clues: NurikabeClue[]): number[] {
  const n = size * size;
  const neighbors = buildNeighbors(size);
  const clueValueAt = new Map<number, number>();
  for (const c of clues) clueValueAt.set(c.cell, c.value);
  const out: number[] = [];
  const seen = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (grid[i] !== ISLAND || seen[i]) continue;
    const cells = [i];
    seen[i] = 1;
    for (let k = 0; k < cells.length; k++) {
      for (const nb of neighbors[cells[k]]) {
        if (grid[nb] === ISLAND && !seen[nb]) {
          seen[nb] = 1;
          cells.push(nb);
        }
      }
    }
    const clueCells = cells.filter((c) => clueValueAt.has(c));
    if (clueCells.length === 1 && clueValueAt.get(clueCells[0]) === cells.length) out.push(...cells);
  }
  return out;
}

/**
 * The hint's cell: the next cell sound deduction forces from the player's
 * currently-correct marks. Runs the same propagation the generator uses,
 * seeded only with player cells that agree with the solution (so a wrong
 * mark never poisons the deduction). Falls back to a frontier cell of the
 * solution. Returns null when nothing is left to reveal.
 */
export function hintCell(
  size: number,
  clues: NurikabeClue[],
  playerGrid: ArrayLike<number>,
  solution: ArrayLike<number>
): { cell: number; state: number } | null {
  const ctx = makeCtx(size, clues);
  const clueSet = new Set(clues.map((c) => c.cell));
  const g = new Uint8Array(ctx.n);
  for (const c of clues) g[c.cell] = ISLAND;
  for (let i = 0; i < ctx.n; i++) {
    if (clueSet.has(i)) continue;
    const ps = playerGrid[i];
    if (ps === SEA && solution[i] === 1) g[i] = SEA;
    else if (ps === ISLAND && solution[i] === 0) g[i] = ISLAND;
  }
  const before = g.slice();
  propagate(g, ctx); // seeded from correct cells only → no contradiction

  // the first cell propagation newly forces that the player hasn't set
  for (let i = 0; i < ctx.n; i++) {
    if (before[i] !== UNKNOWN || g[i] === UNKNOWN) continue;
    const want = solution[i] === 1 ? SEA : ISLAND;
    if (g[i] === want && playerGrid[i] !== want) return { cell: i, state: want };
  }
  // fallback: a frontier cell of the solution the player hasn't solved
  let any = -1;
  for (let i = 0; i < ctx.n; i++) {
    if (clueSet.has(i)) continue;
    const want = solution[i] === 1 ? SEA : ISLAND;
    if (playerGrid[i] === want) continue;
    if (any === -1) any = i;
    for (const nb of ctx.neighbors[i]) {
      if (clueSet.has(nb) || playerGrid[nb] !== UNKNOWN) return { cell: i, state: want };
    }
  }
  if (any !== -1) return { cell: any, state: solution[any] === 1 ? SEA : ISLAND };
  return null;
}
