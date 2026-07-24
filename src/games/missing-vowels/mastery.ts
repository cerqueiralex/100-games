import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Missing Vowels" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Reading words from consonants alone is ancient — abjad scripts like Hebrew and Arabic have always written mostly without vowels, trusting readers to restore them. As a quiz format, Missing Vowels was popularized by the BBC quiz show Only Connect (first broadcast 2008, hosted by Victoria Coren Mitchell), whose frantic final round strips the vowels from phrases and regroups the consonants. This version is gentler than the TV round — consonants keep their true positions and every missing vowel leaves a visible slot — but the core skill is the same.',
  intro:
    'Mastery here means reading the consonant skeleton as language, not as a cipher. Fluent players pronounce the consonants, let the slot pattern suggest the rhythm of the phrase, and use vowel frequency to resolve what sound alone cannot. Because wrong submissions are punished (and can end the game on the top tiers), mastery is also about verifying the whole phrase before committing.',
  sections: [
    {
      title: 'Sound it out',
      art: {
        kind: 'grid',
        rows: ['P.ZZL.'],
        caption: 'P_ZZL_ announces itself the moment you mumble it'
      },
      paragraphs: [
        'Consonants carry most of the information in English. Read the skeleton aloud (or subvocalize) and many phrases simply announce themselves — "PZZL" is puzzle before logic even starts.'
      ],
      bullets: [
        '🗣️ Pronounce each word as a mumble with schwa sounds in the gaps — the ear recognizes what the eye cannot.',
        '📏 Word lengths and word breaks are visible — decode the shortest words first and the long ones inherit context.',
        '🆓 Short function words are nearly free: TH_ → THE, _F → OF/IF, _ND → AND, T_ → TO, Y__ → YOU.'
      ]
    },
    {
      title: 'Read the slot geometry',
      art: {
        kind: 'grid',
        rows: ['.CT..N'],
        caption: 'A slot at word start means a vowel opener; twin slots mean a vowel team — ACTION'
      },
      paragraphs: [
        'Unlike the TV version, slots here sit exactly where vowels belong. The pattern of slots and consonants is itself a huge clue.'
      ],
      bullets: [
        '🅰️ A slot at the very start of a word means it begins with a vowel — far fewer candidates.',
        '👯 Two slots in a row is a vowel team: EA, OU, EE, OO, IO and AI cover most of them.',
        '🥁 Slot-consonant alternation (C _ C _ C) suggests a plain word like BANANA-style rhythm; long consonant runs mean clusters like STR or NGTH with no vowels inside.',
        '🔚 Word endings resolve fast: _NG → ING, T__N → TION, _BL_ at the end → ABLE/IBLE.'
      ]
    },
    {
      title: 'Play the frequencies',
      art: {
        kind: 'row',
        items: ['E', '>', 'A', '>', 'O', '>', 'I', '>', 'U'],
        caption: 'English vowel frequency order — the tie-breaker when sound fails'
      },
      paragraphs: [
        'When sound and shape leave a slot ambiguous, statistics break the tie: E is the most common vowel in English by a wide margin, then A, O, I, U.'
      ],
      bullets: [
        '🥇 Uncertain final slot? E is the best single guess (silent E is everywhere).',
        '💍 Q is always followed by U; a slot right after Q is never in doubt.',
        '🦄 U is the rarest vowel — place it only where the consonants demand it (after Q, in -FUL, -OUS).',
        '🪤 Common traps: Y acts as a vowel but is shown as a consonant here, so a word may look vowel-starved (RHYTHM, FLY) — if a word seems impossible, look for a Y doing vowel work.'
      ]
    },
    {
      title: 'Lean on the category',
      art: {
        kind: 'grid',
        rows: ['TH.', 'L..N', 'K.NG'],
        caption: 'Under "Movies", the skeleton recites itself'
      },
      paragraphs: [
        'Phrases come themed, and the theme collapses the search space: under "Movies", a long skeleton starting TH_ is a title you can probably recite.'
      ],
      bullets: [
        '🧠 Brainstorm category members FIRST, then test them against word counts and lengths — matching a known phrase is faster than decoding one.',
        '🏷️ The Category assist names the theme (and reveals it on Extreme, where it is otherwise hidden); it counts as help, so treat it as training wheels.',
        '🧩 Solve the easiest words of the phrase first — two solved words usually give away the rest of a famous phrase.'
      ]
    },
    {
      title: 'Submit like it costs something — it does',
      art: {
        kind: 'banner',
        emojis: '⚠️✅📖',
        caption: 'Read the full phrase back before committing'
      },
      bullets: [
        '⚠️ On Pro and Extreme a run of mistakes ends the game, so read the FULL phrase back before submitting, not just the last word you fixed.',
        '🔒 The Keep correct assist locks your right vowels after a miss — with it off, one slip clears the whole board, so it is the difference between forgiving and hardcore play.',
        '💡 Reveal vowel (−20) is best spent on the one ambiguous slot blocking an otherwise-solved phrase, never sprayed early.',
        '⏱️ On Extreme the 25-second per-phrase timer punishes dithering: commit to the sound-it-out reading quickly and use frequency defaults for stragglers.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['longer', '>', 'mistake caps', '>', 'hidden theme', '>', 'timer'],
        caption: 'Each tier adds one pressure to train against'
      },
      bullets: [
        '🧗 Climb tiers deliberately: higher tiers bring longer phrases, mistake limits, hidden categories and finally the timer — each adds one pressure to train against.',
        '✨ Chase clean wins with Category off and no reveals; your history separates clean from assisted wins.',
        '📰 Practice reading disemvoweled text anywhere — headlines, song titles — the skill transfers directly and builds surprisingly fast.',
        '🔍 When a phrase beats you, study WHICH word hid the longest; it is almost always a vowel-team or silent-E word, and those patterns repeat.'
      ]
    }
  ],
  references: [
    {
      label: 'Only Connect — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Only_Connect',
      note: 'the quiz that made the Missing Vowels round famous'
    },
    {
      label: 'Abjad — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Abjad',
      note: 'writing systems that omit vowels — proof the skill is learnable'
    },
    {
      label: 'Letter frequency — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Letter_frequency',
      note: 'why E-first guessing works'
    }
  ]
};
