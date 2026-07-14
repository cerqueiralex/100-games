import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { LightsOutGame } from './LightsOutGame';
import { lightsOutTutorial } from './tutorial';

export const lightsOutDefinition: GameDefinition = {
  id: 'lights-out',
  category: 'logic',
  name: 'Lights Out',
  tagline: 'Every tap flips a cross of lights — turn them all off.',
  icon: gameIcons['lights-out'],
  component: LightsOutGame,
  tutorial: lightsOutTutorial,
  scoringNote:
    'Clear the board: +100 × difficulty multiplier (1–5), plus an efficiency bonus up to 300 × multiplier scaled by par ÷ your presses — match par (the true minimum, computed exactly) for the full bonus. Hints −25 each. Losing is impossible; quitting counts as abandoned.',
  assistFeatures: [
    {
      id: 'par-meter',
      name: 'Best-left meter',
      description:
        'Shows the optimal number of presses remaining from the current position. Counts as help while on.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint button',
      description: 'Pulses one light that is part of a perfect solution (−25). Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'undo',
      name: 'Undo button',
      description: 'Reverts your last press. Counts as help when used.',
      defaultOn: true
    }
  ]
};
