import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { FutoshikiGame } from './FutoshikiGame';
import { futoshikiTutorial } from './tutorial';

export const futoshikiDefinition: GameDefinition = {
  id: 'futoshiki',
  category: 'logic',
  name: 'Futoshiki',
  tagline: 'A number square ruled by greater-than signs.',
  icon: gameIcons['futoshiki'],
  component: FutoshikiGame,
  tutorial: futoshikiTutorial,
  scoringNote:
    'Scoring: +40 points per correctly filled cell × difficulty multiplier (1–5), −40 per entry that breaks a rule, −30 per hint. Finish under par time (4/8/14/20/25 min) for a bonus per second saved. Boards grow from 4×4 to 7×7; pro is inequality-heavy with minimal givens.',
  assistFeatures: [
    {
      id: 'ineq-check',
      name: 'Rule check',
      description:
        'Highlights violated inequality signs and duplicate digits in red while you play. Counts as help.',
      defaultOn: true
    },
    {
      id: 'notes-auto',
      name: 'Auto note cleanup',
      description:
        'Placing a digit removes it from pencil marks in the same row and column. Counts as help.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hints',
      description: 'A hint button that fills one logically forced cell for you. Counts as help.',
      defaultOn: true
    }
  ]
};
