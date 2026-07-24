import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { HousePuzzlesGame } from './HousePuzzlesGame';
import { housePuzzlesTutorial } from './tutorial';
import { mastery } from './mastery';

export const housePuzzlesDefinition: GameDefinition = {
  id: 'house-puzzles',
  category: 'logic',
  name: 'House Puzzles',
  tagline: 'Who lives where? Deduce every house from positional clues.',
  icon: gameIcons['house-puzzles'],
  component: HousePuzzlesGame,
  tutorial: housePuzzlesTutorial,
  mastery,
  scoringNote:
    'Scoring: +8 per correct ✓ × difficulty multiplier, −30 per hint, −10 per wrong mark found by Check; winning adds a bonus plus a time bonus under par (4–18 min by tier). Puzzles grow from 4 houses × 3 categories to 6 × 5 on extreme — always one unique, guess-free solution.',
  assistFeatures: [
    {
      id: 'autoCross',
      name: 'Auto-cross',
      description: 'Placing a ✓ crosses out the rest of its row and column automatically. Counts as help.',
      defaultOn: true
    },
    {
      id: 'check',
      name: 'Check marks',
      description: 'A button that highlights any wrong marks on the grid. Counts as help.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'Fixes a wrong mark, or reveals one correct ✓. Counts as help.',
      defaultOn: true
    }
  ]
};
