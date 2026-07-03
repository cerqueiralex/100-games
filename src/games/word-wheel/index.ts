import type { GameDefinition } from '../../platform/types';
import { WordWheelGame } from './WordWheelGame';
import { wordWheelTutorial } from './tutorial';

export const wordWheelDefinition: GameDefinition = {
  id: 'word-wheel',
  category: 'words',
  name: 'Word Wheel',
  tagline: 'Spell words from the letter wheel to fill the crossword.',
  icon: 'A◯',
  component: WordWheelGame,
  tutorial: wordWheelTutorial,
  scoringNote:
    'Scoring: +20/30/40 points per letter of every placed word (easy/medium/hard), −5 per wrong guess, −15 per revealed letter. Finish under par time (3/5/8 min) for a time bonus.',
  assistFeatures: [
    {
      id: 'revealLetter',
      name: 'Hint button',
      description: 'Reveals one letter in the grid (−15 points). Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'firstLetters',
      name: 'First letters',
      description: 'Shows the first letter of every word from the start. Counts as help.',
      defaultOn: false
    }
  ]
};
