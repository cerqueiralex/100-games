import type { GameDefinition } from '../../platform/types';
import { CryptogramGame } from './CryptogramGame';
import { cryptogramTutorial } from './tutorial';

export const cryptogramDefinition: GameDefinition = {
  id: 'cryptogram',
  category: 'words',
  name: 'Cryptogram',
  tagline: 'Crack the substitution cipher to reveal the hidden phrase.',
  icon: 'X→A',
  component: CryptogramGame,
  tutorial: cryptogramTutorial,
  scoringNote:
    'Decode the phrase: +25/35/50 points per solved letter (easy/medium/hard), −10 per wrong guess, −25 per revealed letter. Finish under par time (4/7/10 min) for a time bonus.',
  assistFeatures: [
    {
      id: 'autoCheck',
      name: 'Auto-check',
      description: 'Wrong guesses are marked red the moment you type them. Counts as help.',
      defaultOn: true
    },
    {
      id: 'reveal',
      name: 'Reveal letter',
      description: 'Unlocks the correct mapping for the selected letter (−25). Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'frequency',
      name: 'Letter frequency',
      description: 'Shows how often each cipher letter appears — a classic decoding aid. Counts as help.',
      defaultOn: false
    }
  ]
};
