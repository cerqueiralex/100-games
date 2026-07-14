import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { Game2048Game } from './Game2048Game';
import { game2048Tutorial } from './tutorial';

export const game2048Definition: GameDefinition = {
  id: 'game2048',
  category: 'numbers',
  name: '2048',
  tagline: 'Swipe to merge tiles up to the target.',
  icon: gameIcons['game2048'],
  component: Game2048Game,
  tutorial: game2048Tutorial,
  scoringNote:
    'Every merge scores the value of the tile it creates, multiplied by the difficulty (×1 easy → ×5 extreme). Reaching the target tile adds a win bonus (1000 × difficulty); each Hint used costs 50. Reach 1024 / 2048 / 2048 / 4096 / 4096 (easy → extreme) to win — you may keep going for a higher score. It is game over when the board fills with no merges left.',
  assistFeatures: [
    {
      id: 'undo',
      name: 'Undo',
      description: 'Take back your last move, up to 5 times per game. Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'Arrow the swipe that merges the most right now. Counts as help each use.',
      defaultOn: true
    },
    {
      id: 'easySpawns',
      name: 'Easy spawns',
      description: 'Every new tile is a 2, never a 4, so the board fills slower. Counts as help while on.',
      defaultOn: false
    }
  ]
};
