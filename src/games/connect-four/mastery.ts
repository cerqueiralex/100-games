import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Connect Four" — strategy content only; the rules live
 * in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Connect Four was published by Milton Bradley (USA) in 1974, refining the older "Captain\'s Mistress" vertical four-in-a-row tradition. It was solved independently in 1988 by James Dow Allen and Victor Allis: with perfect play the FIRST player wins — and only by opening in the center column.',
  intro:
    'Mastery is threat bookkeeping on two levels: immediate tactics (make three, block three) and the deeper parity game — which ROW a threat sits on decides whether it ever cashes. First player wants threats on odd rows, second player on even rows; the endgame is won by whoever\'s standing threat matures as the board fills.',
  sections: [
    {
      title: 'The center is everything',
      art: {
        kind: 'grid',
        rows: ['...h...', '...b...', '..yb...', '.ybby..'],
        caption: 'The centre column joins the most four-lines — open there, always'
      },
      bullets: [
        '🎯 Open in the center column, always — it participates in the most four-lines, and perfect play from anywhere else does not win for the first player.',
        '📊 Value columns by centrality: d > c/e > b/f > a/g. When tactics are equal, drop closer to the middle.',
        '📡 A center-column stack of three of your discs radiates diagonal threats both ways — opponents must answer it structurally, not once.'
      ]
    },
    {
      title: 'Tactical hygiene',
      art: {
        kind: 'grid',
        rows: ['....', 'hyyy', 'xbby', 'bbyy'],
        caption: 'Dropping on ✕ hands them the winning square above it — check what your disc enables'
      },
      bullets: [
        '🔍 Every turn scan: my winning drop? Their winning drop? Only then strategy. Missed one-move wins and blocks decide most casual games.',
        '⚠️ Never GIVE the winning square: before dropping, check what your disc enables directly above it — filling the cell under their winning square is the classic self-destruction.',
        '⚡ Sevens and double-threats: two threats sharing no answer square win on the spot; steer exchanges toward shapes (open-ended diagonals through the center) that spawn them.'
      ]
    },
    {
      title: 'Parity: the invisible layer',
      art: {
        kind: 'grid',
        rows: ['4.', '3h', '2.', '1h'],
        caption: 'Count rows from the bottom — first player naturally lands on ODD rows'
      },
      bullets: [
        '🔢 Count rows from the bottom starting at 1. If nothing forces play, columns fill alternately — first player naturally lands on ODD rows, second on EVEN.',
        '♟️ As first player, build a lasting threat on an odd row (rows 3 and 5 are gold) and simply avoid tactics: as the board fills, zugzwang delivers the square to you.',
        '🔁 As second player, an even-row threat plus disciplined column-filling turns the same squeeze around; without one, trade pieces toward a draw.'
      ]
    },
    {
      title: 'Against this app\'s robot',
      art: {
        kind: 'row',
        items: ['diagonals', '>', 'square above', '>', 'parity'],
        caption: 'What wins by tier — tricks down low, structure up high'
      },
      bullets: [
        '📐 Lower tiers miss diagonal threats most — build diagonals through the center and cash the oversights.',
        '🐢 Higher tiers punish neglect of the "square above" rule ruthlessly; slow down exactly when a column reaches height 4–5.',
        '🏗️ On extreme, play the parity plan from move one: near-perfect opponents lose only to structure, never to tricks.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🔁🧮📈',
        caption: 'One deliberate parity count per game makes the layer permanent'
      },
      bullets: [
        '🔎 After every loss, find the move where you filled the cell under their win — it is almost always there; naming it retrains the reflex.',
        '🗣️ Practice counting a position\'s threats by row parity aloud once per game; one deliberate count per game makes the layer permanent.',
        '📊 Watch your round margins in best-of-N: winning rounds faster (fewer discs) tracks tactical sharpness; winning slow full boards tracks parity skill — train whichever lags.'
      ]
    }
  ],
  references: [
    {
      label: 'Connect Four — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Connect_Four',
      note: 'history plus the 1988 solving and what perfect play looks like'
    },
    {
      label: 'Victor Allis — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Victor_Allis',
      note: 'whose thesis introduced the threat-based solving method (VICTOR)'
    }
  ]
};
