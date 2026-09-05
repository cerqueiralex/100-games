import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { SnakeGame } from './SnakeGame';
import { snakeTutorial } from './tutorial';
import { mastery } from './mastery';

export const snakeDefinition: GameDefinition = {
  id: 'snake',
  category: 'reflex',
  name: 'Snake',
  tagline: 'Eat, grow, and never bite your own tail.',
  icon: gameIcons['snake'],
  component: SnakeGame,
  tutorial: snakeTutorial,
  mastery,
  scoringNote:
    'Steer the snake into the apples — swipe, the D-pad or the arrow keys. Every apple adds a segment and a little speed; hit a wall or your own body and the run is over. Each tier plays on a bigger board, faster, and asks for more apples: 12 on easy up to 40 on extreme. An apple pays 10 × difficulty (1–5), apples eaten within 2.5 s of each other build a combo worth 2 × difficulty extra per link, and reaching the target adds 100 × difficulty. No daily challenge — the apples land at random while you play.',
  assistFeatures: [
    {
      id: 'slow',
      name: 'Slow pace',
      description: 'The snake moves a third slower for the whole run. Counts as help while on.'
    },
    {
      id: 'wrap',
      name: 'Wall wrap',
      description: 'Walls no longer kill: the snake comes out on the opposite side. Counts as help while on.'
    }
  ],
  easterEggs: [
    {
      id: 'frenzy',
      title: 'Feeding frenzy',
      requirement: 'Won a run with a combo of eight apples, each within 2.5 seconds of the last.',
      emoji: '🐍',
      slot: 1,
      when: (r) => r.outcome === 'won' && Number(r.extra?.bestCombo ?? 0) >= 8
    }
  ]
};
