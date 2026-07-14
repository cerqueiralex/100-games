import type { Difficulty } from '../../../platform/types';

/**
 * Hangman word bank — all ORIGINAL, hand-authored content (never copied from
 * any other site). Twelve themed categories, each split into three rarity
 * tiers:
 *   - common  (≥25 words, everyday vocabulary, single words)
 *   - tricky  (≥15 words, less obvious single words)
 *   - rare    (≥10 words, may be two-word phrases)
 * Every entry is UPPERCASE A–Z; rare entries may contain single spaces
 * between words. Covered by `validateHangmanBank()` (run in `npm run validate`).
 */

export type Rarity = 'common' | 'tricky' | 'rare';

export interface Category {
  name: string;
  common: string[];
  tricky: string[];
  rare: string[];
}

export const CATEGORIES: Category[] = [
  {
    name: 'Animals',
    common: [
      'CAT', 'DOG', 'LION', 'TIGER', 'BEAR', 'WOLF', 'FOX', 'DEER', 'HORSE',
      'SHEEP', 'GOAT', 'DUCK', 'GOOSE', 'EAGLE', 'OWL', 'FROG', 'SNAKE',
      'MOUSE', 'RABBIT', 'ZEBRA', 'GIRAFFE', 'MONKEY', 'WHALE', 'DOLPHIN',
      'SHARK', 'SEAL'
    ],
    tricky: [
      'PANTHER', 'LEOPARD', 'CHEETAH', 'GAZELLE', 'WALRUS', 'OTTER', 'BADGER',
      'BEAVER', 'HEDGEHOG', 'PLATYPUS', 'MEERKAT', 'PORCUPINE', 'RACCOON',
      'ANTELOPE', 'FLAMINGO', 'PELICAN'
    ],
    rare: [
      'PRAYING MANTIS', 'KOMODO DRAGON', 'SNOW LEOPARD', 'ORANGUTAN',
      'CHINCHILLA', 'ARMADILLO', 'WILDEBEEST', 'PANGOLIN', 'TASMANIAN DEVIL',
      'MOUNTAIN GOAT', 'POLAR BEAR', 'HAMMERHEAD SHARK'
    ]
  },
  {
    name: 'At the cinema',
    common: [
      'MOVIE', 'FILM', 'SCREEN', 'TICKET', 'POPCORN', 'ACTOR', 'ACTRESS',
      'SCENE', 'HERO', 'VILLAIN', 'COMEDY', 'HORROR', 'DRAMA', 'TRAILER',
      'SEQUEL', 'POSTER', 'CAMERA', 'DIRECTOR', 'STUDIO', 'PLOT', 'SCRIPT',
      'CINEMA', 'AUDIENCE', 'PROJECTOR', 'CAST', 'ENDING'
    ],
    tricky: [
      'BLOCKBUSTER', 'SCREENPLAY', 'CLIFFHANGER', 'SUBTITLE', 'PREMIERE',
      'MONTAGE', 'CLIMAX', 'FLASHBACK', 'ANIMATION', 'DOCUMENTARY', 'THRILLER',
      'WESTERN', 'SOUNDTRACK', 'INTERMISSION', 'MULTIPLEX', 'MATINEE'
    ],
    rare: [
      'OPENING NIGHT', 'SPECIAL EFFECTS', 'LEADING ROLE', 'BOX OFFICE',
      'SILENT FILM', 'MOTION CAPTURE', 'POST PRODUCTION', 'RED CARPET',
      'PLOT TWIST', 'SCORE COMPOSER', 'CAMEO ROLE', 'DIRECTORS CUT'
    ]
  },
  {
    name: 'In the kitchen',
    common: [
      'SPOON', 'FORK', 'KNIFE', 'PLATE', 'BOWL', 'CUP', 'MUG', 'POT', 'PAN',
      'KETTLE', 'OVEN', 'STOVE', 'FRIDGE', 'TOASTER', 'BLENDER', 'WHISK',
      'LADLE', 'GRATER', 'PEELER', 'TIMER', 'APRON', 'SPATULA', 'COLANDER',
      'TEAPOT', 'SIEVE', 'TRAY'
    ],
    tricky: [
      'SAUCEPAN', 'CASSEROLE', 'CORKSCREW', 'THERMOMETER', 'MICROWAVE',
      'DISHWASHER', 'RAMEKIN', 'SKILLET', 'TUREEN', 'DECANTER', 'CANISTER',
      'PLACEMAT', 'TONGS', 'CLEAVER', 'STRAINER', 'PITCHER'
    ],
    rare: [
      'ROLLING PIN', 'CUTTING BOARD', 'MIXING BOWL', 'GARLIC PRESS',
      'PASTRY BRUSH', 'COOKIE CUTTER', 'SLOTTED SPOON', 'PIZZA CUTTER',
      'SALAD TONGS', 'EGG TIMER', 'SPICE RACK', 'BREAD BASKET'
    ]
  },
  {
    name: 'Sports',
    common: [
      'SOCCER', 'TENNIS', 'GOLF', 'BOXING', 'RUGBY', 'HOCKEY', 'CRICKET',
      'SKIING', 'SURFING', 'ROWING', 'CYCLING', 'RUNNING', 'DIVING', 'FENCING',
      'BOWLING', 'ARCHERY', 'KARATE', 'JUDO', 'SKATING', 'CLIMBING', 'SAILING',
      'BASEBALL', 'FOOTBALL', 'VOLLEYBALL', 'SWIMMING', 'BASKETBALL'
    ],
    tricky: [
      'BADMINTON', 'LACROSSE', 'TRIATHLON', 'MARATHON', 'SNOWBOARD',
      'WRESTLING', 'HANDBALL', 'SQUASH', 'CANOEING', 'KAYAKING', 'EQUESTRIAN',
      'DECATHLON', 'BIATHLON', 'TAEKWONDO', 'PENTATHLON', 'GYMNASTICS'
    ],
    rare: [
      'TABLE TENNIS', 'WATER POLO', 'HIGH JUMP', 'LONG JUMP', 'POLE VAULT',
      'SHOT PUT', 'ICE HOCKEY', 'FIGURE SKATING', 'MARTIAL ARTS',
      'ROCK CLIMBING', 'SCUBA DIVING', 'HORSE RACING'
    ]
  },
  {
    name: 'Travel',
    common: [
      'PLANE', 'TRAIN', 'HOTEL', 'BEACH', 'MAP', 'PASSPORT', 'LUGGAGE',
      'TICKET', 'AIRPORT', 'STATION', 'JOURNEY', 'TOURIST', 'CAMERA',
      'SUITCASE', 'BACKPACK', 'COMPASS', 'HARBOR', 'VOYAGE', 'CRUISE',
      'SAFARI', 'JUNGLE', 'DESERT', 'ISLAND', 'VILLAGE', 'MARKET', 'TAXI'
    ],
    tricky: [
      'ITINERARY', 'EXCURSION', 'TERMINAL', 'EXPEDITION', 'PENINSULA',
      'CONTINENT', 'LANDMARK', 'SOUVENIR', 'BOULEVARD', 'VINEYARD',
      'CATHEDRAL', 'EMBASSY', 'RAILWAY', 'HIGHWAY', 'HOSTEL', 'CARAVAN'
    ],
    rare: [
      'BOARDING PASS', 'TRAVEL AGENT', 'ROAD TRIP', 'MOUNTAIN PASS',
      'TROPICAL ISLAND', 'HOT SPRING', 'TRAIN STATION', 'DUTY FREE',
      'JET LAG', 'SLEEPER CAR', 'SCENIC ROUTE', 'WINDOW SEAT'
    ]
  },
  {
    name: 'Music',
    common: [
      'PIANO', 'GUITAR', 'DRUM', 'VIOLIN', 'FLUTE', 'TRUMPET', 'HARP', 'BANJO',
      'CELLO', 'ORGAN', 'SINGER', 'CHOIR', 'MELODY', 'RHYTHM', 'TEMPO',
      'CHORD', 'LYRICS', 'ALBUM', 'CONCERT', 'STAGE', 'BAND', 'TUNE', 'NOTE',
      'SONG', 'BASS', 'OBOE'
    ],
    tricky: [
      'SAXOPHONE', 'CLARINET', 'TROMBONE', 'ACCORDION', 'HARMONICA',
      'KEYBOARD', 'ORCHESTRA', 'SYMPHONY', 'HARMONY', 'OCTAVE', 'SOPRANO',
      'BARITONE', 'CONDUCTOR', 'PERCUSSION', 'TAMBOURINE', 'XYLOPHONE'
    ],
    rare: [
      'GRAND PIANO', 'DOUBLE BASS', 'SHEET MUSIC', 'ELECTRIC GUITAR',
      'DRUM MACHINE', 'STRING QUARTET', 'TREBLE CLEF', 'JAZZ BAND',
      'MUSIC STAND', 'WIND INSTRUMENT', 'FRENCH HORN', 'PIPE ORGAN'
    ]
  },
  {
    name: 'Nature',
    common: [
      'TREE', 'RIVER', 'MOUNTAIN', 'FOREST', 'FLOWER', 'GRASS', 'LEAF',
      'CLOUD', 'RAIN', 'SNOW', 'WIND', 'STORM', 'OCEAN', 'VALLEY', 'MEADOW',
      'DESERT', 'ISLAND', 'CANYON', 'GLACIER', 'VOLCANO', 'WATERFALL',
      'SUNSET', 'RAINBOW', 'MOON', 'STAR', 'THUNDER'
    ],
    tricky: [
      'PENINSULA', 'ESTUARY', 'PLATEAU', 'SAVANNA', 'TUNDRA', 'LAGOON',
      'GEYSER', 'WILDLIFE', 'HORIZON', 'BOULDER', 'BLOSSOM', 'ORCHID',
      'CRATER', 'MARSHLAND', 'RAVINE', 'CASCADE'
    ],
    rare: [
      'CORAL REEF', 'RAIN FOREST', 'NIGHT SKY', 'MOUNTAIN RANGE',
      'DESERT DUNE', 'MORNING DEW', 'FALLING STAR', 'NORTHERN LIGHTS',
      'HIDDEN SPRING', 'SEA BREEZE', 'FULL MOON', 'RIVER DELTA'
    ]
  },
  {
    name: 'Jobs',
    common: [
      'DOCTOR', 'NURSE', 'TEACHER', 'FARMER', 'BAKER', 'CHEF', 'PILOT',
      'SAILOR', 'ARTIST', 'WRITER', 'SINGER', 'DANCER', 'LAWYER', 'JUDGE',
      'PLUMBER', 'PAINTER', 'DENTIST', 'TAILOR', 'BUTCHER', 'WAITER',
      'DRIVER', 'CLEANER', 'BUILDER', 'JEWELER', 'GARDENER', 'LIBRARIAN'
    ],
    tricky: [
      'ARCHITECT', 'ENGINEER', 'ELECTRICIAN', 'MECHANIC', 'SURGEON',
      'PHARMACIST', 'ACCOUNTANT', 'JOURNALIST', 'PHOTOGRAPHER', 'ASTRONOMER',
      'DETECTIVE', 'PROFESSOR', 'CARPENTER', 'VETERINARIAN', 'RECEPTIONIST',
      'TRANSLATOR'
    ],
    rare: [
      'FLIGHT ATTENDANT', 'FIRE FIGHTER', 'PARK RANGER', 'TOUR GUIDE',
      'SOFTWARE ENGINEER', 'MARINE BIOLOGIST', 'BUS DRIVER', 'POLICE OFFICER',
      'SOCIAL WORKER', 'DENTAL NURSE', 'NEWS REPORTER', 'RACE DRIVER'
    ]
  },
  {
    name: 'Technology',
    common: [
      'PHONE', 'LAPTOP', 'MOUSE', 'SCREEN', 'TABLET', 'ROBOT', 'CAMERA',
      'BATTERY', 'CHARGER', 'KEYBOARD', 'MONITOR', 'SPEAKER', 'PRINTER',
      'ROUTER', 'CABLE', 'SENSOR', 'PIXEL', 'MODEM', 'WEBSITE', 'BROWSER',
      'DOWNLOAD', 'PASSWORD', 'NETWORK', 'PROGRAM', 'CURSOR', 'GADGET'
    ],
    tricky: [
      'PROCESSOR', 'ALGORITHM', 'DATABASE', 'SOFTWARE', 'HARDWARE',
      'FIREWALL', 'BLUETOOTH', 'INTERFACE', 'ENCRYPTION', 'PROTOCOL',
      'BANDWIDTH', 'COMPILER', 'TRANSISTOR', 'SATELLITE', 'MICROCHIP',
      'TERABYTE'
    ],
    rare: [
      'VIRTUAL REALITY', 'HARD DRIVE', 'SOLAR PANEL', 'TOUCH SCREEN',
      'VOICE ASSISTANT', 'WIRELESS ROUTER', 'SMART WATCH', 'DATA CENTER',
      'CIRCUIT BOARD', 'SEARCH ENGINE', 'CLOUD STORAGE',
      'ARTIFICIAL INTELLIGENCE'
    ]
  },
  {
    name: 'Mythology',
    common: [
      'DRAGON', 'WIZARD', 'GIANT', 'FAIRY', 'GHOST', 'KNIGHT', 'CASTLE',
      'SWORD', 'MAGIC', 'SPELL', 'POTION', 'TROLL', 'GOBLIN', 'ELF', 'DWARF',
      'WITCH', 'KING', 'QUEEN', 'THRONE', 'ORACLE', 'TEMPLE', 'HERO',
      'MONSTER', 'LEGEND', 'MERMAID', 'CENTAUR'
    ],
    tricky: [
      'PHOENIX', 'GRIFFIN', 'MINOTAUR', 'PEGASUS', 'KRAKEN', 'CYCLOPS',
      'SPHINX', 'CHIMERA', 'VALKYRIE', 'POSEIDON', 'HERCULES', 'PANDORA',
      'MEDUSA', 'ODYSSEY', 'TITAN', 'GORGON'
    ],
    rare: [
      'TROJAN HORSE', 'GOLDEN FLEECE', 'SEA SERPENT', 'HOLY GRAIL',
      'LOCH NESS', 'MOUNT OLYMPUS', 'WINGED HORSE', 'CRYSTAL BALL',
      'MAGIC CARPET', 'FIRE DRAGON', 'ICE GIANT', 'SHADOW REALM'
    ]
  },
  {
    name: 'Space',
    common: [
      'STAR', 'MOON', 'SUN', 'PLANET', 'COMET', 'GALAXY', 'ROCKET', 'ORBIT',
      'EARTH', 'MARS', 'VENUS', 'SATURN', 'JUPITER', 'NEPTUNE', 'MERCURY',
      'URANUS', 'PLUTO', 'METEOR', 'CRATER', 'NEBULA', 'ECLIPSE', 'GRAVITY',
      'ASTRONAUT', 'TELESCOPE', 'SATELLITE', 'COSMOS'
    ],
    tricky: [
      'SUPERNOVA', 'CONSTELLATION', 'ASTEROID', 'ATMOSPHERE', 'HEMISPHERE',
      'SPACECRAFT', 'OBSERVATORY', 'INTERSTELLAR', 'PARALLAX', 'QUASAR',
      'PULSAR', 'MAGNETOSPHERE', 'EQUINOX', 'SOLSTICE', 'PLANETARIUM',
      'COSMONAUT'
    ],
    rare: [
      'SOLAR SYSTEM', 'BLACK HOLE', 'MILKY WAY', 'SHOOTING STAR',
      'SPACE STATION', 'LUNAR ECLIPSE', 'ASTEROID BELT', 'DWARF PLANET',
      'COSMIC DUST', 'SPACE SHUTTLE', 'RED GIANT', 'LAUNCH PAD'
    ]
  },
  {
    name: 'Weather',
    common: [
      'RAIN', 'SNOW', 'WIND', 'STORM', 'CLOUD', 'SUN', 'FOG', 'FROST', 'HAIL',
      'THUNDER', 'LIGHTNING', 'BREEZE', 'DRIZZLE', 'SHOWER', 'RAINBOW',
      'SUNSHINE', 'SMOG', 'BLIZZARD', 'TORNADO', 'CYCLONE', 'HUMIDITY',
      'PRESSURE', 'FORECAST', 'CLIMATE', 'SLEET', 'GALE'
    ],
    tricky: [
      'HURRICANE', 'MONSOON', 'DROUGHT', 'OVERCAST', 'TURBULENCE',
      'TEMPERATURE', 'CONDENSATION', 'PRECIPITATION', 'WHIRLWIND',
      'SNOWSTORM', 'THUNDERBOLT', 'WINDCHILL', 'ICICLE', 'TYPHOON',
      'DOWNPOUR', 'FLURRIES'
    ],
    rare: [
      'HEAT WAVE', 'COLD FRONT', 'MORNING FOG', 'WINTER STORM',
      'GENTLE BREEZE', 'ACID RAIN', 'DUST STORM', 'FREEZING RAIN',
      'WEATHER VANE', 'STORM CLOUD', 'CLEAR SKIES', 'NORTHERN WIND'
    ]
  }
];

/** Which rarity tiers each difficulty draws its hidden word from. */
export const RARITIES: Record<Difficulty, Rarity[]> = {
  easy: ['common'],
  medium: ['common', 'tricky'],
  hard: ['tricky'],
  pro: ['tricky', 'rare'],
  extreme: ['rare']
};

/** Lives (wrong guesses allowed) per difficulty. */
export const LIVES: Record<Difficulty, number> = {
  easy: 8,
  medium: 7,
  hard: 6,
  pro: 5,
  extreme: 4
};

/** Whether the themed category is shown as a clue from the start. */
export const SHOW_CATEGORY: Record<Difficulty, boolean> = {
  easy: true,
  medium: true,
  hard: true,
  pro: false,
  extreme: false
};

/** Difficulty score multiplier (1–5). */
export const MULT: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  pro: 4,
  extreme: 5
};

export interface Picked {
  word: string;
  category: string;
}

/**
 * Pick a hidden word for a difficulty. Pure: pass a custom `rng` (0..1) for
 * deterministic tests; defaults to Math.random for real play.
 */
export function pickWord(difficulty: Difficulty, rng: () => number = Math.random): Picked {
  const pools = RARITIES[difficulty];
  const cat = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];
  const rarity = pools[Math.floor(rng() * pools.length)];
  const list = cat[rarity];
  const word = list[Math.floor(rng() * list.length)];
  return { word, category: cat.name };
}

/**
 * Static integrity checks for `npm run validate`: category count, per-tier
 * sizes, charset (A–Z, single spaces only in rare), and no duplicate word
 * within a single category.
 */
export function validateHangmanBank(): string[] {
  const errors: string[] = [];
  if (CATEGORIES.length < 10) {
    errors.push(`only ${CATEGORIES.length} categories (need ≥10)`);
  }
  const MINS: Record<Rarity, number> = { common: 25, tricky: 15, rare: 10 };
  const single = /^[A-Z]{3,}$/;
  const phrase = /^[A-Z]+( [A-Z]+)?$/; // one or two uppercase words

  const catNames = new Set<string>();
  for (const cat of CATEGORIES) {
    if (catNames.has(cat.name)) errors.push(`duplicate category name "${cat.name}"`);
    catNames.add(cat.name);

    const tiers: Rarity[] = ['common', 'tricky', 'rare'];
    const seen = new Set<string>();
    for (const tier of tiers) {
      const list = cat[tier];
      if (list.length < MINS[tier]) {
        errors.push(`${cat.name} / ${tier}: ${list.length} words (need ≥${MINS[tier]})`);
      }
      for (const w of list) {
        const pattern = tier === 'rare' ? phrase : single;
        if (!pattern.test(w)) {
          errors.push(`${cat.name} / ${tier}: "${w}" fails charset (A–Z${tier === 'rare' ? ' + single space' : ''})`);
        }
        if (seen.has(w)) errors.push(`${cat.name}: duplicate word "${w}"`);
        seen.add(w);
      }
    }
  }
  return errors;
}
