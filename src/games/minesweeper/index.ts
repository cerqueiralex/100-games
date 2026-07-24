import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { MinesweeperGame } from './MinesweeperGame';
import { minesweeperTutorial } from './tutorial';
import { mastery } from './mastery';

export const minesweeperDefinition: GameDefinition = {
  id: 'minesweeper',
  category: 'logic',
  name: 'Minesweeper',
  tagline: 'Read the numbers, flag the mines, clear the field.',
  icon: gameIcons['minesweeper'],
  component: MinesweeperGame,
  tutorial: minesweeperTutorial,
  mastery,
  scoringNote:
    'Clear all safe cells on boards from 8×8 with 8 mines up to 16×16 with 58 on extreme. +5 per cleared cell × difficulty, +20 per mine × difficulty on a win, time bonus under par (2/4/7/10/14 min). One mine ends the game.',
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
