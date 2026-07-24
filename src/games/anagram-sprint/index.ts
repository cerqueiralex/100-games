import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { AnagramSprintGame } from './AnagramSprintGame';
import { anagramSprintTutorial } from './tutorial';
import { mastery } from './mastery';

export const anagramSprintDefinition: GameDefinition = {
  id: 'anagram-sprint',
  category: 'words',
  name: 'Anagram Sprint',
  tagline: 'Unscramble as many words as you can before time runs out.',
  icon: gameIcons['anagram-sprint'],
  component: AnagramSprintGame,
  tutorial: anagramSprintTutorial,
  mastery,
  scoringNote:
    'Each solved word scores 12 points per letter × your streak multiplier × the difficulty multiplier (1/2/3/4/5 for easy→extreme). Three solves in a row without a skip or miss earns ×1.5, six in a row ×2. Skips cost 40 points and reset the streak; wrong submissions add 3 seconds to the clock; hints cost 20 points. Reach the word quota before the timer empties for a win bonus plus 5 points per remaining second (× difficulty).',
  assistFeatures: [
    {
      id: 'hint',
      name: 'Hint button',
      description:
        'Locks the next correct letter into its slot (−20 points, counts as help each time you tap it).',
      defaultOn: true
    },
    {
      id: 'firstLetter',
      name: 'First letter',
      description:
        "Softly glows the tile the answer starts with. Counts as help whenever it's enabled.",
      defaultOn: false
    }
  ]
};
