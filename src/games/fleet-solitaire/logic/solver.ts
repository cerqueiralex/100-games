/**
 * Fleet Finder — deduction engine. Two layers:
 *
 * 1. `propagateFix` — sound constraint propagation to a fixpoint:
 *    row/column count forcing, no-touch (diagonal) water, revealed-segment
 *    shape forcing, and fleet/run reasoning (finished ships consume fleet
 *    entries; unknowns that would grow a run beyond the largest remaining
 *    ship become water). Every deduction holds in EVERY solution, so a
 *    grid fully decided by propagation alone is provably unique AND
 *    guess-free — the invariant easy/medium puzzles are generated under.
 *
 * 2. `countSolutions` — propagation-guided backtracking that counts
 *    solutions up to a cap (2 is enough to prove uniqueness), used for
 *    the hard/pro/extreme tiers and by `npm run validate`.
 */

import {
  SHIP,
  UNKNOWN,
  WATER,
  runSizes,
  shapeFrom,
  solutionShape,
  type FleetPuzzle
} from './board';

/** solver grid seeded with the puzzle's revealed cells */
export function initialState(puzzle: FleetPuzzle): Int8Array {
  const state = new Int8Array(puzzle.size * puzzle.size);
  for (const rv of puzzle.reveals) state[rv.cell] = rv.ship ? SHIP : WATER;
  return state;
}

/** multiset difference helper: fleet sizes minus finished-run sizes */
function remainingFleet(fleet: number[], finished: number[]): number[] | null {
  const pool = [...fleet];
  for (const s of finished) {
    const at = pool.indexOf(s);
    if (at === -1) return null; // a finished ship the fleet doesn't contain
    pool.splice(at, 1);
  }
  return pool;
}

/**
 * Propagate all constraints to a fixpoint. Mutates `state`; returns false
 * on contradiction. Sound: only deductions valid in every completion.
 */
export function propagateFix(state: Int8Array, puzzle: FleetPuzzle): boolean {
  const { size, fleet, rowCounts, colCounts, solution, reveals } = puzzle;
  const n = size * size;
  const maxShip = Math.max(...fleet);
  let changed = true;
  let ok = true;

  const set = (i: number, v: number) => {
    if (state[i] === v) return;
    if (state[i] !== UNKNOWN) {
      ok = false;
      return;
    }
    state[i] = v;
    changed = true;
  };
  const at = (r: number, c: number) => (r < 0 || r >= size || c < 0 || c >= size ? WATER : state[r * size + c]);
  const setAt = (r: number, c: number, v: number) => {
    if (r >= 0 && r < size && c >= 0 && c < size) set(r * size + c, v);
    else if (v === SHIP) ok = false; // a forced ship cell off the board
  };

  while (changed && ok) {
    changed = false;

    // --- revealed ship segments force their exact shape -----------------
    for (const rv of reveals) {
      if (!ok) break;
      if (!rv.ship) {
        set(rv.cell, WATER);
        continue;
      }
      set(rv.cell, SHIP);
      const r = (rv.cell / size) | 0;
      const c = rv.cell % size;
      const shape = solutionShape(solution, size, rv.cell);
      if (shape === 'single') {
        setAt(r, c - 1, WATER);
        setAt(r, c + 1, WATER);
        setAt(r - 1, c, WATER);
        setAt(r + 1, c, WATER);
      } else if (shape === 'left') {
        setAt(r, c + 1, SHIP);
        setAt(r, c - 1, WATER);
        setAt(r - 1, c, WATER);
        setAt(r + 1, c, WATER);
      } else if (shape === 'right') {
        setAt(r, c - 1, SHIP);
        setAt(r, c + 1, WATER);
        setAt(r - 1, c, WATER);
        setAt(r + 1, c, WATER);
      } else if (shape === 'up') {
        setAt(r + 1, c, SHIP);
        setAt(r - 1, c, WATER);
        setAt(r, c - 1, WATER);
        setAt(r, c + 1, WATER);
      } else if (shape === 'down') {
        setAt(r - 1, c, SHIP);
        setAt(r + 1, c, WATER);
        setAt(r, c - 1, WATER);
        setAt(r, c + 1, WATER);
      } else {
        // middle piece: the axis may still be open — infer what we can
        const hPossible = at(r, c - 1) !== WATER && at(r, c + 1) !== WATER;
        const vPossible = at(r - 1, c) !== WATER && at(r + 1, c) !== WATER;
        const hKnown = at(r, c - 1) === SHIP || at(r, c + 1) === SHIP;
        const vKnown = at(r - 1, c) === SHIP || at(r + 1, c) === SHIP;
        if ((!hPossible && !vPossible) || (hKnown && vKnown)) {
          ok = false;
        } else if (hKnown || !vPossible) {
          setAt(r, c - 1, SHIP);
          setAt(r, c + 1, SHIP);
          setAt(r - 1, c, WATER);
          setAt(r + 1, c, WATER);
        } else if (vKnown || !hPossible) {
          setAt(r - 1, c, SHIP);
          setAt(r + 1, c, SHIP);
          setAt(r, c - 1, WATER);
          setAt(r, c + 1, WATER);
        }
      }
    }
    if (!ok) return false;

    // --- ships water all their diagonal neighbours ----------------------
    for (let i = 0; i < n; i++) {
      if (state[i] !== SHIP) continue;
      const r = (i / size) | 0;
      const c = i % size;
      setAt(r - 1, c - 1, WATER);
      setAt(r - 1, c + 1, WATER);
      setAt(r + 1, c - 1, WATER);
      setAt(r + 1, c + 1, WATER);
      // perpendicular contact is impossible (it implies diagonal contact)
      if ((at(r, c - 1) === SHIP || at(r, c + 1) === SHIP) && (at(r - 1, c) === SHIP || at(r + 1, c) === SHIP)) {
        ok = false;
      }
    }
    if (!ok) return false;

    // --- row/column count forcing ---------------------------------------
    for (let axis = 0; axis < 2 && ok; axis++) {
      for (let a = 0; a < size; a++) {
        const target = axis === 0 ? rowCounts[a] : colCounts[a];
        let ships = 0;
        let unknowns = 0;
        for (let b = 0; b < size; b++) {
          const i = axis === 0 ? a * size + b : b * size + a;
          if (state[i] === SHIP) ships++;
          else if (state[i] === UNKNOWN) unknowns++;
        }
        if (ships > target || ships + unknowns < target) {
          ok = false;
          break;
        }
        if (unknowns === 0) continue;
        if (ships === target) {
          for (let b = 0; b < size; b++) {
            const i = axis === 0 ? a * size + b : b * size + a;
            if (state[i] === UNKNOWN) set(i, WATER);
          }
        } else if (ships + unknowns === target) {
          for (let b = 0; b < size; b++) {
            const i = axis === 0 ? a * size + b : b * size + a;
            if (state[i] === UNKNOWN) set(i, SHIP);
          }
        }
      }
    }
    if (!ok) return false;

    // --- fleet/run reasoning ---------------------------------------------
    // finished ships (sealed on every side by water/border) consume fleet
    // entries; open runs and potential extensions are capped by the
    // largest ship still afloat.
    const isShip = (i: number) => state[i] === SHIP;
    const finished: number[] = [];
    const open: number[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const i = r * size + c;
        if (!isShip(i)) continue;
        const shape = shapeFrom(isShip, size, i);
        if (shape === 'single') {
          const s = [at(r, c - 1), at(r, c + 1), at(r - 1, c), at(r + 1, c)];
          if (s.every((v) => v === WATER)) finished.push(1);
          else open.push(1);
        } else if (shape === 'left' || shape === 'up') {
          const dr = shape === 'up' ? 1 : 0;
          const dc = shape === 'left' ? 1 : 0;
          let len = 1;
          while (at(r + dr * len, c + dc * len) === SHIP) len++;
          const before = at(r - dr, c - dc);
          const after = at(r + dr * len, c + dc * len);
          if (before === WATER && after === WATER) finished.push(len);
          else open.push(len);
        }
      }
    }
    if (open.some((len) => len > maxShip)) return false;
    const remaining = remainingFleet(fleet, finished);
    if (remaining === null) return false;
    const maxRemaining = remaining.length > 0 ? Math.max(...remaining) : 0;
    if (open.some((len) => len > maxRemaining)) return false;
    if (maxRemaining === 0) {
      for (let i = 0; i < n; i++) if (state[i] === UNKNOWN) set(i, WATER);
    } else {
      // an unknown that would join runs into something longer than the
      // largest remaining ship (or would weld two perpendicular runs)
      // must be water
      for (let i = 0; i < n; i++) {
        if (state[i] !== UNKNOWN) continue;
        const r = (i / size) | 0;
        const c = i % size;
        let hJoin = 1;
        for (let k = 1; at(r, c - k) === SHIP; k++) hJoin++;
        for (let k = 1; at(r, c + k) === SHIP; k++) hJoin++;
        let vJoin = 1;
        for (let k = 1; at(r - k, c) === SHIP; k++) vJoin++;
        for (let k = 1; at(r + k, c) === SHIP; k++) vJoin++;
        if (hJoin > 1 && vJoin > 1) set(i, WATER);
        else if (Math.max(hJoin, vJoin) > maxRemaining) set(i, WATER);
      }
    }
  }
  return ok;
}

/** true when every cell is decided */
export function allDecided(state: Int8Array): boolean {
  for (let i = 0; i < state.length; i++) if (state[i] === UNKNOWN) return false;
  return true;
}

/** full-grid validity: counts, no-touch, exact fleet, reveal shapes */
export function validFull(state: Int8Array, puzzle: FleetPuzzle): boolean {
  const { size, fleet, rowCounts, colCounts, solution, reveals } = puzzle;
  const isShip = (i: number) => state[i] === SHIP;
  for (let r = 0; r < size; r++) {
    let ships = 0;
    for (let c = 0; c < size; c++) if (isShip(r * size + c)) ships++;
    if (ships !== rowCounts[r]) return false;
  }
  for (let c = 0; c < size; c++) {
    let ships = 0;
    for (let r = 0; r < size; r++) if (isShip(r * size + c)) ships++;
    if (ships !== colCounts[c]) return false;
  }
  for (let i = 0; i < size * size; i++) {
    if (!isShip(i)) continue;
    const r = (i / size) | 0;
    const c = i % size;
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && isShip(nr * size + nc)) return false;
    }
  }
  const runs = runSizes(isShip, size).sort((a, b) => b - a);
  const want = [...fleet].sort((a, b) => b - a);
  if (runs.length !== want.length || runs.some((v, k) => v !== want[k])) return false;
  for (const rv of reveals) {
    if (!rv.ship) {
      if (state[rv.cell] !== WATER) return false;
    } else {
      if (state[rv.cell] !== SHIP) return false;
      if (shapeFrom(isShip, size, rv.cell) !== solutionShape(solution, size, rv.cell)) return false;
    }
  }
  return true;
}

/**
 * Does propagation alone fully decide the grid (and reproduce the known
 * solution)? Success proves uniqueness AND guess-free solvability.
 */
export function propagationSolves(puzzle: FleetPuzzle): boolean {
  const state = initialState(puzzle);
  if (!propagateFix(state, puzzle)) return false;
  if (!allDecided(state)) return false;
  for (let i = 0; i < state.length; i++) {
    if ((state[i] === SHIP) !== (puzzle.solution[i] === 1)) return false;
  }
  return validFull(state, puzzle);
}

/** pick the unknown cell in the tightest line (highest need density) */
function pickBranchCell(state: Int8Array, puzzle: FleetPuzzle): number {
  const { size, rowCounts, colCounts } = puzzle;
  let best = -1;
  let bestScore = -1;
  for (let axis = 0; axis < 2; axis++) {
    for (let a = 0; a < size; a++) {
      const target = axis === 0 ? rowCounts[a] : colCounts[a];
      let ships = 0;
      let unknowns = 0;
      let firstUnknown = -1;
      for (let b = 0; b < size; b++) {
        const i = axis === 0 ? a * size + b : b * size + a;
        if (state[i] === SHIP) ships++;
        else if (state[i] === UNKNOWN) {
          unknowns++;
          if (firstUnknown === -1) firstUnknown = i;
        }
      }
      const need = target - ships;
      if (unknowns === 0 || need <= 0) continue;
      const score = need / unknowns;
      if (score > bestScore) {
        bestScore = score;
        best = firstUnknown;
      }
    }
  }
  if (best !== -1) return best;
  for (let i = 0; i < state.length; i++) if (state[i] === UNKNOWN) return i;
  return -1;
}

/**
 * Count solutions up to `cap` with propagation-guided backtracking.
 * Returns -1 when the node budget is exhausted (callers treat that
 * conservatively). Found solutions are pushed into `collect` (≤ cap).
 */
export function countSolutions(
  puzzle: FleetPuzzle,
  cap = 2,
  nodeBudget = 150_000,
  collect?: Int8Array[]
): number {
  let nodes = 0;
  let blown = false;

  const dfs = (state: Int8Array): number => {
    if (blown) return 0;
    if (++nodes > nodeBudget) {
      blown = true;
      return 0;
    }
    if (!propagateFix(state, puzzle)) return 0;
    const cell = pickBranchCell(state, puzzle);
    if (cell === -1) {
      if (!validFull(state, puzzle)) return 0;
      collect?.push(state.slice());
      return 1;
    }
    let total = 0;
    for (const v of [SHIP, WATER]) {
      const next = state.slice();
      next[cell] = v;
      total += dfs(next);
      if (total >= cap || blown) break;
    }
    return total;
  };

  const found = dfs(initialState(puzzle));
  return blown ? -1 : found;
}
