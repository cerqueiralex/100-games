import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { MemoryMatchGame } from './MemoryMatchGame';
import { MEMORY_THEME_LIST } from './logic/themes';
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
  /* Derived from the theme table, never a second list: adding a theme in
     logic/themes.tsx puts it on the setup screen automatically. */
  options: [
    {
      id: 'theme',
      name: 'Card theme',
      description:
        'What the cards are made of. Purely cosmetic — every theme deals the same board sizes and scores the same, so a theme never counts as help.',
      choices: MEMORY_THEME_LIST.map((t) => ({ id: t.id, label: t.label, icon: t.preview })),
      defaultChoice: 'standard'
    }
  ],
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
