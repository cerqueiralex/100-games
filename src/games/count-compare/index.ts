import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { CountCompareGame } from './CountCompareGame';
import { countCompareTutorial } from './tutorial';
import { mastery } from './mastery';

export const countCompareDefinition: GameDefinition = {
  id: 'count-compare',
  category: 'focus',
  name: 'Count & Compare',
  tagline: 'A flash of shapes — answer before it fades.',
  icon: gameIcons['count-compare'],
  component: CountCompareGame,
  tutorial: countCompareTutorial,
  mastery,
  scoringNote:
    'Scoring per correct answer: round × 10 × difficulty multiplier (1–5), plus a speed bonus (up to 25 × mult for a snap answer), a round-clear bonus (5 × round), and a streak bonus (2 × mult per consecutive hit, capped at 10). A wrong answer or timeout costs 8 × mult points and a life; each Re-flash costs a hint. Win to bank a bonus of 100 × mult plus 25 × mult per life left. Clear every round of the tier to win; run out of lives to lose.',
  assistFeatures: [
    {
      id: 'replay',
      name: 'Re-flash',
      description: 'Show the scene again for the current question, up to 3 times. Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'narrow',
      name: 'Narrow questions',
      description: 'Only ask the simpler “more of which color?” comparison. Counts as help while on.',
      defaultOn: true
    },
    {
      id: 'longerFlash',
      name: 'Longer flash',
      description: 'Shapes stay on screen 40% longer. Counts as help while on.',
      defaultOn: false
    }
  ]
};
