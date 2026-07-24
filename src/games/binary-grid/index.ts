import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { BinaryGridGame } from './BinaryGridGame';
import { binaryGridTutorial } from './tutorial';
import { mastery } from './mastery';

export const binaryGridDefinition: GameDefinition = {
  id: 'binary-grid',
  category: 'logic',
  name: 'Binary Grid',
  tagline: 'Balance suns and moons — never three in a row.',
  icon: gameIcons['binary-grid'],
  component: BinaryGridGame,
  tutorial: binaryGridTutorial,
  mastery,
  scoringNote:
    'Fill boards from 6×6 up to 12×12 (hard and above add the no-identical-lines rule; every board has a single solution). +5 per placed cell × difficulty (1–5), −10 per rule break, −25 per hint, plus a time bonus under par (3/5/8/10/14 min).',
  assistFeatures: [
    {
      id: 'violations',
      name: 'Rule-break highlights',
      description: 'Cells breaking a rule glow red as you play. Counts as help while on.',
      defaultOn: true
    },
    {
      id: 'counts',
      name: 'Row & column counters',
      description: 'Gutters show how many suns and moons each line still needs. Counts as help while on.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint button',
      description: 'Fills one logically-forced cell and explains the rule (−25). Counts as help when used.',
      defaultOn: true
    }
  ]
};
