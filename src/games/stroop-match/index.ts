import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { StroopMatchGame } from './StroopMatchGame';
import { stroopMatchTutorial } from './tutorial';

export const stroopMatchDefinition: GameDefinition = {
  id: 'stroop-match',
  category: 'focus',
  name: 'Stroop Match',
  tagline: 'Tap the ink colour, not the word.',
  icon: gameIcons['stroop-match'],
  component: StroopMatchGame,
  tutorial: stroopMatchTutorial,
  scoringNote:
    'Each correct tap scores (10 + up to 20 speed bonus) × streak multiplier (1.00→3.00 over nine in a row) × difficulty multiplier (1–5). Reach the target correct answers (12/15/18/20/22 easy→extreme) before your lives (4/3/3/2/2) run out to win, for a +100×difficulty bonus. Wrong taps and timeouts cost a life; 50/50 costs 15 points per use.',
  assistFeatures: [
    {
      id: 'ruleLabel',
      name: 'Rule label',
      description: 'Always spells out the current rule ("Tap the INK colour") instead of just a tag. Counts as help.',
      defaultOn: true
    },
    {
      id: 'slowTimer',
      name: 'Relaxed timer',
      description: '40% more time on every trial. Counts as help.',
      defaultOn: false
    },
    {
      id: 'skip',
      name: 'Skip button',
      description: 'Skip the current trial with no penalty — but no points either. Counts as help when used.',
      defaultOn: false
    },
    {
      id: 'fifty',
      name: '50/50',
      description: 'Greys out two wrong colour buttons for the current trial. Counts as a hint when used.',
      defaultOn: false
    }
  ]
};
