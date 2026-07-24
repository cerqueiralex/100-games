import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { KlondikeGame } from './KlondikeGame';
import { klondikeTutorial } from './tutorial';
import { mastery } from './mastery';

export const klondikeDefinition: GameDefinition = {
  id: 'klondike',
  category: 'strategy',
  name: 'Klondike Solitaire',
  tagline: 'The classic solitaire — build the four suits up from Ace.',
  icon: gameIcons['klondike'],
  component: KlondikeGame,
  tutorial: klondikeTutorial,
  mastery,
  scoringNote:
    'Win bonus 1000 × difficulty (easy 1 → extreme 5), plus an efficiency bonus (350 × difficulty − 2 per move) and a time bonus of (par − your time) × difficulty; each hint costs 40. Illegal drops just bounce back, so errors are always 0. easy = draw-1 with unlimited redeals; medium = draw-1 with 3 redeals — both dealt from a bank of solver-verified WINNABLE layouts. hard = draw-3 unlimited redeals, pro = draw-3 with 2 redeals, extreme = draw-3 with a single redeal on a random deal. extra records moves and time.',
  assistFeatures: [
    {
      id: 'autoFoundation',
      name: 'Auto to foundation',
      description: 'Automatically sends obviously-safe cards up to the foundations and offers a one-tap Finish when the game is won. Counts as help while on.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'Highlights a useful legal move found by the solver. Adds to your hint count.',
      defaultOn: true
    },
    {
      id: 'undo',
      name: 'Undo',
      description: 'Take back your last move (unlimited). Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'winnableBadge',
      name: 'Winnable badge',
      description: 'On easy/medium, shows a badge confirming the deal is solver-verified winnable. Counts as help while on.',
      defaultOn: true
    }
  ]
};
