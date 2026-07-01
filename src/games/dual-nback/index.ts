import type { GameDefinition } from '../../platform/types';
import { DualNBackGame } from './DualNBackGame';
import { dualNBackTutorial } from './tutorial';

export const dualNBackDefinition: GameDefinition = {
  id: 'dual-n-back',
  name: 'Dual N-Back',
  tagline: 'Track positions AND letters at once — the advanced memory workout.',
  icon: 'n×2',
  component: DualNBackGame,
  tutorial: dualNBackTutorial,
  scoringNote:
    'Two channels at once: press Position when the square repeats from N steps back, Letter when the letter does (N = 1/2/3 by difficulty). +25/35/45 per hit, +3 per correct pass, −10 per mistake. Reach 65% accuracy to win.',
  assistFeatures: [
    {
      id: 'feedback',
      name: 'Instant feedback',
      description: 'Shows right/wrong after every trial. Counts as help.',
      defaultOn: true
    },
    {
      id: 'showHistory',
      name: 'Show N-back',
      description: 'Shows the position and letter from N steps back. Counts as help.',
      defaultOn: false
    },
    {
      id: 'slowMode',
      name: 'Relaxed pace',
      description: '35% more time on every trial. Counts as help.',
      defaultOn: false
    }
  ]
};
