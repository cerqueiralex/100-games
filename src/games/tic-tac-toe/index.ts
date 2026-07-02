import type { GameDefinition } from '../../platform/types';
import { TicTacToeGame } from './TicTacToeGame';
import { ticTacToeTutorial } from './tutorial';

export const ticTacToeDefinition: GameDefinition = {
  id: 'tic-tac-toe',
  name: 'Tic-Tac-Toe',
  tagline: 'Beat the robot — first to three round wins.',
  icon: 'X·O',
  component: TicTacToeGame,
  tutorial: ticTacToeTutorial,
  scoringNote:
    'You are X. First side to win 3 rounds takes the match (draws replay, starters alternate). +100 × difficulty per round win. The robot gets sharper with difficulty — on hard it is nearly perfect.',
  assistFeatures: [
    {
      id: 'suggest',
      name: 'Suggest move',
      description: 'Highlights the strongest square for you. Counts as help when used.',
      defaultOn: true
    }
  ]
};
