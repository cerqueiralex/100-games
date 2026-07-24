import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { UntangleGame } from './UntangleGame';
import { untangleTutorial } from './tutorial';
import { mastery } from './mastery';

export const untangleDefinition: GameDefinition = {
  id: 'untangle',
  category: 'spatial',
  name: 'Untangle',
  tagline: 'Drag the nodes until no lines cross.',
  icon: gameIcons['untangle'],
  component: UntangleGame,
  tutorial: untangleTutorial,
  mastery,
  scoringNote:
    'A planar web of nodes starts scrambled with many crossings; drag nodes until zero lines cross. Score = 400 × difficulty (1–5) + a time bonus under par (1/2/3.5/5.5/9 min) + a fewer-moves bonus (150 × difficulty × nodes ÷ (nodes + moves)), minus 60 per Hint used. Graphs are freshly generated every game (6 nodes on easy up to 22 on extreme) and always solvable because a planar layout exists by construction.',
  assistFeatures: [
    {
      id: 'highlight-crossings',
      name: 'Crossing highlights',
      description:
        'Tints crossed lines red, clear lines green, and shows the live crossings counter. Turn off for a pure challenge. Counts as help.',
      defaultOn: true
    },
    {
      id: 'auto-spread',
      name: 'Spread',
      description: 'A tool that gently relaxes the layout to reduce clutter (does not solve it). Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'A tool that slides one node into a solved position (−60 points). Counts as help when used.',
      defaultOn: true
    }
  ]
};
