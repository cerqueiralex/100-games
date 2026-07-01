import type { GameDefinition } from '../../platform/types';
import { MemoryMatchGame } from './MemoryMatchGame';
import { memoryMatchTutorial } from './tutorial';

export const memoryMatchDefinition: GameDefinition = {
  id: 'memory-match',
  name: 'Memory Match',
  tagline: 'Flip the cards and find every matching pair.',
  icon: '◆◆',
  component: MemoryMatchGame,
  tutorial: memoryMatchTutorial,
  scoringNote:
    'Scoring: +50/75/100 per pair (easy/medium/hard) plus streak bonuses for consecutive matches, −10 per miss, −25 per peek. Finish under par time (1.5/3.5/5 min) for a time bonus.',
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
