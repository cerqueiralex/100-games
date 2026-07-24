import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { SimonGame } from './SimonGame';
import { simonTutorial } from './tutorial';
import { mastery } from './mastery';

export const simonDefinition: GameDefinition = {
  id: 'simon',
  category: 'memory',
  name: 'Simon',
  tagline: 'Repeat ever-longer color and sound sequences.',
  icon: gameIcons['simon'],
  component: SimonGame,
  tutorial: simonTutorial,
  mastery,
  scoringNote:
    'Scoring: round length × 10 × difficulty multiplier for every sequence you repeat. Reach round 8/12/16/20/24 (easy → extreme) to win — playback gets faster every tier. One wrong pad ends the game — unless Second chances is on.',
  assistFeatures: [
    {
      id: 'secondChance',
      name: 'Second chances',
      description: 'Survive up to 2 wrong presses — the sequence replays. Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'slowPlayback',
      name: 'Slow playback',
      description: 'Sequences play back 50% slower. Counts as help.',
      defaultOn: false
    },
    {
      id: 'repeatSequence',
      name: 'Replay button',
      description: 'Re-watch the current sequence during your turn. Counts as help when used.',
      defaultOn: true
    }
  ]
};
