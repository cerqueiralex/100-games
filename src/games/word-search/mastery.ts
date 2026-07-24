import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Word Search" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'The word search is usually credited to Norman E. Gibat, who published the first known grid in the Selenby Digest, a small classified ad paper in Norman, Oklahoma, in March 1968; teachers picked it up and it spread across the United States within a year. Spanish puzzle maker Pedro Ocón de Oro created the equivalent "sopa de letras" (letter soup) around the same era. It has been a fixture of newspapers, schoolbooks and puzzle magazines ever since.',
  intro:
    'Casual players stare at the grid and wait for words to jump out; masters run deliberate scanning algorithms. Mastery of this game is about controlling your eyes — sweeping in fixed patterns, anchoring on rare letters, and protecting your find streak by never releasing a drag you have not fully verified. On extreme, where the list shows only word lengths, it becomes a deduction game about the theme itself.',
  sections: [
    {
      title: 'Anchor on rare letters',
      art: {
        kind: 'grid',
        rows: ['TNREA', 'AQUIZ', 'SLOTE'],
        caption: 'Hunt the rare letter: the lone Q gives QUIZ away instantly'
      },
      paragraphs: [
        'The fastest find is the one you barely search for. Before sweeping, check each target word for an uncommon letter and hunt that letter instead of the word.'
      ],
      bullets: [
        '💎 Q, Z, X, J, K and W appear so rarely that scanning for one is near-instant — a word containing any of them is effectively found already.',
        '👯 Double letters (OO, LL, EE, SS) are almost as good: pairs of identical neighbors pop out of a grid of noise.',
        '🎯 No rare letter? Anchor on the least common letter the word has, or on an unusual pair like "WH" or "CK".'
      ]
    },
    {
      title: 'Sweep systematically',
      art: {
        kind: 'grid',
        rows: ['..S..', 'S....', '...S.'],
        caption: 'Mark every anchor letter, then check all directions from each'
      },
      paragraphs: [
        'When hunting a specific word by its first letter, discipline beats wandering: pick one scanning pattern and finish it before judging it failed.'
      ],
      bullets: [
        '➡️ Run your finger (or cursor) left-to-right along each row like reading, marking every instance of the first letter; check all directions from each hit before moving on.',
        '⬇️ Then repeat top-to-bottom by columns — a vertical sweep catches instances your horizontal pass skimmed past.',
        '🔄 On tiers with reversed words, check backwards directions from each anchor too; the Direction arrows assist shows exactly which directions are in play at your tier.',
        '🔗 Alternatively sweep for letter PAIRS: the first two letters together produce far fewer false anchors than the first letter alone.'
      ]
    },
    {
      title: 'Protect the streak',
      art: {
        kind: 'grid',
        rows: ['APPLE', 'gggg.'],
        caption: 'Released one cell early — the classic streak-killer'
      },
      paragraphs: [
        'Consecutive finds without a wrong drag earn a compounding streak bonus, and one sloppy release resets it. Accuracy is worth more than raw speed here.'
      ],
      bullets: [
        '👀 Before releasing, read the whole selection once — the classic error is releasing one cell early or late.',
        '📋 A wrong drag also logs an error on your history page; treat every release like submitting an answer.',
        '📏 Knock out the longest words first: they have the fewest possible placements, their capsules shrink the visual noise, and they are worth the most letters.'
      ]
    },
    {
      title: 'Extreme: solving the mystery list',
      art: {
        kind: 'grid',
        rows: ['·····', '···', '·······'],
        caption: 'Only lengths show — a 7-dot entry under "Animals" narrows fast'
      },
      paragraphs: [
        'On extreme the list is just dot-silhouettes, so the theme and word lengths are the only clues. This flips the game: first brainstorm the theme, then search.'
      ],
      bullets: [
        '🧩 List theme members aloud and match them to the visible lengths — a 7-dot entry under "Animals" narrows to a handful of candidates.',
        '📐 Unusual lengths (very long or very short) resolve first; each reveal shrinks the pool for the rest.',
        '🔎 When brainstorming stalls, scan the grid for rare letters and work backwards: an unexplained Q or Z belongs to some unfound entry.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['h....', '.h...', '..h..', '...h.'],
        caption: 'The last words hide on diagonals and along the edges'
      },
      bullets: [
        '🔀 Change modes: if you were hunting first letters, hunt LAST letters or a mid-word pair instead — fresh anchors expose placements your eyes have been sliding over.',
        '🌫️ Defocus for a few seconds and look at the whole grid; peripheral vision often spots a word shape that focused scanning misses.',
        '🧭 The last words usually hide on diagonals or backwards along edges and corners — check the border cells explicitly.',
        '💸 Flash a word (−40 points) is honest about its price; if you use it, watch WHERE the word was and note which scanning pattern would have caught it.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['rows', '>', 'columns', '>', 'pairs'],
        caption: 'One scanning pattern per session until each is automatic'
      },
      bullets: [
        '✨ Turn off the First letters and Direction arrows assists as you climb — clean wins are tracked separately, and unassisted scanning is the skill itself.',
        '⏱️ Race the par clock (2–8 minutes by tier): the time bonus rewards finishing fast, but only after your wrong-drag rate is near zero.',
        '🏋️ Practice one pattern per session (rows-only, columns-only, pairs) until each is automatic; masters switch between them without thinking.'
      ]
    }
  ],
  references: [
    {
      label: 'Word search — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Word_search',
      note: 'history and common solving strategies'
    },
    {
      label: 'Letter frequency — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Letter_frequency',
      note: 'why rare-letter anchoring works'
    },
    {
      label: 'Pedro Ocón de Oro — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Pedro_Oc%C3%B3n_de_Oro',
      note: 'the Spanish inventor of "sopa de letras"'
    }
  ]
};
