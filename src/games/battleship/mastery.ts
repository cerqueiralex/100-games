import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Battleship" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Battleship began as a French pencil-and-paper game (L\'Attaque navale) around World War I, spread as a pad-and-pencil pastime in the 1930s, and became the famous plastic peg game when Milton Bradley boxed it in 1967 in the USA. It has since been studied extensively as a probability-search problem.',
  intro:
    'Mastery has two halves: hiding your fleet where search patterns look last, and hunting with probability instead of hope. Every shot should either maximize the chance of a first hit (search mode) or squeeze a wounded ship efficiently (target mode) — and the switch between modes is where games are won.',
  sections: [
    {
      title: 'Hunt with parity',
      art: {
        kind: 'grid',
        rows: ['h.h.h', '.h.h.', 'h.h.h', '.h.h.'],
        caption: 'The parity lattice: every 2-ship must cover a highlighted cell'
      },
      bullets: [
        '♟️ Your smallest target is 2 long, so first hits only need HALF the board: shoot one color of the checkerboard and you cannot miss a ship forever.',
        '📐 When only length-3+ ships remain, widen the lattice to every third cell — recompute your parity as the fleet shrinks.',
        '🎯 Prefer central lattice cells early: more ship placements cross the middle than any edge, so central misses eliminate more arrangements.'
      ]
    },
    {
      title: 'Switch to target mode properly',
      art: {
        kind: 'grid',
        rows: ['.h.', 'h💥h', '.h.'],
        caption: 'After a hit, probe orthogonals — prefer the direction with more room'
      },
      bullets: [
        '💥 After a hit, shoot an orthogonal neighbor — prefer the direction with more open room, since long ships need space.',
        '📏 Two hits in a line: extend the LINE, never the sides, until sunk or blocked; if blocked, jump to the other end of the line.',
        '🌊 After sinking, mark the no-longer-possible cells around the wreck mentally (or with the auto-water assist) and return to your parity lattice — lingering near old wrecks is the classic time-waster.'
      ]
    },
    {
      title: 'Count what\'s left',
      art: {
        kind: 'grid',
        rows: ['xuuxuu', 'x.....'],
        caption: 'Hunting a 5-length: the top row\'s gaps are dead, the bottom still fits it'
      },
      bullets: [
        '📋 Track the enemy fleet panel: hunting for a 5-length carrier means ignoring every gap shorter than 5 — huge board sections become dead.',
        '🧩 A hit that cannot belong to any remaining ship\'s legal placements tells you an adjacent cell is part of the SAME wounded ship — use fleet lengths to disambiguate touching ships.',
        '🧮 Late game, literally count placements: with two ships left, most boards have under a dozen legal arrangements; shoot the cell shared by the most.'
      ]
    },
    {
      title: 'Placing your own fleet',
      art: {
        kind: 'grid',
        rows: ['#....', '#..##', '.....', '..#..'],
        caption: 'Spread the fleet and mix edges with center — predictability is the sin'
      },
      bullets: [
        '🎭 Break up your own patterns: humans and AIs alike sweep centers and lattices first, so edges and corners survive longer — but never place ALL ships on edges, predictability is the real sin.',
        '↔️ Avoid placing ships touching each other: one discovered ship then gives away the neighborhood of a second (this app\'s rules allow touching — decline the invitation).',
        '💣 On pro/extreme the enemy fires salvos — spreading ships far apart means one lucky salvo can\'t wound two ships at once.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '📡🤖🎯',
        caption: 'Watch how the AI hunts — then steal its pattern'
      },
      bullets: [
        '🤖 This app\'s higher-tier AI hunts by probability density — play against it as a masterclass: notice WHERE it searches and steal the pattern.',
        '⚡ Score rewards intact ships and fast wins: practice the parity lattice until first hits come reliably under ten shots.',
        '📡 Use the radar assist only to study, not to win — a pinged cell teaches you what your search pattern was missing (and costs points).'
      ]
    }
  ],
  references: [
    {
      label: 'Battleship (game) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Battleship_(game)',
      note: 'history from pencil-and-paper to Milton Bradley'
    },
    {
      label: 'Battleship (puzzle) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Battleship_(puzzle)',
      note: 'the deduction cousin — its constraint thinking sharpens endgame counting'
    }
  ]
};
