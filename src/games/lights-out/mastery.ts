import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Lights Out" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Lights Out was released as a handheld electronic game by Tiger Electronics (USA) in 1995, though the underlying "all-off" switching puzzle was studied by mathematicians earlier (Sutner, 1989). It became a favorite of recreational mathematics because every position is solvable — or not — by linear algebra over GF(2).',
  intro:
    'Mastery rests on three facts: presses commute (order never matters), pressing a cell twice cancels out, and therefore a solution is just a SET of cells to press. The classic human algorithm — light chasing — turns that math into a routine anyone can execute; the expert layer is knowing the small tweak table that finishes the job optimally.',
  sections: [
    {
      title: 'The three invariants',
      art: {
        kind: 'grid',
        rows: ['.y.', 'yyy', '.y.'],
        caption: 'One press toggles a plus — the cell and its four orthogonal neighbors'
      },
      bullets: [
        '🔀 Order is irrelevant: stop thinking in sequences; think in press-sets.',
        '♻️ Never press a cell twice — it undoes itself. If your plan revisits a cell, the plan simplifies.',
        '➕ Each press toggles a plus-shape (self + orthogonal neighbors); edges and corners toggle fewer cells, which is why the last row is special.'
      ]
    },
    {
      title: 'Light chasing: the workhorse',
      art: {
        kind: 'grid',
        rows: ['y..y', 'h..h', '....'],
        caption: 'Chasing: press directly below each lit cell, row after row'
      },
      paragraphs: [
        'Sweep top to bottom: for every lit cell in a row, press the cell DIRECTLY BELOW it. Each row goes dark as you descend, pushing all remaining light into the bottom row.'
      ],
      bullets: [
        '🤖 Execute mechanically — no decisions until the bottom row.',
        '🌑 If the bottom row ends dark, you are done; otherwise its lit pattern decides a second pass.',
        '🔁 Second pass: press specific TOP-row cells according to the bottom pattern, then chase down again — on the classic 5×5, bottom-pattern 10001 maps to pressing top cell 1 (leftmost) etc.; the map has only a handful of entries and repeats fast.'
      ]
    },
    {
      title: 'Beating par',
      art: {
        kind: 'row',
        items: ['🧮 any solution', '>', '➖ quiet pattern', '>', '🏆 minimal'],
        caption: 'Subtracting a quiet pattern yields another — often shorter — solution'
      },
      bullets: [
        '📏 Chasing solves but rarely optimally; this app\'s par is the exact GF(2) minimum, so the gap between your presses and par is measurable coaching.',
        '✂️ After finding ANY solution, prune: any press-set differing from yours by a "quiet pattern" (a set that toggles nothing) is also a solution — the 5×5 has nontrivial quiet patterns, which is exactly why shorter solutions exist.',
        '🪞 Solve symmetric boards symmetrically: symmetric light patterns admit symmetric minimal solutions — mirror your presses and halve the search.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['h....', '.....', 'y...y'],
        caption: 'Bottom row 1···1 → press the top-left, then chase down again'
      },
      bullets: [
        '🔄 Reset and re-chase cleanly — a stray double-press is invisible mid-solve and poisons everything after it.',
        '🍩 On wrap-around (torus) tiers, chasing still works but the bottom-row table differs; derive it once by experiment and keep it.',
        '🌡️ Use the par meter as a thermometer: if par drops after your press, the press was right; if it rises, you moved away from every minimal solution.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '💡📓🏆',
        caption: 'Own the bottom-row table and every board becomes two sweeps'
      },
      bullets: [
        '📓 Learn the bottom-row table for your favorite size by logging three games — it repeats, and owning it converts every board into two mechanical sweeps.',
        '🎯 Chase par exactly on easy sizes before moving up: matching the GF(2) minimum even once teaches more than ten sloppy clears.',
        '🔮 Treat the hint as a linear-algebra oracle: it reveals one cell of the minimal press-set — check whether it was in your planned set, and if not, why not.'
      ]
    }
  ],
  references: [
    {
      label: 'Lights Out (game) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Lights_Out_(game)',
      note: 'history, light chasing, and the mathematics of solvability'
    },
    {
      label: 'GF(2) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/GF(2)',
      note: 'the two-element field that makes press-sets, not sequences, the right mental model'
    }
  ]
};
