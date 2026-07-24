import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { ReversiGame } from './ReversiGame';
import { reversiTutorial } from './tutorial';
import { mastery } from './mastery';

export const reversiDefinition: GameDefinition = {
  id: 'reversi',
  category: 'strategy',
  name: 'Reversi',
  tagline: 'Flip discs, own the board, outsmart the robot.',
  icon: gameIcons['reversi'],
  component: ReversiGame,
  tutorial: reversiTutorial,
  mastery,
  scoringNote:
    'Outflank a line of the opponent’s discs to flip them; most discs when the board fills wins. Winning scores a 400 base + 12 per disc of your margin, all times the difficulty multiplier (×1 easy … ×5 extreme), minus 60 per hint. The robot deepens its search with difficulty — medium looks 3 moves ahead, extreme 8+ with corner-aware, endgame-exact play. Two-player matches show who won by how much from the phone owner’s side.',
  assistFeatures: [
    {
      id: 'legal-dots',
      name: 'Legal-move dots',
      description: 'Marks every square you may play on. Turn it off for a stiffer challenge; counts as help.',
      defaultOn: true
    },
    {
      id: 'disc-count',
      name: 'Live disc tally',
      description: 'Shows the running disc count for both sides. Counts as help while enabled.',
      defaultOn: true
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'Highlights a strong move via a quick search (vs Robot only). Counts as a hint.',
      defaultOn: true
    }
  ]
};
