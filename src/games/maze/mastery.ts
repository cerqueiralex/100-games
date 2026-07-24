import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Maze" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Mazes are among humanity\'s oldest puzzles — from the Cretan labyrinth of Greek myth to the hedge mazes of 17th-century European gardens (Hampton Court, 1690s, still open). The mathematics of maze solving was formalized in the 19th century (wall following, Trémaux\'s algorithm, 1882, France); computer-generated "perfect" mazes like this app\'s came with the 1970s.',
  intro:
    'Mastery means solving with your eyes before your finger moves. These are perfect mazes — no loops, exactly one path between any two points — which makes them ideal for look-ahead training: every junction has exactly one correct branch, and score rewards matching the shortest path. Read far, commit in bursts, never wander.',
  sections: [
    {
      title: 'Read from both ends',
      art: {
        kind: 'grid',
        rows: ['h#...', 'h#.#.', 'hhh#.', '##hhh'],
        caption: 'Trace from the entrance AND back from the exit — meet in the middle'
      },
      bullets: [
        '🏁 Scan backwards from the exit for its first junction — the exit corridor is usually long and identifies the final approach direction.',
        '🤝 Solve the middle LAST: match your entrance progress and your exit knowledge until they meet — bidirectional reading roughly halves look-ahead depth.',
        '👀 Before the first move, spend a few seconds tracing the full route visually; par bonuses reward planning far more than fast fingers.'
      ]
    },
    {
      title: 'Junction logic in a perfect maze',
      art: {
        kind: 'grid',
        rows: ['#x###', '#.###', 'hhhhh'],
        caption: 'Seal dead branches mentally and follow the trunk'
      },
      bullets: [
        '🛑 Every wrong branch is a dead end eventually — the question at each junction is only how SOON. Prefer branches that head toward the exit region and stay near the maze\'s main diagonal.',
        '🧱 Mentally seal dead ends: when a branch visibly terminates, imagine it walled off — dead-end filling shrinks the maze as you look.',
        '🌳 Long straight corridors are usually trunk; twisty tight clusters are usually filler. Follow the trunk.'
      ]
    },
    {
      title: 'Wall following and when it fails you',
      art: {
        kind: 'grid',
        rows: ['hhhhh', 'h####', 'h....', 'hhhh.'],
        caption: 'Hug one wall and you WILL exit — rarely by the shortest route'
      },
      bullets: [
        '🖐️ Right-hand (or left-hand) wall following ALWAYS exits a perfect maze whose entrance and exit are on the border — it is the panic-proof fallback.',
        '⚠️ But wall following is rarely shortest: use it only to escape genuine disorientation, then re-plan.',
        '🚧 Trémaux discipline for big mazes: treat corridors you have visually "used" twice as closed.'
      ]
    },
    {
      title: 'Execution',
      art: {
        kind: 'row',
        items: ['read', '>', 'burst', '>', 'pause', '>', 'read'],
        caption: 'Junction-to-junction bursts, never step-by-step wandering'
      },
      bullets: [
        '⚡ Move in planned bursts (junction to junction), not step-by-step — drag along your memorized segment, then pause and read the next.',
        '↩️ If you realize a branch is wrong, backtrack IMMEDIATELY; sunk-cost corridor-finishing is the main source of over-par moves.',
        '🗺️ On custom/huge boards, break the maze into thirds and plan each third fully before entering it.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '👁️🧠🏁',
        caption: 'Eyes-only solve first, then execute without stopping'
      },
      bullets: [
        '👁️ Practice eyes-only solving: trace the whole route visually, then execute without stopping — the par-ratio stat in your history measures exactly this skill.',
        '📈 Increase size before tier: bigger boards train look-ahead depth; harder tiers train it under branching pressure.',
        '⏱️ Race your average time, not your best — consistency of first-read accuracy is what separates tiers.'
      ]
    }
  ],
  references: [
    {
      label: 'Maze — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Maze',
      note: 'history from labyrinths to computer generation'
    },
    {
      label: 'Maze-solving algorithm — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Maze-solving_algorithm',
      note: 'wall following, Trémaux and dead-end filling, formally'
    }
  ]
};
