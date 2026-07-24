import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { MemoryMatchGame } from './MemoryMatchGame';
import { memoryMatchTutorial } from './tutorial';
import { mastery } from './mastery';

export const memoryMatchDefinition: GameDefinition = {
  id: 'memory-match',
  category: 'memory',
  name: 'Memory Match',
  tagline: 'Flip the cards and find every matching pair.',
  icon: gameIcons['memory-match'],
  component: MemoryMatchGame,
  tutorial: memoryMatchTutorial,
  mastery,
  scoringNote:
    'Scoring: +50/75/100/125/150 per pair (easy → extreme) plus streak bonuses for consecutive matches, −10 per miss, −25 per peek. Finish under par time for a bonus. Boards grow to 6×7 on pro and 7×8 on extreme.',
  assistFeatures: [
    {
      id: 'previewStart',
      name: 'Opening peek',
      description: 'All cards are revealed for ~3 seconds when the game starts. Counts as help.',
      defaultOn: false
    },
    {
      id: 'peek',
      name: 'Peek button',
      description: 'Briefly reveal every card for one second (−25 points). Counts as help when used.',
      defaultOn: true
    }
  ]
};
