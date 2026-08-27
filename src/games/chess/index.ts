import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { ChessGame } from './ChessGame';
import { chessTutorial } from './tutorial';
import { mastery } from './mastery';

export const chessDefinition: GameDefinition = {
  id: 'chess',
  category: 'strategy',
  name: 'Chess',
  tagline: 'The royal game — outplay a robot that grows with you.',
  icon: gameIcons['chess'],
  component: ChessGame,
  tutorial: chessTutorial,
  mastery,
  scoringNote:
    'Full chess against the robot — you play White. Castling, en passant, promotion, check and checkmate all work exactly as over the board, and stalemate, threefold repetition, the fifty-move rule and dead positions are called as draws. Drag a piece (or tap-then-tap) to move; the last move, checks and your legal squares are highlighted, captures collect in the trays and every move lands in the log. Checkmate the robot to win: 400 × difficulty (1–5) plus 20 per pawn of material lead. A draw pays 60 × difficulty. The robot searches deeper — and blunders less — with every difficulty tier.',
  assistFeatures: [
    {
      id: 'undo',
      name: 'Undo move',
      description:
        'Take back your last move (the robot’s reply comes back with it). Counts as help when used.',
      defaultOn: true
    }
  ]
};
