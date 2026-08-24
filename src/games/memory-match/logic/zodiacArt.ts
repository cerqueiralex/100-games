import type { PixelSprite } from './pixelArt';

/**
 * The zodiac, drawn as 16×16 pixel art.
 *
 * Two palettes carry the whole set — a warm one and a cool one, alternating
 * so neighbouring cards on the board never blur together, with one dark ink
 * for outlines. A limited shared palette is what makes thirty separate
 * drawings read as one theme rather than thirty stickers.
 *
 * The twelve signs are their CREATURES (ram, bull, twins, crab…) rather than
 * their astrological glyphs: a glyph is a thin line drawing, and thin lines
 * are exactly what a 16-pixel grid cannot hold. The remaining eighteen are
 * the sky itself — sun, moon, the planets, a comet — which is both the
 * honest astrological set and the part that draws cleanly at this size.
 *
 * Characters: `o` outline/ink, `a` main colour, `b` secondary, `c` light
 * accent, `.` transparent.
 */

const INK = '#1b2432';

/** warm: fire and earth signs */
const WARM = { o: INK, a: '#e8762c', b: '#c04a1e', c: '#ffd08a' };
/** cool: air and water signs */
const COOL = { o: INK, a: '#3a86d4', b: '#245f9e', c: '#a8d8ff' };
/** night: the sky objects */
const NIGHT = { o: INK, a: '#8f6fe0', b: '#5b3fa8', c: '#e2d4ff' };
/** gold: the luminaries */
const GOLD = { o: INK, a: '#f5b731', b: '#c9821a', c: '#fff0b8' };

type Rows = string[];

const art = (palette: Record<string, string>, rows: Rows): PixelSprite => ({ palette, rows });

/* ---------------- the twelve signs ---------------- */

/*
 * The twelve signs are their GLYPHS, drawn as thick pixel strokes.
 *
 * The first version drew each sign's creature — a ram's head, a crab, an
 * archer. At sixteen pixels that failed: a lion's mane and a sunflower are
 * the same forty pixels, and on a memory board where the only job is telling
 * two cards apart, "unrecognisable" is a bug, not a style. The glyphs are
 * geometric — arcs, bars, zigzags — which is exactly what a pixel grid draws
 * well, and no two of them share a silhouette.
 */

/** Aries — the ram's curling horns over a stem */
const ARIES: Rows = [
  '................',
  '.aaa........aaa.',
  'aa.aa......aa.aa',
  'aa..aa....aa..aa',
  'aa...aa..aa...aa',
  'aa....aaaa....aa',
  '.aa....aa....aa.',
  '..aa...aa...aa..',
  '...aaa.aa.aaa...',
  '.....aaaaaa.....',
  '.......aa.......',
  '.......aa.......',
  '.......aa.......',
  '.......aa.......',
  '.......aa.......',
  '................'
];

/** Taurus — the bull: a ring under a pair of horns */
const TAURUS: Rows = [
  'aaa..........aaa',
  '.aaa........aaa.',
  '..aaa......aaa..',
  '...aaa....aaa...',
  '....aaaaaaaa....',
  '.....aaaaaa.....',
  '................',
  '.....aaaaaa.....',
  '...aaa....aaa...',
  '..aa........aa..',
  '..aa........aa..',
  '..aa........aa..',
  '...aaa....aaa...',
  '.....aaaaaa.....',
  '................',
  '................'
];

/** Gemini — the twins: two columns between two bars */
const GEMINI: Rows = [
  '................',
  '.aaaaaaaaaaaaaa.',
  '.aaaaaaaaaaaaaa.',
  '....aa....aa....',
  '....aa....aa....',
  '....aa....aa....',
  '....aa....aa....',
  '....aa....aa....',
  '....aa....aa....',
  '....aa....aa....',
  '....aa....aa....',
  '....aa....aa....',
  '.aaaaaaaaaaaaaa.',
  '.aaaaaaaaaaaaaa.',
  '................',
  '................'
];

/** Cancer — the two spirals of the crab, set diagonally like a rotated 69.
    Drawn symmetrically at first, which came out as a blob in a ring. */
const CANCER: Rows = [
  '................',
  '.aaaaaaaa.......',
  'aa......aa......',
  'a...aaa..aa.....',
  'a..aaaaa..aa....',
  'a..aaaaa...aa...',
  '.a..aaa.....aa..',
  '..aa.........aa.',
  '.aa.........aa..',
  '..aa.....aaa..a.',
  '...aa...aaaaa..a',
  '....aa..aaaaa..a',
  '.....aa..aaa...a',
  '......aa......aa',
  '.......aaaaaaaa.',
  '................'
];

/** Leo — the lion: the mane loop with its tail sweeping out */
const LEO: Rows = [
  '................',
  '....aaaaaa......',
  '...aa....aa.....',
  '..aa......aa....',
  '..aa......aa....',
  '..aa.....aa.....',
  '...aa...aa......',
  '....aaaaa.......',
  '.......aa.......',
  '.......aa...aaa.',
  '.......aa..aa.aa',
  '.......aa.aa..aa',
  '........aa....aa',
  '.........aaaaaa.',
  '................',
  '................'
];

/** Virgo — the maiden: the M with its closing loop */
const VIRGO: Rows = [
  '................',
  'aa..aa..aa......',
  'aa..aa..aa......',
  'aa..aa..aa......',
  'aa..aa..aa......',
  'aa..aa..aaaaaa..',
  'aa..aa..aa...aa.',
  'aa..aa..aa....aa',
  'aa..aa..aa....aa',
  'aa..aa..aa...aa.',
  'aa..aa..aaaaaa..',
  'aa..aa.....aa...',
  'aa..aa......aa..',
  'aa..aa.......aa.',
  '................',
  '................'
];

/** Libra — the scales: the setting sun over the horizon */
const LIBRA: Rows = [
  '................',
  '................',
  '.....aaaaaa.....',
  '...aaa....aaa...',
  '..aa........aa..',
  '.aa..........aa.',
  'aaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaa',
  '................',
  '................',
  'aaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaa',
  '................',
  '................',
  '................',
  '................'
];

/** Scorpio — Virgo's M, but the last leg leaves as a sting */
const SCORPIO: Rows = [
  '................',
  'aa..aa..aa......',
  'aa..aa..aa......',
  'aa..aa..aa......',
  'aa..aa..aa......',
  'aa..aa..aa......',
  'aa..aa..aa..aa..',
  'aa..aa..aa..aa..',
  'aa..aa..aa..aa..',
  'aa..aa..aa..aa..',
  'aa..aa..aaaaaa..',
  'aa..aa.......aaa',
  'aa..aa......aaaa',
  '.............aaa',
  '............aaaa',
  '................'
];

/** Sagittarius — the archer's arrow, crossed at the shaft */
const SAGITTARIUS: Rows = [
  '................',
  '.......aaaaaaaaa',
  '.......aaaaaaaaa',
  '.............aaa',
  '............aaaa',
  '..........aa.aaa',
  '.........aa..aa.',
  '........aa......',
  '.....aaaaaaa....',
  '.......aa.......',
  '......aa........',
  '.....aa.........',
  '....aa..........',
  '...aa...........',
  '..aa............',
  '................'
];

/** Capricorn — the sea-goat: horned stroke into a curling fish tail */
const CAPRICORN: Rows = [
  '................',
  'aa..............',
  'aa..............',
  'aa....aa........',
  'aa....aa........',
  'aa....aa........',
  'aa....aa........',
  'aa....aa........',
  'aaaaaaaa........',
  '.....aaaaaaa....',
  '..........aaa...',
  '.......aaaaaa...',
  '......aa...aa...',
  '......aa..aa....',
  '.......aaaa.....',
  '................'
];

/** Aquarius — the water bearer: two waves */
const AQUARIUS: Rows = [
  '................',
  '................',
  'aa....aa....aa..',
  'aaa..aaaa..aaa..',
  '.aaaaaa.aaaaa.aa',
  '..aa.....aa....a',
  '................',
  '................',
  'aa....aa....aa..',
  'aaa..aaaa..aaa..',
  '.aaaaaa.aaaaa.aa',
  '..aa.....aa....a',
  '................',
  '................',
  '................',
  '................'
];

/** Pisces — two fishes tied together */
const PISCES: Rows = [
  '................',
  '.aaa........aaa.',
  'aa.aa......aa.aa',
  'aa..aa....aa..aa',
  'aa...aa..aa...aa',
  'aa...aa..aa...aa',
  'aa...aa..aa...aa',
  'aaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaa',
  'aa...aa..aa...aa',
  'aa...aa..aa...aa',
  'aa...aa..aa...aa',
  'aa..aa....aa..aa',
  'aa.aa......aa.aa',
  '.aaa........aaa.',
  '................'
];

/* ---------------- the sky ---------------- */

const SUN: Rows = [
  '.......oo.......',
  '..o....oo....o..',
  '.oao.oooooo.oao.',
  '..o.oaaaaaao.o..',
  '....oaaaaaao....',
  '.o.oaaaaaaaao.o.',
  'oaooaaaaaaaaooao',
  'oaooaacaaaaaooao',
  'oaooaaaaaaaaooao',
  '.o.oaaaaaaaao.o.',
  '....oaaaaaao....',
  '..o.oaaaaaao.o..',
  '.oao.oooooo.oao.',
  '..o....oo....o..',
  '.......oo.......',
  '................'
];

const MOON: Rows = [
  '................',
  '......oooo......',
  '....ooaaaaoo....',
  '...oaaaaaaaao...',
  '..oaaaaoooaaao..',
  '..oaaaao..oaao..',
  '.oaacaao...ooo..',
  '.oaaaaao........',
  '.oaaaaao........',
  '.oaacaao...ooo..',
  '..oaaaao..oaao..',
  '..oaaaaoooaaao..',
  '...oaaaaaaaao...',
  '....ooaaaaoo....',
  '......oooo......',
  '................'
];

/** the ringed planet — the ring reaches past the disc on both sides, which
    is the only thing that separates it from the plain orbs */
const SATURN: Rows = [
  '................',
  '................',
  '.......oooo.....',
  '.....ooaaaaoo...',
  '....oaaaaaaaao..',
  '...oaacaaaaaaao.',
  'oooooaaaaaaaaooo',
  'obbbooaaaaaaobbo',
  '.obbbooaaaaobbo.',
  '..oooooaaaaooo..',
  '....oaaaaaaao...',
  '.....oaaaaao....',
  '......oooo......',
  '................',
  '................',
  '................'
];

/** a plain orb, used for the planets that differ only by colour */
const ORB: Rows = [
  '................',
  '......oooo......',
  '....ooaaaaoo....',
  '...oaaaaaaaao...',
  '..oaacaaaaaaao..',
  '..oaaaaaaaaaao..',
  '.oaaaaaaaaaaaao.',
  '.oaacaaaaaaaaao.',
  '.oaaaaaaaaaaaao.',
  '.oaaaaaaacaaaao.',
  '..oaaaaaaaaaao..',
  '..oaaaaaaaaaao..',
  '...oaaaaaaaao...',
  '....ooaaaaoo....',
  '......oooo......',
  '................'
];

/** a banded gas giant */
const BANDED: Rows = [
  '................',
  '......oooo......',
  '....ooaaaaoo....',
  '...oaaaaaaaao...',
  '..oabbbbbbbbao..',
  '..oaaaaaaaaaao..',
  '.oabbbbbbbbbbao.',
  '.oaaaaaaaaaaaao.',
  '.oaaacaaaaaaaao.',
  '.oabbbbbbbbbbao.',
  '..oaaaaaaaaaao..',
  '..oabbbbbbbbao..',
  '...oaaaaaaaao...',
  '....ooaaaaoo....',
  '......oooo......',
  '................'
];

/** a crescent-lit small world */
const SMALL_ORB: Rows = [
  '................',
  '................',
  '.......oo.......',
  '.....ooaaoo.....',
  '....oaaaaaao....',
  '...oaacaaaaao...',
  '...oaaaaaaaao...',
  '...oaaaaaaaao...',
  '...oaaaaaaaao...',
  '...oaaaaaaaao...',
  '....oaaaaaao....',
  '.....ooaaoo.....',
  '.......oo.......',
  '................',
  '................',
  '................'
];

const STAR: Rows = [
  '................',
  '.......oo.......',
  '.......oo.......',
  '......oaao......',
  '......oaao......',
  'oooooooaaooooooo',
  'oaaaaaaaaaaaaaao',
  '.oaaaaaaaaaaaao.',
  '..ooaaaaaaaaoo..',
  '....oaaaaaao....',
  '...oaaaooaaao...',
  '..oaaao..oaaao..',
  '.oaao......oaao.',
  '.oo..........oo.',
  '................',
  '................'
];

/** a four-point sparkle: concave sides, not the straight arms of a plus */
const SPARK: Rows = [
  '.......oo.......',
  '.......oo.......',
  '......oaao......',
  '......oaao......',
  '.....oaaaao.....',
  '....oaaaaaao....',
  '..ooaaaaaaaaoo..',
  'ooaaaaaaaaaaaaoo',
  'ooaaaaaaaaaaaaoo',
  '..ooaaaaaaaaoo..',
  '....oaaaaaao....',
  '.....oaaaao.....',
  '......oaao......',
  '......oaao......',
  '.......oo.......',
  '.......oo.......'
];

const COMET: Rows = [
  '................',
  '............oo..',
  '..........ooaao.',
  '.........oaaaaao',
  '........oaacaaao',
  '.o.....oaaaaaaao',
  'oao...ooaaaaaao.',
  '.o..ooaaaaaaoo..',
  '...oaaaaaaoo....',
  '.o.ooaaaoo...o..',
  'oao..ooo....oao.',
  '.o..........o...',
  '.....o..........',
  '....oao.........',
  '.....o..........',
  '................'
];

const HOURGLASS: Rows = [
  '................',
  '..oooooooooooo..',
  '..oaaaaaaaaaao..',
  '...oaaaaaaaao...',
  '....oaaaaaao....',
  '.....oaaaao.....',
  '......oaao......',
  '.......oo.......',
  '.......oo.......',
  '......oaao......',
  '.....oaaaao.....',
  '....oacacao.....',
  '...oaaaaaaao....',
  '..oaaaaaaaaao...',
  '..oooooooooooo..',
  '................'
];

const NODE_UP: Rows = [
  '................',
  '....oooooooo....',
  '...oaaaaaaaao...',
  '..oaaoooooaao...',
  '..oaao...oaao...',
  '..oaao...oaao...',
  '..oaao...oaao...',
  '..oaao...oaao...',
  '.ooaaoo.ooaaoo..',
  'oaaaaaaoaaaaaao.',
  'oaaooaaoaaooaao.',
  'oaao.oaoao.oaao.',
  '.oaooaaoaaooao..',
  '..oaaaao.oaaao..',
  '...oooo...oooo..',
  '................'
];

const NODE_DOWN: Rows = [...NODE_UP].reverse();

/** two linked rings — the opposition aspect, and the one sky object that
    must not borrow another's silhouette (see the distinctness note below) */
const RINGS: Rows = [
  '................',
  '................',
  '...oooo.........',
  '..oaaaao........',
  '.oaaooaao.......',
  '.oaao.oaaooooo..',
  '.oaao..oaaaaaao.',
  '.oaao..oaaooaao.',
  '.oaao..oaao.oaao',
  '.oaaooooaao.oaao',
  '..oaaaaaaao.oaao',
  '...oooooaao.oaao',
  '........oaaooaao',
  '.........oaaaao.',
  '..........oooo..',
  '................'
];

/* ---------------- the table ---------------- */

export const ZODIAC_ART: Record<string, PixelSprite> = {
  aries: art(WARM, ARIES),
  taurus: art(WARM, TAURUS),
  gemini: art(COOL, GEMINI),
  cancer: art(COOL, CANCER),
  leo: art(WARM, LEO),
  virgo: art(WARM, VIRGO),
  libra: art(COOL, LIBRA),
  scorpio: art(COOL, SCORPIO),
  sagittarius: art(WARM, SAGITTARIUS),
  capricorn: art(WARM, CAPRICORN),
  aquarius: art(COOL, AQUARIUS),
  pisces: art(COOL, PISCES),

  sun: art(GOLD, SUN),
  moon: art({ o: INK, a: '#cfd6e6', b: '#8f9ab5', c: '#ffffff' }, MOON),
  mercury: art({ o: INK, a: '#b9a88f', b: '#8a7a63', c: '#e6dbc8' }, SMALL_ORB),
  venus: art({ o: INK, a: '#e8c07a', b: '#b98f45', c: '#fff2d0' }, ORB),
  earth: art({ o: INK, a: '#3a86d4', b: '#2f7a3f', c: '#8fd67a' }, BANDED),
  mars: art({ o: INK, a: '#d4532f', b: '#9c3418', c: '#ffb08a' }, ORB),
  jupiter: art({ o: INK, a: '#dba566', b: '#9c6a34', c: '#ffe0b0' }, BANDED),
  saturn: art({ o: INK, a: '#e3c98a', b: '#a88a4a', c: '#fff4cf' }, SATURN),
  uranus: art({ o: INK, a: '#7fd6d0', b: '#3f958e', c: '#d6fffb' }, ORB),
  neptune: art({ o: INK, a: '#3f63c8', b: '#26408a', c: '#9fb6ff' }, ORB),
  // icy blue-white, deliberately far from Mercury's tan: the two share the
  // SMALL_ORB silhouette, so colour is the only thing telling them apart
  pluto: art({ o: INK, a: '#9fd4e8', b: '#5a93ad', c: '#f0fbff' }, SMALL_ORB),

  'north-node': art(NIGHT, NODE_UP),
  'south-node': art(NIGHT, NODE_DOWN),
  comet: art({ o: INK, a: '#8fd6ff', b: '#3f8fc8', c: '#ffffff' }, COMET),
  star: art(GOLD, STAR),
  sparkle: art(NIGHT, SPARK),
  hourglass: art(NIGHT, HOURGLASS),
  opposition: art(COOL, RINGS)
};
