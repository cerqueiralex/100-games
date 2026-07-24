import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { CheckersGame } from './CheckersGame';
import { checkersTutorial } from './tutorial';
import { mastery } from './mastery';

export const checkersDefinition: GameDefinition = {
  id: 'checkers',
  category: 'strategy',
  name: 'Checkers',
  tagline: 'Jump, crown kings, and clear the board.',
  icon: gameIcons['checkers'],
  component: CheckersGame,
  tutorial: checkersTutorial,
  mastery,
  scoringNote:
    'English draughts on an 8×8 board. Pick the robot (choose your color) or a friend on this phone. Captures are mandatory and multi-jumps must be completed; reach the far row to crown a King. Win by capturing every enemy piece or leaving it no move. A win scores 300 × difficulty (1–5) plus 20 per surviving man and 40 per surviving King, minus 40 per hint. The robot deepens its search with difficulty — easy blunders, extreme searches 11+ ply.',
  assistFeatures: [
    {
      id: 'move-hints',
      name: 'Move hints',
      description:
        'Highlights a tapped piece’s legal squares and flags pieces that must capture. Counts as help while enabled.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'Suggests a strong move via a short search (vs. the robot). Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'undo',
      name: 'Undo (2-player)',
      description: 'Take back the last move in a pass-and-play match. Counts as help when used.',
      defaultOn: false
    }
  ]
};
