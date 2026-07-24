import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Target Number" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'This is the "numbers round" from television: French producer Armand Jammot built it into "Des chiffres et des lettres", whose ancestor "Le mot le plus long" first aired in 1965 and which took its modern letters-and-numbers form in 1972. The UK adaptation, Countdown, was the very first programme broadcast on Channel 4 in 1982 and made the format famous in English: six numbers drawn from small (1–10) and large (25, 50, 75, 100) tiles, a three-digit target, thirty seconds. This app keeps the classic tile pools but guarantees every target is exactly reachable, and banks partial credit for near misses within a per-tier tolerance.',
  intro:
    'Mastery means turning a blind search into directed arithmetic. Champions do not wander through combinations — they factor the target, anchor on a large tile, and close the remaining gap with the small tiles. Since every round here has an exact solution, your ceiling is purely technique: the same three-step method (approximate with the large tiles, factor, adjust) cracks a 967 as reliably as a 240.',
  sections: [
    {
      title: 'Anchor on the large tiles',
      art: {
        kind: 'row',
        items: ['75', '×', '9', '=', '675'],
        caption: 'Large-tile products are the scaffolding — know where each one lands'
      },
      paragraphs: [
        'The large tiles (25, 50, 75, 100) are your scaffolding — nearly every solution is "large-tile expression, then corrections". Start by asking what neighbourhood of the target they can reach.'
      ],
      bullets: [
        '✖️ Multiply a large tile by a small one and see where you land: 75 × 9 = 675, 100 × 7 = 700, 50 × 13 hits nothing — know these products cold.',
        '🤝 Combine larges first when you have two: 75 + 50 = 125, 100 − 75 = 25, 75 × 50 is rarely useful but (100 + 50) × k very often is.',
        '📺 Target 952 with 75 and 3, 6, 25...? Think (75 + something) × something: the famous Countdown solve was ((100 + 6) × 3 × 75 − 50) ÷ 25. You will not need that — but the shape (big sum) × small ÷ small is worth knowing.',
        '🔧 Reserve one small tile as an adjuster before you commit the rest: a spare 2 or 3 rescues an off-by-small result.'
      ]
    },
    {
      title: 'Work backwards from the target',
      art: {
        kind: 'row',
        items: ['596', '>', '600 − 4', '>', '8 × 75 − 4'],
        caption: 'Most three-digit targets are (large × small) ± something small'
      },
      bullets: [
        '🧱 Factor it: 336 = 6 × 56 = 8 × 42 = 7 × 48. If any factor pair is buildable from your tiles, the round is over.',
        '📏 Check the target’s distance to round numbers: 596 is 600 − 4, and 600 is 6 × 100 or 8 × 75. Most three-digit targets are (large × small) ± (something small).',
        '⚖️ Use divisibility instantly: even target → try halving; ends in 0 or 5 → a 25/50/75 route likely exists; digit sum divisible by 3 → a ×3 route exists.',
        '🧮 Compute target mod your small tiles: if target mod 7 = 2 and you hold a 7 and a 2, then (target − 2) ÷ 7 names the exact number you must build.'
      ]
    },
    {
      title: 'Play the app’s rules, not against them',
      art: {
        kind: 'row',
        items: ['±10 easy', '>', '±4 extreme'],
        caption: 'The near-miss window narrows as tiers climb — exact always pays most'
      },
      bullets: [
        '➗ Every intermediate must stay a positive integer and division must be exact — so plan multiplications before divisions, and treat ÷ as “undo a known factor”, never as exploration.',
        '⚠️ Combines consume tiles: each merge replaces two numbers with one, and a dead end forces a reset (counted as an error). Sketch the full route mentally before the first tap.',
        '🏗️ Higher tiers require deeper solutions (extreme solutions use at least 5 of the 6 tiles) — expect the lazy two-tile answer to not exist, and budget for a correction step.',
        '🏦 The tolerance shrinks from ±10 (easy) to ±4 (extreme). Banking a close value is worth up to 60 × multiplier — real points — but exact is 100 × multiplier plus the speed bonus, so only settle when the clock or the tiles say so.'
      ]
    },
    {
      title: 'When the target will not fall',
      art: {
        kind: 'row',
        items: ['7 × 68', '>', '7 × (75 − 7)', '=', '476'],
        caption: 'Distributing a multiplication is the most unlocking move in the format'
      },
      bullets: [
        '🔁 Flip your direction: if forward building stalls, spend 20 seconds purely factoring the target; if factoring stalls, build the two or three landmarks your tiles reach and measure the gaps.',
        '➖ Recheck the neglected operation — most stuck rounds are missing a subtraction: overshoot deliberately (large × small beyond the target), then subtract the difference you can now build.',
        '🔓 Try the ×(a+b) shape: 7 × 68 may be impossible directly, but 7 × (75 − 7) uses tiles you actually hold. Distributing a multiplication is the single most unlocking move in the format.',
        '💡 The Hint (−6 × multiplier) shows just the next combine — cheap enough to unstick a round without spoiling it. Reveal forfeits the round; save it for studying extreme solutions.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['25×', '50×', '75×', '100×'],
        caption: 'Drill the large-tile tables (× 1–13) until they are instant'
      },
      bullets: [
        '🏋️ Drill your large-tile times tables (25/50/75/100 × 1–13) until they are instant — this is the highest-leverage practice in the whole game.',
        '🔕 Turn off the Reachable badge once you internalize that every round is exactly solvable — it counts as help while on, and clean wins need it off.',
        '🏁 Race the soft clock: the speed bonus (up to 30 × multiplier) rewards the anchor-factor-adjust method over exhaustive search. If you are consistently exact but slow, your factoring step needs drilling, not your arithmetic.',
        '🪞 After each round, compare your route with the reveal’s: shorter solutions usually found a factor pair you missed. Collect those pairs — they repeat.'
      ]
    }
  ],
  references: [
    {
      label: 'Countdown (game show) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Countdown_(game_show)',
      note: 'the UK institution, numbers-round rules and famous solves'
    },
    {
      label: 'Des chiffres et des lettres — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Des_chiffres_et_des_lettres',
      note: 'the 1965/1972 French original of the format'
    },
    {
      label: 'Countdown (Le compte est bon) numbers game — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Countdown_(game_show)#Format',
      note: 'format details including the small/large tile draw'
    }
  ]
};
