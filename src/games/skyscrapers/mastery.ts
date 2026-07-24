import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Skyscrapers" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Skyscrapers is a Latin-square puzzle with visibility clues that emerged from the international puzzle-championship scene in the early 1990s and has been a World Puzzle Championship staple ever since. Its exact inventor is not well documented — it spread through championship sets and puzzle magazines rather than a single publisher — but it belongs squarely to the Latin-square family that also produced Sudoku, Futoshiki and KenKen. Simon Tatham’s long-running puzzle collection popularized it to programmers under the name "Towers".',
  intro:
    'Mastering Skyscrapers means converting each edge clue into hard bans on cells before building anything. Every clue is a statement about a whole line, and the expert move is to translate all of them into "this cell cannot exceed this height" limits in one opening pass — after that, the puzzle plays like a Latin square with most candidates already gone. Boards in this app always have a unique solution that pure deduction reaches, so a guess is never required, only a limit you have not derived.',
  sections: [
    {
      title: 'Cash the free clues first',
      art: {
        kind: 'grid',
        rows: ['4→1234'],
        caption: 'A clue equal to N sees the full staircase — the whole line for free'
      },
      bullets: [
        '🎯 A clue of 1 means the tallest tower N stands immediately next to it — place it before anything else.',
        '🪜 A clue of N means the whole line is the staircase 1, 2, …, N in order from that edge — a full line for free.',
        '💪 A clue of 2 with N already adjacent to the OPPOSITE edge is strong: the first tower from the 2-side must be N−1 or the line breaks.',
        '⚖️ Opposite clues obey c1 + c2 ≤ N + 1 (they double-count the tallest tower); a pair summing to N+1 pins where N stands in that line exactly.'
      ]
    },
    {
      title: 'The distance rule — your opening pass',
      art: {
        kind: 'grid',
        rows: ['3→xxhh'],
        caption: 'A clue of 3 needs two hiders first — the tallest tower stands at least 3 cells in'
      },
      paragraphs: [
        'Every clue c bans heights near its edge: to see c towers you need c−1 towers hiding behind each other before the tallest appears.'
      ],
      bullets: [
        '📏 From a clue c, the k-th cell in can hold at most N − c + k. In practice: a clue 4 on a 6×6 caps its first three cells at 3, 4, 5.',
        '🗺️ Do this for all four edges into notes before placing a single tower — high clues carve away huge candidate blocks and hidden singles fall out immediately.',
        '🚧 The tallest tower N sits at least c cells away from a clue c — combined from both ends of a line this often leaves N one legal cell.',
        '🔄 Redo the rule on partially built lines: towers already placed change how many "hiders" remain, tightening the caps further in.'
      ]
    },
    {
      title: 'Count partial skylines',
      art: {
        kind: 'grid',
        rows: ['2→3142'],
        caption: 'Clue 2 sees the 3 and the 4 — the 1 and the 2 hide behind taller towers'
      },
      paragraphs: [
        'Once a line has a few towers, stop using formulas and just count what the clue sees: walk from the edge, count each tower taller than everything before it, and compare against the clue.'
      ],
      bullets: [
        '👁️ If the visible count already equals the clue, every remaining cell must hide — each must be shorter than the tallest tower before it.',
        '⬆️ If the count is one short and only one empty cell remains before the current maximum, that cell must produce the final step up.',
        '🔒 Placing N in a line "closes" it from that side — nothing beyond N is ever visible, so clue accounting only concerns the cells before it.',
        '✅ Lines with N placed are the cheapest to finish: check them for forced visibility every time a new tower lands.'
      ]
    },
    {
      title: 'The Latin square backbone',
      art: {
        kind: 'row',
        items: ['scan N', '>', 'scan N−1', '>', 'singles'],
        caption: 'Tall heights first — they have the fewest legal cells'
      },
      bullets: [
        '🕵️ Each height appears once per row and column — hidden singles ("only one cell in this row can still hold 5") solve most mid-game cells.',
        '🗼 Cross-reference: a height banned near two edges by the distance rule is often confined to one cell of a row — scan height by height, tallest first, because tall towers have the fewest legal cells.',
        '👥 Naked pairs work here too: two cells of a line both noted {2,3} clear those heights from the rest of the line.',
        '✏️ On hard and up, pencil candidates for the tall heights only (N, N−1) — full-grid notes waste time when the distance rule already decides the short towers late.'
      ]
    },
    {
      title: 'When you stall',
      art: {
        kind: 'banner',
        emojis: '🔭🏙️💡',
        caption: 'An impasse is an uncounted skyline'
      },
      bullets: [
        '🔄 Re-walk every clue of a line that just gained a tower — visibility counting after each placement is where late deductions hide.',
        '🎯 Find the line whose clue is most extreme among unfinished lines (1s, Ns, and N−1s first); extreme clues always hold the most leverage.',
        '🧪 Try a contradiction sweep on one cell: for each candidate, count the best- and worst-case visibility of its line — candidates that cannot hit the clue are deleted, no guessing involved.',
        '🚫 Never bifurcate: the board is proven solvable by deduction alone, so an impasse means an uncounted skyline, usually on a line you finished "in your head" but never verified.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['📏 caps', '>', '👁️ counting', '>', '✨ clean wins'],
        caption: 'Distance-rule openings, live visibility counts, then assist-free play'
      },
      bullets: [
        '🪜 Boards grow 4×4 to 7×7 across the tiers and hard strips clues to the minimum — fewer clues means the distance-rule pass and Latin-square scanning must carry more, so drill them on medium first.',
        '🎛️ Turn off Clue check and Highlight repeats for clean wins; both count as help, and your history separates clean from assisted wins.',
        '🧮 Contradictions cost 50 points, so count a line’s visibility BEFORE placing its last tower, not after.',
        '🎓 After any hint, reverse-engineer it: was it a distance-rule cap, a hidden single, or a visibility count? Name the technique and it becomes yours.'
      ]
    }
  ],
  references: [
    {
      label: 'Latin square — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Latin_square',
      note: 'the structure underneath every Skyscrapers deduction'
    },
    {
      label: 'World Puzzle Championship — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/World_Puzzle_Championship',
      note: 'the competition scene that made Skyscrapers a standard genre'
    },
    {
      label: 'Simon Tatham’s Portable Puzzle Collection',
      url: 'https://www.chiark.greenend.org.uk/~sgtatham/puzzles/',
      note: 'the classic free implementation (as "Towers"), with notes on the genre'
    }
  ]
};
