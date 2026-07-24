import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Nurikabe" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Nurikabe was first published by the Japanese puzzle house Nikoli around 1991, named after a yōkai from Japanese folklore — an invisible wall that blocks travelers at night. The puzzle\'s "sea and islands" framing made it one of Nikoli\'s enduring classics alongside Slitherlink and Hashiwokakero.',
  intro:
    'Mastery is bookkeeping two worlds at once: numbered islands that must reach exact sizes, and one connected sea with no 2×2 pool anywhere. The strongest moves come from the negative space — cells no island can ever reach are sea, and the pool rule turns three dark corners into a forced white square. Every board here is guess-free with a unique solution.',
  sections: [
    {
      title: 'Openers that always fire',
      art: {
        kind: 'grid',
        rows: ['.#.', '#1#', '.#.'],
        caption: 'A 1 is born finished — all four neighbors are sealed as sea'
      },
      bullets: [
        '1️⃣ Every 1 is a finished island: seal all four neighbors as sea immediately.',
        '🚧 Two clues separated by one cell (orthogonally or diagonally adjacent islands would merge): the cell between them is sea.',
        '🌊 Cells out of range of EVERY clue (farther than clue−1 steps from each number, counting around known sea) are sea — sweep for them early.',
        '➡️ A clue in a corner or corridor often has only one growth direction — extend it as far as forced.'
      ]
    },
    {
      title: 'The 2×2 pool rule works for you',
      art: {
        kind: 'grid',
        rows: ['##', '#a'],
        caption: 'Three sea cells in a square: the fourth must be island or a 2×2 pool forms'
      },
      bullets: [
        '🧩 Three sea cells in a square: the fourth cell is island — find which clue must claim it.',
        '💧 Pool danger propagates: long sea slabs must be broken by islands at regular intervals; scan wide sea areas for the single cell that must stay white.',
        '🔁 When an island completes, wrap it in sea, then immediately check the new sea for pool threats — completions cause chain reactions.'
      ]
    },
    {
      title: 'Keep the sea in one piece',
      art: {
        kind: 'grid',
        rows: ['#aa', 'haa'],
        caption: 'The corner sea cell has one escape route left — that route must stay sea'
      },
      bullets: [
        '🚪 Sea regions may never be sealed off: if a pocket of sea has only one escape route, that route is sea.',
        '🚫 An island expansion that would cut the sea in two is illegal — use this to reject candidate growth directions.',
        '🧱 Border cells are prime sea: islands hugging the edge strangle sea connectivity fast, so edge expansions are often forced inward.'
      ]
    },
    {
      title: 'Growing ambiguous islands',
      art: {
        kind: 'grid',
        rows: ['3h#', '#h#'],
        caption: 'The 3 has one direction to grow — exactly two reachable cells, so it takes both'
      },
      bullets: [
        '📏 An island that still needs k cells with only one legal path extends along it; count reachable cells — if exactly k remain reachable, take them all.',
        '🤝 Unclaimed white cells must belong to SOME clue: if only one island can reach a white cell, connect it.',
        '⛔ Islands may not touch orthogonally — completing one often forces a neighboring island to route away, cascading three or four deductions.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🏝️🌊🔁',
        caption: 'Alternate island eyes and sea eyes on every pass'
      },
      bullets: [
        '🔄 Alternate scanning modes each pass: islands (sizes, reach) then sea (connectivity, pools) — most stalls come from staying in one mode too long.',
        '🗺️ On pro/extreme, mark "unreachable" sea first before growing any island; the skeleton it reveals makes big clue routing obvious.',
        '🎓 When a hint marks a cell, work out which of the three rules (size, connectivity, pool) forced it — Nurikabe hints map one-to-one onto missed rule applications.'
      ]
    }
  ],
  references: [
    {
      label: 'Nurikabe (puzzle) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Nurikabe_(puzzle)',
      note: 'rules, solving techniques and history'
    },
    {
      label: 'Nurikabe (folklore) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Nurikabe',
      note: 'the invisible-wall yōkai the puzzle is named after'
    }
  ]
};
