import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Image Puzzle" — strategy content only; the rules live
 * in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'The sliding puzzle began with the 15 Puzzle, credited to New York postmaster Noyes Chapman around 1874; Sam Loyd\'s (false) claim of invention and his unsolvable 14-15 prize hoax fueled an 1880 world craze. The mathematics — half of all arrangements are unreachable — made it a classic of permutation theory; picture versions like this one add visual navigation to the same machine.',
  intro:
    'Mastery is solving in layers with a memorized endgame. Row by row, column by column, the board shrinks to a 3×2 box that one practiced maneuver always finishes. Experts never "explore" — every slide is part of a named technique: build the row, rotate the last two in, keep the solved frame frozen.',
  sections: [
    {
      title: 'The layer method',
      art: {
        kind: 'grid',
        rows: ['gggg', 'ghhh', 'ghhh'],
        caption: 'Solved layers frozen (green); the rest shrinks to one practiced 3×2 endgame (highlight)'
      },
      bullets: [
        '🧅 Solve the top row first, then the left column of the remainder, alternating until a 3×2 box remains — this order never has to break finished work.',
        '➡️ Within a row, place tiles left to right EXCEPT the last two; never socket the second-to-last tile directly into its corner.',
        '🧊 Freeze discipline: once a row/column is done, treat it as a wall. Any plan that would disturb it is wrong by definition.'
      ]
    },
    {
      title: 'The last-two trick',
      art: {
        kind: 'grid',
        rows: ['gg.3', '...4', '....'],
        caption: 'Park 3 in the corner, 4 beneath it — one 3-cycle rotates both home'
      },
      bullets: [
        '🅿️ For a row\'s final pair: park the second-to-last tile IN the corner, its neighbor directly below the corner, then rotate both in with one 3-cycle. Same trick sideways for columns.',
        '⚛️ Learn the 3-cycle consciously (blank circles around the pair) — it is the atom of all sliding technique.',
        '🪢 If the two tiles arrive pre-tangled (swapped), push one three cells away and restart the trick — untangling in place always costs more.'
      ]
    },
    {
      title: 'Move the blank, not the tile',
      art: {
        kind: 'grid',
        rows: ['aaa.', 'a5..', '....'],
        caption: 'Walk the blank (accent path) around the tile, then push — transport runs in L-shaped legs'
      },
      bullets: [
        '🚶 Plan each move as "walk the blank around to the far side of the tile, then push" — cycling the blank is the entire mechanics of transport.',
        '📐 Transport tiles along an L: horizontal leg then vertical leg (or vice versa); diagonal-ish zigzags waste 2–4 moves per tile.',
        '🚏 The blank should end each technique near your next work area — factor its parking spot into the plan.'
      ]
    },
    {
      title: 'Reading the picture',
      art: {
        kind: 'grid',
        rows: ['h..h', '....', 'h..h'],
        caption: 'Certify the four corners first — they anchor the mental map'
      },
      bullets: [
        '🗺️ Use Preview early to build a mental map, then navigate by content: edges of objects, color gradients and text fragments identify tiles faster than trial fitting.',
        '☁️ Sky/texture regions with identical-looking tiles: disambiguate by their neighbors\' features, or defer them to the endgame where positions force identity.',
        '📌 Corner tiles are the easiest to certify — anchor your mental map on all four before the middle.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['layers', '>', '3-cycles', '>', '3×2 endgame'],
        caption: 'Par-level solves are three techniques chained'
      },
      bullets: [
        '🏁 The 3×2 endgame has few distinct cases — drill it until it is reflex; experts\' speed advantage lives almost entirely there.',
        '📊 Watch your moves-vs-par stat: layer method with clean 3-cycles lands close to par; big gaps mean improvised transport.',
        '📷 Add your own photos (see the manifest) — unfamiliar images force map-building skill instead of memory of the stock pictures.'
      ]
    }
  ],
  references: [
    {
      label: '15 puzzle — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/15_puzzle',
      note: 'the 1874 original, Sam Loyd\'s hoax, and the parity mathematics'
    },
    {
      label: 'Sliding puzzle — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Sliding_puzzle',
      note: 'the family and its solution techniques'
    }
  ]
};
