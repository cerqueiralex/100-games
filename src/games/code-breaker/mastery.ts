import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Code Breaker" — strategy content only; the rules live
 * in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Code Breaker is the classic Mastermind, invented in 1970 by Mordecai Meirowitz, an Israeli postmaster and telecommunications expert, and turned into one of the 1970s\' best-selling board games by Invicta Plastics of England. It refines the older pencil game Bulls and Cows; Donald Knuth proved in 1977 that any four-peg, six-color code falls in at most five guesses.',
  intro:
    'Mastery means playing for information, not for the answer. Early guesses are experiments designed to split the remaining possibilities as evenly as possible; the answer falls out once the candidate set is small. Strong players track what every past row PROVES and never submit a guess inconsistent with earlier feedback.',
  sections: [
    {
      title: 'Read feedback precisely',
      art: {
        kind: 'grid',
        rows: ['gyuo', '●○..'],
        caption: 'A guess row and its pegs: ● right color right slot, ○ right color wrong slot'
      },
      bullets: [
        '⚫ A black peg = right color, right slot; a white peg = right color, wrong slot. Pegs do not tell you WHICH positions — that ambiguity is the whole game.',
        '🏆 Zero pegs is gold: every color in that guess is absent — eliminate them across the board.',
        '➕ Total pegs (black + white) equals how many of the guess\'s colors appear in the code (counting duplicates) — read the sum before the split.'
      ]
    },
    {
      title: 'Opening theory',
      art: {
        kind: 'grid',
        rows: ['ggyy', 'uuoo'],
        caption: 'Paired openers (AABB) cover the palette and pin duplicates fast'
      },
      bullets: [
        '👯 Open with two pairs (AABB) rather than four distinct colors — pair structure disambiguates duplicates faster.',
        '🔀 Second guess: keep confirmed-total colors, swap the rest, and MOVE everything you keep — repeating a color in the same slot wastes the position information.',
        '🎨 With more colors than slots (hard+ tiers), spend the first two guesses covering the palette to find which colors exist at all.'
      ]
    },
    {
      title: 'Consistency is the engine',
      art: {
        kind: 'row',
        items: ['🤔 candidate', '>', '🧪 replay old rows', '>', '✅ submit'],
        caption: 'Only submit codes that could still be the answer'
      },
      paragraphs: [
        'Every new guess should be a code that COULD be the answer given all previous feedback. This single discipline is most of Knuth\'s power.'
      ],
      bullets: [
        '🧪 Before submitting, replay your candidate against each earlier row: would it have produced exactly those pegs? If not, it is wasted.',
        '⚖️ When two candidates survive, prefer the guess whose possible feedbacks distinguish them — sometimes that is a third code that can\'t be the answer but splits the pair.',
        '📍 Write positions off one at a time: a color proven present but white-pegged in slots 1 and 3 must live in 2 or 4.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['guyo', 'gouy', 'gyou'],
        caption: 'List the survivors — after three reads only a handful remain'
      },
      bullets: [
        '📝 List the surviving candidates explicitly — on a 4-slot code after three reads there are usually fewer than six.',
        '🧮 Re-sum the palette: colors accounted for across all feedback often pin the duplicate count exactly.',
        '🎣 Do not chase blacks greedily; a guess yielding 2 black may carry less information than one yielding 1 black 2 white.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🧠🎯🏆',
        caption: 'Play for information — the answer falls out on its own'
      },
      bullets: [
        '📉 Score here rewards fewer rows — practice holding one full "experiment plan" (guess 1 and 2 fixed) so early rows are automatic.',
        '🌈 Play a tier with more colors as an information exercise: when covering guesses become necessary, the value of zero-peg results becomes visceral.',
        '🔎 After each win, recount which guess was wasted (produced no elimination) — most players find exactly one per game, and removing it drops your average by a full row.'
      ]
    }
  ],
  references: [
    {
      label: 'Mastermind (board game) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Mastermind_(board_game)',
      note: 'history, Knuth\'s five-guess algorithm and optimal strategies'
    },
    {
      label: 'Bulls and Cows — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Bulls_and_cows',
      note: 'the older pencil game Mastermind refined'
    }
  ]
};
