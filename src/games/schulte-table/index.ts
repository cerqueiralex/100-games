import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { SchulteTableGame } from './SchulteTableGame';
import { schulteTableTutorial } from './tutorial';
import { mastery } from './mastery';

export const schulteTableDefinition: GameDefinition = {
  id: 'schulte-table',
  category: 'focus',
  name: 'Schulte Table',
  tagline: 'Find the numbers in order, as fast as your eyes can move.',
  icon: gameIcons['schulte-table'],
  component: SchulteTableGame,
  tutorial: schulteTableTutorial,
  mastery,
  scoringNote:
    'Clear the whole grid in order: 3×3 (1–9) up to the classic 5×5 (1–25), with a descending 5×5 on pro and a two-colour interleaved 5×5 on extreme. Score = 200 × difficulty (×1–5) × (par ÷ your time), where finishing under par (8/22/40/48/70s) multiplies up to ×2.5 and slower runs scale down to ×0.25. Each wrong tap adds 1.5s to your effective time; each Peek costs a flat 25. Completing the grid wins — a generous time cap ends a stalled drill.',
  assistFeatures: [
    {
      id: 'dim-found',
      name: 'Dim found tiles',
      description: 'Tiles you have already tapped fade back so they stop competing for your eyes. Counts as help.',
      defaultOn: true
    },
    {
      id: 'fixation-dot',
      name: 'Fixation dot',
      description: 'A faint dot marks the grid centre — the classic technique is to hold your gaze there. Counts as help.',
      defaultOn: false
    },
    {
      id: 'next-highlight',
      name: 'Next-tile outline',
      description: 'Faintly outlines the tile you are looking for — training wheels for the search. Counts as help.',
      defaultOn: false
    },
    {
      id: 'peek-next',
      name: 'Peek button',
      description: 'Adds a Peek tool that pulses the next tile once (−25). Counts as help when used.',
      defaultOn: false
    }
  ]
};
