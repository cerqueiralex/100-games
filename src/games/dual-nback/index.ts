import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { DualNBackGame } from './DualNBackGame';
import { dualNBackTutorial } from './tutorial';
import { mastery } from './mastery';

export const dualNBackDefinition: GameDefinition = {
  id: 'dual-n-back',
  category: 'focus',
  name: 'Dual N-Back',
  tagline: 'Track positions AND letters at once — the advanced memory workout.',
  icon: gameIcons['dual-n-back'],
  component: DualNBackGame,
  tutorial: dualNBackTutorial,
  mastery,
  scoringNote:
    'Two channels at once: press Position when the square repeats from N steps back, Letter when the letter does (N = 1/2/3/4/5 by difficulty). +25/35/45/55/65 per hit, +3 per correct pass, −10 per mistake. Reach 65% accuracy to win.',
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
