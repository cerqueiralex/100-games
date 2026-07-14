import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { ConnectFourGame } from './ConnectFourGame';
import { connectFourTutorial } from './tutorial';

export const connectFourDefinition: GameDefinition = {
  id: 'connect-four',
  category: 'strategy',
  name: 'Connect Four',
  tagline: 'Drop discs, connect four, beat the robot or a friend.',
  icon: gameIcons['connect-four'],
  component: ConnectFourGame,
  tutorial: connectFourTutorial,
  scoringNote:
    'Pick your opponent (robot or a friend on this phone), your disc colour and the round count on the match menu. Most round wins takes the match; a tie goes to sudden death. +100 × difficulty per round win, plus a match-win bonus (150 × difficulty). Hints cost 30 points each. The robot searches deeper with difficulty — pro is near-flawless, and on extreme it also opens every round.',
  assistFeatures: [
    {
      id: 'threatWarn',
      name: 'Block warning',
      description: 'Lights up any column where your opponent could win on their next drop. Counts as help whenever enabled.',
      defaultOn: true
    },
    {
      id: 'suggest',
      name: 'Suggest move',
      description: 'Highlights a strong column for you (vs the robot only). Counts as help when used.',
      defaultOn: false
    },
    {
      id: 'undo',
      name: 'Undo (pass & play)',
      description: 'Take back the last drop in a friend match. Counts as help when used.',
      defaultOn: false
    }
  ]
};
