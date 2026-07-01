import type { GameDefinition } from './types';
import { sudokuDefinition } from '../games/sudoku';
import { crosswordDefinition } from '../games/crossword';
import { memoryMatchDefinition } from '../games/memory-match';
import { simonDefinition } from '../games/simon';
import { nBackDefinition } from '../games/nback';
import { dualNBackDefinition } from '../games/dual-nback';

/**
 * Central game registry. To add a new game to the platform:
 *  1. Create a folder under src/games/<id>/ with all its logic and UI.
 *  2. Export a GameDefinition from src/games/<id>/index.ts.
 *  3. Add it to this list. Difficulty selection, timing, scoring history,
 *     statistics, assist tracking and settings all come for free.
 */
export const GAMES: GameDefinition[] = [
  sudokuDefinition,
  crosswordDefinition,
  memoryMatchDefinition,
  simonDefinition,
  nBackDefinition,
  dualNBackDefinition
];

export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}
