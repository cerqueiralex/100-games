import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master House Puzzles" — strategy content only; the rules live
 * in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'House Puzzles descend from the Zebra Puzzle — often called Einstein\'s Riddle — a positional deduction puzzle that appeared in Life International magazine in 1962 (its attribution to Einstein is legend, not history). The "row of houses with attributes" framing became the genre\'s signature. This app\'s puzzles are original, generated so ordering logic alone always decides every cell.',
  intro:
    'Mastery is spatial squeezing. Every clue is a constraint on positions along the row — an anchor, a neighbor bond, or an ordering — and the craft is converting each into eliminated positions immediately, then watching the survivors force each other. The best solvers work from the tightest clue, not the first clue.',
  sections: [
    {
      title: 'Triage the clues by tightness',
      art: {
        kind: 'grid',
        rows: ['🏠🏠🏠🏠🏠', 'xxaxx'],
        caption: 'An anchor ("the red house is #3") places once and eliminates four spots'
      },
      bullets: [
        '📌 Anchors first ("the red house is #3"): place them, eliminate everywhere else.',
        '🧱 Edge clues next ("X is in the first/last house") and near-edge orderings — a "left of" clue involving position 2 bites much harder than one in the middle.',
        '🔗 "Between" and adjacency clues are strongest once ONE of their items is pinned; queue them for every re-pass.'
      ]
    },
    {
      title: 'Convert orderings into dead positions',
      art: {
        kind: 'grid',
        rows: ['AAAAx', 'xBBBB'],
        caption: '"A left of B": A dies in the last house, B in the first — always'
      },
      bullets: [
        '➡️ "A is left of B" kills A from the last house and B from the first — always, before anything else is known.',
        '⛓️ Chained orderings compress hard: A<B<C in five houses forces A∈{1,2,3}, B∈{2,3,4}, C∈{3,4,5}.',
        '🧲 "A is directly left of B" is an adjacency pair — treat the pair as one two-wide block and slide it; blocks have far fewer legal positions than singles.'
      ]
    },
    {
      title: 'Cross-category transfer',
      art: {
        kind: 'row',
        items: ['🏠 house 4', '>', '🎨 its color', '>', '🐕 its pet'],
        caption: 'Position is the hub — one landing converts every related clue'
      },
      bullets: [
        '🏠 Position is the hub: once an attribute lands in house 4, every clue about that attribute becomes a clue about house 4.',
        '🚫 Two attributes in the same category can never share a house — a candidate list of one is a placement, and a placement radiates eliminations across its whole column.',
        '📝 Track candidate sets per house; the moment a house has one candidate left in any category, place it and re-run the neighbor clues touching that house.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['AB...', '.AB..', '..AB.', '...AB'],
        caption: 'An adjacency block slides as one piece — few legal spots, fast decay'
      },
      bullets: [
        '🔄 Re-slide every adjacency block against the current board — block positions decay fastest and are easiest to forget.',
        '🕳️ Look for the pigeonhole: three attributes confined to three houses lock those houses against everything else in the category.',
        '🧭 These boards never need guessing; a stall means some ordering clue\'s range hasn\'t been re-narrowed since your last placement.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🗣️🔁📊',
        caption: 'Verbalize ranges, re-pass clues, track your clean-win rate'
      },
      bullets: [
        '🗣️ Say clue conversions out loud at first ("so she\'s not in 1 or 2") — verbalizing ranges builds the reflex faster than staring.',
        '🔁 On higher tiers, do a full clue re-pass after every two placements; the cost is seconds, the missed-inference rate drops massively.',
        '📊 Compare your clean-win rate across tiers in the profile stats — when a tier hits ~80% clean, the next one will teach instead of punish.'
      ]
    }
  ],
  references: [
    {
      label: 'Zebra Puzzle — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Zebra_Puzzle',
      note: 'the original riddle, its history and a full worked solution'
    },
    {
      label: 'Constraint satisfaction problem — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Constraint_satisfaction_problem',
      note: 'the formal frame: what "propagating eliminations" really is'
    }
  ]
};
