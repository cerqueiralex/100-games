import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Sudoku" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar:
 * every section ships a MasteryArt illustration and every bullet leads
 * with an emoji marker.
 */
export const mastery: MasteryGuide = {
  origins:
    'Modern Sudoku was created as "Number Place" by Howard Garns, a retired American architect, in Dell Pencil Puzzles in 1979. Japanese publisher Nikoli imported it in 1984, trimmed the givens to a symmetric pattern and named it Sūdoku ("single number"). It exploded worldwide in 2004 after Wayne Gould convinced The Times of London to print it daily.',
  intro:
    'Mastering Sudoku means never guessing. Every puzzle here has exactly one solution reachable by pure logic, so your growth path is a ladder of named techniques: each new one you internalize turns a tier that needed luck into one you solve calmly. Speed comes last — accuracy and scanning discipline come first.',
  sections: [
    {
      title: 'Scan before you write',
      art: {
        kind: 'grid',
        rows: ['5xx', 'xxh', 'x5x'],
        caption: 'Cross-hatch a digit: strike its rows and columns — one free cell remains'
      },
      paragraphs: [
        'Strong players spend the first minute writing nothing. Sweep the grid digit by digit — all the 1s, then all the 2s — and ask for each box: where can this digit still go?'
      ],
      bullets: [
        '🔢 Start with the most frequent digits on the board; a digit placed 6–7 times often forces its remaining cells instantly.',
        '🎯 Cross-hatch: for one digit and one 3×3 box, mentally strike the rows and columns that already contain it — one free cell left means a placement.',
        '📊 Rank areas by fullness: a row, column or box with 6+ givens is where your next placement almost always lives.'
      ]
    },
    {
      title: 'The technique ladder',
      art: {
        kind: 'row',
        items: ['Single', '>', 'Pair', '>', 'Pointing', '>', 'X-Wing'],
        caption: 'Each named technique unlocks roughly one difficulty tier'
      },
      paragraphs: [
        'Learn these in order; each unlocks roughly one difficulty tier.'
      ],
      bullets: [
        '1️⃣ Naked single — a cell with only one candidate left. Bread and butter of easy/medium.',
        '🕵️ Hidden single — a digit with only one legal cell in a row, column or box, even if that cell has other candidates.',
        '👥 Naked pair/triple — two cells in a unit sharing the same two candidates eliminate those digits from the rest of the unit.',
        '👉 Pointing pair — a digit confined to one row/column inside a box eliminates it from that row/column outside the box.',
        '❌ X-Wing — a digit forming a rectangle across two rows and two columns wipes it from the rest of those columns. Pro/extreme territory.'
      ]
    },
    {
      title: 'Use notes like a pro',
      art: {
        kind: 'grid',
        rows: ['7.9', '.h.', '9.7'],
        caption: 'Cells down to two candidates are the leverage points'
      },
      paragraphs: [
        'On hard and up, switch to notes mode early and maintain candidates rigorously — stale notes cause more wrong entries than bad logic does.'
      ],
      bullets: [
        '✏️ Only note cells in the regions you are actively working; full-grid notes waste time on easy digits.',
        '🧹 After every placement, immediately erase that digit from notes in the same row, column and box.',
        '💎 Cells with exactly two candidates are your leverage points — pairs power most advanced techniques.'
      ]
    },
    {
      title: 'When you stall',
      art: {
        kind: 'banner',
        emojis: '🔄🔍💡',
        caption: 'Stalls are missed techniques, never dead ends'
      },
      bullets: [
        '🌊 Re-scan the digit you placed most recently — new placements create chain reactions two or three boxes away.',
        '🔀 Switch scanning modes: if you were scanning digits, scan units (rows/boxes with few empties) instead.',
        '🧮 Hunt for an almost-full unit: with 2–3 empties, listing the missing digits and testing each against the crossing units usually cracks one.',
        '🚫 Never bifurcate (guess-and-check). If you feel the urge, there is a technique you have not spotted — that feeling is the lesson.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['🎯 accuracy', '>', '🧠 technique', '>', '⚡ speed'],
        caption: 'Train in this order — speed is a byproduct'
      },
      bullets: [
        '📈 Play one tier above comfort with the auto-check assist off; the error count on your history page is your honest coach.',
        '✨ Chase clean wins (no hints, no assists) before chasing time — the statistics page tracks both separately.',
        '🎓 When a hint reveals a cell, stop and reverse-engineer WHY that cell was forced; a hint you understand is a technique gained.'
      ]
    }
  ],
  references: [
    {
      label: 'Sudoku — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Sudoku',
      note: 'history, mathematics and variant overview'
    },
    {
      label: 'Glossary of Sudoku — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Glossary_of_Sudoku',
      note: 'every named technique in one place'
    },
    {
      label: 'SudokuWiki strategy index',
      url: 'https://www.sudokuwiki.org/Strategy_Families',
      note: 'the classic reference for techniques from singles to chains, with interactive examples'
    }
  ]
};
