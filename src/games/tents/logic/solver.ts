/*
 * Tents & Trees — pure solving logic (no React) shared by the generator
 * (uniqueness proof), the in-game assists and `npm run validate`.
 *
 * Rules: every tree pairs 1:1 with a tent on an orthogonally adjacent cell,
 * tents never touch each other (not even diagonally), and each row/column
 * holds exactly the number of tents its clue says. The player marks empty
 * cells as TENT or GRASS; TREE cells are fixed by the puzzle.
 */

export const EMPTY = 0;
export const TENT = 1;
export const GRASS = 2;
export const TREE = 3;

/** The clue side of a puzzle — everything the solver needs. */
export interface TentsBoard {
  size: number;
  /** cell indices holding trees (fixed) */
  trees: number[];
  rowCounts: number[];
  colCounts: number[];
}

/** A full generated puzzle: board + the unique solution + its seed. */
export interface TentsPuzzle extends TentsBoard {
  seed: number;
  /** cell indices of the solution's tents (sorted) */
  solution: number[];
}

export function orthNeighbors(i: number, size: number): number[] {
  const r = (i / size) | 0;
  const c = i % size;
  const out: number[] = [];
  if (r > 0) out.push(i - size);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  if (c < size - 1) out.push(i + 1);
  return out;
}

export function kingNeighbors(i: number, size: number): number[] {
  const r = (i / size) | 0;
  const c = i % size;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) out.push(nr * size + nc);
    }
  }
  return out;
}

/** Fresh solver state: all EMPTY except the fixed trees. */
export function initialState(board: TentsBoard): Uint8Array {
  const s = new Uint8Array(board.size * board.size);
  for (const t of board.trees) s[t] = TREE;
  return s;
}

/**
 * Maximum bipartite matching (augmenting paths) between left nodes and the
 * candidate cells listed for each. Small boards keep this cheap. Returns the
 * matching size plus cell → left-node ownership (used to attach trees).
 */
export function maxMatching(cands: number[][]): { size: number; owner: Map<number, number> } {
  const owner = new Map<number, number>();
  const tryAssign = (li: number, seen: Set<number>): boolean => {
    for (const cell of cands[li]) {
      if (seen.has(cell)) continue;
      seen.add(cell);
      const cur = owner.get(cell);
      if (cur === undefined || tryAssign(cur, seen)) {
        owner.set(cell, li);
        return true;
      }
    }
    return false;
  };
  let size = 0;
  for (let li = 0; li < cands.length; li++) if (tryAssign(li, new Set())) size++;
  return { size, owner };
}

/**
 * Place a tent: grasses the 8-neighbourhood (tents never touch). Returns
 * false when the placement contradicts the state.
 */
function placeTent(state: Uint8Array, i: number, size: number): boolean {
  if (state[i] === TENT) return true;
  if (state[i] !== EMPTY) return false;
  state[i] = TENT;
  for (const nb of kingNeighbors(i, size)) {
    if (state[nb] === TENT) return false;
    if (state[nb] === EMPTY) state[nb] = GRASS;
  }
  return true;
}

/**
 * Sound constraint propagation to a fixpoint. Rules: line counts (satisfied
 * → grass the rest, tight → all tents), cells without an adjacent tree or
 * beside a tent → grass, trees with a single possible tent cell → forced,
 * and a global tree↔cell bipartite-matching feasibility check. Returns
 * false on contradiction.
 */
export function propagate(board: TentsBoard, state: Uint8Array): boolean {
  const { size, rowCounts, colCounts, trees } = board;
  const n = size * size;

  const applyLine = (cells: number[], target: number): boolean | 'x' => {
    let tents = 0;
    const empties: number[] = [];
    for (const i of cells) {
      if (state[i] === TENT) tents++;
      else if (state[i] === EMPTY) empties.push(i);
    }
    if (tents > target || tents + empties.length < target) return 'x';
    if (empties.length === 0) return false;
    if (tents === target) {
      for (const i of empties) state[i] = GRASS;
      return true;
    }
    if (tents + empties.length === target) {
      // every open cell in the line is forced to be a tent
      for (const i of empties) if (state[i] === EMPTY && !placeTent(state, i, size)) return 'x';
      return true;
    }
    return false;
  };

  const rowCells = (r: number) => Array.from({ length: size }, (_, c) => r * size + c);
  const colCells = (c: number) => Array.from({ length: size }, (_, r) => r * size + c);

  for (;;) {
    let changed = false;

    for (let r = 0; r < size; r++) {
      const res = applyLine(rowCells(r), rowCounts[r]);
      if (res === 'x') return false;
      if (res) changed = true;
    }
    for (let c = 0; c < size; c++) {
      const res = applyLine(colCells(c), colCounts[c]);
      if (res === 'x') return false;
      if (res) changed = true;
    }

    for (let i = 0; i < n; i++) {
      if (state[i] !== EMPTY) continue;
      // a tent must serve a tree — cells with no orthogonal tree are grass
      if (!orthNeighbors(i, size).some((nb) => state[nb] === TREE)) {
        state[i] = GRASS;
        changed = true;
        continue;
      }
      // tents never touch — cells beside a placed tent are grass
      if (kingNeighbors(i, size).some((nb) => state[nb] === TENT)) {
        state[i] = GRASS;
        changed = true;
      }
    }

    // a tree whose only possible tent cell is still open forces that tent
    for (const t of trees) {
      const cands = orthNeighbors(t, size).filter((c) => state[c] === TENT || state[c] === EMPTY);
      if (cands.length === 0) return false;
      if (cands.length === 1 && state[cands[0]] === EMPTY) {
        if (!placeTent(state, cands[0], size)) return false;
        changed = true;
      }
    }

    if (!changed) {
      // matching feasibility: every tree must still be pairable 1:1
      const cands = trees.map((t) =>
        orthNeighbors(t, size).filter((c) => state[c] === TENT || state[c] === EMPTY)
      );
      return maxMatching(cands).size === trees.length;
    }
  }
}

/** Full-rules check of a complete tent set against a board. */
export function verifySolution(board: TentsBoard, tents: number[]): boolean {
  const { size, rowCounts, colCounts, trees } = board;
  const set = new Set(tents);
  if (set.size !== tents.length || set.size !== trees.length) return false;
  const rows = new Array(size).fill(0);
  const cols = new Array(size).fill(0);
  const treeSet = new Set(trees);
  for (const t of tents) {
    if (treeSet.has(t)) return false;
    rows[(t / size) | 0]++;
    cols[t % size]++;
  }
  for (let k = 0; k < size; k++) if (rows[k] !== rowCounts[k] || cols[k] !== colCounts[k]) return false;
  for (const t of tents) if (kingNeighbors(t, size).some((nb) => set.has(nb))) return false;
  const cands = trees.map((tr) => orthNeighbors(tr, size).filter((c) => set.has(c)));
  return maxMatching(cands).size === trees.length;
}

/**
 * Count solutions up to `limit` (propagation + branching on the most
 * constrained tree). A blown node budget counts as `limit` so the generator
 * treats pathological boards as non-unique and regenerates.
 */
export function countSolutions(board: TentsBoard, limit = 2, nodeBudget = 40000): number {
  let nodes = 0;
  const search = (state: Uint8Array): number => {
    if (nodes++ > nodeBudget) return limit;
    if (!propagate(board, state)) return 0;

    // branch on an open candidate of the tree with the fewest options
    let branch = -1;
    let best = Infinity;
    for (const t of board.trees) {
      const nbs = orthNeighbors(t, board.size);
      if (nbs.some((c) => state[c] === TENT)) continue; // possibly already served
      const empties = nbs.filter((c) => state[c] === EMPTY);
      if (empties.length > 0 && empties.length < best) {
        best = empties.length;
        branch = empties[0];
      }
    }
    if (branch === -1) branch = state.indexOf(EMPTY);
    if (branch === -1) {
      const tents: number[] = [];
      for (let i = 0; i < state.length; i++) if (state[i] === TENT) tents.push(i);
      return verifySolution(board, tents) ? 1 : 0;
    }

    let total = 0;
    const asTent = new Uint8Array(state);
    if (placeTent(asTent, branch, board.size)) total += search(asTent);
    if (total >= limit) return limit;
    const asGrass = new Uint8Array(state);
    asGrass[branch] = GRASS;
    total += search(asGrass);
    return Math.min(total, limit);
  };
  return search(initialState(board));
}

/* ---------- in-game helpers (assists) ---------- */

export interface TentsHint {
  cell: number;
  place: 'tent' | 'grass';
}

/**
 * The hint assist: first corrects one wrongly placed tent (grasses it),
 * otherwise places the missing solution tent whose row + column have the
 * fewest open cells — the most constrained spot on the board.
 */
export function hintMove(puzzle: TentsPuzzle, marks: ArrayLike<number>): TentsHint | null {
  const { size, solution } = puzzle;
  const sol = new Set(solution);
  const treeSet = new Set(puzzle.trees);
  for (let i = 0; i < size * size; i++) {
    if (marks[i] === TENT && !sol.has(i)) return { cell: i, place: 'grass' };
  }
  const openIn = (cells: number[]) =>
    cells.filter((c) => !treeSet.has(c) && marks[c] === EMPTY).length;
  let bestCell = -1;
  let bestScore = Infinity;
  for (const t of solution) {
    if (marks[t] === TENT) continue;
    const r = (t / size) | 0;
    const c = t % size;
    const score =
      openIn(Array.from({ length: size }, (_, k) => r * size + k)) +
      openIn(Array.from({ length: size }, (_, k) => k * size + c));
    if (score < bestScore) {
      bestScore = score;
      bestCell = t;
    }
  }
  return bestCell === -1 ? null : { cell: bestCell, place: 'tent' };
}

/**
 * Auto-grass assist: cells to mark as grass because their row's or column's
 * tent count is already met by the player's tents. Purely rule-derived from
 * the visible clues (never peeks at the solution).
 */
export function autoGrassCells(board: TentsBoard, marks: ArrayLike<number>): number[] {
  const { size, rowCounts, colCounts } = board;
  const treeSet = new Set(board.trees);
  const out = new Set<number>();
  const sweep = (cells: number[], target: number) => {
    let tents = 0;
    for (const i of cells) if (marks[i] === TENT) tents++;
    if (tents !== target) return;
    for (const i of cells) if (!treeSet.has(i) && marks[i] === EMPTY) out.add(i);
  };
  for (let r = 0; r < size; r++) sweep(Array.from({ length: size }, (_, c) => r * size + c), rowCounts[r]);
  for (let c = 0; c < size; c++) sweep(Array.from({ length: size }, (_, r) => r * size + c), colCounts[c]);
  return [...out];
}
