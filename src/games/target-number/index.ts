import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { TargetNumberGame } from './TargetNumberGame';
import { targetNumberTutorial } from './tutorial';

export const targetNumberDefinition: GameDefinition = {
  id: 'target-number',
  category: 'numbers',
  name: 'Target Number',
  tagline: 'Reach the target from six numbers.',
  icon: gameIcons['target-number'],
  component: TargetNumberGame,
  tutorial: targetNumberTutorial,
  scoringNote:
    'Each round scores when you resolve it. An exact hit banks 100 × difficulty multiplier (1–5) plus a speed bonus of up to 30 × mult for a quick answer. Submitting a close value (within the tier tolerance) banks up to 60 × mult, scaled by how near you landed. Each Hint costs 6 × mult points; Reveal shows the full solution and forfeits that round. Finishing all rounds banks a win bonus of 120 × mult plus 15 × mult per exactly-solved round. Errors are dead-end resets and too-far submits. Play every round of the tier to win; a clean win uses no hints or assists.',
  assistFeatures: [
    {
      id: 'reachable',
      name: 'Reachable badge',
      description: 'Confirms the target is exactly reachable from the dealt numbers. Counts as help while on.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'Highlights the next combine step toward a solution. Counts as help when used.',
      defaultOn: true
    },
    {
      id: 'reveal',
      name: 'Reveal solution',
      description: 'Shows a full solution and forfeits the round’s points. Counts as help when used.',
      defaultOn: false
    }
  ]
};
