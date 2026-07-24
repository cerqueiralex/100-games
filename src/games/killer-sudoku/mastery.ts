import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Killer Sudoku" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Killer Sudoku fuses classic Sudoku with the summed runs of Kakuro. It was already an established variant in Japanese puzzle magazines by the mid-1990s under the name "samunamupure" (from "sum number place"). The Times of London imported it in 2005 — one year into the West’s Sudoku craze — and the "Killer" name it ran under stuck worldwide.',
  intro:
    'Mastery here means treating the cage sums as a second, richer digit system layered on Sudoku. Weak players fill the easy cages and stall; strong players work the arithmetic — the 45 rule, the forced combinations, min/max bounds — until cells appear in cages they never "solved" directly. Every board in this app has a unique solution reachable by pure deduction, so never bifurcate: on pro and extreme there are zero givens and the sums genuinely are everything.',
  sections: [
    {
      title: 'The 45 rule is the whole game',
      art: {
        kind: 'grid',
        rows: ['hhh', 'h?h', 'hhh'],
        caption: 'Cages tile the box except one cell — the innie equals 45 minus the cage sums'
      },
      paragraphs: [
        'Every row, column and 3×3 box sums to 45. Whenever a set of cages almost tiles a box (or row, or column), the arithmetic hands you a cell.'
      ],
      bullets: [
        '📥 Innie: cages cover a box except one cell sticking IN — that cell equals 45 minus the cage sums.',
        '📤 Outie: cages cover a box plus one cell sticking OUT — that cell equals the cage sums minus 45.',
        '📈 Scale it up: two boxes sum to 90, three to 135; a two-box innie/outie is often the first placement on a no-givens board.',
        '🧹 Do a 45-rule sweep of all nine boxes before placing anything — on pro/extreme this is your opening, not a trick for later.'
      ]
    },
    {
      title: 'Memorize the forced combinations',
      art: {
        kind: 'row',
        items: ['3=1+2', '16=7+9', '17=8+9'],
        caption: 'Two-cell magic sums — exactly one digit set each'
      },
      paragraphs: [
        'Some cage sums have exactly one digit set. These are your givens in disguise — find them first.'
      ],
      bullets: [
        '2️⃣ 2 cells: 3 = 1+2, 4 = 1+3, 16 = 7+9, 17 = 8+9.',
        '3️⃣ 3 cells: 6 = 1+2+3, 7 = 1+2+4, 23 = 6+8+9, 24 = 7+8+9.',
        '4️⃣ 4 cells: 10 = 1+2+3+4, 11 = 1+2+3+5, 29 = 5+7+8+9, 30 = 6+7+8+9.',
        '⚖️ Near-forced sums (two combinations) are almost as good: note both sets and let a crossing row or box kill one.',
        '🚫 Digits never repeat inside a cage — so a 2-cell cage is never an even sum made of doubles (16 is 7+9, never 8+8).'
      ]
    },
    {
      title: 'Squeeze cages with min/max bounds',
      art: {
        kind: 'row',
        items: ['20 in 3', '>', 'min 3'],
        caption: 'The other two cells max at 8+9, so no cell drops below 3'
      },
      bullets: [
        '➖ For a partly filled cage, subtract placed digits from the sum and re-derive the combinations for the remaining cells — the set shrinks every time.',
        '📏 Bound single cells: in a 3-cell cage totalling 20, no cell can be less than 3 (the other two max at 8+9).',
        '⛔ A low-sum cage (5 in two cells) bans high digits from BOTH its cells — use that to place the 8s and 9s elsewhere in the unit.',
        '📦 Cages lying inside one box obey box rules too: two cages in a box that together need two 9s are proof you misread one of them.'
      ]
    },
    {
      title: 'Classic Sudoku still runs underneath',
      art: {
        kind: 'grid',
        rows: ['aa xx', '.. ..'],
        caption: 'A combination locked in one row of its cage evicts those digits from the row beyond the box'
      },
      paragraphs: [
        'Once combinations pin candidates, the whole Sudoku toolkit fires: hidden singles, naked pairs, pointing pairs. The cages feed the candidates; the units finish the job.'
      ],
      bullets: [
        '👉 A forced combination confined to one row of its cage eliminates those digits from the rest of the row — pointing pairs made of cage math.',
        '✏️ Keep notes rigorously from the very start; unlike plain Sudoku there may be no givens to anchor you, so your pencil marks ARE the board state.',
        '🔁 After every placement, re-check the cage it belongs to before scanning units — cage arithmetic tightens faster than unit logic.'
      ]
    },
    {
      title: 'When you stall',
      art: {
        kind: 'banner',
        emojis: '🔄🧮💡',
        caption: 'A stall is an uncomputed bound, never a dead end'
      },
      bullets: [
        '🔄 Re-run the 45 rule on multi-box regions you have partially solved — placements change which cages "stick out".',
        '🎯 Hunt the extreme cages you skipped: the biggest and smallest sums on the board always carry the most information per cell.',
        '✂️ Check cage/unit overlaps: a cage crossing a box boundary splits into two parts, and each part must fit its own box — often one side is forced.',
        '🧮 The urge to guess means a bound you have not computed. Pick one uncertain cage and write out its full remaining combination list — it is usually shorter than you fear.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['🧮 45 rule', '>', '🔢 combos', '>', '✨ clean wins'],
        caption: 'From arithmetic openings to assist-free mastery'
      },
      bullets: [
        '🪜 Climb the tiers deliberately: hard still gives you 8 starting digits; pro and extreme give none, forcing a pure 45-rule and combinations opening.',
        '🎛️ Turn off Cage check and Duplicate highlight once you trust your arithmetic — both count as help, and clean wins are tracked separately in your history.',
        '🎓 When a hint fills a cell, reconstruct which rule forced it (an innie? a unique combination?) before moving on — that is one technique earned.',
        '📊 Watch your error stat: Killer errors are almost always arithmetic slips, not logic gaps, so slow down on the subtraction, not the scanning.'
      ]
    }
  ],
  references: [
    {
      label: 'Killer sudoku — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Killer_sudoku',
      note: 'history, terminology and the standard combination tables'
    },
    {
      label: 'Sudoku — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Sudoku',
      note: 'the classic techniques that still run underneath every cage'
    },
    {
      label: 'SudokuWiki strategy index',
      url: 'https://www.sudokuwiki.org/Strategy_Families',
      note: 'canonical technique reference, including a dedicated Killer section'
    }
  ]
};
