import type { PixelSprite } from './pixelArt';

/**
 * The 8-bit card deck.
 *
 * 54 cards are COMPOSED, not drawn: thirteen rank glyphs and four suit pips
 * are authored once and stamped into a 15×16 grid. Hand-drawing all 54 would
 * be four copies of the same thirteen shapes, and the fourth copy is where
 * the typo lives.
 *
 * The layout is rank-over-pip rather than the pip-count layout a real card
 * uses (nine hearts on the nine of hearts). On a square card at phone size a
 * nine-pip grid is nine 4px smudges; one big pip and one big numeral is what
 * survives being 80 pixels wide, and it is the layout 8-bit decks land on
 * for the same reason.
 *
 * Ink only — the card stock is the surface underneath (see `.mm-theme-cards`
 * in global.css), which is what keeps the black suits readable on the dark
 * themes.
 */

/*
 * Card-shaped, not square: 13×18. The first pass used a 15×16 square with
 * the rank on rows 0–6 and the pip starting at row 7, which left NO gap —
 * the numeral and the pip fused into one blob. The canvas is taller than
 * wide now so the two sit in their own bands with clear air between them,
 * and the sprite letterboxes inside the square card the way a real card
 * would.
 */
const W = 13;
const H = 18;
/** the band each element owns, with rows 8 blank between them */
const RANK_Y = 1;
const PIP_Y = 10;

/* ---------- rank glyphs: 5×7, deliberately heavy so they hold up small ---------- */

const RANKS: Record<string, string[]> = {
  A: ['.###.', '##.##', '##.##', '#####', '##.##', '##.##', '##.##'],
  '2': ['.###.', '##.##', '...##', '..##.', '.##..', '##...', '#####'],
  '3': ['####.', '...##', '...##', '.###.', '...##', '...##', '####.'],
  '4': ['..###', '.####', '##.##', '##.##', '#####', '...##', '...##'],
  '5': ['#####', '##...', '####.', '...##', '...##', '##.##', '.###.'],
  '6': ['.###.', '##.##', '##...', '####.', '##.##', '##.##', '.###.'],
  '7': ['#####', '...##', '...##', '..##.', '..##.', '.##..', '.##..'],
  '8': ['.###.', '##.##', '##.##', '.###.', '##.##', '##.##', '.###.'],
  '9': ['.###.', '##.##', '##.##', '.####', '...##', '##.##', '.###.'],
  J: ['..###', '...##', '...##', '...##', '##.##', '##.##', '.###.'],
  Q: ['.###.', '##.##', '##.##', '##.##', '##.##', '.###.', '...##'],
  K: ['##.##', '##.#.', '####.', '###..', '####.', '##.#.', '##.##']
};

/** "10" is two glyphs; drawn as one 9-wide unit so it centres like the rest */
const TEN = [
  '.#...###.',
  '##..##.##',
  '.#..##.##',
  '.#..##.##',
  '.#..##.##',
  '.#..##.##',
  '###..###.'
];

/* ---------- suit pips: 9×9 ---------- */

const PIPS: Record<string, string[]> = {
  h: [
    '.##...##.',
    '####.####',
    '#########',
    '#########',
    '#########',
    '.#######.',
    '..#####..',
    '...###...',
    '....#....'
  ],
  d: [
    '....#....',
    '...###...',
    '..#####..',
    '.#######.',
    '#########',
    '.#######.',
    '..#####..',
    '...###...',
    '....#....'
  ],
  s: [
    '....#....',
    '...###...',
    '..#####..',
    '.#######.',
    '#########',
    '#########',
    '..##.##..',
    '....#....',
    '..#####..'
  ],
  /* three distinct lobes and a stem. The first club was a solid mass, which
     at nine pixels was a spade with a wider waist — and the two suits sit on
     the same board. */
  c: [
    '...###...',
    '..#####..',
    '...###...',
    '.##...##.',
    '####.####',
    '#########',
    '.##.#.##.',
    '....#....',
    '..#####..'
  ]
};

/**
 * The joker is a STAR, which is what most decks actually print on it.
 * Two jester-cap attempts came back unreadable at this size — one looked
 * like a crab — and a card nobody can name is a card nobody can match. A
 * five-pointed star is unmistakable at 11 pixels and shares its silhouette
 * with none of the four pips.
 */
const JOKER_STAR = [
  '.....###.....',
  '.....###.....',
  '....#####....',
  '....#####....',
  '#############',
  '#############',
  '.###########.',
  '..#########..',
  '..#########..',
  '.###########.',
  '.####...####.',
  '.###.....###.',
  '##.........##',
  '#...........#'
];

/* ---------- composition ---------- */

function blank(): string[][] {
  return Array.from({ length: H }, () => new Array<string>(W).fill('.'));
}

/** stamps a glyph's set pixels into the grid at (x, y) using palette key `k` */
function stamp(grid: string[][], art: string[], x: number, y: number, k: string) {
  art.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      if (row[dx] === '#') {
        const gy = y + dy;
        const gx = x + dx;
        if (gy >= 0 && gy < H && gx >= 0 && gx < W) grid[gy][gx] = k;
      }
    }
  });
}

const RED = '#d1252c';
const BLACK = '#23201b';

export function cardSprite(faceId: string): PixelSprite {
  const grid = blank();

  if (faceId.startsWith('joker')) {
    const red = faceId === 'joker-red';
    stamp(grid, JOKER_STAR, 0, 2, 'i');
    return { palette: { i: red ? RED : BLACK }, rows: grid.map((r) => r.join('')) };
  }

  const suit = faceId[0];
  const rank = faceId.slice(1);
  const red = suit === 'h' || suit === 'd';

  const glyph = rank === '10' ? TEN : RANKS[rank];
  if (glyph) {
    const gw = glyph[0].length;
    stamp(grid, glyph, Math.floor((W - gw) / 2), RANK_Y, 'i');
  }
  const pip = PIPS[suit];
  if (pip) stamp(grid, pip, Math.floor((W - 9) / 2), PIP_Y, 'i');

  return { palette: { i: red ? RED : BLACK }, rows: grid.map((r) => r.join('')) };
}
