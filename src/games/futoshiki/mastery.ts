import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Futoshiki" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Futoshiki (不等式, "inequality") is a Japanese Latin-square puzzle credited to Tamaki Seto, who developed it in 2001. It reached the West through British newspapers — The Guardian made it a daily feature from 2006 — riding the same wave that carried Sudoku and Kakuro out of Japan. Underneath the chevrons it is a classic Latin square: each digit once per row and column.',
  intro:
    'Futoshiki mastery is learning that the inequality signs are not local hints — they are chains that broadcast information across the whole line. The expert opening is not placing digits at all: it is walking every chain and shrinking each cell’s range from both ends. Every board in this app has a unique solution that pure deduction reaches, so a stall never means "try something"; it means a chain you have not squeezed yet.',
  sections: [
    {
      title: 'Place the extremes first',
      art: {
        kind: 'grid',
        rows: ['x<a>x'],
        caption: 'Both end cells sit on the small side of a sign — only the middle can hold the maximum'
      },
      paragraphs: [
        'The biggest and smallest digits are the most constrained by inequalities, which makes them the easiest to place.'
      ],
      bullets: [
        '👑 The maximum digit N can never sit on the small side of any chevron — cross off every cell that is "less than" a neighbor, and each row often has just one cell left for N.',
        '1️⃣ Symmetrically, 1 can never sit on the big side of a sign; sweep for 1s right after the Ns.',
        '🔁 Repeat the sweep for N−1 and 2: N−1 cannot be smaller than two different neighbors in a chain, and so on down.',
        '🧹 Do this extremes pass for all rows AND all columns before touching the middle digits — it routinely fills a quarter of the board.'
      ]
    },
    {
      title: 'Squeeze the chains',
      art: {
        kind: 'grid',
        rows: ['a<h<a'],
        caption: 'A linked ladder: every rung inherits a floor and a ceiling from its position in the chain'
      },
      paragraphs: [
        'A run of linked cells a < b < c < d is a ladder: each rung has a floor and a ceiling you can compute instantly.'
      ],
      bullets: [
        '📏 In an increasing chain of k cells, the smallest cell is at most N−k+1 and the largest is at least k — a length-4 chain on a 5×5 pins its ends almost completely.',
        '✏️ Write the range into notes: the i-th cell of a k-chain (counting from the small end) can only hold i through N−k+i.',
        '↩️ Chains that bend through a corner still chain — follow the signs across direction changes, the arithmetic is identical.',
        '⚡ When one chain cell gets placed, re-propagate both directions immediately: a placed 2 in the middle of a chain caps everything below it at 1.'
      ]
    },
    {
      title: 'Then it is a Latin square',
      art: {
        kind: 'grid',
        rows: ['aaxx'],
        caption: 'A naked pair: two cells sharing {2,3} evict those digits from the rest of the line'
      },
      bullets: [
        '🕵️ Hidden singles win most middle digits: for each digit, scan where it can still legally sit in a row — chains often leave exactly one cell.',
        '👥 Naked pairs work as in Sudoku: two cells of a row noted {2,3} evict 2 and 3 from the rest of the row.',
        '🔀 Cross-reference rows against columns after each placement — the digit you placed just became a constraint in the perpendicular line.',
        '🧼 Keep notes current with auto-cleanup or by hand; futoshiki chains produce narrow ranges, and stale ranges are the main source of wrong entries.'
      ]
    },
    {
      title: 'Traps to avoid',
      art: {
        kind: 'grid',
        rows: ['3>1'],
        caption: 'Read the chevron as a mouth — it always opens toward the bigger number'
      },
      bullets: [
        '👄 Read the chevron as a mouth: it always opens toward the bigger number — most wrong entries come from flipping one sign in a long chain.',
        '🔗 A sign constrains only its two adjacent cells; do not "transitively" compare cells that are not linked through an actual chain.',
        '🆓 Unsigned neighbors are unconstrained: 5 next to 1 with no chevron is perfectly legal — do not invent order that is not printed.',
        '⚠️ Do not stop range-propagation early: a chain touched by a new digit must be re-walked to BOTH ends, or your notes silently rot.'
      ]
    },
    {
      title: 'When you stall',
      art: {
        kind: 'banner',
        emojis: '🔁📉🔍',
        caption: 'Redo the extremes sweep — every placement creates new bans'
      },
      bullets: [
        '🔄 Redo the extremes sweep with the current board — placements create new "cannot hold N" cells that were not there at the start.',
        '⛓️ Find the longest chain with unplaced cells and recompute its floors and ceilings from scratch; long chains hide late forcings.',
        '🔢 Count candidates per line: the row or column with the fewest total candidates left is where the next hidden single lives.',
        '🚫 Never guess — the unique solution is deduction-reachable by construction, so bifurcating only teaches you to skip the lesson.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['📏 extremes', '>', '⛓️ chains', '>', '🔤 Latin square'],
        caption: 'The solving order that scales to every tier'
      },
      bullets: [
        '🪜 Boards grow 4×4 to 7×7 up the tiers, and pro is inequality-heavy with minimal givens — exactly where chain-squeezing pays; practice it on medium until the extremes pass is automatic.',
        '🎛️ Turn Rule check off once your sign-reading is reliable: it counts as help, and clean wins are tracked separately in your statistics.',
        '📝 Entries that break a rule cost points immediately, so resolve ranges in notes first and only commit forced digits.',
        '🎓 The hint fills a logically forced cell — before continuing, find the chain or single that forced it, and open your next game with that scan.'
      ]
    }
  ],
  references: [
    {
      label: 'Futoshiki — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Futoshiki',
      note: 'rules, history and worked solving examples'
    },
    {
      label: 'Latin square — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Latin_square',
      note: 'the structure shared with Sudoku, KenKen and Skyscrapers'
    },
    {
      label: 'Glossary of Sudoku — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Glossary_of_Sudoku',
      note: 'hidden singles, naked pairs and friends — all apply here'
    }
  ]
};
