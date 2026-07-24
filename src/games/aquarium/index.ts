import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { AquariumGame } from './AquariumGame';
import { aquariumTutorial } from './tutorial';
import { mastery } from './mastery';

export const aquariumDefinition: GameDefinition = {
  id: 'aquarium',
  category: 'logic',
  name: 'Aquarium',
  tagline: 'Fill the tanks — water always finds its level.',
  icon: gameIcons['aquarium'],
  component: AquariumGame,
  tutorial: aquariumTutorial,
  mastery,
  scoringNote:
    '+10 per correctly placed water cell × difficulty (×1–×5), −15 per overflow error, −40 per hint. Winning adds 150 × difficulty plus a time bonus for finishing under par (3/5/8/11/15 min). Boards grow from 6×6 to 10×10.',
  assistFeatures: [
    {
      id: 'lineCheck',
      name: 'Line check',
      description: 'Crosses out satisfied counts and auto-marks cells that can no longer hold water. Counts as help.',
      defaultOn: true
    },
    {
      id: 'tankGlow',
      name: 'Tank glow',
      description: 'Press and hold a cell to highlight its whole tank. Counts as help.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Level hint',
      description: 'Sets one tank to its correct water level (−40). Counts as help when used.',
      defaultOn: true
    }
  ]
};
