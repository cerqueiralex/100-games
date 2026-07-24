import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Aquarium" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Aquarium is a modern logic puzzle popularized in the 2010s by online puzzle sites (notably puzzle-aquarium.com) and puzzle magazines, building on the region-plus-counts tradition that Japanese publishers like Nikoli established in the 1980s–90s. Its physics twist — water seeks its own level inside each tank — gives it a character no other counts puzzle has.',
  intro:
    'Mastery is exploiting gravity. Inside one aquarium, water level is everything: filling a cell fills every cell of that tank on the same row and below (within the tank\'s shape), and emptying a cell empties everything above it. Strong players never think in single cells — they think in levels, and let the row/column counts pick which levels are possible.',
  sections: [
    {
      title: 'Think in levels, not cells',
      art: {
        kind: 'grid',
        rows: ['...', 'uuu', 'uuu'],
        caption: 'A tank\'s whole state is one water line — filled up to a level, never single cells'
      },
      bullets: [
        '📊 A tank\'s state is just "filled up to row r" — enumerate its few legal water lines instead of its many cell combinations.',
        '⬇️ Filling one cell of a tank at some row fills ALL its cells on that row and every row below; emptying one cell empties its whole row of that tank and everything above.',
        '🛁 Wide shallow tanks are powerful: one decision settles many cells in one row — resolve them first.'
      ]
    },
    {
      title: 'Squeeze the counts',
      art: {
        kind: 'grid',
        rows: ['uuu.3'],
        caption: 'The row count of 3 is met — every undecided cell in the row is air'
      },
      bullets: [
        '⚖️ Compare a row count to the tanks crossing it: if the count equals the sum of all crossing tank widths, every tank holds water there; if it equals zero, none do.',
        '🏜️ Partial sums bite too: if one tank\'s width alone exceeds the row count, that tank is dry on that row — and therefore on every row above.',
        '🏁 Finish lines: a row or column that has reached its count empties every undecided cell in it; one that can only reach its count by filling everything left, fills it.'
      ]
    },
    {
      title: 'Propagate through gravity',
      art: {
        kind: 'grid',
        rows: ['uu.', 'uuu'],
        caption: 'Each tank keeps its own level: fill a cell and its tank floods that row and below'
      },
      bullets: [
        '⚡ Every deduction doubles: marking a cell full pushes water down its tank; marking it empty pushes air up. Apply the vertical consequence before reading any new counts.',
        '🧠 A tank spanning many rows acts as a memory: its water line decided by a tight row constrains every other row it crosses.',
        '🗼 Tall narrow tanks resolve columns the way wide tanks resolve rows — use whichever axis has the tighter counts.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['...', 'hhh', 'uuu'],
        caption: 'A stubborn tank has few legal water lines — test each against the tightest crossing count'
      },
      bullets: [
        '🔢 Enumerate a stubborn tank\'s 2–3 legal water lines and test each against the tightest crossing count — usually only one survives.',
        '🔄 Re-scan rows where a recent fill landed: counts that were slack often became exact.',
        '👀 Check near-full columns; column logic is easy to neglect when the eye works row by row.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['📐 outlines', '>', '💨 air marks', '>', '✨ guess-free'],
        caption: 'Read tank shapes fast, mark air as diligently as water'
      },
      bullets: [
        '📐 Practice reading a tank\'s outline fast — its row-by-row widths ARE the puzzle; misreading a tank boundary causes most errors.',
        '💨 On pro/extreme, mark empties (air) as diligently as water; the air above a water line is information the next count needs.',
        '🚫 Boards here are guess-free: a stall means an unread count or an unpropagated gravity consequence, never a needed guess.'
      ]
    }
  ],
  references: [
    {
      label: 'Aquarium puzzle rules — puzzle-aquarium.com',
      url: 'https://www.puzzle-aquarium.com/',
      note: 'the site that popularized the format, with endless practice boards'
    },
    {
      label: 'Logic puzzle — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Logic_puzzle',
      note: 'the deduction-puzzle family Aquarium belongs to'
    }
  ]
};
