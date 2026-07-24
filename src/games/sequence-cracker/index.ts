import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { SequenceCrackerGame } from './SequenceCrackerGame';
import { sequenceCrackerTutorial } from './tutorial';
import { mastery } from './mastery';

export const sequenceCrackerDefinition: GameDefinition = {
  id: 'sequence-cracker',
  category: 'numbers',
  name: 'Sequence Cracker',
  tagline: 'Find the rule, predict the next number.',
  icon: gameIcons['sequence-cracker'],
  component: SequenceCrackerGame,
  tutorial: sequenceCrackerTutorial,
  mastery,
  scoringNote:
    'Scoring: +20 per solved puzzle × difficulty multiplier (1/2/3/4/5 for easy→extreme), plus a streak bonus of +6 × multiplier × your current solve streak. Win the round (solve the target: 5/6/6/6/7) for +120 × multiplier and +25 × multiplier for each life still standing. The Rule hint costs −15 × multiplier. Errors are wrong answers — each also costs a life.',
  assistFeatures: [
    {
      id: 'ruleHint',
      name: 'Rule hint',
      description:
        'A button that names the current rule family (e.g. "Quadratic"). Counts as help and costs points.',
      defaultOn: true
    },
    {
      id: 'showDifferences',
      name: 'Show differences',
      description:
        'Prints the gap between each pair of terms below the sequence — a big scaffold for spotting the pattern. Counts as help.',
      defaultOn: false
    },
    {
      id: 'narrow',
      name: 'Narrow the rules',
      description:
        'Restricts puzzles to add / multiply patterns only (no effect on easy, which is already limited to those). Counts as help.',
      defaultOn: false
    }
  ]
};
