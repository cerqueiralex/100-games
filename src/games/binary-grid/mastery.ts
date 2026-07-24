import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Binary Grid" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'This is the puzzle known as Takuzu, Binairo or simply the binary puzzle, introduced in 2009 by the Belgian publishing duo Peter De Schepper and Frank Coussement and popularized through Belgian and Dutch newspapers. It descends from the older recreational idea of balanced binary sequences, and the suns-and-moons skin used here is a modern dress-up of the same 0/1 grid. The three rules — no three in a row, balanced lines, no duplicate lines — are unchanged from the original.',
  intro:
    'Binary Grid rewards a strict scanning routine more than cleverness. Almost every cell falls to three local patterns applied relentlessly, and mastery is making those patterns reflexive while keeping the row/column quotas in your peripheral vision. Every board here has exactly one solution and never needs guessing — on the big 12×12 extreme grids, discipline in re-checking the lines you just changed is the entire difference between flow and stall.',
  sections: [
    {
      title: 'The three reflex patterns',
      art: {
        kind: 'grid',
        rows: ['uyyu', 'yuy '],
        caption: 'Pair (top): two suns force moons on both ends. Sandwich (bottom): the middle cell is forced'
      },
      paragraphs: [
        'These solve the bulk of every board. Scan for them constantly, in both rows and columns.'
      ],
      bullets: [
        '👯 Pair: two identical symbols side by side force the OPPOSITE symbol on both ends — suns-sun gets moons on each side, always.',
        '🥪 Sandwich: identical symbols with one gap between them (sun, empty, sun) force the opposite symbol in the middle — a triple would otherwise be unavoidable.',
        '🌊 Quota flood: a line that has all of one symbol (half the line) fills every remaining cell with the other symbol instantly.',
        '⚡ Work a placement’s consequences immediately: every symbol you place can create a new pair or sandwich in BOTH its row and its column — check the four neighbors before scanning elsewhere.'
      ]
    },
    {
      title: 'Count quotas before they complete',
      art: {
        kind: 'grid',
        rows: ['yuu..y'],
        caption: 'One sun and one moon left: a moon after the pair would make three, so the sun is forced first'
      },
      paragraphs: [
        'The half-and-half rule bites earlier than the flood. When a symbol is one short of quota, ask where the last one can legally go — the three-in-a-row rule usually forbids most spots.'
      ],
      bullets: [
        '🧮 One-left logic: if a line needs one more sun and placing it in a gap would leave three moons together elsewhere, the sun’s position is forced.',
        '📍 Ends first: long empty stretches at a line’s edge are the most constrained — a stretch of three empties needing two moons and one sun can only alternate a few ways; enumerate them, they often agree on a cell.',
        '🔢 The counters assist shows exactly this arithmetic — learn to run it in your head and keep the assist off for clean wins.'
      ]
    },
    {
      title: 'The twin-line rule (hard and up)',
      art: {
        kind: 'grid',
        rows: ['yuyu', 'yu..'],
        caption: 'No twin lines: copying the finished top row is illegal, so the bottom ends moon-then-sun'
      },
      paragraphs: [
        'From hard tier onward no two rows may be identical, and no two columns. This rule is dormant most of the game and decisive at the end.'
      ],
      bullets: [
        '🔍 Whenever you COMPLETE a line, scan for other lines that differ from it in only the cells still empty — those cells are now forced to break the twin.',
        '⚖️ A line missing two cells with one sun and one moon to place: if one order duplicates a finished line, the other order is the answer.',
        '👀 Track near-twins deliberately on pro/extreme: two rows agreeing everywhere except two columns are a pending deduction, not a coincidence.'
      ]
    },
    {
      title: 'Common traps',
      art: {
        kind: 'grid',
        rows: ['y..', 'y..', 'x..'],
        caption: 'Columns obey every rule too — two stacked suns force a moon below'
      },
      bullets: [
        '🙈 Column blindness: the classic error is scanning rows only — alternate strictly, or sweep columns after every few placements.',
        '📏 Quota is per line, not per board: a globally balanced-looking grid can still have an unbalanced column.',
        '🎨 Do not "complete the pattern" aesthetically — alternating stripes feel right but nothing in the rules prefers them; trust only the three rules.',
        '👆 Tap-cycling past your target (sun → moon → empty) and leaving a wrong symbol is a silent killer on big boards; glance at the cell after each tap.'
      ]
    },
    {
      title: 'When you stall',
      art: {
        kind: 'banner',
        emojis: '🔎🧭💡',
        caption: 'Scan the frontier — the lines you just changed hold the next move'
      },
      bullets: [
        '🧭 Re-scan only the lines that changed since your last full pass — keep a mental frontier instead of rescanning the whole board.',
        '🎯 Find the line closest to quota (most filled) and run one-left logic on it; near-full lines are where forced cells hide.',
        '♊ On hard+, check the twin-line rule against every completed line — it is the most-forgotten deduction and the usual answer to a late-game stall.',
        '🚫 Never guess: with a unique deduction-reachable solution, an apparently free cell always has a pair, sandwich, quota or twin argument waiting.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['6×6', '>', '8×8', '>', '10×10', '>', '12×12'],
        caption: 'Boards grow up the tiers and the twin rule joins at hard'
      },
      bullets: [
        '🪜 Boards grow 6×6 to 12×12 up the tiers and the twin-line rule joins at hard — move up when the three reflex patterns feel automatic, not before.',
        '🎛️ Turn off Rule-break highlights and the counters to chase clean wins; both count as help while enabled, and your statistics separate clean from assisted wins.',
        '📊 Errors cost 10 each and highlight-off play makes them silent — the error stat on your history page tells you honestly whether you were deducing or hoping.',
        '💡 The hint explains the rule that forces its cell — read the explanation, because it is naming the pattern you failed to spot.'
      ]
    }
  ],
  references: [
    {
      label: 'Takuzu — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Takuzu',
      note: 'rules, history and solving techniques of the binary puzzle family'
    },
    {
      label: 'Logic puzzle — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Logic_puzzle',
      note: 'where Takuzu sits in the wider deduction-puzzle landscape'
    }
  ]
};
