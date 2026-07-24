import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Cryptogram" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Substitution-cipher word puzzles go back to medieval Arab cryptanalysis — al-Kindī described frequency analysis in the 9th century — and became newspaper "cryptoquote" entertainment in America from the 1920s. This app\'s version is an original variant: clued words share one pictogram cipher, and a shaded column spells a hidden answer.',
  intro:
    'Mastery is attacking the cipher from two directions at once: the clues tell you candidate words from meaning, while the shared symbols tie every row to every other. One confidently placed word seeds letters across the whole board; the craft is choosing which row cracks first and letting the hidden answer column confirm your progress.',
  sections: [
    {
      title: 'Pick your entry row',
      art: {
        kind: 'row',
        items: ['📜 read every clue', '>', '🎯 surest row', '>', '🔤 seed the cipher'],
        caption: 'Start from certainty, not from the shortest row'
      },
      bullets: [
        '🎯 Scan all clues first and start with the row you are most CERTAIN of, not the shortest — one wrong seed poisons every shared symbol.',
        '📏 Long answers beat short ones once known: an 8-letter word placed is eight symbols solved.',
        '🕸️ Rows sharing many symbols with other rows are worth more — check the symbol overlap before committing your first answer.'
      ]
    },
    {
      title: 'Let symbols vote',
      art: {
        kind: 'grid',
        rows: ['♠♦♣♠', 'E..E'],
        caption: 'One cipher everywhere: a repeated symbol is the same letter in every row'
      },
      bullets: [
        '🔄 After each placement, sweep every row for newly revealed letters and re-read its clue with the pattern (e.g. _ A _ E) in mind — patterns plus clues crack words that neither could alone.',
        '🛡️ A candidate word that would assign a symbol two different letters is dead — this consistency check is your error firewall.',
        '🪞 Repeated symbols inside one word are strong filters: pattern ABBA-type structures eliminate most candidates instantly.'
      ]
    },
    {
      title: 'Use the hidden answer',
      art: {
        kind: 'grid',
        rows: ['..S.', '..U.', '..N.'],
        caption: 'The shaded column takes one letter per row — here it spells SUN'
      },
      bullets: [
        '🗝️ The shaded column spells a themed answer — guess it early from partial letters; each letter it fixes back-fills a row.',
        '⚖️ When the column guess conflicts with a row candidate, trust whichever is confirmed by more crossing symbols.',
        '✅ A solved hidden answer is a master key: verify every row against it before typing further.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'row',
        items: ['E', 'T', 'A', 'O', 'I', 'N'],
        caption: 'English frequency order — the busiest unknown symbol is likely one of these'
      },
      bullets: [
        '📊 Return to English letter statistics: the most frequent unknown symbol across the board is likely E, A or a common consonant (T, N, S, R).',
        '🗣️ Try the clue aloud in synonyms — these clues point at everyday vocabulary, and the third synonym that fits the pattern is usually right.',
        '🎯 Use the icon-echo assist deliberately: confirming one uncertain symbol early is cheaper than unwinding a wrong word later (it counts as help — a trade you make knowingly).'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🔤🗝️🧠',
        caption: 'Raise your confidence bar, not your typing speed'
      },
      bullets: [
        '📉 Track your errors stat: cryptogram errors are almost always premature placements — raise your confidence bar rather than your typing speed.',
        '📚 Play higher tiers for longer words and rarer vocabulary; the symbol-consistency discipline is what transfers, not word lists.',
        '✨ For clean wins, form the habit of solving the hidden answer BEFORE the last two rows — it converts the endgame into verification.'
      ]
    }
  ],
  references: [
    {
      label: 'Cryptogram — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Cryptogram',
      note: 'the substitution-cipher puzzle tradition this game modernizes'
    },
    {
      label: 'Frequency analysis — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Frequency_analysis',
      note: 'al-Kindī\'s 9th-century technique, still the cryptogram player\'s core tool'
    }
  ]
};
