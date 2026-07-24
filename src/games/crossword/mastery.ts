import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Crossword" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'The first modern crossword was published by Liverpool-born journalist Arthur Wynne in the New York World on 21 December 1913, as a diamond-shaped "word-cross". The 1920s crossword craze made it the world\'s most popular word puzzle; this app uses the criss-cross style, where interlocking answers check each other letter by letter.',
  intro:
    'Mastery is exploiting the interlock. Every solved answer donates letters to its crossings, and a good solver treats those letters as the primary clue — the written clue merely narrows candidates the pattern already suggests. Confidence discipline matters more than vocabulary: certain answers first, doubtful ones only when crossings vote.',
  sections: [
    {
      title: 'First pass: certainty only',
      art: {
        kind: 'grid',
        rows: ['PLANET', '..A...', '..N...'],
        caption: 'A long certain fill seeds crossings all the way down'
      },
      bullets: [
        '✅ Sweep ALL clues once and fill only answers you would bet on — a single wrong early answer corrupts every crossing it touches.',
        '📏 Prefer long answers among your certainties: an 8-letter fill seeds up to eight crossings.',
        '🧠 Note near-misses mentally ("either TIDE or TIME") and move on; a crossing will decide for you within minutes.'
      ]
    },
    {
      title: 'Work the crossings',
      art: {
        kind: 'grid',
        rows: ['T..E'],
        caption: 'T _ _ E plus the clue cracks what neither alone could'
      },
      bullets: [
        '🔄 After each fill, re-read the clues of every crossing entry with the new pattern (T _ _ E) in mind — patterns plus definitions crack what neither alone could.',
        '🎯 First and last letters are worth double: they filter candidates hardest, so chase crossings that give you word boundaries.',
        '💎 Uncommon letters (J, Q, X, Z, K) in a pattern collapse the candidate space to almost nothing — prioritize entries containing them.'
      ]
    },
    {
      title: 'Reading clues like a setter',
      art: {
        kind: 'row',
        items: ['Ship\'s pole (4)', '>', 'MAST or SPAR'],
        caption: 'Run the synonym list against the letters you already have'
      },
      bullets: [
        '🪞 Match the clue\'s form: a plural clue wants a plural answer (usually ...S), a past-tense clue a past-tense answer (...ED), "abbr." an abbreviation.',
        '📖 Clues by synonym default: for "Ship\'s pole (4)" run the synonym list (MAST, SPAR...) against known letters rather than free-associating.',
        '🎭 If a clue reads strange, consider the OTHER meaning of its first word — misdirection almost always lives in the first word\'s part of speech.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['.ATCH'],
        caption: 'Run the alphabet: B, C, H, L, M, P, W... against _ATCH'
      },
      bullets: [
        '🚪 Change entry point: abandon the stuck corner and build pressure from the opposite side of the grid — crosswords fall region by region.',
        '🤔 Re-question your oldest uncertain fill: a stall clustered around one answer usually means that answer is wrong.',
        '🔡 Run the alphabet on a nearly-full word (_ A T C H → B, C, H, L, M, P, W...) and test each against the clue — mechanical but nearly always decisive.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '✅📖🧠',
        caption: 'Check teaches; Reveal only spends points'
      },
      bullets: [
        '🧪 Use Check (not Reveal) when unsure — learning that a letter is wrong teaches; being shown the answer only spends points.',
        '✨ Chase clean wins on lower tiers before speed on higher ones: accuracy habits compound, error habits do too.',
        '📚 After finishing, re-read clues you never solved yourself — post-game clue review is the fastest vocabulary builder in the genre.'
      ]
    }
  ],
  references: [
    {
      label: 'Crossword — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Crossword',
      note: 'history from Wynne\'s 1913 word-cross to modern styles'
    },
    {
      label: 'Arthur Wynne — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Arthur_Wynne',
      note: 'the inventor and the original diamond puzzle'
    }
  ]
};
