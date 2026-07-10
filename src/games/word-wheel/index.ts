import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { WordWheelGame } from './WordWheelGame';
import { wordWheelTutorial } from './tutorial';

export const wordWheelDefinition: GameDefinition = {
  id: 'word-wheel',
  category: 'words',
  name: 'Word Wheel',
  tagline: 'Spell words from the letter wheel — crossword or word hunt.',
  icon: gameIcons['word-wheel'],
  component: WordWheelGame,
  tutorial: wordWheelTutorial,
  scoringNote:
    'Two modes: fill the criss-cross grid, or hunt every hidden word on a random wheel (each uses the center letter; bigger wheels on higher difficulty). +20/30/40 points per letter of every word (easy/medium/hard), −5 per wrong guess, −15 per hint. Finish under par time (3/5/8 min) for a bonus.',
  assistFeatures: [
    {
      id: 'revealLetter',
      name: 'Hint button',
      description:
        'Crossword: reveals one letter in the grid. Word hunt: reveals a whole word as a first-letter chip (−15 points). Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'firstLetters',
      name: 'First letters',
      description:
        'Crossword mode: shows the first letter of every word from the start (no effect in word hunt). Counts as help.',
      defaultOn: false
    }
  ]
};
