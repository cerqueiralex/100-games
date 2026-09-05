import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { BlockDropGame } from './BlockDropGame';
import { blockDropTutorial } from './tutorial';
import { mastery } from './mastery';

export const blockDropDefinition: GameDefinition = {
  id: 'block-drop',
  category: 'reflex',
  name: 'Block Drop',
  tagline: 'Falling tetrominoes — stack flat, clear lines, survive the speed.',
  icon: gameIcons['block-drop'],
  component: BlockDropGame,
  tutorial: blockDropTutorial,
  mastery,
  scoringNote:
    'Seven pieces fall into a ten-wide well; full rows clear. Move with the buttons, the arrow keys or by dragging on the well; tap or ↑/X to turn, Z to turn back, Space or a flick down to hard-drop, C to hold. Clear the tier’s line target to win — 10 lines on easy up to 50 on extreme — and every 10 lines raises the level and the speed. Lines pay 100 / 300 / 500 / 800 × level for 1 / 2 / 3 / 4 at once, soft drops 1 a row and hard drops 2 a row; finishing adds 500 × difficulty (1–5). Pieces come from a 7-bag, so every shape appears once per seven. No daily challenge — the bags are drawn while you play.',
  assistFeatures: [
    {
      id: 'slow',
      name: 'Slow gravity',
      description: 'Pieces fall at two-thirds speed for the whole run. Counts as help while on.'
    },
    {
      id: 'undo',
      name: 'Undo piece',
      description: 'Take back your last placed piece, up to 3 times per game. Counts as help when used.'
    }
  ],
  easterEggs: [
    {
      id: 'four',
      title: 'Four at once',
      requirement: 'Won a run that included a four-line clear.',
      emoji: '🧱',
      slot: 6,
      when: (r) => r.outcome === 'won' && Number(r.extra?.tetrises ?? 0) >= 1
    }
  ]
};
