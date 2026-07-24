import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { Make24Game } from './Make24Game';
import { make24Tutorial } from './tutorial';
import { mastery } from './mastery';

export const make24Definition: GameDefinition = {
  id: 'make-24',
  category: 'numbers',
  name: 'Make 24',
  tagline: 'Combine four numbers to make exactly 24.',
  icon: gameIcons['make-24'],
  component: Make24Game,
  tutorial: make24Tutorial,
  mastery,
  scoringNote:
    'Each solved deal scores 100 × difficulty (×1 easy → ×5 extreme) plus a speed bonus (up to 40s under par × multiplier). Clearing every deal in the round adds a 150 × multiplier win bonus. Hints cost 25 points each; Reveal forfeits that deal’s points entirely. Dead-ends (a final card that isn’t the target) count as errors but don’t deduct points. A clean win uses no hints, reveals or the solvable badge.',
  assistFeatures: [
    {
      id: 'solvableBadge',
      name: 'Solvable badge',
      description:
        'Shows a live check that the cards can still reach the target — reassurance while you plan. Counts as help when enabled.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint button',
      description: 'Lights up the next two cards and operator of a solution. Counts as help; costs points.',
      defaultOn: true
    },
    {
      id: 'reveal',
      name: 'Reveal solution',
      description: 'Shows the full solution expression and resets the deal so you can follow it. Forfeits that deal’s points.',
      defaultOn: true
    }
  ]
};
