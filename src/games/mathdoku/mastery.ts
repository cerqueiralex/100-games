import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master MathDoku" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'This is the KenKen family of puzzles, invented in 2004 by Tetsuya Miyamoto, a Japanese mathematics teacher, as a classroom tool he called the "Kashikoku naru" (getting-smarter) puzzle — his teaching philosophy was learning without instruction. The Times of London began printing it in 2008 and it spread worldwide fast. "KenKen" is a trademark, so unlicensed versions like this one go by MathDoku or Calcudoku; the puzzle itself is a Latin square carved into arithmetic cages.',
  intro:
    'MathDoku mastery is knowing which cages to interrogate first. Every board is a Latin square — each row and column holds 1 to N once — and every cage is an arithmetic fingerprint whose possible digit sets you can enumerate. Strong players rank cages by how few fillings they allow, mine the rare ones, and let row/column logic finish the rest. Boards here always have a unique, deduction-only solution, so if you feel like guessing, a cage enumeration is waiting to be written out.',
  sections: [
    {
      title: 'Open with the rarest cages',
      art: {
        kind: 'row',
        items: ['120×', '>', '{4,5,6}'],
        caption: 'On a 6×6 a three-cell 120× factors exactly one way'
      },
      paragraphs: [
        'Not all cages are equal: a single-cell cage is a free given, and extreme targets often have one possible digit set. Sweep the board and grade every cage before placing anything.'
      ],
      bullets: [
        '1️⃣ Fill all single-cell cages first — they are givens and they seed every row/column deduction.',
        '💰 Large products are gold: on a 6×6, a 3-cell "120×" can only be {4,5,6} — multiplication targets factor far fewer ways than sums split.',
        '🔢 A ×-cage whose target is divisible by a prime bigger than half the grid size must contain that prime: any multiple of 5 on a 6×6 board contains the 5.',
        '🧮 Extreme sums are forced like Kakuro blocks: a 3-cell "6+" is {1,2,3}; the max-sum cages are the top digits.',
        '👯 Two-cell "1−" cages are consecutive digits, and "2÷" cages are digit-and-double — few options, and they pair up with row logic quickly.'
      ]
    },
    {
      title: 'Use the line-sum arithmetic',
      art: {
        kind: 'grid',
        rows: ['hhha'],
        caption: 'Addition cages tile the row except one cell — it equals the line constant minus the cage totals'
      },
      paragraphs: [
        'Every row and column sums to a fixed constant: 10 on 4×4, 15 on 5×5, 21 on 6×6, 28 on 7×7. When cages tile most of a line, the remainder is forced — the same innie/outie trick as Killer Sudoku.'
      ],
      bullets: [
        '➖ If addition cages exactly cover a row except one cell, that cell equals the row constant minus the cage totals.',
        '📐 Extend to two or three lines at once — a cage poking out of a two-row block is the block total of the cages minus twice the line constant.',
        '⚖️ Parity helps: subtraction cages fix the parity of their pair’s sum, which can settle an innie/outie the raw bounds leave open.'
      ]
    },
    {
      title: 'The Latin square is half the puzzle',
      art: {
        kind: 'grid',
        rows: ['3.', 'h3'],
        caption: 'An L-cage may repeat a digit across the diagonal — different row, different column'
      },
      bullets: [
        '👉 A cage combination confined to one row eliminates those digits from the rest of that row even before the cage is resolved — pointing pairs made of arithmetic.',
        '👥 Naked pairs and hidden singles work exactly as in Sudoku (minus the boxes) — after each cage enumeration, sweep its lines for them.',
        '🧩 Remember the shape rule: a digit MAY repeat inside an L-shaped cage as long as the copies sit in different rows and columns — do not prune those combinations away.',
        '✏️ Keep notes cage by cage: write the full candidate sets for your two or three most-constrained unsolved cages, and refresh them whenever a crossing digit lands.'
      ]
    },
    {
      title: 'Extreme: deducing the hidden operation',
      art: {
        kind: 'row',
        items: ['target 24', '>', 'must be ×'],
        caption: 'A 3-cell cage above the max possible sum can only be multiplication'
      },
      paragraphs: [
        'On the extreme tier the cages show only a target number. Enumerate per operation and merge — it is less work than it looks, because most targets are impossible for most operations.'
      ],
      bullets: [
        '➗ Check ÷ and − first on 2-cell cages: they allow the fewest pairs, and a target above the grid size rules both out instantly.',
        '🎯 A 2-cell target of 1 in a straight cage can only be subtraction with consecutive digits — division to 1 would need equal digits, illegal in one row or column.',
        '✖️ Targets bigger than the max sum of the cage are multiplication, full stop — a 3-cell cage above 3N is a product.',
        '🔀 Union the surviving sets across operations and treat the cage like a normal one from there; the operation itself often stays unknown until the end, and that is fine.'
      ]
    },
    {
      title: 'When you stall',
      art: {
        kind: 'banner',
        emojis: '🔁🧮🔍',
        caption: 'A dead end is an enumeration you have not written out yet'
      },
      bullets: [
        '🔁 Re-enumerate the cage you trimmed longest ago — digits placed since then usually kill half its combinations.',
        '🔍 Find the line with the fewest empty cells and write out which digits are missing; test each against the cages it would land in.',
        '✂️ Check cage/line overlaps: the part of a cage inside one row must be satisfiable with the row’s remaining digits — a quick contradiction check that often forces the split.',
        '🚫 Never bifurcate: every board here is proven to fall to sound deduction alone, so a dead end means an enumeration you have not done, not a coin to flip.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['4×4', '>', '5×5', '>', '6×6', '>', '7×7'],
        caption: 'Boards grow up the tiers — pro drops the free single cells'
      },
      bullets: [
        '🪜 Climb 4×4 to 7×7 through the tiers; pro removes the free single-cell cages and enlarges cages, so practice the line-sum arithmetic on hard before you need it.',
        '🎛️ Turn off Cage check and Duplicate highlight to chase clean wins — both count as help, and your history tracks clean and assisted wins separately.',
        '📝 Rule-breaking placements cost points, so resolve a cage on paper (notes) before committing digits; the −30 errors are almost always premature commits.',
        '🎓 When you use a hint, identify which cage enumeration would have produced that digit — then do that enumeration first next game.'
      ]
    }
  ],
  references: [
    {
      label: 'KenKen — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/KenKen',
      note: 'history of Miyamoto’s invention and the naming of the family'
    },
    {
      label: 'Latin square — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Latin_square',
      note: 'the mathematical structure underneath every row/column deduction'
    },
    {
      label: 'Killer sudoku — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Killer_sudoku',
      note: 'the sibling cage puzzle whose innie/outie arithmetic transfers directly'
    }
  ]
};
