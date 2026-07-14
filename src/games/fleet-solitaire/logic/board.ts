/**
 * Fleet Finder — shared board primitives. Pure TS (no React) so the
 * generator/solver can be validated headlessly.
 *
 * A puzzle hides a fleet of straight 1×k ships in a square grid. Ships
 * never touch each other, not even diagonally (which also forces every
 * connected ship group to be a straight segment). Row/column counts give
 * the number of ship cells in each line; a few revealed cells (water, or
 * ship segments with their exact shape) complete the clues.
 */

/** player/solver cell states */
export const UNKNOWN = 0;
export const WATER = 1;
export const SHIP = 2;

/**
 * How a ship segment looks, derived from its orthogonal ship neighbours:
 * 'left' = left end cap of a horizontal ship (continues right), 'up' =
 * top cap of a vertical ship, 'hmid'/'vmid' = horizontal/vertical middle
 * piece, 'single' = 1-cell ship. ('mid' without axis is treated as hmid.)
 */
export type SegShape = 'single' | 'left' | 'right' | 'up' | 'down' | 'hmid' | 'vmid';

/** a cell revealed at start — water, or a ship segment (exact shape shown) */
export interface Reveal {
  cell: number;
  ship: boolean;
}

export interface FleetPuzzle {
  size: number;
  /** ship sizes, descending, e.g. [4,3,3,2,2,2,1,1,1,1] */
  fleet: number[];
  /** 0 water / 1 ship per cell, length size*size */
  solution: number[];
  rowCounts: number[];
  colCounts: number[];
  reveals: Reveal[];
  seed: number;
}

/** segment shape at `i` given a ship predicate (invalid contact ⇒ 'mid') */
export function shapeFrom(isShip: (i: number) => boolean, size: number, i: number): SegShape {
  const r = (i / size) | 0;
  const c = i % size;
  const left = c > 0 && isShip(i - 1);
  const right = c < size - 1 && isShip(i + 1);
  const up = r > 0 && isShip(i - size);
  const down = r < size - 1 && isShip(i + size);
  // a well-formed straight segment has neighbours on only one axis; if a
  // malformed (junction) cell has both, treat it as a horizontal middle
  if ((left || right) && (up || down)) return 'hmid';
  if (left && right) return 'hmid';
  if (up && down) return 'vmid';
  if (right) return 'left';
  if (left) return 'right';
  if (down) return 'up';
  if (up) return 'down';
  return 'single';
}

/** shape of a solution ship cell (solution uses 0/1) */
export function solutionShape(solution: number[], size: number, i: number): SegShape {
  return shapeFrom((j) => solution[j] === 1, size, i);
}

/** sizes of all maximal ship runs under `isShip` (singles are length 1) */
export function runSizes(isShip: (i: number) => boolean, size: number): number[] {
  const out: number[] = [];
  // horizontal runs of length ≥ 2
  for (let r = 0; r < size; r++) {
    let len = 0;
    for (let c = 0; c <= size; c++) {
      if (c < size && isShip(r * size + c)) len++;
      else {
        if (len >= 2) out.push(len);
        len = 0;
      }
    }
  }
  // vertical runs of length ≥ 2
  for (let c = 0; c < size; c++) {
    let len = 0;
    for (let r = 0; r <= size; r++) {
      if (r < size && isShip(r * size + c)) len++;
      else {
        if (len >= 2) out.push(len);
        len = 0;
      }
    }
  }
  // singles: ship cells with no orthogonal ship neighbour
  for (let i = 0; i < size * size; i++) {
    if (isShip(i) && shapeFrom(isShip, size, i) === 'single') out.push(1);
  }
  return out;
}

/**
 * Sizes of the player's *finished* ships: maximal straight runs of SHIP
 * marks whose every surrounding cell is marked water (or the border) —
 * i.e. runs the player has fully sealed off. Used by the fleet inventory
 * panel to check silhouettes off, and by the solver's fleet reasoning.
 */
export function closedRunSizes(state: ArrayLike<number>, size: number): number[] {
  const isShip = (i: number) => state[i] === SHIP;
  const sealed = (r: number, c: number) => r < 0 || r >= size || c < 0 || c >= size || state[r * size + c] === WATER;
  const out: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const i = r * size + c;
      if (!isShip(i)) continue;
      const shape = shapeFrom(isShip, size, i);
      if (shape === 'single') {
        if (sealed(r - 1, c) && sealed(r + 1, c) && sealed(r, c - 1) && sealed(r, c + 1)) out.push(1);
      } else if (shape === 'left') {
        // walk the horizontal run from its left cap
        let len = 1;
        while (c + len < size && isShip(i + len)) len++;
        if (sealed(r, c - 1) && sealed(r, c + len) && sealed(r - 1, c) && sealed(r + 1, c)) {
          // ends sealed — a straight run's flanks are sealed by the caller's
          // marks only if the player watered them; require the full hull
          let hull = true;
          for (let k = 0; k < len && hull; k++) {
            if (!sealed(r - 1, c + k) || !sealed(r + 1, c + k)) hull = false;
          }
          if (hull) out.push(len);
        }
      } else if (shape === 'up') {
        let len = 1;
        while (r + len < size && isShip(i + len * size)) len++;
        if (sealed(r - 1, c) && sealed(r + len, c)) {
          let hull = true;
          for (let k = 0; k < len && hull; k++) {
            if (!sealed(r + k, c - 1) || !sealed(r + k, c + 1)) hull = false;
          }
          if (hull) out.push(len);
        }
      }
    }
  }
  return out;
}

/**
 * The auto-water assist: one sound pass of "free" water — lines whose ship
 * count is already met get their unknowns watered, and every cell touching
 * a ship diagonally becomes water. Only UNKNOWN cells are converted (marks
 * and reveals are never overwritten). Returns true when anything changed.
 */
export function applyAutoWater(grid: number[], puzzle: FleetPuzzle): boolean {
  const { size, rowCounts, colCounts } = puzzle;
  let changed = false;
  const water = (i: number) => {
    if (grid[i] === UNKNOWN) {
      grid[i] = WATER;
      changed = true;
    }
  };
  for (let r = 0; r < size; r++) {
    let ships = 0;
    for (let c = 0; c < size; c++) if (grid[r * size + c] === SHIP) ships++;
    if (ships === rowCounts[r]) for (let c = 0; c < size; c++) water(r * size + c);
  }
  for (let c = 0; c < size; c++) {
    let ships = 0;
    for (let r = 0; r < size; r++) if (grid[r * size + c] === SHIP) ships++;
    if (ships === colCounts[c]) for (let r = 0; r < size; r++) water(r * size + c);
  }
  for (let i = 0; i < size * size; i++) {
    if (grid[i] !== SHIP) continue;
    const r = (i / size) | 0;
    const c = i % size;
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) water(nr * size + nc);
    }
  }
  return changed;
}
