import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Anagram Sprint" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Anagrams are among the oldest word games on record — the Greek poet Lycophron composed flattering anagrams of royal names in the 3rd century BC, and rearranging letters was a popular Victorian parlor pastime. The timed unscramble-against-the-clock format was cemented by television: Channel 4’s Countdown (1982, adapted from the French Des chiffres et des lettres) made racing a clock to find words a national institution, and computer games like Text Twist carried the formula to screens. This sprint distills that lineage into pure solve-streak racing.',
  intro:
    'Anagram mastery is pattern recognition under pressure. Experienced solvers do not test permutations — they recognize chunks: familiar endings, consonant clusters and vowel frames that snap the answer into place. Because the streak multiplier and clock penalties shape your score, mastery is equally about tempo management: knowing when to grind a word out, when to shuffle, and when a skip is worth its price.',
  sections: [
    {
      title: 'Strip the suffix first',
      art: {
        kind: 'row',
        items: ['TGENRSI', '>', '····ING', '>', 'RESTING'],
        caption: 'Spot the N+G, park -ING aside, and a 7-letter scramble becomes a 4'
      },
      paragraphs: [
        'Most English words longer than four letters wear a common ending. Spot it, mentally set those tiles aside, and you have a much smaller puzzle.'
      ],
      bullets: [
        '🔎 Scan for -ING, -ED, -ER, -LY, -TION, -MENT, -NESS the instant tiles appear; an N+G means -ING more often than not.',
        '🧷 A lone S is usually a plural tail — park it at the end and solve the rest.',
        '⏪ Prefixes work too: RE-, UN-, DE-, PRE- at the front shrink the core the same way.',
        '✂️ With the ending fixed, a 7-letter scramble becomes a 4-letter one — that is the whole trick.'
      ]
    },
    {
      title: 'Build around the vowel frame',
      art: {
        kind: 'grid',
        rows: ['TRUCK', '..h..'],
        caption: 'One vowel in five letters usually sits mid-word'
      },
      paragraphs: [
        'Count vowels before anything else. The vowel-to-consonant ratio dictates the word’s shape, and most English words alternate roughly consonant-vowel-consonant.'
      ],
      bullets: [
        '🅰️ One vowel in five letters? It sits in the middle more often than the edges (BLAND, TRUCK, STOMP).',
        '👫 Vowel pairs cling together: EA, OU, IE, OO — try them as a unit before splitting them.',
        '🧲 Cluster the consonants that co-occur: TH, CH, SH, ST, TR, PL — a valid cluster at the front or back massively prunes the options.',
        '💍 Q demands its U; V and J almost never end a word; H after T/C/S far more often than alone.'
      ]
    },
    {
      title: 'Shuffle is free — exploit it',
      art: {
        kind: 'row',
        items: ['ONSET', '>', '🔀', '>', 'STONE'],
        caption: 'Same tiles, new order — a reshuffle triggers new candidates'
      },
      paragraphs: [
        'Fixation is the real enemy: once your brain reads the tiles as a pseudo-word, it keeps re-reading the same wrong order. Shuffle costs nothing and breaks the spell.'
      ],
      bullets: [
        '🔀 Shuffle the moment you notice re-reading the same arrangement — three seconds of stubbornness costs more than a reshuffle.',
        '🔁 Read the shuffled tiles in a circle or in reverse rather than left-to-right; different orders trigger different candidate words.',
        '🗣️ Say the letters out loud — auditory processing catches words the eyes miss.'
      ]
    },
    {
      title: 'Manage the streak and the clock',
      art: {
        kind: 'row',
        items: ['×1', '>', '×1.5', '>', '×2'],
        caption: 'Three straight solves, then six — a skip or a miss resets it all'
      },
      paragraphs: [
        'Three straight solves earn ×1.5, six earn ×2, and both a skip and a miss reset it. Meanwhile wrong submissions burn 3 seconds. Score is won and lost in these margins.'
      ],
      bullets: [
        '🛑 Never submit a hunch: a wrong word costs 3 seconds AND the streak. Submit only what you can read as a real word.',
        '⏭️ Skip early, not late: if a word gives you nothing in ~10 seconds, the −40 costs less than the time you would sink — but remember it resets the multiplier, so skip BEFORE building a long streak, not during one.',
        '🚦 With the quota nearly met and time healthy, protect the streak; with the bar red, solve anything as fast as possible — bonus points come from remaining seconds.',
        '💡 A single Hint (−20) that locks the first letter often pays for itself by rescuing a streak.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['K....', '..K..', '....K'],
        caption: 'Walk the awkward letter through every position'
      },
      bullets: [
        '🧩 Try the rarest letter in every position — placing the awkward letter first (the K, the V, the W) collapses the possibilities.',
        '🚫 Ask what the word CANNOT be: no common ending, two vowels stuck together, odd cluster — eliminations guide as well as guesses.',
        '🛟 Enable the First letter assist while learning; a known start plus a suffix guess solves most words instantly (it does count as help).',
        '🪤 Common trap: the answer is a plainer word than you expect. Check simple candidates before exotic ones.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '📚⏱️📈',
        caption: 'The words that beat you under pressure are your training list'
      },
      bullets: [
        '🧗 Climb tiers for longer words and tighter clocks — the per-letter scoring means hard words repay the practice directly.',
        '✨ Play hint-free runs for clean wins; the history page tracks them separately from assisted wins.',
        '📎 Practice recognizing the top suffixes until it is automatic — that single skill halves your average solve time.',
        '📓 After a run, recall the words you skipped and unscramble them calmly; the ones that beat you under pressure are your personal training list.'
      ]
    }
  ],
  references: [
    {
      label: 'Anagram — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Anagram',
      note: 'history from Lycophron to modern wordplay'
    },
    {
      label: 'Countdown (game show) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Countdown_(game_show)',
      note: 'the show that made timed letter-solving a sport'
    },
    {
      label: 'Letter frequency — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Letter_frequency',
      note: 'the statistics behind vowel frames and clusters'
    }
  ]
};
