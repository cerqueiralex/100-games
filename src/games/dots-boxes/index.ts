import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { DotsBoxesGame } from './DotsBoxesGame';
import { dotsBoxesTutorial } from './tutorial';
import { mastery } from './mastery';

export const dotsBoxesDefinition: GameDefinition = {
  id: 'dots-boxes',
  category: 'strategy',
  name: 'Dots & Boxes',
  tagline: 'Close the most boxes — mind the chains.',
  icon: gameIcons['dots-boxes'],
  component: DotsBoxesGame,
  tutorial: dotsBoxesTutorial,
  mastery,
  scoringNote:
    'Draw edges; completing the 4th side of a box claims it and gives you another turn. Most boxes wins. Score = (boxes × 10 + win bonus of 100 + 20 per box of winning margin) × difficulty multiplier (easy 1 … extreme 5), minus 25 per hint. Board grows with difficulty (3×3 → 6×6) and the robot gets sharper: easy plays at random but grabs free boxes; medium never gives a box away; hard opens the shortest chain when forced; pro and extreme run the double-cross endgame — taking all but two of a chain to keep control of the parity. Pass-and-play matches show who won instead of your stats.',
  assistFeatures: [
    {
      id: 'box-count',
      name: 'Box count',
      description: 'Show the live box score for both sides. Counts as help while on.',
      defaultOn: true
    },
    {
      id: 'safe-edges',
      name: 'Safe edges',
      description: 'Subtly mark edges that will not hand your opponent a box. Counts as help while on.',
      defaultOn: false
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'Suggest a strong edge (vs the robot). Each use counts as help.',
      defaultOn: true
    }
  ]
};
