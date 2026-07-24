import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { HangmanGame } from './HangmanGame';
import { hangmanTutorial } from './tutorial';
import { mastery } from './mastery';

export const hangmanDefinition: GameDefinition = {
  id: 'hangman',
  category: 'words',
  name: 'Hangman',
  tagline: 'Guess the word before the balloon pops.',
  icon: gameIcons['hangman'],
  component: HangmanGame,
  tutorial: hangmanTutorial,
  mastery,
  scoringNote:
    'Scoring: +10 per revealed letter position × difficulty multiplier (×1 easy → ×5 extreme). Solve the word for a +50×mult win bonus plus +15×mult for each life still left. Vowel and Category peeks cost −25 each. Errors are your wrong letters; a clean win uses no assists or hints.',
  assistFeatures: [
    {
      id: 'vowel-peek',
      name: 'Vowel peek',
      description: 'Reveal one hidden vowel (up to twice). Counts as help each time you use it.',
      defaultOn: true
    },
    {
      id: 'category-hint',
      name: 'Category hint',
      description: 'On the tiers where the category is hidden, reveal it. Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'safe-first',
      name: 'Safe first guess',
      description: 'Your first wrong guess each game is forgiven — the balloon only wobbles. Counts as help while on.',
      defaultOn: false
    }
  ]
};
