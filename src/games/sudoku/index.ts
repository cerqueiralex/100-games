import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { SudokuGame } from './SudokuGame';
import { sudokuTutorial } from './tutorial';

export const sudokuDefinition: GameDefinition = {
  id: 'sudoku',
  category: 'logic',
  name: 'Sudoku',
  tagline: 'Fill the grid so every row, column and box has 1–9.',
  icon: gameIcons['sudoku'],
  component: SudokuGame,
  tutorial: sudokuTutorial,
  scoringNote:
    'Scoring: +50/75/100/125/150 points per correct cell (easy → extreme), −50 per error, −25 per hint. Finish under par time (8/15/25/35/45 min) for a time bonus. Pro and extreme boards start with fewer clues.',
  assistFeatures: [
    {
      id: 'smartHints',
      name: 'Smart hints',
      description: 'A hint button that fills a correct cell for you. Counts as help.',
      defaultOn: true
    },
    {
      id: 'errorLimit',
      name: 'Error limit',
      description: '3 errors and the game is over. A challenge, not a help.',
      defaultOn: true
    },
    {
      id: 'colorAssist',
      name: 'Rule out blocks',
      description:
        'Fades every 3×3 block that already contains the selected digit — no second copy fits there. The digits themselves stay bright. Counts as help.',
      defaultOn: true
    },
    {
      id: 'regionHighlight',
      name: 'Region highlight',
      description: 'Highlights the row, column and box of the selected cell. Counts as help.',
      defaultOn: true
    },
    {
      id: 'highlightSame',
      name: 'Highlight same numbers',
      description: 'Highlights every cell holding the same number as the selected cell. Counts as help.',
      defaultOn: true
    },
    {
      id: 'showPoints',
      name: 'Points',
      description: 'Shows your live score while playing.',
      defaultOn: true
    }
  ]
};
