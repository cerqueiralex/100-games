import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { MathdokuGame } from './MathdokuGame';
import { mathdokuTutorial } from './tutorial';
import { mastery } from './mastery';

export const mathdokuDefinition: GameDefinition = {
  id: 'mathdoku',
  category: 'numbers',
  name: 'MathDoku',
  tagline: 'A number square carved into arithmetic cages.',
  icon: gameIcons['mathdoku'],
  component: MathdokuGame,
  tutorial: mathdokuTutorial,
  mastery,
  scoringNote:
    'Scoring: +30 × tier per correctly placed cell (easy ×1 → extreme ×5), −30 per rule-breaking placement, −40 per hint. Winning adds 100 × tier plus a per-second bonus for finishing under par (5/8/12/16/20 min). Pro has bigger cages and no givens; Extreme hides the operations.',
  assistFeatures: [
    {
      id: 'cage-check',
      name: 'Cage check',
      description:
        'Completed cages turn green when their arithmetic works and red when it fails. Counts as help.',
      defaultOn: true
    },
    {
      id: 'dupes',
      name: 'Duplicate highlight',
      description: 'Marks digits that repeat within a row or column. Counts as help.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'A hint button that fills one correct cell for you. Counts as help.',
      defaultOn: true
    }
  ]
};
