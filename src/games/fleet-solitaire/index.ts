import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { FleetSolitaireGame } from './FleetSolitaireGame';
import { fleetSolitaireTutorial } from './tutorial';
import { mastery } from './mastery';

export const fleetSolitaireDefinition: GameDefinition = {
  id: 'fleet-solitaire',
  category: 'logic',
  name: 'Fleet Finder',
  tagline: 'Deduce the hidden fleet from the harbor counts.',
  icon: gameIcons['fleet-solitaire'],
  component: FleetSolitaireGame,
  tutorial: fleetSolitaireTutorial,
  mastery,
  scoringNote:
    'Scoring: +6 per correct ship cell × difficulty (1–5), −18 per wrong ship mark, −30 per hint, plus a time bonus of (par − your time) × difficulty on the win. Par 3/5/8/11/14 min. easy 6×6, medium 8×8, hard/pro 10×10 (pro gives fewer reveals); extreme 10×10 hides a 5-ship fleet with minimal reveals. Every puzzle has one solution — hard and easier are fully solvable by pure deduction.',
  assistFeatures: [
    {
      id: 'satCheck',
      name: 'Count check',
      description:
        'Row/column count chips turn green when the line is complete and red when too many ships are marked; touching ships are flagged. Counts as help.',
      defaultOn: true
    },
    {
      id: 'autoWater',
      name: 'Auto-water',
      description:
        'Fills the rest of a line with water once its ship count is met, and waters the diagonal corners of ship cells. Counts as help.',
      defaultOn: false
    },
    {
      id: 'hint',
      name: 'Hint',
      description: 'Reveals one correct cell (fixing a wrong mark first). Adds to your hint count.',
      defaultOn: true
    }
  ]
};
