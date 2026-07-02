import type { GameDefinition } from './types';
import { sudokuDefinition } from '../games/sudoku';
import { crosswordDefinition } from '../games/crossword';
import { memoryMatchDefinition } from '../games/memory-match';
import { simonDefinition } from '../games/simon';
import { nBackDefinition } from '../games/nback';
import { dualNBackDefinition } from '../games/dual-nback';
import { wordWheelDefinition } from '../games/word-wheel';
import { numberMergeDefinition } from '../games/number-merge';
import { colorConnectDefinition } from '../games/color-connect';
import { ticTacToeDefinition } from '../games/tic-tac-toe';
import { imagePuzzleDefinition } from '../games/image-puzzle';
import { mazeDefinition } from '../games/maze';
import { cryptogramDefinition } from '../games/cryptogram';
import { minesweeperDefinition } from '../games/minesweeper';

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
  wordWheelDefinition,
  memoryMatchDefinition,
  simonDefinition,
  nBackDefinition,
  dualNBackDefinition,
  numberMergeDefinition,
  colorConnectDefinition,
  ticTacToeDefinition,
  imagePuzzleDefinition,
  mazeDefinition,
  cryptogramDefinition,
  minesweeperDefinition
];

export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}
