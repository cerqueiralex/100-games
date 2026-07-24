import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Bridges" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Bridges is Hashiwokakero ("build bridges!"), first published by the Japanese puzzle house Nikoli in Puzzle Communication Nikoli issue 31 in September 1990. Nikoli — the Tokyo publisher that also turned Sudoku into a phenomenon — made Hashi one of its flagship pencil puzzles, and it has since become a staple of puzzle magazines and apps worldwide, often under the names Bridges or Ai-Ki-Ai.',
  intro:
    'Mastering Bridges means seeing every island as an equation between its number and the capacity of its neighborhood. The strongest players open with pure capacity counting at corners and edges, then lean on the quieter second rule — the whole board must end as ONE connected network — which forbids as many moves as the numbers do. Every puzzle here has a unique solution reachable without guessing.',
  sections: [
    {
      title: 'Open at corners and edges',
      art: {
        kind: 'grid',
        rows: ['4═3', '║..', '2..'],
        caption: 'A corner 4 has only two neighbors — both links must be doubles'
      },
      paragraphs: [
        'An island can carry at most two bridges per neighbor, so its number against its neighbor count often forces everything. Corners have at most 2 neighbors, edges 3, interior islands 4 — scan the rim first.'
      ],
      bullets: [
        '🎯 Number = 2 × neighbors → every connection is a double: a 4 in a corner, a 6 on an edge, an 8 in the middle are fully solved on sight.',
        '📌 Number = 2 × neighbors − 1 → at least one bridge to EVERY neighbor: a 3 in a corner, a 5 on an edge, a 7 anywhere. Draw those singles immediately; the doubles sort themselves out later.',
        '🔁 Recount an island every time one of its corridors gets blocked by a crossing bridge — a mid-board 5 becomes "5 with two neighbors", which is over capacity, so one of your bridges elsewhere is wrong, or the block reveals forced doubles.'
      ]
    },
    {
      title: 'The 1s and 2s isolation rules',
      art: {
        kind: 'grid',
        rows: ['1x1', '2x2'],
        caption: 'Sealed pairs are illegal: no 1–1 link, no double between two 2s'
      },
      paragraphs: [
        'Small numbers carry a hidden constraint: the finished board must be one connected network, so any move that seals off a small group is illegal.'
      ],
      bullets: [
        '🚫 Never connect a 1 to another 1 (unless they are the only two islands on the board) — the pair would be complete and cut off.',
        '⛔ Never connect a 2 to another 2 with a double bridge for the same reason; a single between two 2s is fine.',
        '🧩 Generalize it: if a set of islands would have all its numbers satisfied while other islands remain outside, the connecting move that completes the set is forbidden.',
        '🌉 Flip it into a placement rule: when an island\'s only escape from a would-be-sealed group runs through one corridor, that corridor MUST carry a bridge.'
      ]
    },
    {
      title: 'Capacity bookkeeping',
      art: {
        kind: 'grid',
        rows: ['..1..', '..│..', '1─4═2'],
        caption: 'Need 4 = supply 1+1+2 — saturate every corridor'
      },
      paragraphs: [
        'Between the openers and the endgame, progress comes from comparing what an island still needs with what its neighborhood can still supply.'
      ],
      bullets: [
        '⚖️ Remaining need = remaining supply → saturate: build every bridge the neighbors can still accept.',
        '✅ A neighbor that is already satisfied supplies zero — mentally delete it and recount. The "lock full islands" assist does this visually; doing it by eye is the clean-win skill.',
        '🪫 A neighbor with 1 remaining supplies at most 1, even across a wide-open corridor — this is what turns "4 with three neighbors" into forced bridges.',
        '🛤️ Track corridors, not just islands: every bridge you draw blocks the perpendicular corridors it crosses. Before committing a long bridge, check which distant islands depended on that lane.'
      ]
    },
    {
      title: 'Think in networks, not islands',
      art: {
        kind: 'grid',
        rows: ['aaxuu', 'aahuu', 'aaxuu'],
        caption: 'Two clusters, one open corridor — it must carry a bridge'
      },
      paragraphs: [
        'On hard boards and up, connectivity graduates from a tiebreaker to your main engine. Watch the growing clusters of connected islands.'
      ],
      bullets: [
        '🕸️ When two clusters can only meet through one corridor, that corridor carries a bridge — no numbers needed.',
        '🧮 Count a cluster\'s total remaining need: if it is 0 the cluster is closed, so it must already contain every island; if it is 1, its single outgoing bridge location is often forced.',
        '🟢 A satisfied green island is not "done" — it still routes connectivity. Check whether its bridges are the only path between two halves of the board.'
      ]
    },
    {
      title: 'When you stall',
      art: {
        kind: 'row',
        items: ['🏝️ rim', '>', '🧮 capacity', '>', '🕸️ network'],
        caption: 'The stall-breaking scan loop — repeat until the board moves again'
      },
      bullets: [
        '🔄 Re-scan the rim: a blocked corridor or newly satisfied island quietly re-creates the corner/edge openers mid-game.',
        '🔍 Hunt for near-sealed groups — the isolation argument is the deduction players most often miss.',
        '🎯 Check every island with exactly 1 or 2 remaining against its unsatisfied neighbors only; satisfied neighbors screen out more moves than you expect.',
        '🚧 Do not guess a double where a single is proven: build the single, keep going — the second strand will be forced or forbidden a few moves later.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['7×7', '>', '9×9', '>', '11×11', '>', '13×13'],
        caption: 'Bigger boards add bookkeeping, not rules'
      },
      bullets: [
        '✨ Turn off the island check and lock assists for clean wins — both count as help while enabled; you should be able to read satisfied/over-full at a glance from the numbers.',
        '📈 Boards grow from 7×7 with 8 islands to 13×13 with 26 across the five tiers; larger boards do not add rules, they add bookkeeping — a fixed scan loop (rim → capacity → connectivity) keeps you fast.',
        '⚠️ Over-building costs 15 per over-full island: cycle taps carefully (1 → 2 → 0) and prefer proven singles to hopeful doubles.',
        '💡 A hint (−40) sets one bridge to its true count — before playing on, find which of the arguments above proves it.'
      ]
    }
  ],
  references: [
    {
      label: 'Hashiwokakero — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Hashiwokakero',
      note: 'history, rules and solution techniques for the original Nikoli puzzle'
    },
    {
      label: 'Nikoli — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Nikoli_(publisher)',
      note: 'the publisher behind Hashi, Sudoku\'s revival and dozens of grid classics'
    },
    {
      label: "Simon Tatham's Portable Puzzle Collection",
      url: 'https://www.chiark.greenend.org.uk/~sgtatham/puzzles/',
      note: 'includes a classic free Bridges implementation for extra practice'
    }
  ]
};
