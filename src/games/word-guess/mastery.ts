import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Word Guess" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'This game descends from Wordle, created in 2021 by Welsh software engineer Josh Wardle as a gift for his partner; it went viral that winter and was bought by The New York Times in early 2022. The colored-feedback idea is much older: the pen-and-paper game Jotto (1955) and the TV show Lingo (1987) both had players deduce a secret word from letter feedback, and Mastermind used the same right-symbol/right-place logic with colored pegs. This version stretches the formula from 4-letter words on easy up to 7-letter words on extreme.',
  intro:
    'Mastery here is information management, not vocabulary showing off. Six rows is enough to pin down almost any word if every guess is chosen to eliminate as many possibilities as possible. Strong players treat the first guesses as probes, read the colors like constraints in a logic puzzle, and only start "trying to win" once the candidate list is short.',
  sections: [
    {
      title: 'Open with information, not hope',
      art: {
        kind: 'grid',
        rows: ['CRANE', 'y.g..'],
        caption: 'One probe, two facts: C is elsewhere, A is locked in place'
      },
      paragraphs: [
        'English letter frequency is your compass: E, A, R, O, T, L, I, S, N do most of the work. A great opener covers several of these with no repeats.'
      ],
      bullets: [
        '🔤 Pick an opener with 2–3 common vowels and top consonants — the classic 5-letter choices are SLATE, CRANE, TRACE, ADIEU (vowel-heavy).',
        '📏 On the 6- and 7-letter tiers, favor openers with S, R, T, L, N and an -ER or -ING shape — longer words lean on suffixes.',
        '🚫 Never repeat a letter in your opener; a duplicate wastes a whole probe slot.',
        '🛟 The Starter assist fills a statistically strong first word — use it while learning, then wean off it for clean wins.'
      ]
    },
    {
      title: 'The second guess is a probe too',
      art: {
        kind: 'row',
        items: ['SLATE', '>', 'CORNY'],
        caption: 'Ten fresh letters in two rows — the answer is usually cornered'
      },
      paragraphs: [
        'If the first row comes back mostly gray, resist the urge to "solve". A second word made of five NEW common letters (e.g. SLATE then CORNY or DOUGH) tests ten letters in two rows — after that the answer is usually cornered.'
      ],
      bullets: [
        '🕵️ Little green after row one? Burn a fresh-letters probe rather than recycling yellows too early.',
        '🟩 Lots of green early? Switch to solving mode immediately — every remaining row should be a real candidate.',
        '⚠️ Watch the scoring: from the 4th row on, a guess that reveals no new green counts as a slip — probes belong in rows 1–3.'
      ]
    },
    {
      title: 'Read the colors like constraints',
      art: {
        kind: 'grid',
        rows: ['SPEED', '..g#.'],
        caption: 'First E green, second E dark: the answer has exactly one E'
      },
      bullets: [
        '🟨 A yellow letter excludes that position AND guarantees the letter appears — mentally slide it through the remaining slots.',
        '👯 Gray on a letter you guessed twice may only mean the SECOND copy is absent: colors count copies, so E-good E-dim means exactly one E.',
        '🧠 Keep a mental (or muttered) alphabet of dead letters; the Keyboard hints assist does this for you, but it is disabled on Extreme — practice tracking it yourself.',
        '✅ Before submitting, check the guess against EVERY color you have seen — contradicting a known green is the most common wasted row.'
      ]
    },
    {
      title: 'Beware word families',
      art: {
        kind: 'grid',
        rows: ['SHAKE', 'SHAME', 'SHAPE'],
        caption: 'A family: probe MARSH to test K, M and S-adjacent letters at once'
      },
      paragraphs: [
        'The classic endgame trap: a pattern like _IGHT or SHA_E matches many words (LIGHT/MIGHT/NIGHT/RIGHT…, SHAKE/SHALE/SHAME/SHAPE/SHAVE). Guessing them one by one can burn every remaining row.'
      ],
      bullets: [
        '🧮 Count the family before guessing: if four candidates share a pattern and you have two rows, guess a word containing several of the DIFFERING letters (e.g. MARSH tests M, R and S at once for SHA_E words).',
        '🧪 That test word does not need to be a possible answer — it needs to split the family.',
        '📎 Suffix awareness prunes fast on long tiers: -ED, -ER, -LY, -ING endings fix several letters at once.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'row',
        items: ['B?', '>', 'C?', '>', 'D?', '>', 'F?'],
        caption: 'A systematic consonant sweep cracks most open slots'
      },
      bullets: [
        '🔡 Recite the alphabet against the open slot: A_, B_, C_ … most patterns crack under a systematic consonant sweep.',
        '❓ Ask which letters you have NOT tested yet — the answer often hides behind an untested common letter like Y, W or H.',
        '👥 Consider repeated letters explicitly; after row three, doubles (LL, EE, SS, OO) are the most commonly missed shape.',
        '💡 One Reveal is available per game: use it on the slot that splits the most candidates, not the one you are merely curious about.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['4', '>', '5', '>', '6', '>', '7'],
        caption: 'Word length climbs with the tiers — extreme locks keyboard hints off'
      },
      bullets: [
        '🧗 Climb the tiers: easy gives 4 letters and 7 tries, extreme demands 7-letter words with keyboard hints locked off — the real test of your mental letter tracking.',
        '✨ Chase clean wins (no Starter, no Reveal, keyboard hints off) — the history page separates them from assisted wins.',
        '🔍 Review your losses: almost every one traces to a wasted row that repeated known information. Name the mistake and it stops recurring.',
        '🏆 Unused tries are worth 160 points each — but consistency beats speed; secure the win before hunting the two-row flex.'
      ]
    }
  ],
  references: [
    {
      label: 'Wordle — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Wordle',
      note: 'origin story and the strategy/analysis section'
    },
    {
      label: 'Jotto — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Jotto',
      note: 'the 1955 ancestor of letter-feedback word deduction'
    },
    {
      label: 'Letter frequency — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Letter_frequency',
      note: 'the frequency tables behind every good opener'
    }
  ]
};
