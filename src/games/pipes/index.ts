import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { PipesGame } from './PipesGame';
import { pipesTutorial } from './tutorial';
import { mastery } from './mastery';

export const pipesDefinition: GameDefinition = {
  id: 'pipes',
  category: 'spatial',
  name: 'Pipes',
  tagline: 'Rotate the pipes to make the water flow.',
  icon: gameIcons['pipes'],
  component: PipesGame,
  tutorial: pipesTutorial,
  mastery,
  scoringNote:
    'Rotate every pipe to connect the tank to all outlets with no leaks. Win = 100 × difficulty multiplier (1–5), plus an efficiency bonus up to 300 × multiplier scaled by par ÷ your turns (match par for the full bonus), plus a time bonus for finishing under par time. Hints −30 each. errors are always 0; quitting counts as abandoned.',
  assistFeatures: [
    {
      id: 'flow-preview',
      name: 'Flow preview',
      description:
        'Fills connected pipes with water so you can see what the tank reaches. Turn it off for a no-feedback challenge. Counts as help while on.',
      defaultOn: true
    },
    {
      id: 'lock-correct',
      name: 'Solved marks',
      description:
        'Shows a faint check on any pipe already in its correct orientation, so you can leave it be. Counts as help while on.',
      defaultOn: false
    },
    {
      id: 'hint',
      name: 'Hint button',
      description: 'Spins one wrong pipe to its correct orientation (−30). Counts as help when used.',
      defaultOn: true
    }
  ]
};
