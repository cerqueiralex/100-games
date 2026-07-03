import type { GameDefinition } from '../../platform/types';
import { ColorConnectGame } from './ColorConnectGame';
import { colorConnectTutorial } from './tutorial';

export const colorConnectDefinition: GameDefinition = {
  id: 'color-connect',
  category: 'spatial',
  name: 'Color Connect',
  tagline: 'Link every pair of dots without crossing the pipes.',
  icon: '●–●',
  component: ColorConnectGame,
  tutorial: colorConnectTutorial,
  scoringNote:
    'Connect every color pair and cover the whole board to win. Boards are freshly generated every game (5×5/6×6/7×7). Score starts at 500× difficulty, −2 per move, −50 per solved color, plus a time bonus under par (2/4/6 min).',
  assistFeatures: [
    {
      id: 'solveColor',
      name: 'Solve a color',
      description: 'Draws one complete pipe for you (−50 points). Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'progress',
      name: 'Coverage meter',
      description: 'Shows what percentage of the board your pipes cover. Counts as help.',
      defaultOn: true
    }
  ]
};
