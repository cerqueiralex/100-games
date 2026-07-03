import type { GameDefinition } from '../../platform/types';
import { TicTacToeGame } from './TicTacToeGame';
import { ticTacToeTutorial } from './tutorial';

export const ticTacToeDefinition: GameDefinition = {
  id: 'tic-tac-toe',
  category: 'strategy',
  name: 'Tic-Tac-Toe',
  tagline: 'Beat the robot or a friend — best of N rounds.',
  icon: 'X·O',
  component: TicTacToeGame,
  tutorial: ticTacToeTutorial,
  scoringNote:
    'Pick your opponent (robot or a friend on this phone), your mark and the round count on the match menu. Most round wins takes the match; a tie goes to sudden death. +100 × difficulty per round win. The robot gets sharper with difficulty — on hard it is nearly perfect.',
  assistFeatures: [
    {
      id: 'suggest',
      name: 'Suggest move',
      description: 'Highlights the strongest square for you. Counts as help when used.',
      defaultOn: true
    }
  ]
};
