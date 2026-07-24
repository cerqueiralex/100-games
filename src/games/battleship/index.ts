import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { BattleshipGame } from './BattleshipGame';
import { battleshipTutorial } from './tutorial';
import { mastery } from './mastery';

export const battleshipDefinition: GameDefinition = {
  id: 'battleship',
  category: 'strategy',
  name: 'Battleship',
  tagline: 'Place your fleet, call your shots, sink theirs first.',
  icon: gameIcons['battleship'],
  component: BattleshipGame,
  tutorial: battleshipTutorial,
  mastery,
  scoringNote:
    'Scoring: +20 per hit and +60 per ship sunk (×1–5 by difficulty), −40 per radar ping. Winning adds a bonus for every surviving segment of your fleet and for finishing under par. The enemy aims smarter with difficulty — and on pro/extreme it fires 2/3-shot salvos.',
  assistFeatures: [
    {
      id: 'radar',
      name: 'Radar ping',
      description: 'A button that reveals one enemy ship cell to fire at. Counts as help.',
      defaultOn: true
    },
    {
      id: 'autoWater',
      name: 'Auto-mark water',
      description:
        'When an enemy ship sinks, the water around it is marked as misses for you. Counts as help.',
      defaultOn: true
    }
  ]
};
