import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { TicTacToeGame } from './TicTacToeGame';
import { ticTacToeTutorial } from './tutorial';
import { mastery } from './mastery';

export const ticTacToeDefinition: GameDefinition = {
  id: 'tic-tac-toe',
  category: 'strategy',
  name: 'Tic-Tac-Toe',
  tagline: 'Beat the robot or a friend — best of N rounds.',
  icon: gameIcons['tic-tac-toe'],
  component: TicTacToeGame,
  tutorial: ticTacToeTutorial,
  mastery,
  scoringNote:
    'Pick your opponent (robot or a friend on this phone), your mark and the round count on the match menu. Most round wins takes the match; a tie goes to sudden death. +100 × difficulty per round win. The robot gets sharper with difficulty — pro is near-flawless, and on extreme it also opens every round.',
  assistFeatures: [
    {
      id: 'suggest',
      name: 'Suggest move',
      description: 'Highlights the strongest square for you. Counts as help when used.',
      defaultOn: true
    }
  ]
};
