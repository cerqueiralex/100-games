import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Tower of Hanoi" — strategy content only; the rules
 * live in tutorial.tsx. See DESIGN.md "Mastery guides" for the bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'The Tower of Hanoi was invented by French mathematician Édouard Lucas in 1883, sold as a toy with a legend about Brahmin priests moving 64 golden discs as the world ends. Its 2ⁿ−1 optimal solution made it the canonical teaching example of recursion; the 4-peg version\'s optimal count (the Frame–Stewart conjecture, 1941) was only proven for four pegs in 2014.',
  intro:
    'Mastery means the puzzle stops being search and becomes rhythm. The optimal solution is fully determined: the smallest nut moves every second turn in a fixed rotation, and every other turn has exactly one legal move. Internalize those two facts and any 3-peg tower solves itself at par; the 4-peg extreme adds one real decision — where to park the middle stack.',
  sections: [
    {
      title: 'The two-beat rhythm',
      art: {
        kind: 'row',
        items: ['smallest', '>', 'forced', '>', 'smallest', '>', 'forced'],
        caption: 'The whole optimal 3-peg algorithm is a two-beat rhythm'
      },
      bullets: [
        '🥁 Beat 1: move the SMALLEST nut. Beat 2: make the only legal move that doesn\'t touch the smallest. Repeat. That\'s the entire optimal 3-peg algorithm.',
        '🧭 The smallest nut always circles in one direction: with an ODD number of nuts it cycles source→target→spare; with an EVEN count, source→spare→target. Set its direction before move one and never re-decide.',
        '⚠️ If you ever face a "choice" on beat 2, you broke rhythm somewhere — one of the two non-smallest moves is always illegal.'
      ]
    },
    {
      title: 'Recursive sight',
      art: {
        kind: 'grid',
        rows: ['..1..', '..2.3'],
        caption: 'Phase reading: 1–2 evacuated to the spare peg so the big 3 crosses to the target'
      },
      bullets: [
        '🪆 To move n nuts to the target: move n−1 to the spare, the big one to target, n−1 onto it. Read every position as "which sub-tower am I relocating right now?"',
        '🎯 The largest unmoved nut defines the phase: everything smaller is either evacuating it or re-stacking onto it — knowing the phase tells you the destination of every move.',
        '📈 Par doubles per nut (7, 15, 31, 63…): if your count is drifting above the doubling line mid-solve, the rhythm broke early — restart the pattern rather than repairing.'
      ]
    },
    {
      title: 'The 4-peg game (extreme)',
      art: {
        kind: 'grid',
        rows: ['..1....', '..2....', '4.3....'],
        caption: 'Frame–Stewart: park the top stack on its own peg, solve the rest as 3-peg, retrieve last'
      },
      bullets: [
        '🅿️ With four pegs the rhythm alone is no longer optimal: the Frame–Stewart idea splits the stack — park the top k nuts on a spare peg using ALL four pegs, solve the rest as a 3-peg problem, then bring the parked stack home.',
        '3️⃣ For 7 nuts, parking the top 3 is the right split — park them early, ignore them completely through the middlegame, retrieve them last.',
        '⛔ The parked stack\'s peg is sacred: any move onto it mid-solve is a wrong turn.'
      ]
    },
    {
      title: 'When lost mid-solve',
      art: {
        kind: 'row',
        items: ['find smallest', '>', 'moved last?', '>', 'forced move or cycle on'],
        caption: 'The rhythm re-enters from any legal position'
      },
      bullets: [
        '🔎 Find the smallest nut and count back: if it moved last turn, this turn is the forced non-smallest move; if not, move it along its cycle — you can re-enter the rhythm from ANY legal position.',
        '🏔️ Check the largest misplaced nut and ask what is sitting on its destination — that stack is your immediate sub-goal.',
        '💡 The hint here computes the true optimal move from the current position — use one after a tangle, then continue the rhythm from it.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['7', '>', '15', '>', '31', '>', '63'],
        caption: 'Par doubles per nut — moves above the line mean one broken phase'
      },
      bullets: [
        '🔂 Hit exact par on 3–4 nuts until it feels mechanical before adding size; the rhythm must survive without counting.',
        '🗣️ Say the phase out loud on bigger towers ("evacuating 5") — verbal phase-tracking prevents mid-solve disorientation better than staring.',
        '📊 Your moves-vs-par history is a pure rhythm meter: par means perfect, par+2ᵏ means one broken phase — find which.'
      ]
    }
  ],
  references: [
    {
      label: 'Tower of Hanoi — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Tower_of_Hanoi',
      note: 'Lucas\'s original, the recursive solution and the legend'
    },
    {
      label: 'Frame–Stewart algorithm — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Frame%E2%80%93Stewart_algorithm',
      note: 'the 4-peg splitting strategy the extreme tier demands'
    }
  ]
};
