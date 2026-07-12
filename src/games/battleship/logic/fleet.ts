/** Fleet definitions, placement validation and random layouts. */

export const GRID = 10;

export interface ShipDef {
  id: string;
  name: string;
  size: number;
}

/** classic Hasbro fleet, largest first (nicer placement order) */
export const FLEET: ShipDef[] = [
  { id: 'carrier', name: 'Carrier', size: 5 },
  { id: 'battleship', name: 'Battleship', size: 4 },
  { id: 'cruiser', name: 'Cruiser', size: 3 },
  { id: 'submarine', name: 'Submarine', size: 3 },
  { id: 'destroyer', name: 'Destroyer', size: 2 }
];

export type Dir = 'h' | 'v';

/** one ship placed on the board (shipIdx indexes FLEET) */
export interface Placed {
  shipIdx: number;
  row: number;
  col: number;
  dir: Dir;
}

export const COLS = 'ABCDEFGHIJ';

/** board cell indices covered by a placement, or null if it runs off the board */
export function cellsOf(p: Placed): number[] | null {
  const size = FLEET[p.shipIdx].size;
  const cells: number[] = [];
  for (let k = 0; k < size; k++) {
    const r = p.dir === 'v' ? p.row + k : p.row;
    const c = p.dir === 'h' ? p.col + k : p.col;
    if (r >= GRID || c >= GRID) return null;
    cells.push(r * GRID + c);
  }
  return cells;
}

/** true when the placement fits and overlaps none of `occupied` */
export function canPlace(p: Placed, occupied: Set<number>): boolean {
  const cells = cellsOf(p);
  return cells !== null && cells.every((c) => !occupied.has(c));
}

/** all cells occupied by a set of placements */
export function occupiedBy(placements: Placed[]): Set<number> {
  const out = new Set<number>();
  for (const p of placements) for (const c of cellsOf(p) ?? []) out.add(c);
  return out;
}

/** random full-fleet layout (always succeeds — the board is roomy) */
export function randomFleet(): Placed[] {
  for (;;) {
    const placements: Placed[] = [];
    const occupied = new Set<number>();
    let ok = true;
    for (let s = 0; s < FLEET.length; s++) {
      let placed = false;
      for (let tries = 0; tries < 200; tries++) {
        const p: Placed = {
          shipIdx: s,
          row: Math.floor(Math.random() * GRID),
          col: Math.floor(Math.random() * GRID),
          dir: Math.random() < 0.5 ? 'h' : 'v'
        };
        if (canPlace(p, occupied)) {
          placements.push(p);
          for (const c of cellsOf(p)!) occupied.add(c);
          placed = true;
          break;
        }
      }
      if (!placed) {
        ok = false;
        break;
      }
    }
    if (ok) return placements;
  }
}

/** cells orthogonally/diagonally adjacent to a placement (for auto-water) */
export function surroundingCells(p: Placed): number[] {
  const cells = new Set(cellsOf(p) ?? []);
  const out = new Set<number>();
  for (const c of cells) {
    const r = Math.floor(c / GRID);
    const cc = c % GRID;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = cc + dc;
        if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
        const idx = nr * GRID + nc;
        if (!cells.has(idx)) out.add(idx);
      }
    }
  }
  return [...out];
}
