import type { GameDefinition } from '../../platform/types';
import { CrosswordGame } from './CrosswordGame';
import { crosswordTutorial } from './tutorial';

export const crosswordDefinition: GameDefinition = {
  id: 'crossword',
  name: 'Crossword',
  tagline: 'Solve the clues and fill the crossing words.',
  icon: 'A–Z',
  component: CrosswordGame,
  tutorial: crosswordTutorial,
  scoringNote:
    'Scoring: +15/20/30 points per correct letter (easy/medium/hard), −10 per error, −25 per reveal. Finish under par time (6/12/20 min) for a time bonus.',
  assistFeatures: [
    {
      id: 'autoCheck',
      name: 'Auto-check',
      description: 'Wrong letters are marked red the moment you type them. Counts as help.',
      defaultOn: true
    },
    {
      id: 'checkPuzzle',
      name: 'Check button',
      description: 'Check the grid on demand; wrong letters get flagged. Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'reveal',
      name: 'Reveal',
      description: 'Buttons to reveal the selected letter or the whole word. Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'skipFilled',
      name: 'Smart cursor',
      description: 'The cursor skips over cells you already filled. Pure convenience, not counted as help.',
      defaultOn: true
    }
  ]
};
