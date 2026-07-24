import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Tangram" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'The tangram was devised in China around 1800, late in the Qing dynasty — the earliest surviving book of figures dates to 1813, and the puzzle grew out of an older Chinese tradition of dissection furniture and banquet-table sets. Trade ships carried it west, and by 1817 Europe and America were in the grip of a full "tangram fever" of published problem books. The seven-piece set has been standard ever since: two large triangles, one medium, two small, a square and a parallelogram.',
  intro:
    'Mastering tangram means reading the silhouette structurally before touching a piece. Beginners shuffle small pieces around hoping something clicks; strong solvers first decide where the two large triangles must go, then treat everything else as filling. Every figure is the same seven pieces — so mastery is really a library of shapes you have learned to decompose at a glance.',
  sections: [
    {
      title: 'The two big triangles decide everything',
      art: {
        kind: 'grid',
        rows: ['aaaa', 'aaau', 'aauu', 'auuu'],
        caption: 'The two large triangles cover half of every figure — seat them before anything else'
      },
      paragraphs: [
        'Together the two large triangles cover exactly half of every figure. Get them right and the puzzle is mostly over; get them wrong and no arrangement of the small pieces can rescue you.'
      ],
      bullets: [
        '🔎 Scan the silhouette for its two biggest right-angled regions — a large triangle almost always fills each.',
        '📏 A long straight run of outline usually means a large triangle’s hypotenuse (or two legs lined up) lies along it.',
        '🧱 If the figure has one big square-ish mass, the two large triangles probably meet along their hypotenuses inside it.',
        '🔄 When stuck, evict ONLY the large triangles and re-seat them — do not reset the whole board.'
      ]
    },
    {
      title: 'Read angles like a surveyor',
      art: {
        kind: 'row',
        items: ['45° tip', '90° corner', '135° slant'],
        caption: 'Every corner of every figure is a multiple of 45° — classify it and it names its piece'
      },
      paragraphs: [
        'Every corner of every tangram figure is a multiple of 45°. Classify each corner of the silhouette and it tells you which pieces can possibly touch it.'
      ],
      bullets: [
        '🔺 A sharp 45° point must be a triangle tip — nothing else in the set is that sharp.',
        '📐 A 90° corner takes a triangle’s square corner or the square piece itself.',
        '🪁 A 135° corner comes from the parallelogram, or from a leg meeting a hypotenuse.',
        '🧮 Count the silhouette’s outline in piece-edge lengths: the small triangle’s leg is the unit; hypotenuses are that unit times 1.41 — mixing them up is the most common misfit.'
      ]
    },
    {
      title: 'Small pieces are your slack',
      art: {
        kind: 'row',
        items: ['large ×2', '>', 'medium', '>', 'square + para', '>', 'small ×2'],
        caption: 'Place in size order — the small triangles are the slack that plugs leftovers'
      },
      bullets: [
        '🥇 Place in size order: large triangles, then medium triangle, then square and parallelogram, small triangles last.',
        '🧩 The two small triangles are the most flexible pieces in the set — paired they form a square, a bigger triangle or a parallelogram, so they can plug almost any leftover hole.',
        '🪞 The parallelogram is the only piece that is not its own mirror image: if it stubbornly refuses to fit a slot that looks right, Flip it.',
        '⚠️ The medium triangle is the most commonly misplaced piece — it loves to sit where a small-triangle pair belongs. If the last two pieces will not fit, relocate the medium triangle first.'
      ]
    },
    {
      title: 'Rotation discipline',
      art: {
        kind: 'row',
        items: ['◤', '◥', '◢', '◣'],
        caption: 'Eight 45° orientations per triangle — decide the right one before dragging'
      },
      paragraphs: [
        'Pieces rotate in 45° steps, so each triangle has eight orientations and only one is right for a given slot. Decide the orientation from the silhouette before dragging.'
      ],
      bullets: [
        '🎯 Match the piece’s right angle to the target corner first, then rotate until its legs run along the outline.',
        '🧲 On harder tiers the snap radius tightens — line the longest edge up first and the corner will catch.',
        '✅ If a piece glows green in a spot you did not expect, leave it: the app confirms correct placement, and a confirmed piece anchors its neighbours.'
      ]
    },
    {
      title: 'Tier notes for this app',
      art: {
        kind: 'row',
        items: ['2m', '3m', '4m', '5m', '6m'],
        caption: 'Time-bonus pars from easy to extreme'
      },
      bullets: [
        '🌱 Easy starts pieces near their homes — use it to learn each figure’s decomposition, not just to finish fast.',
        '🌪️ From hard up, pieces spawn scattered and rotated with a tighter snap; extreme adds the rotated Gem figure and heavy scatter, so angle-reading matters more than dragging speed.',
        '📚 Guides (drawing the internal boundaries) is a teaching tool: solve one figure with it on, then immediately re-solve it with it off — both it and Strong snap count as help while enabled.',
        '💰 The time bonus pars are 2/3/4/5/6 minutes by tier and each Hint costs 40 points, so a calm unaided solve under par outscores a hint-rush every time.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🧩👀🧠',
        caption: 'Recall is what builds the shape library'
      },
      bullets: [
        '🔁 After any solve, look back at the finished figure for five seconds and name where each of the seven pieces ended up — recall is what builds the shape library.',
        '💡 When a hint drops a piece, work out what in the silhouette should have told you that placement.',
        '🏆 Chase clean wins (no Guides, no Strong snap, no hints) on medium before chasing extreme times — the history page tracks clean wins separately.'
      ]
    }
  ],
  references: [
    {
      label: 'Tangram — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Tangram',
      note: 'history, the 1817 craze, paradoxes and the mathematics of the seven pieces'
    },
    {
      label: 'Dissection puzzle — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Dissection_puzzle',
      note: 'the wider family tangram belongs to'
    }
  ]
};
