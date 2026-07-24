import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Word Ladder" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Word ladders were invented by Lewis Carroll, the English author of Alice in Wonderland, who devised the game as "Doublets" for two bored young guests at Christmas 1877; Vanity Fair began publishing his puzzles in 1879. Carroll’s classic examples — turn HEAD into TAIL, make FLOUR into BREAD — are still quoted today. A century later Donald Knuth analyzed the complete graph of five-letter word ladders by computer, proving most common words connect to each other.',
  intro:
    'A word ladder is a pathfinding problem wearing a vocabulary costume. Mastery means seeing the start and goal as two ends of a route through word-space and planning which letters must change — and in what order — before you type a single rung. Par is always reachable; every rung past par is a detour you could have planned away.',
  sections: [
    {
      title: 'Diff the words first',
      art: {
        kind: 'grid',
        rows: ['COLD', 'WARM'],
        caption: 'All four positions differ — the minimum ladder is four rungs'
      },
      paragraphs: [
        'Before rung one, compare the start and goal position by position. Every differing position needs at least one change, so the number of differences is your minimum ladder length — if par is higher, some detour through a mismatched letter is forced.'
      ],
      bullets: [
        '💎 Positions that already match are assets: try to route through words that KEEP them.',
        '🪜 If par equals the letter difference, a clean one-change-per-position route exists — look for the order that keeps every rung a real word.',
        '🧱 If par exceeds the difference, expect to temporarily break a matching letter — knowing this upfront stops you fighting it.'
      ]
    },
    {
      title: 'Work from both ends',
      art: {
        kind: 'row',
        items: ['COLD', '>', 'CORD', '>', '?', '>', 'WARD', '>', 'WARM'],
        caption: 'Grow forward from the start, backward from the goal, meet in the middle'
      },
      paragraphs: [
        'The strongest technique is bidirectional: grow a few words forward from the start AND backward from the goal, then look for a rung where they meet. Neighbors of the goal are exactly the words one change away from it — meeting in the middle halves the search.'
      ],
      bullets: [
        '🎯 List two or three neighbors of the GOAL before you start climbing — those are your landing targets.',
        '🔃 Stuck going forward? Flip the problem: which word one step from the goal can you reach?',
        '🧭 The par meter’s up/down arrow tells you whether your last rung moved toward or away from the goal — an honest compass for the forward half.'
      ]
    },
    {
      title: 'Pivot through hub words',
      art: {
        kind: 'row',
        items: ['CAT', '>', 'COT', '>', 'CUT'],
        caption: 'Vowel swaps in one slot open doors the consonants kept shut'
      },
      paragraphs: [
        'Some words are highly connected — short, vowel-flexible words like CAT, COT, CORE, LINE sit in dense neighborhoods. Routing through a hub gives you options; routing through a rare word (few valid neighbors) risks a dead end.'
      ],
      bullets: [
        '🔓 Vowel swaps are the great unlocker: changing A→O→I in the same slot often opens consonant changes that were illegal before.',
        '🎵 Rhyme families are ladders waiting to happen: -AT, -OT, -IT, or -INE, -ONE, -ANE groups let you fix the consonants first and walk the vowel across.',
        '⚠️ Avoid rungs ending in unusual letter patterns (like -XI or -ZE) unless they head straight for the goal — their neighborhoods are tiny.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['B.T', 'C.T', 'H.T'],
        caption: 'Sweep the alphabet through one slot at a time to find neighbors'
      },
      bullets: [
        '🔡 Run the alphabet through one position at a time: B_T, C_T … — a systematic sweep of each slot finds legal neighbors your intuition missed.',
        '💥 Change your matching letters. The counterintuitive move — breaking a letter that already agrees with the goal — is the standard escape from a cornered position.',
        '↩️ Undo generously: backing up two rungs to take a different branch is cheaper than pushing a doomed line (each extra rung costs efficiency bonus).',
        '💡 If you take a Hint, study the word it placed: it lies on a true shortest path, so it reveals which direction the optimal route actually runs.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🪜🎯📈',
        caption: 'Solving in par beats solving fast'
      },
      bullets: [
        '🏁 Score is dominated by the efficiency bonus (par ÷ your steps) — solving IN par matters far more than solving fast.',
        '📴 Turn the par meter off once your instincts are trained; it counts as an assist, and clean wins are tracked separately in your history.',
        '🪞 After every solve, ask whether a shorter route existed — replaying a finished ladder mentally is the fastest way to learn hub words.',
        '🧗 Climb the tiers for longer words: 5+ letter ladders have sparser neighborhoods, so hub knowledge and bidirectional planning stop being optional.'
      ]
    }
  ],
  references: [
    {
      label: 'Word ladder — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Word_ladder',
      note: 'Carroll’s Doublets, famous examples and the computational view'
    },
    {
      label: 'Lewis Carroll — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Lewis_Carroll',
      note: 'the inventor, in context'
    }
  ]
};
