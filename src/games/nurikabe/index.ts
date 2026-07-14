import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { NurikabeGame } from './NurikabeGame';
import { nurikabeTutorial } from './tutorial';

export const nurikabeDefinition: GameDefinition = {
  id: 'nurikabe',
  category: 'logic',
  name: 'Nurikabe',
  tagline: 'Grow numbered islands in one connected sea.',
  icon: gameIcons['nurikabe'],
  component: NurikabeGame,
  tutorial: nurikabeTutorial,
  scoringNote:
    'Paint a grid into numbered islands and one connected sea (no 2×2 sea, islands never touch) on boards from 5×5 up to 10×10 on extreme. Solve the whole board to score +5 per cell × difficulty (1–5), minus 20 per error and 30 per hint, plus a time bonus under par (2/4/6/9/14 min).',
  assistFeatures: [
    {
      id: 'ruleCheck',
      name: 'Rule check',
      description: 'Outlines broken rules in red — 2×2 sea, touching or oversized islands, cut-off sea — and flags wrong paints. Counts as help.',
      defaultOn: true
    },
    {
      id: 'completeIslands',
      name: 'Complete islands',
      description: 'Dims and outlines an island once it reaches its number, so finished islands drop away. Counts as help when enabled.',
      defaultOn: false
    },
    {
      id: 'hint',
      name: 'Hint button',
      description: 'Paints the next cell that logic forces (−30). Counts as help when used.',
      defaultOn: true
    }
  ]
};
