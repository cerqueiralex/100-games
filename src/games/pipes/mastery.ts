import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Pipes" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Rotate-the-tiles plumbing descends from Pipe Mania (The Assembly Line, UK 1989) and matured into the "Net" rotation puzzle popularized by Simon Tatham\'s 1990s puzzle collection and countless mobile "infinity loop" games. This app\'s version is the classic net form: one water source, fixed tile shapes, rotation only, no leaks.',
  intro:
    'Mastery means solving from certainty outward. Edges and corners forbid arms from pointing off-board; ends and crosses have almost no freedom; and every locked tile constrains its neighbors\' arms. The expert habit is never rotating a tile that isn\'t provably forced — the puzzle is deduction wearing an action game\'s clothes.',
  sections: [
    {
      title: 'Border logic first',
      art: {
        kind: 'grid',
        rows: ['┌─┐', '│.│', '└─┘'],
        caption: 'The frame is nearly forced: no arm may ever point off the board'
      },
      bullets: [
        '🖼️ No arm may point off the board: straight pipes on the border lie parallel to it; T-pieces on the border have their stem inward; corner-cell pieces are heavily forced.',
        '🔚 End-caps (single-arm tiles) on the border have at most three orientations before neighbors are even considered — usually one after.',
        '🧹 Sweep the whole frame before the interior: a locked frame turns interior cells into bordered cells recursively.'
      ]
    },
    {
      title: 'Tiles rank by tyranny',
      art: {
        kind: 'row',
        items: ['┼ fixed', '>', '─ 2 ways', '>', '└ ┬ 4 ways'],
        caption: 'Deduce the least-free tiles first — their certainty cascades cheapest'
      },
      bullets: [
        '👑 Crosses need no rotation — mark them mentally as fixed walls of connectivity.',
        '🥇 Straights have two states, curves four, Ts four: prefer deducing straights, they cascade cheapest.',
        '🤝 An arm pointing at a neighbor demands a matching arm back; a flat side demands a flat side. Every locked tile makes exactly four such demands — spend them all before moving on.'
      ]
    },
    {
      title: 'Flow and leak reasoning',
      art: {
        kind: 'grid',
        rows: ['─x│'],
        caption: 'An arm meeting a flat side is a leak — instant contradiction, rotate again'
      },
      bullets: [
        '💧 Every outlet must receive water and every arm must connect: an arm aimed at a dead flat side is a leak — instant contradiction, rotate again.',
        '🌳 The network is one tree from the tank: a closed loop is as illegal as a leak. If two branches are about to reconnect, one of the joining tiles is wrong.',
        '📡 Use the flowing count as sonar: rotations that raise the flowed-tile number are consistent with the tree; a rotation that strands a region points at the mistake.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['hh.', 'hh.', '│..'],
        caption: 'One corridor feeds the whole region (highlight) — its orientation is forced by counting arms in vs out'
      },
      bullets: [
        '🚪 Find the region\'s single entrance: an area fed through one corridor tile must route ALL its water through it — that tile\'s orientation is forced by counting arms in vs out.',
        '🔍 Recheck tiles adjacent to your most recent rotations — every rotation invalidates old inferences about its four neighbors.',
        '🌐 On wrap (extreme) boards, the border rule disappears; parity of arms along each row/column replaces it — count arms crossing each seam.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🔧🧠🚰',
        caption: 'Touch a tile only when forced — the winning and high-score strategies are the same move'
      },
      bullets: [
        '🏆 Score counts rotations: touching a tile only when forced is both the winning strategy AND the high-score strategy — the incentives align perfectly.',
        '👁️ Practice reading a tile\'s arms without rotating it (visualize all four states); tier difficulty is mostly visualization load.',
        '🌱 When you use a hint, the revealed tile is a new certainty seed — re-run border-style logic from it instead of resuming where you were.'
      ]
    }
  ],
  references: [
    {
      label: 'Pipe Mania — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Pipe_Mania',
      note: 'the 1989 ancestor of all plumbing puzzles'
    },
    {
      label: "Simon Tatham's Portable Puzzle Collection — Wikipedia",
      url: 'https://en.wikipedia.org/wiki/Simon_Tatham%27s_Portable_Puzzle_Collection',
      note: 'home of Net, the canonical rotate-to-connect puzzle'
    }
  ]
};
