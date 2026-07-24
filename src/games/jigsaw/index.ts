import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { JigsawGame } from './JigsawGame';
import { jigsawTutorial } from './tutorial';
import { mastery } from './mastery';

export const jigsawDefinition: GameDefinition = {
  id: 'jigsaw',
  category: 'spatial',
  name: 'Jigsaw',
  tagline: 'Piece the photo back together.',
  icon: gameIcons['jigsaw'],
  component: JigsawGame,
  tutorial: jigsawTutorial,
  mastery,
  scoringNote:
    'A photo is cut into interlocking pieces — 12 (3×4) up to 56 (7×8) on extreme, with 90° rotation from pro on. Drag each piece to its home; it snaps when close (and correctly rotated). Score = 10 × pieces × difficulty (1–5) + a time bonus under par (2/4/7/11/16 min) − 40 per hint. Add your own photos via public/puzzles/manifest.json.',
  assistFeatures: [
    {
      id: 'preview',
      name: 'Image preview',
      description: 'Shows a faint version of the finished photo under the board. Counts as help.',
      defaultOn: true
    },
    {
      id: 'edgeSort',
      name: 'Edge sort',
      description: 'Gathers all edge and corner pieces to the top of the pile. Counts as help when used.',
      defaultOn: false
    },
    {
      id: 'hint',
      name: 'Place a piece',
      description: 'Drops one random piece straight into its home (−40 points). Counts as help when used.',
      defaultOn: false
    }
  ]
};
