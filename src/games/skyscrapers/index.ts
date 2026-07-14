import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { SkyscrapersGame } from './SkyscrapersGame';
import { skyscrapersTutorial } from './tutorial';

export const skyscrapersDefinition: GameDefinition = {
  id: 'skyscrapers',
  category: 'logic',
  name: 'Skyscrapers',
  tagline: 'Place every tower so the edge clues see the right skyline.',
  icon: gameIcons['skyscrapers'],
  component: SkyscrapersGame,
  tutorial: skyscrapersTutorial,
  scoringNote:
    'Scoring: every placed tower banks 20/40/60/80/100 points (easy → extreme) once the skyline is solved; −50 per flagged contradiction, −25 per hint. Finish under par time (4/9/15/22/32 min) for 1–5 bonus points per second saved. Boards grow from 4×4 to 7×7; hard strips the clues to the minimum.',
  assistFeatures: [
    {
      id: 'clue-check',
      name: 'Clue check',
      description:
        'When a row or column is complete, its edge clues turn green if satisfied and red if broken. Counts as help.',
      defaultOn: true
    },
    {
      id: 'dupes',
      name: 'Highlight repeats',
      description:
        'Flags towers that repeat a height already used in their row or column. Counts as help.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hints',
      description: 'A hint button that builds one correct tower for you. Counts as help.',
      defaultOn: true
    }
  ]
};
