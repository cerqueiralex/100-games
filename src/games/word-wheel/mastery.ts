import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Word Wheel" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Word wheels are a staple of British and Commonwealth newspaper puzzle pages from the mid-20th century: letters arranged around a hub, every word required to use the center letter. They share DNA with anagram games like Jumble (USA, 1954) and the letters round of Countdown (UK, 1982, from France\'s Des chiffres et des lettres).',
  intro:
    'Mastery means mining the wheel systematically instead of staring at it. The letters are a fixed multiset; every word is a subset arrangement. Strong players run structured passes — prefixes, suffixes, vowel skeletons — so the words arrive in batches, and they treat the criss-cross grid\'s lengths and crossings as targeting information.',
  sections: [
    {
      title: 'Inventory before hunting',
      art: {
        kind: 'row',
        items: ['vowels: A E I', 'common: R S T', 'rare: K'],
        caption: 'Count the wheel first — the rare letter defines a small family'
      },
      bullets: [
        '🧮 Read the wheel as counts: vowels, common consonants, and any rare letter. The rare letter (K, V, Y...) defines a small word family — clear it first.',
        '🧩 Spot ready-made chunks: -ING, -ED, -ER, -LY, UN-, RE- sitting in the wheel multiply everything else you find.',
        '🗣️ Say the letters in a different order than displayed — the layout itself biases which words you see.'
      ]
    },
    {
      title: 'Systematic passes',
      art: {
        kind: 'row',
        items: ['3s', '>', '4s', '>', '5s'],
        caption: 'Pass by length — short stems seed the long words'
      },
      bullets: [
        '📏 Pass by length: all 3s, then 4s, then 5s — short words prime your brain with usable stems for long ones (RATE → RATED, RATES, CRATE).',
        '🔤 Pass by first letter: for each wheel letter, ask what words start with it using only remaining letters.',
        '🅰️ Pass by vowel skeleton: pick the vowels (A_E, O_A) and drape consonants over them — especially strong when vowels are scarce.'
      ]
    },
    {
      title: 'Grid mode: let lengths aim you',
      art: {
        kind: 'grid',
        rows: ['.R..E'],
        caption: 'A filled crossing turns a slot into a pattern to solve against'
      },
      bullets: [
        '🎯 In criss-cross mode, slot lengths are constraints: a 7-slot on a 7-letter wheel is the full anagram — find it early, it seeds the most crossings.',
        '🔗 Filled crossings turn slots into patterns (_ R _ _ E) — run candidate stems against the pattern instead of the whole wheel.',
        '⚖️ When two candidates fit a slot, check their crossing letters against remaining slots before committing.'
      ]
    },
    {
      title: 'When dry',
      art: {
        kind: 'row',
        items: ['LEMON', '>', 'MELON'],
        caption: 'Near-anagrams surface families you missed'
      },
      bullets: [
        '➕ Pluralize and inflect everything you have: +S, +ED, +ING, +ER conversions are free words hiding behind found ones.',
        '🔁 Swap one letter of a found word with an unused wheel letter — near-anagrams (LEMON → MELON) surface families you missed.',
        '🎡 Rest your eyes on the hub: center-letter-first thinking ("what ends in ...T?" if T is central) reopens a stalled wheel.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🎡📈👁️',
        caption: 'Coverage over speed — read the missed list actively'
      },
      bullets: [
        '📚 Learn the high-value short words once (AE-, QI-type helpers are rare here, but ICE/ACE/EAR families recur constantly) — recognition beats invention under a timer.',
        '🧹 On hunt mode, aim for total sweep percentage, not first-found speed; the profile\'s history shows your coverage climbing tier by tier.',
        '📖 After each game, read the missed-words list actively: type each one\'s pattern in your head — missed words become found words within a few sessions.'
      ]
    }
  ],
  references: [
    {
      label: 'Word game — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Word_game',
      note: 'the anagram-game family word wheels belong to'
    },
    {
      label: 'Countdown (game show) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Countdown_(game_show)',
      note: 'the letters round is word-wheel thinking under a clock'
    }
  ]
};
