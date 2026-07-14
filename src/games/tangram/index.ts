import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { TangramGame } from './TangramGame';
import { tangramTutorial } from './tutorial';

export const tangramDefinition: GameDefinition = {
  id: 'tangram',
  category: 'spatial',
  name: 'Tangram',
  tagline: 'Fit the seven pieces into the silhouette.',
  icon: gameIcons['tangram'],
  component: TangramGame,
  tutorial: tangramTutorial,
  scoringNote:
    'Cover the target silhouette with all seven pieces to win. Score = 400 × difficulty (1–5) + a time bonus for finishing under par (2/3/4/5/6 min), minus 40 per Hint used. Errors are always 0. Figures get trickier by tier — easy starts pieces near their spots, harder tiers scatter and rotate them and tighten the snap; extreme adds the rotated "Gem" and heavy scatter.',
  assistFeatures: [
    {
      id: 'snapStrong',
      name: 'Strong snap',
      description: 'Widens the catch radius so pieces click into place more easily. Counts as help while on.',
      defaultOn: true
    },
    {
      id: 'edgeHints',
      name: 'Guides',
      description: 'Draws the piece boundaries inside the target shape. Counts as help while on.',
      defaultOn: false
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'Drops one piece straight into its correct spot (−40 points). Counts as help when used.',
      defaultOn: true
    }
  ]
};
