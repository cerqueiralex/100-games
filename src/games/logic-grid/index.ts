import type { GameDefinition } from '../../platform/types';
import { LogicGridGame } from './LogicGridGame';
import { logicGridTutorial } from './tutorial';

export const logicGridDefinition: GameDefinition = {
  id: 'logic-grid',
  category: 'logic',
  name: 'Logic Puzzles',
  tagline: 'Cross-reference the clues until every match is found.',
  icon: '✓✕',
  component: LogicGridGame,
  tutorial: logicGridTutorial,
  scoringNote:
    'Solve the grid: +8 per correct ✓ × size multiplier, −30 per hint, −10 per wrong mark found by Check. Winning adds a bonus plus a time bonus under par (4/8/13 min by size). Pick a curated preset (5 tiers, very easy → very hard) or generate a random puzzle on your difficulty — random puzzles always have exactly one guess-free solution.',
  assistFeatures: [
    {
      id: 'autoCross',
      name: 'Auto-cross',
      description: 'Placing a ✓ automatically crosses out the rest of its row and column in that block. Counts as help.',
      defaultOn: true
    },
    {
      id: 'check',
      name: 'Check button',
      description: 'Flags any marks that contradict the solution (−10 each). Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint button',
      description: 'Fixes a mistake, or reveals one correct ✓ (−30). Counts as help when used.',
      defaultOn: true
    }
  ]
};
