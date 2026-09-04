import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { ChessGame } from './ChessGame';
import { chessTutorial } from './tutorial';
import { mastery } from './mastery';

export const chessDefinition: GameDefinition = {
  id: 'chess',
  category: 'strategy',
  name: 'Chess',
  tagline: 'The royal game — Stockfish plays five real strengths, beginner to club.',
  icon: gameIcons['chess'],
  component: ChessGame,
  tutorial: chessTutorial,
  mastery,
  scoringNote:
    'Full chess against the robot — you play White. Castling, en passant, promotion, check and checkmate all work exactly as over the board, and stalemate, threefold repetition, the fifty-move rule and dead positions are called as draws. Drag a piece (or tap-then-tap) to move; the last move, checks and your legal squares are highlighted, captures collect in the trays and every move lands in the log. Checkmate the robot to win: 400 × difficulty (1–5) plus 20 per pawn of material lead. A draw pays 60 × difficulty. The robot is the Stockfish engine held to a real strength per tier: about 300 Elo on easy (a weighted lottery over the legal moves — no search at all), 750 on medium and 1200 on hard (the engine picks, deliberately loosely, among its best few lines), 1600 on pro (its own strength limiter) and full strength on extreme. The engine (7 MB) downloads once, the first time a medium-or-harder game starts.',
  assistFeatures: [
    {
      id: 'hint',
      name: 'Hint',
      description:
        'Ask the engine — at full strength, whatever tier you play — for the best move; it lights up on the board. Counts as help when used.'
    },
    {
      id: 'undo',
      name: 'Undo move',
      description:
        'Take back your last move (the robot’s reply comes back with it). Counts as help when used.'
    }
  ]
};
