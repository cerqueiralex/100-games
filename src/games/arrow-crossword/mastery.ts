import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Arrow Crossword" — strategy only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'The arrow crossword — Swedish "krysset", German "Schwedenrätsel", the "arrowword" of British magazines — grew up in Scandinavian newspapers in the 1950s and 60s: printing the clue inside the grid, with an arrow to the answer, let a puzzle stand on its own with no clue list beside it. It is the everyday crossword across most of Europe and the Middle East today (the Hebrew "tashbetz" reads its arrows leftwards). This version reads left to right, with right and down arrows.',
  intro:
    'Mastery is reading the grid as a map. With the clue printed next to its first letter, the geometry tells you almost as much as the wording: how long the answer is, where the next clue cuts it off, and which crossings you already own. Strong solvers sweep the board for the short, certain answers first, let the crossings vote on the rest, and never fill a doubtful word into a cell that a sure one will settle.',
  sections: [
    {
      title: 'Read the geometry before the clue',
      art: {
        kind: 'grid',
        rows: ['→CAT#', '#h#h#', '#h#h#'],
        caption: 'Length and boundaries are free information — count them first'
      },
      bullets: [
        '📏 Count the cells before you think about the clue: the run stops at the next clue cell or the edge, so every answer comes with its length for free.',
        '🧭 Note which arrow you are on — a cell with two clues reads right from the top half and down from the bottom half, and its two answers start in different cells.',
        '🗺️ Find the double-clue cells: they are the crossroads of the grid, and solving either of their answers opens the other.'
      ]
    },
    {
      title: 'Short and certain first',
      art: {
        kind: 'row',
        items: ['3-letter', '>', '4-letter', '>', 'long ones'],
        caption: 'Short words have few candidates; fill the sure ones and move up'
      },
      bullets: [
        '✅ Sweep the whole board once and fill only what you would bet on — arrowword grids are densely crossed, so one wrong entry poisons two or three neighbours.',
        '🔤 Three- and four-letter answers are the fastest wins: with a terse clue and a known length, the candidate list is often one word.',
        '🧠 Keep near-misses in your head ("HIVE or NEST") and move on; the crossing will decide within a minute.'
      ]
    },
    {
      title: 'Let the crossings vote',
      art: {
        kind: 'grid',
        rows: ['H.V.'],
        caption: 'H _ V _ plus "bee\'s home" is HIVE before you read the clue twice'
      },
      bullets: [
        '🔄 After each fill, re-read the clues of every answer that crosses it with the new letters in mind — the pattern plus a terse clue cracks what neither could alone.',
        '🎯 First and last letters filter hardest, so chase the crossings that give you word boundaries before the ones in the middle.',
        '💎 A rare letter (J, Q, X, Z, K) in a pattern collapses the candidates to almost nothing — prioritize the answers that carry one.'
      ]
    },
    {
      title: 'Reading terse clues',
      art: {
        kind: 'row',
        items: ['Ship\'s pole', '>', 'MAST'],
        caption: 'Small print means synonym clues — match the part of speech'
      },
      bullets: [
        '🪞 Cell-sized clues are almost always definitions or synonyms: a plural clue wants a plural (…S), a past-tense clue a past tense (…ED), "briefly" an abbreviation.',
        '📖 Run the synonym list against the letters you have rather than free-associating: "Ship\'s pole (4)" is MAST or SPAR, and one crossing settles it.',
        '🎭 If a clue reads strangely, try the other meaning of its first word — the misdirection in a short clue lives in the part of speech.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['.ATCH'],
        caption: 'Run the alphabet on a nearly-full word: B, C, H, L, M, P, W…'
      },
      bullets: [
        '🚪 Change corner: the grid is one connected piece, so pressure from the far side arrives at your stuck spot through the crossings.',
        '🤔 Re-question your oldest doubtful fill — a stall clustered around one answer usually means that answer is wrong.',
        '🔡 Run the alphabet on a word with one gap (_ A T C H → B, C, H, L, M, P, W…) and test each against the clue; mechanical, but nearly always decisive.'
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
        '🧪 Use Check rather than Reveal when unsure — learning that a letter is wrong teaches; being shown the answer only spends points.',
        '✨ Chase clean wins on the small grids before speed on the big ones: accuracy habits compound, and so do error habits.',
        '📚 After finishing, re-read the clues you never solved yourself; reviewing terse clues is the fastest way to learn the setter\'s vocabulary.'
      ]
    }
  ],
  references: [
    {
      label: 'Arrowword — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Arrowword',
      note: 'the Scandinavian crossword family and how the in-grid clues work'
    },
    {
      label: 'Crossword — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Crossword',
      note: 'the wider history, from Wynne\'s 1913 word-cross to the arrow variants'
    }
  ]
};
