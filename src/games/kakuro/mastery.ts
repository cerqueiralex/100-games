import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Kakuro" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Kakuro began as "Cross Sums", created in 1966 by Jacob E. Funk, a Canadian employee of Dell Magazines, for the American pencil-puzzle market. Japanese publisher Nikoli imported it in the 1980s, where president Maki Kaji contracted "kasan kurosu" (addition cross) into Kakuro — and it became Japan’s favorite pencil puzzle until Sudoku dethroned it. Western newspapers picked it back up during the mid-2000s logic-puzzle boom.',
  intro:
    'Kakuro mastery is combination fluency. The board is a crossword where every answer is a set of unique digits with a known sum, and the strong solver reads clues the way a crossword solver reads short words: "16 in two" is not a calculation, it is instantly 7+9. Every grid here has a unique solution reachable without guessing, so your growth is learning the forced partitions, then the intersection craft that turns two half-known runs into one placed digit.',
  sections: [
    {
      title: 'Learn the magic blocks cold',
      art: {
        kind: 'row',
        items: ['3=1+2', '16=7+9', '17=8+9'],
        caption: 'Magic blocks read instantly — no arithmetic needed'
      },
      paragraphs: [
        'Certain clue/length pairs have exactly one digit set — solvers call them magic blocks. They are the givens of Kakuro; find every one before doing anything else.'
      ],
      bullets: [
        '2️⃣ 2 cells: 3 = 1+2, 4 = 1+3, 16 = 7+9, 17 = 8+9.',
        '3️⃣ 3 cells: 6 = 1+2+3, 7 = 1+2+4, 23 = 6+8+9, 24 = 7+8+9.',
        '4️⃣ 4 cells: 10 = 1+2+3+4, 11 = 1+2+3+5, 29 = 5+7+8+9, 30 = 6+7+8+9.',
        '📈 The pattern: sums near the minimum (1+2+3+…) or maximum (…+8+9) for their length are forced or nearly forced — extremes carry information, middling sums like 15-in-3 carry almost none.',
        '9️⃣ A 9-cell run is always all of 1–9 (sum 45); an 8-cell run is 45 minus one digit, so its clue names the missing digit directly.'
      ]
    },
    {
      title: 'Solve at the crossings, not along the runs',
      art: {
        kind: 'grid',
        rows: ['#3#', '413', '#2#'],
        caption: 'Across 4 = 1+3, down 3 = 1+2 — the crossing shares only the 1'
      },
      paragraphs: [
        'Every white cell belongs to one across run and one down run, and its value must appear in both candidate sets. Intersections of two magic blocks are where puzzles crack open.'
      ],
      bullets: [
        '📍 Open at a corner where a short across meets a short down: "4 in two" crossing "3 in two" shares only the 1 — placed.',
        '💡 Tap a cell to light both its runs and read their live totals; the combos assist shows exactly this intersection, so learn to compute it yourself and keep the assist for checking.',
        '➖ When one cell of a 2-cell run is placed, the partner is pure subtraction — sweep the board for these after every placement.'
      ]
    },
    {
      title: 'Bound cells with min/max arithmetic',
      art: {
        kind: 'row',
        items: ['12 in 2', '>', '3–9 only'],
        caption: 'A 1 or 2 would need a partner of 11 or 10 — impossible'
      },
      bullets: [
        '📏 In a run of n cells summing to S, one cell equals S minus the others — so it is at least S minus the biggest the rest can be, and at most S minus their smallest.',
        '🧮 Example: 12 in two cells means neither cell can be 1 or 2 (the partner would need 11 or 10) — candidates are 3–9 before you look at anything else.',
        '⛔ Low clues ban high digits from the whole run; high clues ban low digits. "6 in three" caps every cell at 3.',
        '🔄 Recompute bounds every time a digit lands in a run — a placed 9 in "23 in three" collapses the rest to 6+8.'
      ]
    },
    {
      title: 'Common traps',
      art: {
        kind: 'grid',
        rows: ['88b', '79g'],
        caption: 'No repeats within a run: 16 in two is always 7+9, never 8+8'
      },
      bullets: [
        '🚫 No repeats within a run: 16 in two is never 8+8, and a run that "needs" a repeat means an earlier digit is wrong.',
        '🧱 The same digit CAN appear twice in one row of the grid if a dark cell separates the runs — the constraint is per run, not per row.',
        '🧭 Do not confuse the across and down clue on the same dark cell; when a cell resists, the first check is whether you summed the wrong direction.',
        '👀 A completed run whose sum works can still be wrong if it starves a crossing run — always glance at the perpendicular clues before locking a combination in your head.'
      ]
    },
    {
      title: 'When you stall',
      art: {
        kind: 'banner',
        emojis: '🔍🧩🎯',
        caption: 'Kakuro progress is local — exhaust one corner at a time'
      },
      bullets: [
        '🔍 Return to the longest and shortest clues you have not finished — re-derive their remaining combinations with the digits now placed.',
        '🎁 Look for a run missing one cell anywhere on the board; those are free subtractions that are easy to overlook mid-chain.',
        '📌 Work a cluster, not the whole board: pick the most-constrained corner and exhaust it before moving on — Kakuro progress is local.',
        '🚫 Never guess: with unique solutions, an "either 5 or 7" cell always has a crossing run that decides it — go find that run.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['🧠 magic blocks', '>', '📐 bounds', '>', '✨ clean wins'],
        caption: 'Combination fluency first, bounding craft second, assists off last'
      },
      bullets: [
        '🪜 Move up a tier when the 2- and 3-cell magic blocks feel instant; the larger boards mostly add longer, looser runs that reward the min/max bounding above.',
        '🎛️ Play with the Combos assist off — it is the skill itself, and it counts as help; Run check off too once your error rate drops, since clean wins are tracked separately.',
        '✅ A placement that completes a broken run costs points here, so verify the sum BEFORE the last digit of a run, not after.',
        '🎓 Use the hint sparingly and post-mortem it: it cancels its cell and costs points, so a hint you did not learn from is paid for twice.'
      ]
    }
  ],
  references: [
    {
      label: 'Kakuro — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Kakuro',
      note: 'history, rules and the standard combination tables'
    },
    {
      label: 'Nikoli — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Nikoli_(publisher)',
      note: 'the Japanese publisher that turned Cross Sums into Kakuro'
    },
    {
      label: 'Killer sudoku — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Killer_sudoku',
      note: 'the sister puzzle sharing the same sum-partition arithmetic'
    }
  ]
};
