import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { GridlockGame } from './GridlockGame';
import { gridlockTutorial } from './tutorial';
import { mastery } from './mastery';

export const gridlockDefinition: GameDefinition = {
  id: 'gridlock',
  category: 'spatial',
  name: 'Gridlock',
  tagline: 'Clear a path and drive the red car out.',
  icon: gameIcons['gridlock'],
  component: GridlockGame,
  tutorial: gridlockTutorial,
  mastery,
  scoringNote:
    'Slide the traffic aside and drive the red car to the exit. Every board is solvable with a known minimum (par). Score = 400× difficulty win bonus + an efficiency bonus of up to 600× difficulty scaled by par ÷ your moves (solve in par for the full bonus), −60 per hint. Difficulty multiplier runs 1× easy to 5× extreme. Turning off the Move counter and using no hints or undos earns a clean win.',
  assistFeatures: [
    {
      id: 'moveCount',
      name: 'Move counter',
      description: 'Shows your move count against par (the known minimum). Counts as help while enabled.',
      defaultOn: true
    },
    {
      id: 'undo',
      name: 'Undo',
      description: 'Take back your last slide. Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'Ghosts the next car to slide on an optimal path (−60 points). Counts as help when used.',
      defaultOn: true
    }
  ]
};
