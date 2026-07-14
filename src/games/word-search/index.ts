import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { WordSearchGame } from './WordSearchGame';
import { wordSearchTutorial } from './tutorial';

export const wordSearchDefinition: GameDefinition = {
  id: 'word-search',
  category: 'words',
  name: 'Word Search',
  tagline: 'Sweep the grid to find every hidden word.',
  icon: gameIcons['word-search'],
  component: WordSearchGame,
  tutorial: wordSearchTutorial,
  scoringNote:
    'Each found word scores 20 + 6 per letter, times the difficulty multiplier (1–5). Consecutive finds without a wrong drag add a +15×multiplier streak bonus; wrong drags count as errors and reset the streak; each hint costs 40 points. Solving the board adds 100×multiplier plus 1×multiplier per second under par (2/3/5/6/8 minutes). Extreme hides the word list behind length-only silhouettes.',
  assistFeatures: [
    {
      id: 'firstLetter',
      name: 'First letters',
      description:
        'Tints the first letter of every remaining word in its list color. Counts as help while enabled.',
      defaultOn: false
    },
    {
      id: 'directionLock',
      name: 'Direction arrows',
      description:
        'Shows arrows for the directions words can run at this difficulty. Counts as help while enabled.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Flash a word',
      description:
        'Briefly reveals the full path of one remaining word (−40 points). Counts as help when used.',
      defaultOn: true
    }
  ]
};
