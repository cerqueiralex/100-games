import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { BackwardsSpanGame } from './BackwardsSpanGame';
import { backwardsSpanTutorial } from './tutorial';
import { mastery } from './mastery';

export const backwardsSpanDefinition: GameDefinition = {
  id: 'backwards-span',
  category: 'memory',
  name: 'Backwards Span',
  tagline: 'Watch the sequence, then enter it in reverse.',
  icon: gameIcons['backwards-span'],
  component: BackwardsSpanGame,
  tutorial: backwardsSpanTutorial,
  mastery,
  scoringNote:
    'Symbols flash one at a time; re-enter the sequence — backwards on every tier except Easy (which keeps the order). Each fully-correct round scores span × span × difficulty multiplier (1–5), plus a 30×mult span-up bonus; reaching the target span adds a 120×mult win bonus. A wrong answer costs a life and −12×mult; each Replay costs 20. Reach span 7/7/8/8/9 (easy → extreme) to win; run out of lives and it ends. errors = wrong entries; spanReached records the longest sequence recalled.',
  assistFeatures: [
    {
      id: 'direction-reminder',
      name: 'Direction reminder',
      description: 'Keeps the reverse/forward arrow on screen while you type. Counts as help.',
      defaultOn: true
    },
    {
      id: 'slow-flash',
      name: 'Slow flash',
      description: 'Shows each symbol 40% longer during presentation. Counts as help.',
      defaultOn: false
    },
    {
      id: 'replay',
      name: 'Replay',
      description: 'Re-watch the current sequence — up to 3 times per run. Counts as help when used.',
      defaultOn: true
    }
  ]
};
