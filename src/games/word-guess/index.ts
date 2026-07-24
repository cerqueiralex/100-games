import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { WordGuessGame } from './WordGuessGame';
import { wordGuessTutorial } from './tutorial';
import { mastery } from './mastery';

export const wordGuessDefinition: GameDefinition = {
  id: 'word-guess',
  category: 'words',
  name: 'Word Guess',
  tagline: 'Six tries to find the hidden word.',
  icon: gameIcons['word-guess'],
  component: WordGuessGame,
  tutorial: wordGuessTutorial,
  mastery,
  scoringNote:
    'Win reward = (300 + 160 per unused try) × difficulty multiplier (×1 easy → ×5 extreme), minus 120 per hint used. Losing scores 0. Slips (errors) = invalid-word submissions plus any valid guess from the 4th row onward that reveals no green (right-place) letters. Difficulty: easy 4-letter words + 7 tries, medium 5-letter + 6, hard rarer 5-letter + 6, pro 6-letter + 6, extreme 7-letter + 6 with keyboard hints disabled.',
  assistFeatures: [
    {
      id: 'key-colors',
      name: 'Keyboard hints',
      description:
        'Keys recolor to the best result each letter has scored (green / present / absent). Counts as help while enabled. Always off on Extreme.',
      defaultOn: true
    },
    {
      id: 'starter',
      name: 'Starter word',
      description: 'Fills a statistically strong opening word on the first row. Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'reveal-one',
      name: 'Reveal a letter',
      description: 'Reveals one correct letter in its right position (once per game). Counts as help when used.',
      defaultOn: true
    }
  ]
};
