import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { MovingCupsGame } from './MovingCupsGame';
import { movingCupsTutorial } from './tutorial';

export const movingCupsDefinition: GameDefinition = {
  id: 'moving-cups',
  category: 'memory',
  name: 'Moving Cups',
  tagline: 'Keep your eye on the ball as the cups shuffle.',
  icon: gameIcons['moving-cups'],
  component: MovingCupsGame,
  tutorial: movingCupsTutorial,
  scoringNote:
    'Scoring: each correct guess adds (100 × round + 40) × difficulty multiplier (1–5). Winning the tier adds 300 × mult plus 60 × mult per life left. A wrong guess subtracts 60 × mult and costs a life; each Peek subtracts 25. Clear the target round (6/7/8/8/9 easy→extreme) to win — cups, swaps and speed rise every tier and every round.',
  assistFeatures: [
    {
      id: 'ballTint',
      name: 'Ball tint',
      description: "A faint accent glow stays under the ball's cup through the shuffle, making it followable. Counts as help.",
      defaultOn: true
    },
    {
      id: 'slowMotion',
      name: 'Slow motion',
      description: 'The cups shuffle 50% slower. Counts as help.',
      defaultOn: false
    },
    {
      id: 'peek',
      name: 'Peek',
      description: 'Briefly lift every cup to reveal the ball before you choose — up to twice a round. Counts as help when used.',
      defaultOn: false
    }
  ]
};
