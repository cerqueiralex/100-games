/**
 * Word Search themed word bank — ORIGINAL hand-authored content.
 *
 * Authoring rules (enforced by validateWordSearchBank, run by
 * `npm run validate`):
 *  - ≥12 themes, each with ≥14 unique uppercase words of 3–10 letters
 *  - within a theme no word may contain another theme word (or its
 *    reverse) as a substring — this is what guarantees the generator can
 *    promise "every listed word has exactly one findable placement"
 *  - each theme keeps ≥9 words of ≤7 letters so the easy 7×7 tier always
 *    has a generous pool to draw from
 */

export interface WordTheme {
  id: string;
  name: string;
  words: string[];
}

export const THEMES: WordTheme[] = [
  {
    id: 'animals',
    name: 'Animals',
    words: [
      'TIGER', 'LION', 'ZEBRA', 'PANDA', 'OTTER', 'EAGLE', 'SHARK', 'WHALE',
      'RABBIT', 'MONKEY', 'GIRAFFE', 'DOLPHIN', 'PENGUIN', 'LEOPARD',
      'KANGAROO', 'HEDGEHOG'
    ]
  },
  {
    id: 'food',
    name: 'Food',
    words: [
      'PIE', 'BREAD', 'CHEESE', 'APPLE', 'MANGO', 'PASTA', 'SALAD', 'HONEY',
      'OLIVE', 'BURGER', 'WAFFLE', 'NOODLE', 'YOGURT', 'PANCAKE', 'PRETZEL',
      'AVOCADO', 'STRAWBERRY'
    ]
  },
  {
    id: 'space',
    name: 'Space',
    words: [
      'UFO', 'STAR', 'MOON', 'MARS', 'COMET', 'ORBIT', 'VENUS', 'SATURN',
      'METEOR', 'GALAXY', 'ROCKET', 'PLANET', 'NEBULA', 'JUPITER', 'ECLIPSE',
      'ASTEROID', 'TELESCOPE', 'SPACECRAFT'
    ]
  },
  {
    id: 'sports',
    name: 'Sports',
    words: [
      'GOLF', 'SWIM', 'RUGBY', 'TENNIS', 'SOCCER', 'HOCKEY', 'BOXING',
      'SKIING', 'ROWING', 'KARATE', 'ARCHERY', 'CYCLING', 'RUNNING',
      'CRICKET', 'BASEBALL', 'MARATHON', 'BASKETBALL'
    ]
  },
  {
    id: 'music',
    name: 'Music',
    words: [
      'DRUM', 'SONG', 'OPERA', 'PIANO', 'CELLO', 'FLUTE', 'TEMPO', 'CHORD',
      'BANJO', 'VIOLIN', 'GUITAR', 'MELODY', 'SINGER', 'RHYTHM', 'TRUMPET',
      'WHISTLE'
    ]
  },
  {
    id: 'colors',
    name: 'Colors',
    words: [
      'TEAL', 'GOLD', 'PINK', 'IVORY', 'CORAL', 'AMBER', 'GREEN', 'MAROON',
      'PURPLE', 'ORANGE', 'YELLOW', 'SILVER', 'VIOLET', 'CRIMSON', 'MAGENTA',
      'TURQUOISE'
    ]
  },
  {
    id: 'weather',
    name: 'Weather',
    words: [
      'FOG', 'WIND', 'HAIL', 'SNOW', 'STORM', 'CLOUD', 'FROST', 'SUNNY',
      'BREEZE', 'THUNDER', 'DRIZZLE', 'CYCLONE', 'TORNADO', 'MONSOON',
      'RAINBOW', 'BLIZZARD'
    ]
  },
  {
    id: 'ocean',
    name: 'Ocean',
    words: [
      'WAVE', 'REEF', 'CRAB', 'KELP', 'TIDE', 'SQUID', 'PEARL', 'SHELL',
      'ANCHOR', 'URCHIN', 'LAGOON', 'OCTOPUS', 'LOBSTER', 'SEAHORSE',
      'PLANKTON', 'JELLYFISH'
    ]
  },
  {
    id: 'city',
    name: 'City',
    words: [
      'TAXI', 'PARK', 'BANK', 'HOTEL', 'METRO', 'PLAZA', 'TOWER', 'STREET',
      'BRIDGE', 'MUSEUM', 'AVENUE', 'SUBWAY', 'MARKET', 'LIBRARY', 'STADIUM',
      'SIDEWALK'
    ]
  },
  {
    id: 'garden',
    name: 'Garden',
    words: [
      'IVY', 'SEED', 'ROSE', 'LAWN', 'FERN', 'TULIP', 'DAISY', 'SHRUB',
      'MULCH', 'PETAL', 'SPADE', 'HEDGE', 'ORCHID', 'TROWEL', 'BLOSSOM',
      'LAVENDER', 'SUNFLOWER', 'GREENHOUSE'
    ]
  },
  {
    id: 'tools',
    name: 'Tools',
    words: [
      'AXE', 'NAIL', 'FILE', 'RAKE', 'HAMMER', 'WRENCH', 'PLIERS', 'CHISEL',
      'DRILL', 'LEVEL', 'RULER', 'SHOVEL', 'CLAMP', 'MALLET', 'CROWBAR',
      'HACKSAW'
    ]
  },
  {
    id: 'emotions',
    name: 'Emotions',
    words: [
      'JOY', 'HOPE', 'CALM', 'LOVE', 'PRIDE', 'ANGER', 'WORRY', 'TRUST',
      'GRIEF', 'HAPPY', 'SORROW', 'WONDER', 'DELIGHT', 'COURAGE', 'JEALOUSY',
      'SURPRISE'
    ]
  },
  {
    id: 'forest',
    name: 'Forest',
    words: [
      'OAK', 'MOSS', 'PINE', 'TRAIL', 'MAPLE', 'CEDAR', 'BIRCH', 'ACORN',
      'TRUNK', 'LICHEN', 'CANOPY', 'WILLOW', 'THICKET', 'REDWOOD', 'JUNIPER',
      'MUSHROOM'
    ]
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    words: [
      'FORK', 'OVEN', 'BOWL', 'WHISK', 'LADLE', 'SPOON', 'GRATER', 'KETTLE',
      'TEAPOT', 'SKILLET', 'SPATULA', 'BLENDER', 'TOASTER', 'COLANDER',
      'SAUCEPAN', 'MICROWAVE'
    ]
  }
];

const reverse = (w: string): string => [...w].reverse().join('');

/** Integrity checks for the bank — used by scripts/validate.ts. */
export function validateWordSearchBank(): string[] {
  const errors: string[] = [];
  if (THEMES.length < 12) errors.push(`bank has only ${THEMES.length} themes (need ≥12)`);
  const ids = new Set<string>();
  for (const theme of THEMES) {
    const tag = `theme "${theme.id}"`;
    if (ids.has(theme.id)) errors.push(`duplicate theme id ${theme.id}`);
    ids.add(theme.id);
    if (!theme.name) errors.push(`${tag}: missing display name`);
    if (theme.words.length < 14) {
      errors.push(`${tag}: only ${theme.words.length} words (need ≥14)`);
    }
    const seen = new Set<string>();
    for (const w of theme.words) {
      if (!/^[A-Z]{3,10}$/.test(w)) errors.push(`${tag}: word "${w}" must be 3–10 uppercase letters`);
      if (seen.has(w)) errors.push(`${tag}: duplicate word "${w}"`);
      seen.add(w);
    }
    // no word may contain another theme word or its reverse — keeps every
    // listed word's placement count exact in generated grids
    for (const a of theme.words) {
      for (const b of theme.words) {
        if (a === b) continue;
        if (a.includes(b)) errors.push(`${tag}: "${b}" is a substring of "${a}"`);
        if (a.includes(reverse(b))) errors.push(`${tag}: reverse of "${b}" is a substring of "${a}"`);
      }
    }
    const short = theme.words.filter((w) => w.length <= 7).length;
    if (short < 9) errors.push(`${tag}: only ${short} words of ≤7 letters (need ≥9 for the easy tier)`);
  }
  return errors;
}
