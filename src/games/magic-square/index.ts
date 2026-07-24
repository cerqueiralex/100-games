import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { MagicSquareGame } from './MagicSquareGame';
import { magicSquareTutorial } from './tutorial';
import { mastery } from './mastery';

export const magicSquareDefinition: GameDefinition = {
  id: 'magic-square',
  category: 'numbers',
  name: 'Magic Square',
  tagline: 'Place the numbers so every line sums the same.',
  icon: gameIcons['magic-square'],
  component: MagicSquareGame,
  tutorial: magicSquareTutorial,
  mastery,
  scoringNote:
    'Scoring: +25 per placed number × difficulty multiplier (1–5). Completing the square adds a 250 × multiplier win bonus plus an under-par time bonus (par 2–10 min by tier). Each completed line that breaks the magic sum costs 40; each hint costs 25. Picking a number back up removes its points, so only progress that stays on the board counts.',
  assistFeatures: [
    {
      id: 'lineSums',
      name: 'Line sums',
      description:
        'Shows each row, column and diagonal total in the margin, turning green when a full line hits the magic sum and red when it misses. Counts as help.',
      defaultOn: true
    },
    {
      id: 'targetGlow',
      name: 'Target glow',
      description:
        'Lights up an empty cell when only one number can legally complete its line — a nudge toward the next move. Counts as help.',
      defaultOn: false
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'A hint button that drops one correct number into the grid for you. Counts as help.',
      defaultOn: true
    }
  ]
};
