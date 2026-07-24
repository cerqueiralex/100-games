import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { NumberTrailGame } from './NumberTrailGame';
import { numberTrailTutorial } from './tutorial';
import { mastery } from './mastery';

export const numberTrailDefinition: GameDefinition = {
  id: 'number-trail',
  category: 'memory',
  name: 'Number Trail',
  tagline: 'Remember where the numbers were, then tap them in order.',
  icon: gameIcons['number-trail'],
  component: NumberTrailGame,
  tutorial: numberTrailTutorial,
  mastery,
  scoringNote:
    'Scoring: each number tapped in the correct order scores round × multiplier × 5, plus a round-clear bonus of round × multiplier × 15. The multiplier runs 1 (easy) to 5 (extreme). A wrong tap costs 20 points and a life; each Peek costs 30. Winning adds (150 + 50 per life left) × multiplier. Clear the target rounds (6/7/8/8/9) to win; lose when lives run out.',
  assistFeatures: [
    {
      id: 'outline',
      name: 'Position outline',
      description: 'After the flash, tiles that held a number keep a faint outline. Counts as help.',
      defaultOn: true
    },
    {
      id: 'slowFlash',
      name: 'Slow flash',
      description: 'Numbers stay visible 40% longer. Counts as help.',
      defaultOn: false
    },
    {
      id: 'peek',
      name: 'Peek button',
      description: 'Re-reveal the remaining numbers for a moment (max 3, −30 pts each). Counts as help when used.',
      defaultOn: true
    }
  ]
};
