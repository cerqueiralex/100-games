import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { HashiGame } from './HashiGame';
import { hashiTutorial } from './tutorial';
import { mastery } from './mastery';

export const hashiDefinition: GameDefinition = {
  id: 'hashi',
  category: 'logic',
  name: 'Bridges',
  tagline: 'Link every island with the right number of bridges.',
  icon: gameIcons['hashi'],
  component: HashiGame,
  tutorial: hashiTutorial,
  mastery,
  scoringNote:
    'Every island bridged to its exact number scores 30 × difficulty (1–5) on the win, plus the seconds left under par (3/5/8/11/15 min) × difficulty. Over-filling an island costs 15, each hint costs 40. Boards grow from 7×7 with 8 islands to 13×13 with 26 — every puzzle has exactly one solution.',
  assistFeatures: [
    {
      id: 'sat-check',
      name: 'Island check',
      description:
        'Islands turn green when their bridge count is exact and red when over-full. Counts as help while enabled.',
      defaultOn: true
    },
    {
      id: 'full-block',
      name: 'Lock full islands',
      description:
        'Satisfied islands dim and refuse extra bridges, so you cannot over-build by accident. Counts as help while enabled.',
      defaultOn: false
    },
    {
      id: 'hint',
      name: 'Hint button',
      description:
        'Sets one bridge to its correct count, fixing a wrong one first (−40). Counts as help when used.',
      defaultOn: true
    }
  ]
};
