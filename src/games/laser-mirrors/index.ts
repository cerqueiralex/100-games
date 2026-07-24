import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { LaserMirrorsGame } from './LaserMirrorsGame';
import { laserMirrorsTutorial } from './tutorial';
import { mastery } from './mastery';

export const laserMirrorsDefinition: GameDefinition = {
  id: 'laser-mirrors',
  category: 'spatial',
  name: 'Laser Mirrors',
  tagline: 'Aim the mirrors to light every target.',
  icon: gameIcons['laser-mirrors'],
  component: LaserMirrorsGame,
  tutorial: laserMirrorsTutorial,
  mastery,
  scoringNote:
    'Every puzzle is solvable by construction. Win = 400 × difficulty (1–5) + a time bonus under par (1/2/3.3/4.3/5.7 min) + an efficiency bonus for using fewer rotations than par (3 per mirror). Each hint costs 60. Grids run 6×6 with one target up to 10×10 with four targets, walls and a tray of mirrors to place. Errors are always zero.',
  assistFeatures: [
    {
      id: 'beamAlways',
      name: 'Live beam',
      description: 'Always show the laser beam as it re-traces. Turn off to reason blind and Fire to test. Counts as help.',
      defaultOn: true
    },
    {
      id: 'targetGlow',
      name: 'Target glow',
      description: 'Unlit targets pulse faintly to draw the eye. Counts as help when enabled.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint button',
      description: 'Sets one mirror to its correct orientation or position (−60). Counts as help when used.',
      defaultOn: true
    }
  ]
};
