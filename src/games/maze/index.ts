import type { GameDefinition } from '../../platform/types';
import { MazeGame } from './MazeGame';
import { mazeTutorial } from './tutorial';

export const mazeDefinition: GameDefinition = {
  id: 'maze',
  name: 'Maze',
  tagline: 'Race through a freshly generated labyrinth to the exit.',
  icon: '◱',
  component: MazeGame,
  tutorial: mazeTutorial,
  scoringNote:
    'Reach the exit of a generated 8×8/12×12/15×15 maze. Score = 600 × difficulty, −5 per step beyond the shortest path, plus a time bonus under par (1/2.5/5 min). Taps run corridors automatically.',
  assistFeatures: [
    {
      id: 'breadcrumbs',
      name: 'Breadcrumbs',
      description: 'Tints every cell you have visited. Counts as help.',
      defaultOn: true
    },
    {
      id: 'showPath',
      name: 'Show path',
      description: 'Flashes the optimal route for 2 seconds. Counts as help when used.',
      defaultOn: true
    }
  ]
};
