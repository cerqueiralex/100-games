import type { GameDefinition } from '../../platform/types';
import { NumberMergeGame } from './NumberMergeGame';
import { numberMergeTutorial } from './tutorial';

export const numberMergeDefinition: GameDefinition = {
  id: 'number-merge',
  category: 'numbers',
  name: 'Number Merge',
  tagline: 'Drag chains of numbers and merge your way to the goal tile.',
  icon: '248',
  component: NumberMergeGame,
  tutorial: numberMergeTutorial,
  scoringNote:
    'Every merge scores its resulting tile. Chains start with two equal tiles and may continue onto equal-or-double values. Reach 256/512/1024 (easy/medium/hard) to win; run out of moves and it is game over.',
  assistFeatures: [
    {
      id: 'undo',
      name: 'Undo',
      description: 'Take back up to 3 merges per game. Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'showHint',
      name: 'Hint button',
      description: 'Highlights a pair you can merge. Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'chainPreview',
      name: 'Chain preview',
      description: 'Shows the tile your current chain will create while dragging. Counts as help.',
      defaultOn: true
    }
  ]
};
