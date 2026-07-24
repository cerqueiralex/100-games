import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Minesweeper" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Minesweeper descends from 1960s–80s mainframe games like Cube and Mined-Out, but the version everyone knows was written by Robert Donner and Curt Johnson at Microsoft and shipped with Windows 3.1 in 1992 — originally included to teach office workers precise mouse clicking. It became one of the most-played computer games in history.',
  intro:
    'Mastery means reading numbers as constraints, not decorations. Every number is an equation about its unopened neighbors; strong players chain those equations so far that most boards resolve with barely a moment of true risk. Flags are bookkeeping — the real game is subtraction.',
  sections: [
    {
      title: 'Read numbers as equations',
      art: {
        kind: 'grid',
        rows: ['🚩3🚩', '.#.'],
        caption: 'A 3 beside two flags is really a 1 — its last unopened cell is the mine'
      },
      bullets: [
        '🧮 A number equals mines among its unopened neighbors. A 1 touching exactly one unopened cell means that cell IS a mine; a number already touching that many flags means every other neighbor is safe — chord it open.',
        '➖ Always subtract flagged mines mentally: a "3" with two flags beside it is really a "1".',
        '📐 Corners and edges shrink neighborhoods: an edge 1 touches at most 5 cells, a corner 1 only 3 — constraints bite hardest there, so work the border first.'
      ]
    },
    {
      title: 'The classic patterns',
      art: {
        kind: 'grid',
        rows: ['121', 'bgb'],
        caption: 'The 1-2-1 wall pattern: mines under the 1s, safe under the 2'
      },
      paragraphs: [
        'A handful of local patterns solve most middlegames instantly once you recognize them on sight.'
      ],
      bullets: [
        '🧱 1-2-1 along a wall: the mines sit under the 1s — the cell under the 2 is safe.',
        '🔁 1-2-2-1 along a wall: the mines sit under the two 2s; both cells under the 1s are safe.',
        '👣 1-1 stepping off an edge: the third cell in from the edge is safe.',
        '🔀 Any 1 diagonally "shared" between two numbers: subtract the overlap — what one number explains, the other no longer needs.'
      ]
    },
    {
      title: 'Openings and flow',
      art: {
        kind: 'row',
        items: ['🎯 center tap', '>', '💥 cascade', '>', '🧩 border logic'],
        caption: 'Open where a blank cascade is most likely, then work its border'
      },
      bullets: [
        '🛡️ The first tap is always protected here — open near the center, where a blank cascade is most likely to blow the board open.',
        '🌊 Expand from cascades outward rather than poking isolated corners; connected information compounds.',
        '⚡ Use chording (tapping a satisfied number) as your main opening tool — it is faster AND forces you to verify the flag count first.'
      ]
    },
    {
      title: 'When only guesses remain',
      art: {
        kind: 'grid',
        rows: ['.11.', '.##.'],
        caption: 'The walled 50/50 — no amount of staring will split it'
      },
      bullets: [
        '🔍 First re-scan for overlap logic between adjacent numbers — most "forced guesses" are missed subset deductions.',
        '🎲 If truly forced, prefer the cell touched by the fewest numbers, or an untouched cell far from all constraints — on sparse boards the ambient mine density is usually lower than a contested border cell.',
        '🪙 A 50/50 behind a wall stays 50/50 no matter how long you stare; take it early while the rest of the board can still be won.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '⛏️🚩🏆',
        caption: 'Speed comes from opening safe cells, not decorating mines'
      },
      bullets: [
        '🚩 Turn off flag-assists and play pro/extreme density with chording only — speed comes from opening safe cells, not decorating mines.',
        '📊 Watch your error stat: deaths from misclicks and from bad logic need different cures (slow taps vs. pattern drills).',
        '🔁 Replay the same tier until clean wins outnumber losses two to one before moving up — density jumps punish half-learned patterns.'
      ]
    }
  ],
  references: [
    {
      label: 'Minesweeper (video game) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Minesweeper_(video_game)',
      note: 'history and variants'
    },
    {
      label: 'Microsoft Minesweeper — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Microsoft_Minesweeper',
      note: 'the 1992 original and its story'
    },
    {
      label: 'Minesweeper strategy — minesweeper.online guide',
      url: 'https://minesweeper.online/help/patterns',
      note: 'the standard pattern catalog (1-2-1, 1-2-2-1 and friends) with diagrams'
    }
  ]
};
