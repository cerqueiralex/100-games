import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Untangle" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.MD "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Untangle is the playable form of graph planarity, a branch of mathematics reaching back to Euler. The genre went mainstream in 2005 with John Tantalo’s browser game Planarity, and its guarantee comes from a real theorem: Fáry’s theorem says every planar graph — every web that CAN be drawn without crossings — can be drawn crossing-free using only straight lines. The webs here are generated planar by construction, so a zero-crossing layout always exists.',
  intro:
    'Mastering Untangle means switching from whack-a-mole — chasing individual red lines — to structure: finding the web’s outer frame, parking its busiest nodes, and cleaning one region at a time. Because this app pays a bonus for fewer moves, mastery is also economy: decide where a node belongs before you touch it, and move it once.',
  sections: [
    {
      title: 'Find the frame first',
      art: {
        kind: 'grid',
        rows: ['●.●.●', '.....', '●.·.●', '.....', '●.●.●'],
        caption: 'Pull the boundary ring wide — everything else nests inside it'
      },
      paragraphs: [
        'Every planar drawing is rings within rings: an outer boundary with everything else nested inside. Your first job is to guess which nodes form that boundary and pull them outward into a big ring.'
      ],
      bullets: [
        '🔗 Pick a handful of nodes that connect to each other in a cycle and drag them to the edges of the canvas, spread wide.',
        '🖼️ Use the whole play area — cramped layouts manufacture crossings that a spacious ring dissolves for free.',
        '🔄 If the middle stays chaotic, your ring probably contains an interior node; swap it with a calmer one and re-spread.'
      ]
    },
    {
      title: 'Fix the hubs, then the leaves',
      art: {
        kind: 'row',
        items: ['● hubs', '>', 'mid nodes', '>', '· leaves'],
        caption: 'Settle the constrained nodes first — the easy ones slot in at the end'
      },
      paragraphs: [
        'A node with many lines has very few places it can legally live; a node with two lines fits almost anywhere. Settle the constrained nodes early and the easy ones will slot in at the end.'
      ],
      bullets: [
        '👀 Eyeball each node’s line count; drag the busiest node into the largest open area and watch how many of its lines clear at once.',
        '🎯 A hub usually belongs near the middle of its neighbours — centre it among them rather than off to one side.',
        '🍃 Leave degree-2 nodes for last: they are pure slack and will resolve themselves once their two neighbours are placed.'
      ]
    },
    {
      title: 'Untwist, don’t shuffle',
      art: {
        kind: 'grid',
        rows: ['●.●', '.x.', '●.●'],
        caption: 'A twist: drag one endpoint across the line it crosses'
      },
      paragraphs: [
        'Most crossings are a simple twist: two nodes sitting on the wrong sides of each other. The fix is to drag one endpoint across the line it crosses — not to relocate half the board.'
      ],
      bullets: [
        '📉 Watch the live counter as you drag: a good move clears several crossings at once; if the number climbs, you are dragging the wrong node.',
        '🧹 Clean one region completely (all green) before starting another, and route later drags around it.',
        '🔁 Two lines that cross twice are a double twist — swapping the positions of one line’s two endpoints often clears both.'
      ]
    },
    {
      title: 'Spend moves like currency',
      art: {
        kind: 'row',
        items: ['decide', '>', 'drag once', '>', 'done'],
        caption: 'Every pickup counts — one deliberate drag beats five nudges'
      },
      paragraphs: [
        'The score includes a fewer-moves bonus, so every drag should be a decision, not an experiment.'
      ],
      bullets: [
        '🧭 Decide the destination before touching the node — one long deliberate drag beats five nudges (each pickup counts).',
        '💰 Early frame-building moves pay for themselves many times over; late-game fidgeting is where move counts bloat.',
        '🎲 Shuffle re-scatters everything — it is a fresh start, not a tool, so use it only when a layout is truly beyond repair.'
      ]
    },
    {
      title: 'Tiers, assists, improving',
      art: {
        kind: 'row',
        items: ['easy 6', '>', 'extreme 22'],
        caption: 'Webs grow but the method holds — expect rings two or three deep on extreme'
      },
      bullets: [
        '🕸️ Webs grow from 6 nodes on easy to 22 on extreme; the frame-then-hubs method is the same, there is just more nesting — expect two or three rings deep on extreme.',
        '🚦 Crossing highlights count as help while enabled: solving with them off forces you to read the geometry itself and is the single best training setting.',
        '💡 Spread relaxes the layout and Hint places one node (−60 points); both count as help — when a hint moves a node, study why THAT spot, it is showing you the solved layout’s structure.',
        '⏱️ Time pars run 1 to 9 minutes by tier: speed comes from committing to a frame early, not from fast fingers.'
      ]
    }
  ],
  references: [
    {
      label: 'Planarity — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Planarity',
      note: 'the 2005 game this genre grew from, with the theory behind it'
    },
    {
      label: 'Planar graph — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Planar_graph',
      note: 'what makes a web untangleable at all'
    },
    {
      label: 'Fáry’s theorem — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/F%C3%A1ry%27s_theorem',
      note: 'why straight lines are always enough'
    }
  ]
};
