import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { PatternRecallGame } from './PatternRecallGame';
import { patternRecallTutorial } from './tutorial';

export const patternRecallDefinition: GameDefinition = {
  id: 'pattern-recall',
  category: 'memory',
  name: 'Pattern Recall',
  tagline: 'A pattern flashes — light up the same cells from memory.',
  icon: gameIcons['pattern-recall'],
  component: PatternRecallGame,
  tutorial: patternRecallTutorial,
  scoringNote:
    'Scoring: each correct cell scores 5 × round × difficulty multiplier (1–5), plus a 25 × round × multiplier bonus for clearing a round. A wrong tap costs a life and 20 × multiplier points; each Peek costs 30 points. Winning adds 150 × multiplier plus 50 × multiplier per life left. Clear the target round (6/7/8/8/9) before your lives run out — the grid, lit-cell count and speed all ramp up as you go.',
  assistFeatures: [
    {
      id: 'slowFlash',
      name: 'Slow flash',
      description: 'The pattern stays lit 40% longer. Counts as help.',
      defaultOn: false
    },
    {
      id: 'countShown',
      name: 'Count reminder',
      description: 'Shows how many cells to tap, and how many are left. Counts as help.',
      defaultOn: true
    },
    {
      id: 'peek',
      name: 'Peek',
      description: 'Re-flash the pattern during your turn (up to 3 times). Counts as help when used.',
      defaultOn: false
    }
  ]
};
