import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Nonograms" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Nonograms were invented independently in Japan in 1987 by graphic editor Non Ishida (who won a skyscraper-window-art competition with grid pictures) and puzzle author Tetsuya Nishio. James Dalgety in the UK coined the name "nonogram" after Ishida, and Nintendo\'s Picross series (1995 onward) carried the puzzle worldwide.',
  intro:
    'Mastery is line arithmetic. Every row and column clue defines exactly which cells are forced no matter how the blocks slide — strong players extract those forced cells line by line, mark confirmed blanks with X as aggressively as fills, and let rows and columns hand information back and forth until the picture appears. Boards here are line-solvable: no guessing, ever.',
  sections: [
    {
      title: 'Overlap: the master key',
      art: {
        kind: 'grid',
        rows: ['hhh..', '..hhh', '..a..'],
        caption: 'Clue 3 in a 5-line: leftmost and rightmost packings overlap in the middle — that cell is filled'
      },
      paragraphs: [
        'For a single clue of length c in a line of length n, slide the block to its leftmost and rightmost legal positions; the cells covered in BOTH extremes are forced fills. The overlap is 2c − n cells whenever c > n/2.'
      ],
      bullets: [
        '🎯 A 9 in a 15-line forces the middle 3 cells; an 8 forces 1; anything over half the line pays immediately.',
        '📦 Multi-clue lines work the same way: pack all blocks left with single gaps, then right, and fill wherever a block overlaps itself between the two packings.',
        '🔄 Redo the slide after every new X — each blank shortens the effective line and grows the overlaps.'
      ]
    },
    {
      title: 'X marks are half the game',
      art: {
        kind: 'grid',
        rows: ['aaxxx'],
        caption: 'The 2 is complete — every remaining cell of its line is ✕ed instantly'
      },
      bullets: [
        '✖️ When a clue is completed, X out the rest of its line instantly — those Xs are the fuel for the crossing lines.',
        '⛔ X the cells a block can never reach: a lone 2 whose only fill so far touches the edge kills everything beyond distance 2.',
        '🕳️ Gaps smaller than the smallest remaining clue are all X — sweep for them after every burst of progress.'
      ]
    },
    {
      title: 'Choosing the next line',
      art: {
        kind: 'row',
        items: ['big clues', '>', 'fresh lines', '>', 'slack lines'],
        caption: 'Rank lines by tightness and chase your newest marks first'
      },
      bullets: [
        '📊 Rank lines by tightness: total clue length + gaps closest to the line length resolves most, so big-number lines first, then edge rows seeded by them.',
        '🐾 Chase your latest deductions — a new fill or X changes exactly the lines that cross it, and freshly-touched lines are the ones most likely to give more.',
        '💤 Empty-feeling lines (small clues, huge slack) are dead ends early; leave them until crossings have carved them up.'
      ]
    },
    {
      title: 'Reading edges and anchors',
      art: {
        kind: 'grid',
        rows: ['aaax.'],
        caption: 'A filled border cell pins the first clue 3: extend it inward and cap it with an ✕'
      },
      bullets: [
        '📌 A filled cell on a border pins its block: the first clue of that line now grows strictly inward — extend it and cap it with an X.',
        '📏 A fill at distance d from the edge with first clue c ≤ d tells you nothing yet; but if c > d, the block must cover the edge span — fill back toward it.',
        '🧱 Completed crossing columns act as walls that split a row into independent mini-lines; re-run the overlap logic inside each segment.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🖼️🧠⚡',
        caption: 'Reading forced cells at a glance is the whole speed gap between tiers'
      },
      bullets: [
        '🏋️ Practice the two-packing slide until you can read forced cells without marking the extremes — that one skill is most of the speed gap between tiers.',
        '🧾 On pro/extreme, work with the progress assists off and treat every X as mandatory bookkeeping; missed Xs, not missed fills, cause most stalls.',
        '🎓 When a hint fills a cell, find which line forced it before continuing — every hint should teach a line-reading you skipped.'
      ]
    }
  ],
  references: [
    {
      label: 'Nonogram — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Nonogram',
      note: 'history, solution techniques and the mathematics of line solving'
    },
    {
      label: 'Picross — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Picross',
      note: "Nintendo's series that popularized the puzzle worldwide"
    }
  ]
};
