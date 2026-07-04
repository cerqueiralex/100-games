import type { GameDefinition } from '../../platform/types';
import { CryptogramGame } from './CryptogramGame';
import { cryptogramTutorial } from './tutorial';

export const cryptogramDefinition: GameDefinition = {
  id: 'cryptogram',
  category: 'words',
  name: 'Cryptogram',
  tagline: 'Fill the clued words hidden behind a picture code — and reveal the secret vertical answer.',
  icon: 'X→A',
  component: CryptogramGame,
  tutorial: cryptogramTutorial,
  scoringNote:
    'Each word verified with Check earns 60/80/100 points (easy/medium/hard); a failed check costs −15, each hint −30. Solve every row under par time (6/9/12 min) for a time bonus.',
  assistFeatures: [
    {
      id: 'echo',
      name: 'Icon echo',
      description:
        'Typing a letter also fills every empty tile that shares the same picture. Counts as help while enabled.',
      defaultOn: true
    },
    {
      id: 'reveal',
      name: 'Hint: reveal tile',
      description:
        'The Hint button reveals the correct letter in the selected tile (−30). Counts as help when used.',
      defaultOn: true
    }
  ]
};
