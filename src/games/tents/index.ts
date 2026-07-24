import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { TentsGame } from './TentsGame';
import { tentsTutorial } from './tutorial';
import { mastery } from './mastery';

export const tentsDefinition: GameDefinition = {
  id: 'tents',
  category: 'logic',
  name: 'Tents & Trees',
  tagline: 'Pitch a tent by every tree — no two tents touch.',
  icon: gameIcons['tents'],
  component: TentsGame,
  tutorial: tentsTutorial,
  mastery,
  scoringNote:
    'Pitch every tent on boards from 6×6 (8 tents) up to 12×12 (29 tents). +12 per tent × difficulty (1–5), −15 per misplaced tent, −40 per hint, plus 1 pt/sec under par (3/5/7/9/12 min) × difficulty on a win.',
  assistFeatures: [
    {
      id: 'pairCheck',
      name: 'Pair check',
      description:
        'Flags trees that can no longer reach a tent and tents that touch each other. Counts as help.',
      defaultOn: true
    },
    {
      id: 'autoGrass',
      name: 'Auto grass',
      description:
        'Marks the rest of a row or column as grass once its tent count is met. Counts as help.',
      defaultOn: false
    },
    {
      id: 'hint',
      name: 'Hint button',
      description: 'Places one correct tent or grass mark (−40). Counts as help when used.',
      defaultOn: true
    }
  ]
};
