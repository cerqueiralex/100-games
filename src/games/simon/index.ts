import type { GameDefinition } from '../../platform/types';
import { SimonGame } from './SimonGame';
import { simonTutorial } from './tutorial';

export const simonDefinition: GameDefinition = {
  id: 'simon',
  category: 'memory',
  name: 'Simon',
  tagline: 'Repeat ever-longer color and sound sequences.',
  icon: '◉◉',
  component: SimonGame,
  tutorial: simonTutorial,
  scoringNote:
    'Scoring: round length × 10 × difficulty multiplier for every sequence you repeat. Reach round 8/12/16 (easy/medium/hard) to win. One wrong pad ends the game — unless Second chances is on.',
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
