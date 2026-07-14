/*
 * Tangram silhouettes — each is an authored solved arrangement of all seven
 * pieces (2 large + 1 medium + 2 small triangles, 1 square, 1 parallelogram).
 * The silhouette IS the union of these placements. Every arrangement here was
 * produced by an exact-cover tiler on the unit quarter-cell lattice, so it is
 * guaranteed to tile without gaps or overlaps; `npm run validate` re-checks
 * each one against `isSolved`. Coordinates are in small-triangle-leg units.
 */
import type { Difficulty } from '../../../platform/types';
import { type Placement, type Target, buildTarget } from './geometry';

export interface TangramPuzzle {
  id: string;
  name: string;
  /** the authored solved placement of each of the seven pieces */
  solution: Placement[];
}

const rectangle: TangramPuzzle = {
  id: 'rectangle',
  name: 'Rectangle',
  solution: [
    { kind: 'largeTri', rot: 0, flip: false, pos: { x: 0, y: 0 } },
    { kind: 'largeTri', rot: 2, flip: true, pos: { x: 2, y: 2 } },
    { kind: 'medTri', rot: 6, flip: false, pos: { x: 2, y: 2 } },
    { kind: 'smallTri', rot: 0, flip: true, pos: { x: 3, y: 0 } },
    { kind: 'parallelogram', rot: 0, flip: true, pos: { x: 4, y: 1 } },
    { kind: 'square', rot: 0, flip: false, pos: { x: 3, y: 0 } },
    { kind: 'smallTri', rot: 2, flip: true, pos: { x: 4, y: 2 } }
  ]
};

const triangle: TangramPuzzle = {
  id: 'triangle',
  name: 'Triangle',
  solution: [
    { kind: 'largeTri', rot: 4, flip: true, pos: { x: 0, y: 2 } },
    { kind: 'smallTri', rot: 0, flip: true, pos: { x: 1, y: 0 } },
    { kind: 'largeTri', rot: 0, flip: false, pos: { x: 0, y: 2 } },
    { kind: 'square', rot: 0, flip: false, pos: { x: 1, y: 0 } },
    { kind: 'medTri', rot: 0, flip: false, pos: { x: 1, y: 1 } },
    { kind: 'parallelogram', rot: 0, flip: true, pos: { x: 4, y: 0 } },
    { kind: 'smallTri', rot: 0, flip: false, pos: { x: 2, y: 0 } }
  ]
};

const house: TangramPuzzle = {
  id: 'house',
  name: 'House',
  solution: [
    { kind: 'largeTri', rot: 2, flip: true, pos: { x: 2, y: 2 } },
    { kind: 'medTri', rot: 4, flip: false, pos: { x: 2, y: 3 } },
    { kind: 'smallTri', rot: 0, flip: false, pos: { x: 0, y: 2 } },
    { kind: 'parallelogram', rot: 0, flip: false, pos: { x: 1, y: 2 } },
    { kind: 'largeTri', rot: 4, flip: true, pos: { x: 2, y: 2 } },
    { kind: 'smallTri', rot: 0, flip: true, pos: { x: 3, y: 2 } },
    { kind: 'square', rot: 0, flip: false, pos: { x: 3, y: 2 } }
  ]
};

const arrow: TangramPuzzle = {
  id: 'arrow',
  name: 'Arrow',
  solution: [
    { kind: 'largeTri', rot: 4, flip: true, pos: { x: 0, y: 2 } },
    { kind: 'smallTri', rot: 0, flip: true, pos: { x: 1, y: 2 } },
    { kind: 'square', rot: 0, flip: false, pos: { x: 1, y: 2 } },
    { kind: 'medTri', rot: 0, flip: false, pos: { x: 1, y: 3 } },
    { kind: 'largeTri', rot: 2, flip: true, pos: { x: 4, y: 2 } },
    { kind: 'parallelogram', rot: 0, flip: true, pos: { x: 4, y: 2 } },
    { kind: 'smallTri', rot: 0, flip: false, pos: { x: 2, y: 2 } }
  ]
};

const fish: TangramPuzzle = {
  id: 'fish',
  name: 'Fish',
  solution: [
    { kind: 'largeTri', rot: 0, flip: false, pos: { x: 0, y: 1 } },
    { kind: 'largeTri', rot: 2, flip: true, pos: { x: 2, y: 3 } },
    { kind: 'smallTri', rot: 4, flip: true, pos: { x: 2, y: 1 } },
    { kind: 'square', rot: 0, flip: false, pos: { x: 2, y: 1 } },
    { kind: 'parallelogram', rot: 2, flip: false, pos: { x: 3, y: 2 } },
    { kind: 'smallTri', rot: 0, flip: false, pos: { x: 2, y: 2 } },
    { kind: 'medTri', rot: 6, flip: false, pos: { x: 3, y: 3 } }
  ]
};

const rocket: TangramPuzzle = {
  id: 'rocket',
  name: 'Rocket',
  solution: [
    { kind: 'largeTri', rot: 2, flip: true, pos: { x: 2, y: 4 } },
    { kind: 'medTri', rot: 4, flip: false, pos: { x: 3, y: 1 } },
    { kind: 'largeTri', rot: 0, flip: false, pos: { x: 1, y: 1 } },
    { kind: 'smallTri', rot: 2, flip: true, pos: { x: 3, y: 2 } },
    { kind: 'square', rot: 0, flip: false, pos: { x: 2, y: 2 } },
    { kind: 'smallTri', rot: 4, flip: true, pos: { x: 2, y: 4 } },
    { kind: 'parallelogram', rot: 0, flip: false, pos: { x: 2, y: 3 } }
  ]
};

const diamond: TangramPuzzle = {
  id: 'diamond',
  name: 'Gem',
  solution: [
    { kind: 'largeTri', rot: 2, flip: true, pos: { x: 2, y: 2 } },
    { kind: 'largeTri', rot: 0, flip: true, pos: { x: 2, y: 2 } },
    { kind: 'smallTri', rot: 4, flip: true, pos: { x: 2, y: 1 } },
    { kind: 'square', rot: 0, flip: false, pos: { x: 2, y: 1 } },
    { kind: 'parallelogram', rot: 2, flip: false, pos: { x: 3, y: 2 } },
    { kind: 'smallTri', rot: 0, flip: false, pos: { x: 2, y: 2 } },
    { kind: 'medTri', rot: 6, flip: false, pos: { x: 3, y: 3 } }
  ]
};

const bird: TangramPuzzle = {
  id: 'bird',
  name: 'Bird',
  solution: [
    { kind: 'largeTri', rot: 2, flip: true, pos: { x: 2, y: 2 } },
    { kind: 'medTri', rot: 4, flip: false, pos: { x: 2, y: 3 } },
    { kind: 'smallTri', rot: 0, flip: false, pos: { x: 0, y: 2 } },
    { kind: 'largeTri', rot: 0, flip: true, pos: { x: 2, y: 3 } },
    { kind: 'parallelogram', rot: 0, flip: false, pos: { x: 1, y: 2 } },
    { kind: 'smallTri', rot: 0, flip: true, pos: { x: 3, y: 2 } },
    { kind: 'square', rot: 0, flip: false, pos: { x: 3, y: 2 } }
  ]
};

export const PUZZLES: Record<Difficulty, TangramPuzzle[]> = {
  easy: [rectangle, triangle],
  medium: [house, arrow],
  hard: [fish, rocket],
  pro: [diamond, bird],
  extreme: [bird, rocket, fish]
};

export function allPuzzles(): TangramPuzzle[] {
  const seen = new Set<string>();
  const out: TangramPuzzle[] = [];
  for (const list of Object.values(PUZZLES)) {
    for (const p of list) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

/** Pick a puzzle for a difficulty using a 0..1 random value. */
export function pickPuzzle(difficulty: Difficulty, r: number): TangramPuzzle {
  const list = PUZZLES[difficulty];
  return list[Math.floor(r * list.length) % list.length];
}

export function puzzleTarget(p: TangramPuzzle): Target {
  return buildTarget(p.solution);
}
