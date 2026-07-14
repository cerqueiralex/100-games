import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { OddOneOutGame } from './OddOneOutGame';
import { oddOneOutTutorial } from './tutorial';

export const oddOneOutDefinition: GameDefinition = {
  id: 'odd-one-out',
  category: 'focus',
  name: 'Odd One Out',
  tagline: 'Spot the tile that does not match.',
  icon: gameIcons['odd-one-out'],
  component: OddOneOutGame,
  tutorial: oddOneOutTutorial,
  scoringNote:
    'Scoring: each cleared round pays round number × 12 × tier multiplier (1–5), plus a speed bonus (up to 40 × multiplier for the time you had left) and a 25 × multiplier round-clear bonus. A wrong tap or timeout costs 30 points and a life; each hint costs 20 points. Winning adds 200 × multiplier plus 40 × multiplier for every surviving life. Clear your tier’s target round to win; run out of lives to lose.',
  assistFeatures: [
    {
      id: 'moreTime',
      name: 'More time',
      description: 'Adds 40% to every round timer. Counts as help while enabled.',
      defaultOn: false
    },
    {
      id: 'biggerDiff',
      name: 'Bigger difference',
      description: 'Keeps the odd tile a little easier to spot at every round. Counts as help while enabled.',
      defaultOn: false
    },
    {
      id: 'hint',
      name: 'Hint button',
      description: 'Pulses the 2×2 region holding the odd tile — up to 3 times. Counts as help and costs points when used.',
      defaultOn: true
    }
  ]
};
