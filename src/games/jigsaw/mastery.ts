import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Jigsaw" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'The jigsaw puzzle was invented in London in the 1760s by John Spilsbury, an engraver and mapmaker who mounted maps on wood and cut them along country borders as "dissected maps" for teaching geography. The name came later, from the treadle fretsaws (jig saws) used to cut wooden puzzles in the late 1800s. Die-cut cardboard made puzzles cheap and mass-market, and they boomed spectacularly during the Great Depression of the 1930s. This app cuts photos into a grid of interlocking pieces, adding 90° rotation on the top tiers.',
  intro:
    'Mastering jigsaw is triage: solving pieces in the order that makes each one cheapest. The border first, then the loud regions, leaving the bland ones to be settled by elimination — and on the rotation tiers, reading a fragment’s correct orientation from its content before you drag it anywhere. The picture always contains more information than beginners use.',
  sections: [
    {
      title: 'Border first, always',
      art: {
        kind: 'grid',
        rows: ['aaaa', 'a..a', 'a..a', 'aaaa'],
        caption: 'Corners and edges first — a finished frame bounds every later search'
      },
      paragraphs: [
        'Corner and edge pieces have flat sides that identify them instantly, and a finished frame turns every later placement into a bounded search instead of an open one.'
      ],
      bullets: [
        '🧹 Sweep the pile once collecting only flat-sided pieces; place the four corners, then run each edge.',
        '🌤️ An edge piece’s content tells you which side it belongs to — sky edges up top, ground texture along the bottom.',
        '🛠️ The Edge sort assist gathers border pieces for you, but it counts as help — spotting flat sides yourself takes seconds once trained.'
      ]
    },
    {
      title: 'Loud regions before quiet ones',
      art: {
        kind: 'grid',
        rows: ['....', '.oo.', '.oo.', '....'],
        caption: 'A loud region: every piece from it carries its own address'
      },
      paragraphs: [
        'Work the saturated, patterned, high-contrast parts of the photo first: faces, signage, flowers, a red boat. Every piece from a loud region carries its own address.'
      ],
      bullets: [
        '🎯 Pick one distinctive region and pull every piece that clearly belongs to it before placing any — batch, then place.',
        '🌊 Leave skies, water and plain walls for last: by then the empty cells are few and elimination does the work the picture will not.',
        '⏭️ The pile shrinks as you go, so a piece that was ambiguous early is often obvious late — skip stubborn pieces instead of grinding on them.'
      ]
    },
    {
      title: 'Read position from a fragment',
      art: {
        kind: 'grid',
        rows: ['uuu', 'hhh', 'ooo'],
        caption: 'Gradients are maps — match the fragment’s shade to the preview'
      },
      paragraphs: [
        'A lone piece tells you roughly where it lives if you interrogate it.'
      ],
      bullets: [
        '🌅 Gradients are maps: skies lighten toward the horizon, vignettes darken toward corners — match the piece’s shade to the preview’s gradient.',
        '📐 Perspective lines (roads, rooflines, railings) converge — the angle of a line on a piece narrows down its column.',
        '🌲 Texture scale encodes distance: big leaves are foreground, fine texture is far away.',
        '👁️ The faint Preview assist makes all of this explicit; it counts as help while on, so wean off it as your picture memory improves.'
      ]
    },
    {
      title: 'Rotation tiers',
      art: {
        kind: 'row',
        items: ['0°', '90°', '180°', '270°'],
        caption: 'Four rotations — orient the content upright before hunting the cell'
      },
      paragraphs: [
        'On pro and extreme pieces start turned, and a piece only snaps when both its cell and its rotation are right. Orientation should be decided before position.'
      ],
      bullets: [
        '🧭 Use content cues to orient: horizons and shelves sit horizontal, buildings and people stand vertical, light comes from one consistent direction.',
        '🔄 Rotate the piece until its content reads naturally, THEN look for its home — dragging a sideways piece around the board wastes the trip.',
        '🤔 If a piece refuses to snap on a cell you are sure of, cycle its three other rotations before doubting the cell.'
      ]
    },
    {
      title: 'Scoring and improving',
      art: {
        kind: 'row',
        items: ['3×4', '>', '7×8'],
        caption: 'Boards grow from 12 to 56 pieces — score scales with piece count and tier'
      },
      bullets: [
        '📊 Boards run 12 pieces (3×4) up to 56 (7×8) with pars of 2 to 16 minutes; score scales with piece count and tier, so a patient extreme solve dwarfs a fast easy one.',
        '💸 Hints place a random piece for −40 — on a 56-piece board that is rarely worth it; spend the time on the border instead.',
        '🏆 A clean win uses no Preview, Edge sort or hints: the path there is border → loud regions → elimination, on a photo you know well.',
        '📷 You can add your own photos via public/puzzles/manifest.json — familiar images are the gentlest way to train the rotation tiers.'
      ]
    }
  ],
  references: [
    {
      label: 'Jigsaw puzzle — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Jigsaw_puzzle',
      note: 'from dissected maps to the cardboard era'
    },
    {
      label: 'John Spilsbury — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/John_Spilsbury_(cartographer)',
      note: 'the mapmaker who started it all'
    }
  ]
};
