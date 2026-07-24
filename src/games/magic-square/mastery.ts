import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Magic Square" — strategy content only; the rules live
 * in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Magic squares are ancient: Chinese legend dates the 3×3 Lo Shu square to a turtle\'s shell around 650 BC, and Islamic, Indian and European mathematicians studied them for centuries — Albrecht Dürer engraved a famous 4×4 into Melencolia I (1514). Arranging numbers so every row, column and diagonal shares one sum is among the oldest recreational mathematics known.',
  intro:
    'Mastery is arithmetic leverage. The magic constant is forced by the numbers themselves — sum everything, divide by the row count — and from there the square is a web of small equations. Champions place the center and corners by theory, then let each completed line dictate its final cell by subtraction.',
  sections: [
    {
      title: 'Compute the constant first',
      art: {
        kind: 'row',
        items: ['1–9 sum 45', '>', '÷ 3 rows', '>', '15'],
        caption: 'The constant is forced: total of all numbers divided by the row count'
      },
      bullets: [
        '🧮 Magic constant = (sum of all numbers) ÷ (number of rows). For 1–9 it is 15; for 1–16 it is 34. Compute it before touching a tile.',
        '➖ Every line becomes a subtraction problem once it has one empty cell: constant − (placed sum). Fill such lines instantly, always.',
        '🤝 Two empty cells in a line define a PAIR SUM — write it mentally and hunt the two numbers that fit.'
      ]
    },
    {
      title: '3×3 theory (and why center = 5)',
      art: {
        kind: 'grid',
        rows: ['816', '357', '492'],
        caption: 'The unique 3×3 (up to symmetry): 5 centers every line, evens hold the corners'
      },
      bullets: [
        '🎯 The center joins four lines, so it must be the mean value — for 1–9, always 5.',
        '⚖️ Even numbers occupy corners, odds the edges (for consecutive 1–9): corner lines each cross the center, and parity forces this split.',
        '🔄 Opposite cells through the center always sum to 2×center (10 for 1–9) — place any number and its partner is determined.'
      ]
    },
    {
      title: 'Bigger squares',
      art: {
        kind: 'row',
        items: ['1 ↔ 16', '2 ↔ 15', '3 ↔ 14'],
        caption: 'On 4×4 extremes pair to 17 in complementary cells — place them first'
      },
      bullets: [
        '🧲 Extremes pair up: the largest and smallest numbers appear in complementary cells (sum = min+max); place extremes first, they have the fewest legal homes.',
        '⚖️ Balance every line: a line loaded with two big numbers needs the smallest survivors — estimate each line as "heavy/light" and fix imbalances before exact sums.',
        '📐 Diagonals are the tightest constraints (they cross the most placed structure late in the solve) — keep them one move from complete as long as possible.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'banner',
        emojis: '🧮🔁🔎',
        caption: 'Re-add the near-full lines — one slip upstream makes the endgame impossible'
      },
      bullets: [
        '🔁 Re-add every full and near-full line — a single arithmetic slip upstream is the usual cause of an "impossible" endgame.',
        '🔀 Swap-test: two lines each off by the same amount in opposite directions differ by one swap; find the two cells that trade.',
        '🗂️ Park the remaining numbers as a written pool and match them against needed pair-sums rather than trying cells one by one.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['🧠 memorize 3×3', '>', '➕ pair sums', '>', '⚡ speed'],
        caption: 'Speed here is 90% arithmetic fluency'
      },
      bullets: [
        '🧠 Memorize the 3×3 solution shape once (it is unique up to rotation/reflection) — then higher tiers become the real game.',
        '🗣️ Practice pair-sum arithmetic aloud until subtraction from the constant is instant; speed here is 90% arithmetic, 10% search.',
        '📊 Use your errors stat to catch guess-placing: magic squares are pure calculation, so every error marks a sum you skipped.'
      ]
    }
  ],
  references: [
    {
      label: 'Magic square — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Magic_square',
      note: 'history from Lo Shu to Dürer, plus construction methods'
    },
    {
      label: 'Lo Shu Square — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Lo_Shu_Square',
      note: 'the legendary 3×3 original'
    }
  ]
};
