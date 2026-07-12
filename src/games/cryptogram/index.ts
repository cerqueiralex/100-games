import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { CryptogramGame } from './CryptogramGame';
import { cryptogramTutorial } from './tutorial';

export const cryptogramDefinition: GameDefinition = {
  id: 'cryptogram',
  category: 'words',
  name: 'Cryptogram',
  tagline: 'Fill the clued words hidden behind a picture code — and reveal the secret vertical answer.',
  icon: gameIcons['cryptogram'],
  component: CryptogramGame,
  tutorial: cryptogramTutorial,
  scoringNote:
    'Each word verified with Check earns 60/80/100/120/140 points (easy → extreme); a failed check costs −15, each hint −30. Solve every row under par time (6/9/12/15/18 min) for a time bonus. Longer hidden answers on pro and extreme.',
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
