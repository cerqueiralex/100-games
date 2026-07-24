import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Peg Solitaire" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Peg solitaire’s first firm record is French: a 1697 engraving shows the Princess of Soubise playing it at the court of Louis XIV, and a persistent (unproven) legend credits a prisoner in the Bastille with inventing it. The 33-hole English cross board and the 37-hole European board became the classics. The central game — full cross, centre empty, finish with one peg in the centre — is fully analysed: an 18-move solution found by Ernest Bergholt in 1912 was proved minimal by John Beasley in 1964.',
  intro:
    'Mastering peg solitaire means abandoning greedy jumping. Any legal jump removes a peg, but only planned jumps leave a board that can still be finished — most losses are decided ten moves before the board actually locks up. Strong players clear the board in rehearsed blocks, keep every remaining peg connected to the action, and know where the final peg will land before the middle game starts.',
  sections: [
    {
      title: 'Think in packages, not jumps',
      art: {
        kind: 'grid',
        rows: ['···', '●●.'],
        caption: 'The 3-removal: a catalyst pair clears the line of three and survives intact'
      },
      paragraphs: [
        'The classic technique is the package (or "purge"): a rehearsed short sequence that removes a small block of pegs — typically three — using a neighbouring pair of pegs as a catalyst that ends up back where it started. Solve the board as a series of packages and the middle game becomes bookkeeping instead of luck.'
      ],
      bullets: [
        '⚛️ Practise the 3-removal: a line of three pegs beside a pair; a few jumps clear the three and restore the pair. It is the atom of every full solution.',
        '🧱 On the cross boards, treat each arm as one package: clear the arm with a sequence that leaves its supporting pegs intact for the next arm.',
        '🔋 Before starting a package, check the catalyst pegs really survive it — a package that consumes its catalyst strands the next region.'
      ]
    },
    {
      title: 'Never strand a peg',
      art: {
        kind: 'grid',
        rows: ['··..', '··..', '....', '...b'],
        caption: 'A peg with no neighbours is dead — keep one connected mass'
      },
      paragraphs: [
        'A peg with no orthogonal neighbours can never be jumped and can only move by jumping others — far from the action it is simply dead, and one dead peg costs the game.'
      ],
      bullets: [
        '🏔️ Empty the arm tips early, while the pegs beside them still exist to jump them.',
        '🧲 Keep the live pegs forming one connected mass drifting toward the centre; two separated islands almost never rejoin.',
        '🚨 Watch the four corner cells of each arm: each can only be cleared by one specific neighbour — do not remove that neighbour first.'
      ]
    },
    {
      title: 'Play the endgame first',
      art: {
        kind: 'grid',
        rows: ['·..', '·..', '··h'],
        caption: 'The final sweep: a short run collapsing into the target hole'
      },
      paragraphs: [
        'Decide where the last peg must land — the centre, for the classic feat and this app’s bonus — and protect the pegs that finish there. The last three or four jumps are usually an L-shape or a straight run collapsing into the target hole.'
      ],
      bullets: [
        '🎯 Reserve a small cluster near the centre as your finishing kit and never spend it on mid-game cleanup.',
        '📦 If the final sweep needs a peg arriving from the north arm, that arm must not be cleared completely — leave the courier.',
        '↩️ When a position feels fine but hints keep pointing away from your plan, your finishing kit is probably already broken — undo early rather than late.'
      ]
    },
    {
      title: 'Board notes for this app',
      art: {
        kind: 'row',
        items: ['△ 15', '>', '✚ 33', '>', '⬡ 37', '>', '🎲 verified'],
        caption: 'Triangle → English cross → European → solver-verified random starts'
      },
      bullets: [
        '🔰 Easy — Triangle (15 pegs): small enough to read fully; avoid piling pegs into one corner, and keep the middle cell active.',
        '➕ Medium — English cross (33, centre start): the classic central game; learn one full solution by packages and it will never leave you.',
        '🇪🇺 Hard — European (37): the six extra rounded-corner holes are awkward; involve them early, they are the first pegs to die stranded.',
        '🎲 Pro/extreme — solver-verified random starts on the English board, and extreme must finish on the centre: plan the finishing kit from move one.',
        '📉 Errors here count illegal jump attempts plus pegs left on a stuck board — a stuck board with 8 pegs is a much worse record than an undone mistake.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '↩️💡🎯',
        caption: 'Undo and hints are lessons — study them, then wean off'
      },
      bullets: [
        '🔬 Use Undo as a study tool: when stuck, rewind to the move that broke connectivity, not just one jump back — but remember it counts as help.',
        '🧑‍🏫 Take one Hint only to re-orient, then work out why the solver chose that jump; hints are solver-verified, so each is a free lesson in package order.',
        '✨ The legal-move glow is passive help; turning it off forces you to compute jumps yourself, which is exactly the skill the hard tiers test.',
        '🏆 Chase the centre finish on medium until it is routine — the 200-point bonus is also the proof you are planning, not scavenging.'
      ]
    }
  ],
  references: [
    {
      label: 'Peg solitaire — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Peg_solitaire',
      note: 'history, board variants and the theory of the central game'
    },
    {
      label: 'Peg Solitaire — Wolfram MathWorld',
      url: 'https://mathworld.wolfram.com/PegSolitaire.html',
      note: 'the mathematics behind solvable and unsolvable positions'
    }
  ]
};
