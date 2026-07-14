/**
 * 2048 — pure sliding-merge engine. No React, fully importable so the
 * validator can exercise it headlessly.
 *
 * Grid encoding (flat `number[]`, length = size*size, row-major):
 *   0    empty cell
 *   >0   a numbered tile (always a power of two)
 *   -1   a BLOCKER: occupies a cell, slides like a tile, never merges
 *        (used by the extreme tier; auto-clears on a timer in the UI).
 */

export type Dir = 'up' | 'down' | 'left' | 'right';
export const ALL_DIRS: Dir[] = ['up', 'down', 'left', 'right'];

export const EMPTY = 0;
export const BLOCKER = -1;

export type RNG = () => number;

// ------------------------------------------------------------------
// Shared line resolver — the heart of a slide. Given the occupied cells
// of one line ordered from the destination wall outward, it packs them
// toward the wall and merges equal *positive* neighbours (once each).
// ------------------------------------------------------------------

interface LineEntry {
  value: number;
  id: number;
}

interface LineOut {
  value: number;
  isMerge: boolean;
}

function resolveLine(entries: LineEntry[]): LineOut[] {
  const out: LineOut[] = [];
  let i = 0;
  while (i < entries.length) {
    const cur = entries[i];
    const nxt = entries[i + 1];
    // only real numbers merge; a blocker (-1) never satisfies this
    if (cur.value > 0 && nxt && nxt.value === cur.value) {
      out.push({ value: cur.value * 2, isMerge: true });
      i += 2;
    } else {
      out.push({ value: cur.value, isMerge: false });
      i += 1;
    }
  }
  return out;
}

/** Flat indices of one line, ordered from the destination wall outward. */
function lineIndices(size: number, dir: Dir): number[][] {
  const lines: number[][] = [];
  for (let a = 0; a < size; a++) {
    const line: number[] = [];
    for (let b = 0; b < size; b++) {
      let r: number;
      let c: number;
      if (dir === 'left') {
        r = a;
        c = b;
      } else if (dir === 'right') {
        r = a;
        c = size - 1 - b;
      } else if (dir === 'up') {
        c = a;
        r = b;
      } else {
        // down
        c = a;
        r = size - 1 - b;
      }
      line.push(r * size + c);
    }
    lines.push(line);
  }
  return lines;
}

export const gridSize = (grid: number[]): number => Math.round(Math.sqrt(grid.length));

export interface SlideResult {
  grid: number[];
  /** did anything change position or value? */
  moved: boolean;
  /** sum of the values of tiles created by merges this move (score gain) */
  gained: number;
  /** flat indices in the NEW grid where a merge landed */
  merges: number[];
}

/** Pure grid slide — the canonical, test-covered move. */
export function slide(grid: number[], dir: Dir): SlideResult {
  const size = gridSize(grid);
  const next = new Array<number>(grid.length).fill(EMPTY);
  let gained = 0;
  const merges: number[] = [];
  for (const line of lineIndices(size, dir)) {
    const entries: LineEntry[] = [];
    for (const idx of line) {
      if (grid[idx] !== EMPTY) entries.push({ value: grid[idx], id: idx });
    }
    const out = resolveLine(entries);
    for (let k = 0; k < out.length; k++) {
      const destIdx = line[k];
      next[destIdx] = out[k].value;
      if (out[k].isMerge) {
        gained += out[k].value;
        merges.push(destIdx);
      }
    }
  }
  let moved = false;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== next[i]) {
      moved = true;
      break;
    }
  }
  return { grid: next, moved, gained, merges };
}

export function emptyCells(grid: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < grid.length; i++) if (grid[i] === EMPTY) out.push(i);
  return out;
}

export interface SpawnResult {
  grid: number[];
  index: number;
  value: number;
}

/** Drop a fresh 2 (or 4 with probability `fourChance`) into a random empty cell. */
export function spawn(grid: number[], rng: RNG, fourChance = 0.1): SpawnResult | null {
  const empties = emptyCells(grid);
  if (empties.length === 0) return null;
  const index = empties[Math.floor(rng() * empties.length)];
  const value = rng() < fourChance ? 4 : 2;
  const g = grid.slice();
  g[index] = value;
  return { grid: g, index, value };
}

/** Is any legal move available? (an empty cell, or an adjacent equal pair) */
export function hasMoves(grid: number[]): boolean {
  const size = gridSize(grid);
  for (let i = 0; i < grid.length; i++) if (grid[i] === EMPTY) return true;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = grid[r * size + c];
      if (v <= 0) continue; // empty or blocker: not mergeable
      if (c + 1 < size && grid[r * size + c + 1] === v) return true;
      if (r + 1 < size && grid[(r + 1) * size + c] === v) return true;
    }
  }
  return false;
}

/** Largest numbered tile currently on the grid (0 if none). */
export function maxTile(grid: number[]): number {
  let m = 0;
  for (const v of grid) if (v > m) m = v;
  return m;
}

// ------------------------------------------------------------------
// Tile-model slide — same algorithm, but preserves tile identity so the
// UI can animate each tile translating to its new cell. Kept here (pure,
// no React) alongside the grid API it mirrors.
// ------------------------------------------------------------------

export interface Tile {
  id: number;
  value: number; // >0 number, or BLOCKER
  r: number;
  c: number;
  ttl?: number; // blocker countdown (moves until it clears)
  isNew?: boolean; // spawned this move → scale-in
  merged?: boolean; // merge result this move → pop
  removing?: boolean; // absorbed tile, kept one frame to slide into its mate
}

export interface SlideTilesResult {
  /** survivors (at new cells) + the absorbed tiles flagged `removing` */
  tiles: Tile[];
  moved: boolean;
  gained: number;
  mergeCount: number;
}

export function tilesToGrid(tiles: Tile[], size: number): number[] {
  const g = new Array<number>(size * size).fill(EMPTY);
  for (const t of tiles) g[t.r * size + t.c] = t.value;
  return g;
}

export function slideTiles(tiles: Tile[], size: number, dir: Dir): SlideTilesResult {
  const cellTile: (Tile | null)[] = new Array(size * size).fill(null);
  for (const t of tiles) cellTile[t.r * size + t.c] = t;

  const result: Tile[] = [];
  let gained = 0;
  let mergeCount = 0;
  let moved = false;

  for (const line of lineIndices(size, dir)) {
    const entries: LineEntry[] = [];
    const entryTiles: Tile[] = [];
    for (const idx of line) {
      const t = cellTile[idx];
      if (t) {
        entries.push({ value: t.value, id: t.id });
        entryTiles.push(t);
      }
    }
    const out = resolveLine(entries);
    let consumed = 0;
    for (let k = 0; k < out.length; k++) {
      const o = out[k];
      const destIdx = line[k];
      const dr = Math.floor(destIdx / size);
      const dc = destIdx % size;
      const primary = entryTiles[consumed];
      if (o.isMerge) {
        const absorbed = entryTiles[consumed + 1];
        consumed += 2;
        result.push({ ...primary, value: o.value, r: dr, c: dc, merged: true, isNew: false, removing: false });
        result.push({ ...absorbed, r: dr, c: dc, removing: true, merged: false, isNew: false });
        gained += o.value;
        mergeCount++;
      } else {
        consumed += 1;
        result.push({ ...primary, r: dr, c: dc, merged: false, isNew: false, removing: false });
      }
      if (primary.r !== dr || primary.c !== dc) moved = true;
    }
  }
  if (mergeCount > 0) moved = true;
  return { tiles: result, moved, gained, mergeCount };
}

/**
 * Rate the four moves and return the strongest legal direction (or null if
 * the board is stuck). Used by the Hint assist — prefers the move that
 * merges the most, then frees the most cells.
 */
export function bestMove(grid: number[]): Dir | null {
  let best: Dir | null = null;
  let bestScore = -1;
  for (const dir of ALL_DIRS) {
    const res = slide(grid, dir);
    if (!res.moved) continue;
    const empties = emptyCells(res.grid).length;
    const score = res.gained * 100 + res.merges.length * 20 + empties;
    if (score > bestScore) {
      bestScore = score;
      best = dir;
    }
  }
  return best;
}
