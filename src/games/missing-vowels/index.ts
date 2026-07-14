import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { MissingVowelsGame } from './MissingVowelsGame';
import { missingVowelsTutorial } from './tutorial';

export const missingVowelsDefinition: GameDefinition = {
  id: 'missing-vowels',
  category: 'words',
  name: 'Missing Vowels',
  tagline: 'The vowels vanished — restore the phrase.',
  icon: gameIcons['missing-vowels'],
  component: MissingVowelsGame,
  tutorial: missingVowelsTutorial,
  scoringNote:
    'Scoring: +15 per vowel slot solved × difficulty multiplier (1/2/3/4/5), minus 20 per Reveal. Win to add a bonus (100–800) plus a time bonus for finishing under par. Errors are wrong submissions; on Pro/Extreme too many mistakes lose the round, and Extreme adds a 25s-per-phrase timer.',
  assistFeatures: [
    {
      id: 'category',
      name: 'Category hint',
      description:
        'Shows the phrase theme. On Extreme it reveals the otherwise hidden category. Counts as help whenever enabled.',
      defaultOn: false
    },
    {
      id: 'revealVowel',
      name: 'Reveal vowel',
      description: 'A button that correctly fills one random empty slot. Counts as help each time you use it.',
      defaultOn: true
    },
    {
      id: 'keepCorrect',
      name: 'Keep correct',
      description:
        'After a wrong submission, correct vowels lock in place and only the wrong ones clear (instead of clearing all). Counts as help when enabled.',
      defaultOn: true
    }
  ]
};
