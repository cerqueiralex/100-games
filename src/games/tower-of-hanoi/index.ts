import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { TowerOfHanoiGame } from './TowerOfHanoiGame';
import { towerOfHanoiTutorial } from './tutorial';
import { mastery } from './mastery';

export const towerOfHanoiDefinition: GameDefinition = {
  id: 'tower-of-hanoi',
  category: 'spatial',
  name: 'Tower of Hanoi',
  tagline: 'Move the tower — never a big disc on a small one.',
  icon: gameIcons['tower-of-hanoi'],
  component: TowerOfHanoiGame,
  tutorial: towerOfHanoiTutorial,
  mastery,
  scoringNote:
    'Solve to win: score = 1000 × difficulty multiplier (1–5) + an efficiency bonus of up to 600 × multiplier scaled by par ÷ your moves + a time bonus of (par time − seconds) × multiplier, minus 60 per hint. Par is the optimal move count — 2^n−1 on 3 pegs, the Frame–Stewart optimum on 4 (7 discs / 4 pegs = 25). Illegal drops are counted as errors but never end the game.',
  assistFeatures: [
    {
      id: 'legalGlow',
      name: 'Legal glow',
      description: 'Valid destination pegs glow while you hold a disc. Counts as help when enabled.',
      defaultOn: true
    },
    {
      id: 'undo',
      name: 'Undo',
      description: 'Take back your last move. Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'Highlights the optimal next move. Counts as help and adds a hint.',
      defaultOn: false
    }
  ]
};
