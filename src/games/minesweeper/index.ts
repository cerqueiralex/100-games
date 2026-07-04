import type { GameDefinition } from '../../platform/types';
import { MinesweeperGame } from './MinesweeperGame';
import { minesweeperTutorial } from './tutorial';

export const minesweeperDefinition: GameDefinition = {
  id: 'minesweeper',
  category: 'logic',
  name: 'Minesweeper',
  tagline: 'Read the numbers, flag the mines, clear the field.',
  icon: '⚑',
  component: MinesweeperGame,
  tutorial: minesweeperTutorial,
  scoringNote:
    'Clear all safe cells on an 8×8/10×10/12×12 board with 8/16/26 mines. +5 per cleared cell × difficulty, +20 per mine × difficulty on a win, time bonus under par (2/4/7 min). One mine ends the game.',
  assistFeatures: [
    {
      id: 'safeFirst',
      name: 'Protected start',
      description: 'Your first tap is never a mine and opens some space. Counts as help.',
      defaultOn: true
    },
    {
      id: 'hintSafe',
      name: 'Safe cell button',
      description: 'Reveals one guaranteed-safe cell (−25). Counts as help when used.',
      defaultOn: true
    }
  ]
};
