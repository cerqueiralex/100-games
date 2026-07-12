import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { MazeGame } from './MazeGame';
import { mazeTutorial } from './tutorial';

export const mazeDefinition: GameDefinition = {
  id: 'maze',
  category: 'spatial',
  name: 'Maze',
  tagline: 'Race through a freshly generated labyrinth to the exit.',
  icon: gameIcons['maze'],
  component: MazeGame,
  tutorial: mazeTutorial,
  scoringNote:
    'Reach the target one step at a time — classic mazes from 9×9 up to 25×25 on extreme, or a custom size that scales as tall as you like. Score = 600 × difficulty, −5 per step beyond the shortest path, plus a time bonus for finishing fast.',
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
      description:
        'Briefly flashes the optimal route (longer on bigger mazes). Counts as help when used.',
      defaultOn: true
    }
  ]
};
