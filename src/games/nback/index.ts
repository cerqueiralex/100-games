import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { NBackGame } from './NBackGame';
import { nBackTutorial } from './tutorial';
import { mastery } from './mastery';

export const nBackDefinition: GameDefinition = {
  id: 'n-back',
  category: 'focus',
  name: 'N-Back',
  tagline: 'Press Match when the position repeats from N steps back.',
  icon: gameIcons['n-back'],
  component: NBackGame,
  tutorial: nBackTutorial,
  mastery,
  scoringNote:
    'Squares light up one by one. Press Match when the position equals the one N steps back (N = 1/2/3/4/5 by difficulty). +20/30/40/50/60 per hit, +5 per correct pass, −10 per mistake. Reach 70% accuracy to win.',
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
      description: 'Outlines the square from N steps back so you can compare directly. Counts as help.',
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
