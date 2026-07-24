import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { KillerSudokuGame } from './KillerSudokuGame';
import { killerSudokuTutorial } from './tutorial';
import { mastery } from './mastery';

export const killerSudokuDefinition: GameDefinition = {
  id: 'killer-sudoku',
  category: 'logic',
  name: 'Killer Sudoku',
  tagline: 'Sudoku with dotted sum cages — and barely any givens.',
  icon: gameIcons['killer-sudoku'],
  component: KillerSudokuGame,
  tutorial: killerSudokuTutorial,
  mastery,
  scoringNote:
    'Scoring: +30/60/90/120/150 points per correct cell (easy → extreme), −50 per error, −30 per hint. Finish under par time (10/20/30/40/50 min) for a time bonus. Hard starts with 8 givens; pro and extreme have none — the cage sums are everything.',
  assistFeatures: [
    {
      id: 'cage-check',
      name: 'Cage check',
      description:
        'Flags every completed cage: green when the sum works with no repeats, red when it does not. Counts as help.',
      defaultOn: true
    },
    {
      id: 'dupes',
      name: 'Duplicate highlight',
      description:
        'Highlights digits that repeat in a row, column, box or cage. Counts as help.',
      defaultOn: true
    },
    {
      id: 'auto-notes',
      name: 'Tidy notes',
      description:
        'Placing a digit sweeps matching pencil marks from its row, column, box and cage. Counts as help.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hints',
      description: 'A hint button that fills one correct cell for you. Counts as help.',
      defaultOn: true
    }
  ]
};
