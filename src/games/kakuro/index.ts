import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { KakuroGame } from './KakuroGame';
import { kakuroTutorial } from './tutorial';
import { mastery } from './mastery';

export const kakuroDefinition: GameDefinition = {
  id: 'kakuro',
  category: 'logic',
  name: 'Kakuro',
  tagline: 'A crossword of sums — digits 1–9, no repeats in a run.',
  icon: gameIcons['kakuro'],
  component: KakuroGame,
  tutorial: kakuroTutorial,
  mastery,
  scoringNote:
    'Scoring: +20/40/60/80/100 points per correct cell (easy → extreme). −25 for a placement that completes a broken run (wrong sum or a repeated digit), and each hint cancels its cell and costs 25 more. Solve the whole grid under par time (5/10/16/24/35 min) for a bonus of 1–5 points per second saved.',
  assistFeatures: [
    {
      id: 'runCheck',
      name: 'Run check',
      description:
        'A completed run turns green when its digits are all different and hit the clue, red when they do not. Counts as help.',
      defaultOn: true
    },
    {
      id: 'combos',
      name: 'Combos',
      description:
        'For the selected cell, lists the digit sets that can still fill its across and down runs and the digits that fit both. A classic kakuro aid — counts as help.',
      defaultOn: false
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'A hint button that fills one correct cell for you. Counts as help.',
      defaultOn: true
    }
  ]
};
