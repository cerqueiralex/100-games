import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { MathSprintGame } from './MathSprintGame';
import { mathSprintTutorial } from './tutorial';

export const mathSprintDefinition: GameDefinition = {
  id: 'math-sprint',
  category: 'numbers',
  name: 'Math Sprint',
  tagline: 'Solve as many as you can before the clock runs out.',
  icon: gameIcons['math-sprint'],
  component: MathSprintGame,
  tutorial: mathSprintTutorial,
  scoringNote:
    'Each correct answer scores 10 points × your streak multiplier × the difficulty multiplier (1/2/3/4/5 for easy→extreme), plus a speed bonus for answering before the per-problem timer empties. Three correct in a row earns ×1.5, six ×2, climbing to ×3. Wrong answers and per-problem timeouts reset the streak and cost 3 seconds; each solve gets harder as your streak grows. Reach the tier target before the overall clock runs out for a win bonus of 120 × difficulty plus 4 points per remaining second (× difficulty). Nudge costs 15 points.',
  assistFeatures: [
    {
      id: 'moreTime',
      name: 'More time',
      description: 'Adds 20% to the overall clock. Counts as help whenever it is enabled.',
      defaultOn: false
    },
    {
      id: 'simpleMode',
      name: 'Simple mode',
      description: 'Stops problems from getting harder as your streak grows. Counts as help whenever it is enabled.',
      defaultOn: false
    },
    {
      id: 'skip',
      name: 'Skip button',
      description: 'Shows a Skip tool that jumps past the current problem for a small time cost. Counts as help each time you tap it.',
      defaultOn: true
    },
    {
      id: 'nudge',
      name: 'Nudge button',
      description: 'Shows a Nudge tool that reveals the answer’s digit count and tens digit (−15 points, counts as help each time you tap it).',
      defaultOn: false
    }
  ]
};
