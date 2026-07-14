import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { WordLadderGame } from './WordLadderGame';
import { wordLadderTutorial } from './tutorial';

export const wordLadderDefinition: GameDefinition = {
  id: 'word-ladder',
  category: 'words',
  name: 'Word Ladder',
  tagline: 'Turn one word into another, one letter at a time.',
  icon: gameIcons['word-ladder'],
  component: WordLadderGame,
  tutorial: wordLadderTutorial,
  scoringNote:
    'Scoring (win): win bonus (120/240/360/480/600 by tier) + an efficiency bonus of up to 150/300/450/600/750 scaled by par ÷ your steps — solve in par for the full bonus. Each hint −60, each invalid submission (an error) −15. Give up reveals the optimal path and counts as a loss. Difficulty multiplies the base points earned per rung while in progress.',
  assistFeatures: [
    {
      id: 'parMeter',
      name: 'Par meter',
      description:
        'Live "rungs to go" indicator with an up/down arrow showing if your last move got you closer to the goal. Counts as help while enabled.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'Places the next word on a shortest path to the goal. Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'undo',
      name: 'Undo',
      description: 'Removes the top rung so you can try a different route. Counts as help when used.',
      defaultOn: true
    }
  ]
};
