import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Logic Puzzles" — strategy content only; the rules live
 * in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Grid-based logic puzzles trace to Lewis Carroll\'s syllogism exercises and were formalized as the "logic problem" with elimination grids in magazines like Dell Puzzle Magazines (USA) from the 1960s onward. The most famous specimen, the Zebra or "Einstein" puzzle, circulated from 1962 in Life International. The puzzles in this app are original, generated so that pure deduction always suffices.',
  intro:
    'Mastery means treating the grid as a truth machine. Every clue converts into ✕s and ✓s; every ✓ radiates ✕s across its row and column and its consequences into the other category pairs. Champions do not "reason harder" — they extract every drop from each clue in a fixed discipline, then re-read the clue list knowing each pass will say more than the last.',
  sections: [
    {
      title: 'First pass: burn the direct clues',
      art: {
        kind: 'grid',
        rows: ['✓xx', 'x..', 'x..'],
        caption: 'Every ✓ radiates ✕s across its whole row and column at once'
      },
      bullets: [
        '✅ "A is B" → place the ✓, then ✕ the entire row and column of that pair immediately — a naked ✓ without its ✕s is half a deduction.',
        '❌ "A is not B" → the ✕ goes down instantly; never hold negatives in your head.',
        '↔️ Translate every comparative clue ("more than", "next to", "earlier") into its endpoints: the extremes it forbids are ✕s right now, even if the middle stays open.'
      ]
    },
    {
      title: 'The row-of-one rule',
      art: {
        kind: 'grid',
        rows: ['xxh', '✓xx', 'x✓x'],
        caption: 'Two ✕s leave one open cell — the ✓ there is forced'
      },
      bullets: [
        '🎯 Any row or column in any sub-grid with a single open cell is a ✓ — sweep all sub-grids after every placement.',
        '🔁 A ✓ in one category pair transfers: if A=B and B=C, then A=C; check the third grid every time two ✓s share an item.',
        '⚡ Contradiction transfer works too: A=B plus B≠C forces A≠C — the most-missed inference in the game.'
      ]
    },
    {
      title: 'Re-read clues in later passes',
      art: {
        kind: 'row',
        items: ['📖 pass 1', '>', '📖 pass 2', '>', '📌 pinned'],
        caption: 'A comparative clue says more on every pass as its range shrinks'
      },
      paragraphs: [
        'Clues are not spent when first read. A comparative that only gave two ✕s on pass one may pin an exact cell on pass three, once other placements shrank its range.'
      ],
      bullets: [
        '📋 Keep a mental (or literal) "live clues" list; drop a clue only when its information is fully in the grid.',
        '🔄 After any breakthrough, re-read the clues that mention the items involved — those are the ones whose ranges just tightened.',
        '🤝 Pairs of clues about the same item often combine: "X is left of Y" and "Y is not last" squeeze both ranges at once.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['✓x·', 'x..', 'x..'],
        caption: 'Audit old ✓s — the dot marks a radiated ✕ you forgot to place'
      },
      bullets: [
        '🔍 Audit ✕ completeness first: a missing radiated ✕ from an old ✓ is the number-one stall cause.',
        '🧪 Hunt rows with two open cells and ask what each candidate would force through the other grids — sound elimination, not guessing, if you only record what a contradiction PROVES.',
        '🧩 These puzzles are generated to be decidable by propagation alone — a stall always means an unmined clue, usually a comparative read only once.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🧠⏱️📈',
        caption: 'Fast, accurate clue translation is the trainable skill'
      },
      bullets: [
        '⏱️ Time your first pass separately from the endgame; tier jumps mostly add clue-translation load, and fast accurate translation is trainable.',
        '🪜 Play the presets in order — they are sequenced by technique, and each introduces one inference the previous rung lacked.',
        '💡 When a hint fills a cell, identify which clue combination forced it before moving on; hints here are missed inferences, never luck.'
      ]
    }
  ],
  references: [
    {
      label: 'Zebra Puzzle — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Zebra_Puzzle',
      note: 'the famous "Einstein" specimen with a walkthrough of grid technique'
    },
    {
      label: 'Logic puzzle — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Logic_puzzle',
      note: 'history of the genre from Carroll to modern grids'
    }
  ]
};
