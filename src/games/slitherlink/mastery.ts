import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Slitherlink" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Slitherlink was first published by the Japanese puzzle house Nikoli in 1989, credited to their reader-driven puzzle workshop culture, and is considered one of Nikoli\'s "big three" alongside Sudoku and Kakuro. It spread internationally as Loop the Loop and Fences.',
  intro:
    'Mastery means thinking in edges you CANNOT draw as much as edges you can. The single-closed-loop rule is a global constraint that turns local numbers into long-range logic: every corner, every 0, every pair of adjacent 3s has a signature you learn to stamp instantly, and small-x marks on dead edges carry as much information as drawn segments.',
  sections: [
    {
      title: 'Open with the signatures',
      art: {
        kind: 'grid',
        rows: ['|3|3|'],
        caption: 'Adjacent 3s: the shared edge and both outer edges are always drawn'
      },
      bullets: [
        '0️⃣ Every 0: x all four edges, then look at its diagonal neighbors — a 3 diagonal to a 0 has both its far edges drawn.',
        '3️⃣ Adjacent 3s (side by side): the shared edge and both outer parallel edges are drawn — three strokes for free.',
        '↗️ Diagonal 3s: both outer corners of each 3 are drawn.',
        '📐 A 3 in a corner of the board: its two border edges are drawn; a 1 in a corner: its two border edges are x-ed.'
      ]
    },
    {
      title: 'Count degrees at every dot',
      art: {
        kind: 'grid',
        rows: [' x ', 'x·─', ' │ '],
        caption: 'A dot on the loop has exactly two edges — the other two get ✕'
      },
      paragraphs: [
        'A dot on the loop has exactly 2 edges; off the loop, exactly 0. This parity rule is the engine of the midgame.'
      ],
      bullets: [
        '✌️ A dot with two drawn edges: x everything else touching it immediately.',
        '🚧 A dot with three x-ed edges: the fourth is x too (a loop can never dead-end).',
        '➡️ A drawn edge arriving at a dot with only one continuation must take it — follow such forced paths until they branch.'
      ]
    },
    {
      title: 'The loop is one piece',
      art: {
        kind: 'grid',
        rows: ['─·x·─'],
        caption: 'Two ends of the SAME segment may not join early — ✕ the connector unless it closes the final loop'
      },
      bullets: [
        '⭕ Never close a small loop unless it satisfies every remaining number — before completing any circuit, check nothing is left outside it.',
        '🚫 Two open ends of the same segment approaching each other may not connect unless that closes the FINAL loop; x the joining edge otherwise.',
        '🌓 Think inside/outside: the loop separates the board into two regions. Cells you can prove are both "inside" must connect without crossing the line — shading inside/outside on hard boards resolves stubborn corners.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['2..', '.2.', '..2'],
        caption: '2s chain along diagonals in known patterns — sweep them when progress stops'
      },
      bullets: [
        '2️⃣ Sweep all 2s: a 2 with one drawn and one x-ed edge is one deduction from done, and 2s chain along diagonals in known patterns.',
        '🔢 Re-count dots — a stall is almost always a missed 2-edge dot buried in the drawn tangle.',
        '⚖️ Look at the parity of loose ends: loop ends come in pairs; an odd-looking region usually hides a forced connection.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['✕ dead edges', '>', '📚 signatures', '>', '✨ no guessing'],
        caption: 'X-discipline plus pattern vocabulary is the whole ladder'
      },
      bullets: [
        '❎ Force yourself to x edges the moment they die — players who only draw positives stall two tiers below their logic ability.',
        '📚 Learn one new corner/edge signature per session and hunt it everywhere; the pattern vocabulary IS the difficulty ladder.',
        '🎓 Every board here has a unique loop reachable without guessing — treat any urge to bifurcate as a missing signature, then find it with a hint and study it.'
      ]
    }
  ],
  references: [
    {
      label: 'Slitherlink — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Slitherlink',
      note: 'rules, history and a catalog of the standard edge patterns'
    },
    {
      label: 'Nikoli — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Nikoli_(publisher)',
      note: 'the publisher behind Slitherlink and modern pencil-puzzle culture'
    }
  ]
};
