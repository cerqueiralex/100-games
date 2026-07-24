import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Hangman" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Hangman is a paper-and-pencil guessing game of obscure origin, generally believed to date from Victorian England; a close relative appears as "Birds, Beasts and Fishes" in Alice Bertha Gomme’s 1894 survey Traditional Games. It spread worldwide as a classroom and parlor staple and inspired the TV mainstay Wheel of Fortune. This version trades the grim gallows for a balloon that sinks with each wrong letter — same deduction, cheerier stakes.',
  intro:
    'Hangman mastery is applied statistics with a memory component. Every guess should be the letter most likely to appear GIVEN everything already revealed — the category, the word length, the pattern of filled and empty blanks, and the letters already dead. Players who guess in a fixed favorite order lose to players who re-rank the alphabet after every reveal.',
  sections: [
    {
      title: 'Open with the workhorse letters',
      art: {
        kind: 'row',
        items: ['E', 'A', 'O', 'I', 'R', 'S', 'T', 'L', 'N'],
        caption: 'The default attack order — until reveals outrank it'
      },
      paragraphs: [
        'With a blank word, frequency is all you have. Vowels first — nearly every English word contains E, A, O or I — then the backbone consonants.'
      ],
      bullets: [
        '🎡 A solid default order: E, A, O, I, then R, S, T, L, N — the same letters Wheel of Fortune hands out for free, because they solve most boards.',
        '📏 Adjust for length: short words (3–4 letters) are vowel-dense and favor A/O; very long words almost certainly contain E, R, S and a suffix.',
        '🔄 Stop using the default order the moment letters land — a revealed pattern outranks general frequency every time.'
      ]
    },
    {
      title: 'Read the pattern like a regex',
      art: {
        kind: 'grid',
        rows: ['.E..ING'],
        caption: '_E_ _ING is one small word family, not seven mysteries'
      },
      paragraphs: [
        'Each reveal turns the word into a constraint. _ E _ _ I N G is not seven mysteries — it is one small family of words. Run candidates against the pattern before spending a guess.'
      ],
      bullets: [
        '🔚 Endings crack first: _ING, _ED, _ER, _TION, _NESS — if the last letters are open, test G, D or N to confirm a suffix cheaply.',
        '👫 Consonants hunt in pairs: T invites H; C invites H or K; Q guarantees U.',
        '🕵️ A vowel between two consonants with no E anywhere? Suspect doubles (LL, SS, TT) or a Y working as a vowel — RHYTHM-style words are classic killers.',
        '🧮 Mentally list actual candidate words and guess the letter that appears in the MOST of them — that is the mathematically best probe.'
      ]
    },
    {
      title: 'Milk the category',
      art: {
        kind: 'row',
        items: ['Animals', '>', '7 letters', '>', 'CHEETAH?'],
        caption: 'Start from the shortlist, not from raw letter statistics'
      },
      paragraphs: [
        'The themed category is the strongest clue on the board. Deduction should start from "which Animals have 7 letters?" rather than from raw letter statistics.'
      ],
      bullets: [
        '🧠 Brainstorm category members matching the length BEFORE guessing; every reveal then prunes the shortlist rather than just filling a blank.',
        '⚖️ When the shortlist is down to two or three, guess a letter that DIFFERS between them, not one they share.',
        '🏷️ On the top tiers the category is hidden — the Category assist reveals it at a points cost, converting a frequency game back into a recall game. It counts as help.'
      ]
    },
    {
      title: 'Budget your lives',
      art: {
        kind: 'grid',
        rows: ['🎈🎈🎈xx'],
        caption: 'Three lives left — probe only what a real candidate needs'
      },
      bullets: [
        '🎈 Count remaining lives before every risky guess: with a full balloon, probing a rare letter to split candidates is fine; at one life, only guess letters a candidate word actually requires.',
        '👁️ Vowel peek (−25, twice per game) is best used when NO vowel has landed — an early anchor is worth more than a late confirmation.',
        '🛟 Safe first guess forgives one miss; treat it as insurance for a deliberate high-information probe, not a license to guess wildly.',
        '🚫 Never guess a letter that no remaining candidate contains — every guess should test a real hypothesis.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['RH.THM'],
        caption: 'No vowels landing? A hidden Y is doing vowel work'
      },
      bullets: [
        '🔡 Run the alphabet against the open blanks one position at a time — systematic beats staring.',
        '👯 Reconsider doubles: a five-letter word with only two distinct letters revealed often hides a repeated letter you already found (it fills every copy, so a "used" letter is done — but an unguessed double is invisible).',
        '🎷 Think about rare-letter words on hard tiers: setters favor words like JAZZ or LYNX precisely because frequency-order guessing dies on them. If common letters keep missing, pivot to J, K, V, X, Z territory.',
        '🗣️ Say the pattern aloud with blanks as hums — pronunciation surfaces candidates that visual scanning misses.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🎈🏆📊',
        caption: 'Solve early — every life kept at the win is points'
      },
      bullets: [
        '🧗 Climb the tiers: fewer lives and hidden categories turn a casual game into genuine deduction — extreme hangman rewards a memorized attack order and fast candidate listing.',
        '✨ Play for clean wins (no peeks, no category reveal, safe-first off); history and statistics track clean and assisted wins separately.',
        '🏆 Each life kept at the win is worth points, so aim to solve the word early rather than confirming every letter.',
        '📓 After a loss, look up the word’s letter pattern and note WHERE your guess order went wrong — a personal list of killer patterns is the fastest way to improve.'
      ]
    }
  ],
  references: [
    {
      label: 'Hangman (game) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Hangman_(game)',
      note: 'history and letter-frequency strategy discussion'
    },
    {
      label: 'Letter frequency — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Letter_frequency',
      note: 'dictionary vs. text frequency — the tables behind a good guess order'
    },
    {
      label: 'Wheel of Fortune (American game show) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Wheel_of_Fortune_(American_game_show)',
      note: 'why R, S, T, L, N, E are the famous freebies'
    }
  ]
};
