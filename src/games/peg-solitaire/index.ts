import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { PegSolitaireGame } from './PegSolitaireGame';
import { pegSolitaireTutorial } from './tutorial';

export const pegSolitaireDefinition: GameDefinition = {
  id: 'peg-solitaire',
  category: 'spatial',
  name: 'Peg Solitaire',
  tagline: 'Jump and remove pegs until one remains.',
  icon: gameIcons['peg-solitaire'],
  component: PegSolitaireGame,
  tutorial: pegSolitaireTutorial,
  scoringNote:
    'Each removed peg scores 8 × difficulty (1–5). Winning (one peg left) adds 300 × difficulty, a time bonus of (par − your time) × difficulty (par 3/5/8/8/10 min), and a 200 × difficulty centre-finish bonus when the last peg lands on the centre hole (required on extreme). Every hint costs 40. Boards: easy Triangle (15), medium English cross (33, centre start), hard European (37), pro English from a random solver-verified start, extreme English from a harder start that must finish on centre. Errors count illegal-jump attempts, plus leftover pegs on a stuck board you give up.',
  assistFeatures: [
    {
      id: 'legalGlow',
      name: 'Legal-move glow',
      description: 'Lights up the holes a lifted peg can jump to. Counts as help while enabled.',
      defaultOn: true
    },
    {
      id: 'undo',
      name: 'Undo',
      description: 'Take back your last jump — as far as the start. Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'Show a solver-verified next jump as a ghost arrow. Adds to your hint count.',
      defaultOn: false
    }
  ]
};
