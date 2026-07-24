import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Make 24" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'The 24 game comes from a long Chinese card-playing tradition: players flip four cards and race to combine them into exactly 24 with the four basic operations, a pastime used for generations to drill children’s arithmetic. It reached American classrooms when Robert Sun packaged it as the "24 Game" in 1988. The target 24 is no accident — it is one of the most divisible small numbers (1, 2, 3, 4, 6, 8, 12, 24 all divide it), so a huge share of random four-card deals can reach it. This app adds targets of 36 and 48 on the top tiers and, on extreme, deals that force fractional intermediate steps.',
  intro:
    'Mastery here is pattern recognition, not search. Strong players do not try operations at random — they instantly see which of a handful of 24-skeletons the four cards can feed, and work backwards from it. Your growth path is memorizing those skeletons, then learning the rarer identities (fractions, near-misses) that crack the deals with only one or two solutions.',
  sections: [
    {
      title: 'The 24 skeletons',
      art: {
        kind: 'row',
        items: ['6 ÷ 2', '>', '3', '×', '8', '=', '24'],
        caption: 'Every solve ends in a skeleton — check 3×8, 4×6, 2×12, 24±k in that order'
      },
      paragraphs: [
        'Almost every solution ends in one of a few final multiplications or a sum landing on 24. Check them in this order — it turns a search over hundreds of expressions into four quick questions.'
      ],
      bullets: [
        '🐴 3 × 8 — the workhorse. Can two cards make 3 while the other two make 8? Deal 6, 2, 4, 4: (6 ÷ 2) × (4 + 4) = 24.',
        '🥈 4 × 6 — second most common. Deal 1, 3, 5, 9: (5 − 1) × (9 − 3) = 24 — one pair makes the 4, the other the 6.',
        '🧮 2 × 12 and 1 × 24 — often via a big product or sum: (5+7) × 2, or (13+11) × 1.',
        '🎯 24 ± k — build 25, 26, 27, 28, 30, 32, 36, 48 and correct: 25−1, 27−3, 30−6, 48/2, 36−12, 96/4. Seeing “I can make 27 and a 3 is left over” is a solve.'
      ]
    },
    {
      title: 'Work backwards from the cards',
      art: {
        kind: 'row',
        items: ['🎴 8', '>', 'make 3', '>', '3 × 8'],
        caption: 'One big card is half a skeleton — the rest of the deal just feeds it'
      },
      bullets: [
        '👀 Spot the big card first: an 8 asks for a 3 from the rest, a 6 asks for a 4, a 12 for a 2. One card often IS half a skeleton.',
        '⚡ Multiples of 8, 6, 4, 3 leap out: with 4 and 6 on the table, the entire puzzle is “make 1 from the other two, then × ” — or make 0 and add: 4×6 + 0.',
        '🦸 Making 0 and 1 is a superpower: a−a = 0 lets you park two cards (24 + 0), a/a = 1 lets you multiply harmlessly (24 × 1) — with two equal cards you only need 24 from the rest.',
        '➕ Sums count too: 24 as 11+13, 9+15, 10+14 — when the cards are large and awkward, check whether two pairs sum there before hunting products.'
      ]
    },
    {
      title: 'Fraction tricks (extreme tier)',
      art: {
        kind: 'row',
        items: ['8', '÷', '(3 − 8/3)', '=', '24'],
        caption: 'The 3, 3, 8, 8 classic: dividing by a third multiplies by three'
      },
      paragraphs: [
        'Extreme deals have NO integer-only solution — division must produce a fraction along the way. Two famous shapes cover most of them.'
      ],
      bullets: [
        '🧩 a × (b − c/d): the classic 1, 5, 5, 5 → 5 × (5 − 1/5) = 5 × 24/5 = 24. Look for a card that, times something-minus-a-small-fraction, lands on 24.',
        '😈 a / (b − c/d): the notorious 3, 3, 8, 8 → 8 / (3 − 8/3) = 8 / (1/3) = 24. Dividing by a small fraction MULTIPLIES — a denominator of 1/3 turns an 8 into 24.',
        '🔢 Target fractions to build: 24/5, 8/3, 3/8, 1/3, 1/4 — when integers keep failing, ask which of these the cards can form.',
        '🪜 The board holds fractional cards mid-solve, so you can build these step by step — the dead-end reset costs no points, only an error mark.'
      ]
    },
    {
      title: 'When a deal will not crack',
      art: {
        kind: 'row',
        items: ['12 | 34', '13 | 24', '14 | 23'],
        caption: 'Four cards split into two pairs in only three ways — enumerate, don\'t wander'
      },
      bullets: [
        '🔚 Enumerate final operations, not first ones: “does any pairing end in ×?” then “in +?” — the last step constrains everything.',
        '✂️ Force yourself through the pairings: four cards split into 2+2 in only three ways. For each, list what each pair can make (a+b, a−b, a×b, a/b) and cross-check the two lists against the skeletons.',
        '🔄 For targets 36 and 48 (pro/extreme), swap in the right skeletons: 36 = 4×9 = 6×6 = 3×12 = 2×18; 48 = 6×8 = 4×12 = 2×24 = 3×16.',
        '💡 The Hint (−25 points) lights the next pair and operator — use it to learn which skeleton you missed, then finish alone. Reveal forfeits the deal; treat it as a last resort on extreme uniques.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🃏⚡🧠',
        caption: 'Skeleton-first thinking turns search into recognition'
      },
      bullets: [
        '📊 Tier difficulty here is solution count: easy deals have 6+ ways in, extreme deals often exactly one. If hard feels brutal, it is because stumbling into answers stopped working — that is the cue to drill skeletons deliberately.',
        '🔕 Turn the Solvable badge off once you trust the generator (every deal is verified solvable) — it counts as help while on, and clean wins require playing without it.',
        '⏱️ Chase the speed bonus (up to 40s under par per deal): skeleton-first thinking is what makes 10-second solves possible, and the round bonus rewards clearing every deal.',
        '🎓 After any reveal, reconstruct WHY the solution works — which skeleton, which trick — before dealing on. A reveal you can re-derive is a pattern gained.'
      ]
    }
  ],
  references: [
    {
      label: '24 (puzzle) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/24_(puzzle)',
      note: 'rules, history and the classic hard deals'
    },
    {
      label: '4nums.com',
      url: 'https://www.4nums.com/',
      note: 'every solvable 24 deal, ranked by difficulty, with solutions'
    },
    {
      label: 'Fraction — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Fraction',
      note: 'brush up on fraction arithmetic for the extreme tier'
    }
  ]
};
