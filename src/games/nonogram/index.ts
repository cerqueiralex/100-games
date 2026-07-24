import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { NonogramGame } from './NonogramGame';
import { nonogramTutorial } from './tutorial';
import { mastery } from './mastery';

export const nonogramDefinition: GameDefinition = {
  id: 'nonogram',
  category: 'logic',
  name: 'Nonograms',
  tagline: 'Shade cells from the number clues to reveal a hidden picture.',
  icon: gameIcons['nonogram'],
  component: NonogramGame,
  tutorial: nonogramTutorial,
  mastery,
  scoringNote:
    'Boards from 5×5 up to 15×15, always solvable without guessing. +4 per cell of the finished picture × difficulty (1–5), −20 per flagged error, −30 per hint, plus a time bonus under par (2/4/6/9/13 min).',
  assistFeatures: [
    {
      id: 'mistakes',
      name: 'Error check',
      description: 'Filled cells that contradict the solution turn red and count as errors. Counts as help.',
      defaultOn: true
    },
    {
      id: 'autocross',
      name: 'Auto-cross',
      description: 'When a row or column is fully satisfied, its remaining cells are crossed out automatically. Counts as help.',
      defaultOn: false
    },
    {
      id: 'hint',
      name: 'Hint button',
      description: 'Reveals one correct cell in the most constrained line (−30). Counts as help when used.',
      defaultOn: true
    }
  ]
};
