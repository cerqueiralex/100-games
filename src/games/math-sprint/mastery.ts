import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Math Sprint" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Timed arithmetic drills go back to 19th-century schoolroom "rapid calculation" and to the mental-arithmetic traditions of soroban (abacus) training in Japan, where anzan — calculating on an imagined abacus — produces astonishing speed. Digital sprint formats were popularized by 2000s brain-training games like Nintendo\'s Brain Age (2005).',
  intro:
    'Mastery is replacing calculation with retrieval and technique. Sprint scores are won by three things: instant recall of the basic tables, left-to-right estimation techniques that beat schoolbook right-to-left methods under time pressure, and error discipline — a wrong answer costs more than a slow one.',
  sections: [
    {
      title: 'Left-to-right beats schoolbook',
      art: {
        kind: 'row',
        items: ['47 + 38', '>', '70', '>', '+15', '>', '85'],
        caption: 'Big-end first: the answer takes shape while you read'
      },
      bullets: [
        '➡️ Add big-end first: 47+38 → 70, +15 → 85. The partial answer arrives early, so you can start typing while finishing.',
        '⬆️ Subtract by complement: 83−47 → 47+3=50, +33 → 36 ("count up" beats borrowing under pressure).',
        '🧩 Multiply via decomposition: 7×16 → 7×10 + 7×6 = 70+42 = 112; ×5 is ×10÷2; ×9 is ×10 minus the number.'
      ]
    },
    {
      title: 'Recall, not thought',
      art: {
        kind: 'row',
        items: ['6 + 7', '=', '6 + 6', '+', '1'],
        caption: 'Near-doubles resolve by retrieval, not computation'
      },
      bullets: [
        '🧠 The multiplication table through 12 and all complements to 100 (37↔63) must be retrieval, not computation — drill the handful of facts you hesitate on.',
        '👯 Recognize near-doubles: 6+7 is "6+6 plus 1"; 15+16 is "15×2 plus 1".',
        '⚡ Parity-check divisions and subtractions instantly: an even−odd can\'t be even — half your slips are catchable in the final glance.'
      ]
    },
    {
      title: 'Sprint craft',
      art: {
        kind: 'row',
        items: ['👀 operator', '>', '🔢 numbers', '>', '⌨️ answer'],
        caption: 'Operator first — misreads there are the costliest error class'
      },
      bullets: [
        '🔣 Read the OPERATOR first, then the numbers — operator misreads are the most expensive error class.',
        '🥁 Keep a steady cadence rather than bursts: rushing one answer poisons the next two (attention takes ~a second to recover from an error).',
        '⏭️ Skip strategy: if a problem stalls you beyond a few seconds, answer your best estimate and move on — the timer prices hesitation, and streaks reward flow.'
      ]
    },
    {
      title: 'Under pressure',
      art: {
        kind: 'banner',
        emojis: '🫁⏱️🎯',
        caption: 'Cadence and accuracy outscore panic bursts'
      },
      bullets: [
        '🛡️ When the clock is low, favor accuracy over count: errors break streak multipliers and cost points that one extra answer will not repay.',
        '🌬️ Breathe out before each new problem — a physical cadence anchor measurably reduces careless slips in timed tasks.',
        '🔍 If two answers look plausible, re-check the ones digit only — it disambiguates most arithmetic pairs fastest.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['🎯 95% accuracy', '>', '⚡ speed'],
        caption: 'Push speed only once accuracy holds — below that, practice trains errors'
      },
      bullets: [
        '🐢 Identify your slowest fact families from the games you play (which problems you hesitate on) and drill those five facts between sessions.',
        '📏 Climb tiers for operand size, not just speed pressure — left-to-right technique only becomes necessary (and thus learned) with two-digit operands.',
        '📈 Watch accuracy percentage in your history: push speed only when accuracy holds above ~95%; below that, speed practice trains errors.'
      ]
    }
  ],
  references: [
    {
      label: 'Mental calculation — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Mental_calculation',
      note: 'the standard techniques: left-to-right, complements, decomposition'
    },
    {
      label: 'Soroban — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Soroban',
      note: 'the abacus tradition behind the fastest mental calculators alive'
    }
  ]
};
