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
    'Reach the target one step at a time — classic 9×9/13×13/17×17 mazes, or a custom size that scales as tall as you like. Score = 600 × difficulty, −5 per step beyond the shortest path, plus a time bonus for finishing fast.',
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
