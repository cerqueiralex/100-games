import type { GameDefinition } from '../../platform/types';
import { ImagePuzzleGame } from './ImagePuzzleGame';
import { imagePuzzleTutorial } from './tutorial';

export const imagePuzzleDefinition: GameDefinition = {
  id: 'image-puzzle',
  category: 'spatial',
  name: 'Image Puzzle',
  tagline: 'Slide the tiles to restore the photo.',
  icon: '▦',
  component: ImagePuzzleGame,
  tutorial: imagePuzzleTutorial,
  scoringNote:
    'A random photo is scrambled into 3×3/4×4/5×5 sliding tiles (always solvable). Score = 800 × difficulty − 2 per move, plus a time bonus under par (2/5/10 min). Add your own photos via public/puzzles/manifest.json.',
  assistFeatures: [
    {
      id: 'showNumbers',
      name: 'Tile numbers',
      description: 'Shows each tile’s number so ordering is obvious. Counts as help.',
      defaultOn: true
    },
    {
      id: 'preview',
      name: 'Preview image',
      description: 'Shows the finished photo for 2 seconds. Counts as help when used.',
      defaultOn: true
    }
  ]
};
