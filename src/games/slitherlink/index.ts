import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { SlitherlinkGame } from './SlitherlinkGame';
import { slitherlinkTutorial } from './tutorial';

export const slitherlinkDefinition: GameDefinition = {
  id: 'slitherlink',
  category: 'logic',
  name: 'Slitherlink',
  tagline: 'Draw one closed loop — the numbers count its edges.',
  icon: gameIcons['slitherlink'],
  component: SlitherlinkGame,
  tutorial: slitherlinkTutorial,
  scoringNote:
    'Boards run 5×5 (most numbers kept) up to a sparse 10×10. +15 per satisfied clue × difficulty (1–5), −10 per error (a line that contradicts the unique solution), −30 per hint, plus a time bonus under par (3/5/8/12/18 min). One single closed loop that meets every number wins.',
  assistFeatures: [
    {
      id: 'degree-guard',
      name: 'Branch guard',
      description:
        'Blocks a line that would make a dot branch or cross, flashing the junction red. Counts as help.',
      defaultOn: true
    },
    {
      id: 'auto-x',
      name: 'Auto-X',
      description:
        'Automatically X-marks the leftover sides once a clue or a dot is fully satisfied. Counts as help.',
      defaultOn: false
    },
    {
      id: 'hint',
      name: 'Hint button',
      description:
        'Fills one correct line or X at the most constrained spot (−30). Counts as help when used.',
      defaultOn: true
    }
  ]
};
