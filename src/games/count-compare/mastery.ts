import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Count & Compare" — strategy content only; the rules
 * live in tutorial.tsx. See DESIGN.md "Mastery guides" for the bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Count & Compare is built on two century-old findings of experimental psychology: subitizing — the instant, exact perception of up to about four items, named by Kaufman and colleagues in 1949 — and the approximate number system, the innate magnitude sense (studied extensively by Stanislas Dehaene and others) that compares quantities without counting.',
  intro:
    'Mastery means using the right number system per trial. Up to four items: trust instant subitizing. Larger sets in a flash: never count — group into subitizable chunks, or for comparisons, read density and area like a magnitude gauge. Counting one-by-one is the beginner move the flash duration is designed to punish.',
  sections: [
    {
      title: 'Subitize, chunk, estimate',
      art: {
        kind: 'row',
        items: ['●●●', '+', '●●●●', '>', '7'],
        caption: 'Chunk into subitizable groups — never count one by one'
      },
      bullets: [
        '⚡ 1–4 items are read instantly and exactly — tap without deliberation.',
        '🧩 5–9 items: chunk into groups of 2–4 ("a 3-cluster and a 4-cluster = 7"); spatial clusters are gifts, use their layout.',
        '📏 Beyond ~9 in a flash: pure estimation — anchor on known patterns (a dice-nine looks like THIS) and accept the magnitude read.'
      ]
    },
    {
      title: 'Comparison trials',
      art: {
        kind: 'row',
        items: ['🌑 denser', '🆚', '🌌 wider'],
        caption: 'Read density × spread like a gauge — never count either side'
      },
      bullets: [
        '🚫 Do not count either side — compare density × spread: the side that is both denser and wider has more, full stop.',
        '🎈 When one side is denser but smaller, beware the area illusion: sparse-but-spread arrays look bigger than they are; density difference usually outweighs spread difference.',
        '⚖️ Ratio rules difficulty (Weber\'s law): 12 vs 18 is easy, 15 vs 17 is hard — give near-ratios your full flash attention and lean on chunk counts for a tiebreak.'
      ]
    },
    {
      title: 'Use the flash well',
      art: {
        kind: 'row',
        items: ['🎯 center gaze', '>', '⚡ flash', '>', '🖼 afterimage'],
        caption: 'Decide during the flash; move the finger after'
      },
      bullets: [
        '🎯 Gaze at the display\'s center BEFORE the stimulus appears; the flash is too short to spend traveling.',
        '🖼 Hold the afterimage: the visual buffer persists briefly after the flash — finish your chunking on the echo, not the screen.',
        '🧠 Decide during the flash, execute after: fingers move post-stimulus; perception must own the display time.'
      ]
    },
    {
      title: 'Traps',
      art: {
        kind: 'grid',
        rows: ['●..●', '.●●.', '●..●'],
        caption: 'Symmetry invites double-counting — count one half and double, consciously'
      },
      bullets: [
        '🎨 Mixed sizes/colors bias counts upward for the salient subset — count POSITIONS, not salience.',
        '🪞 Symmetric arrangements invite double-counting mirrored halves; count one half and double, consciously.',
        '🎰 After two same-answer trials, expect your bias to repeat the answer — the game\'s randomness does not owe you streaks.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['4', '>', '5', '>', '6'],
        caption: 'The subitizing ceiling moves with practice — 5 and 6 become instant reads'
      },
      bullets: [
        '📈 Push your subitizing ceiling: sets of 5–6 become "instant" with practice — the profile\'s accuracy curve shows the ceiling moving.',
        '🎲 Train chunk vocabulary deliberately: dice faces, playing-card layouts and dominoes are pre-learned 1–6 patterns; seeing them in random arrays is the skill.',
        '⬇️ When accuracy dips below ~85% on a tier, drop back one — estimation calibrates by feedback on near-successes, not by drowning.'
      ]
    }
  ],
  references: [
    {
      label: 'Subitizing — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Subitizing',
      note: 'the instant-exact perception of small counts'
    },
    {
      label: 'Approximate number system — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Approximate_number_system',
      note: 'the magnitude sense that decides comparison trials'
    }
  ]
};
