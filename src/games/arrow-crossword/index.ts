import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { ArrowCrosswordGame } from './ArrowCrosswordGame';
import { arrowCrosswordTutorial } from './tutorial';
import { mastery } from './mastery';

export const arrowCrosswordDefinition: GameDefinition = {
  id: 'arrow-crossword',
  category: 'words',
  name: 'Arrow Crossword',
  tagline: 'The clues live in the grid — follow the arrows.',
  icon: gameIcons['arrow-crossword'],
  component: ArrowCrosswordGame,
  tutorial: arrowCrosswordTutorial,
  mastery,
  scoringNote:
    'Scoring: +15/20/30/40/50 points per correct letter (easy → extreme), −10 per error, −25 per reveal. Finish under par time (5/9/15/22/30 min) for a time bonus. Grids grow from 6×7 to 10×13 on extreme.',
  assistFeatures: [
    {
      id: 'autoCheck',
      name: 'Auto-check',
      description:
        'Wrong letters turn red — and count as errors — the moment you type them. Counts as help.'
    },
    {
      id: 'checkPuzzle',
      name: 'Check button',
      description:
        'Check the grid on demand: wrong letters get flagged and counted as errors. Counts as help when used.'
    },
    {
      id: 'reveal',
      name: 'Reveal',
      description: 'Buttons to reveal the selected letter or the whole answer. Counts as help when used.'
    },
    {
      id: 'skipFilled',
      name: 'Smart cursor',
      description: 'The cursor skips over cells you already filled. Pure convenience, not counted as help.'
    }
  ]
};
