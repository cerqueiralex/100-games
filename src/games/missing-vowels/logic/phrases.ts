import type { Difficulty } from '../../../platform/types';

/**
 * Missing Vowels — content bank + pure logic.
 *
 * A phrase is shown with every vowel (A E I O U) removed and its position
 * left as an empty slot; consonants and word breaks stay intact. The player
 * restores the vowels.
 *
 * All content is ORIGINAL: generic idioms / everyday phrases / themed nouns
 * written for this game — never copyrighted quotes. Uppercase A–Z + single
 * spaces only, 1–4 words each.
 */

export const VOWELS = ['A', 'E', 'I', 'O', 'U'] as const;
export type Vowel = (typeof VOWELS)[number];
const VOWEL_SET = new Set<string>(VOWELS);

export function isVowel(ch: string): boolean {
  return VOWEL_SET.has(ch);
}

export interface PhraseCategory {
  name: string;
  phrases: string[];
}

/**
 * Themed phrase sets. Each category mixes single short words (easy pool),
 * two-word pairs (medium/hard), three-word phrases (hard/pro/extreme) and
 * four-word phrases (pro/extreme) so every difficulty has a deep draw pool.
 */
export const PHRASE_BANK: PhraseCategory[] = [
  {
    name: 'Everyday phrases',
    phrases: [
      'HELLO',
      'THANKS',
      'PLEASE',
      'FRIEND',
      'MOMENT',
      'SIMPLE',
      'GOOD MORNING',
      'TAKE CARE',
      'WELL DONE',
      'NO WORRIES',
      'BREAK THE ICE',
      'TIME WILL TELL',
      'EASY DOES IT',
      'BETTER LATE THAN NEVER',
      'OUT OF THE BLUE'
    ]
  },
  {
    name: 'Food and drink',
    phrases: [
      'BREAD',
      'APPLE',
      'MANGO',
      'LEMON',
      'PASTA',
      'HONEY',
      'ICE CREAM',
      'GREEN TEA',
      'APPLE PIE',
      'HOT COCOA',
      'BREAD AND BUTTER',
      'FISH AND CHIPS',
      'SALT AND PEPPER',
      'SOUP OF THE DAY',
      'A PINCH OF SALT'
    ]
  },
  {
    name: 'Animals',
    phrases: [
      'TIGER',
      'HORSE',
      'ZEBRA',
      'MOUSE',
      'SNAKE',
      'EAGLE',
      'POLAR BEAR',
      'SEA TURTLE',
      'HONEY BEE',
      'BALD EAGLE',
      'PACK OF WOLVES',
      'SCHOOL OF FISH',
      'HERD OF DEER',
      'FLOCK OF WILD GEESE',
      'NEST OF BABY BIRDS'
    ]
  },
  {
    name: 'Places',
    phrases: [
      'BEACH',
      'RIVER',
      'FIELD',
      'MARKET',
      'BRIDGE',
      'CASTLE',
      'TRAIN STATION',
      'CITY HALL',
      'OPEN ROAD',
      'BUS STOP',
      'HEART OF TOWN',
      'EDGE OF TOWN',
      'TOP OF HILL',
      'MIDDLE OF THE ROAD',
      'END OF THE LINE'
    ]
  },
  {
    name: 'Science',
    phrases: [
      'LIGHT',
      'SOUND',
      'ENERGY',
      'PLANET',
      'OXYGEN',
      'COMET',
      'BLACK HOLE',
      'SOLAR FLARE',
      'LASER BEAM',
      'DEEP SPACE',
      'SPEED OF LIGHT',
      'LAW OF MOTION',
      'STATE OF MATTER',
      'CENTER OF THE ATOM',
      'A DROP OF WATER'
    ]
  },
  {
    name: 'Weather and nature',
    phrases: [
      'CLOUD',
      'STORM',
      'OCEAN',
      'FROST',
      'BREEZE',
      'SUNSET',
      'BLUE SKY',
      'HEAVY RAIN',
      'NIGHT SKY',
      'FRESH SNOW',
      'BOLT OF LIGHTNING',
      'END OF SUMMER',
      'CRACK OF DAWN',
      'A RAY OF SUNSHINE',
      'UNDER THE OPEN SKY'
    ]
  },
  {
    name: 'Sports and games',
    phrases: [
      'CHESS',
      'RUGBY',
      'TENNIS',
      'SOCCER',
      'HOCKEY',
      'BOXING',
      'HOME RUN',
      'FREE KICK',
      'BOARD GAME',
      'FAIR PLAY',
      'END OF GAME',
      'LEVEL THE SCORE',
      'WINNER TAKES ALL',
      'MAY THE BEST WIN',
      'BACK OF THE NET'
    ]
  },
  {
    name: 'Home and garden',
    phrases: [
      'TABLE',
      'CHAIR',
      'GARDEN',
      'PILLOW',
      'WINDOW',
      'CANDLE',
      'FRONT DOOR',
      'LIVING ROOM',
      'FLOWER BED',
      'COFFEE CUP',
      'PILE OF LEAVES',
      'HOME SWEET HOME',
      'ROW OF PLANTS',
      'KEYS ON THE TABLE',
      'PLANT IN THE POT'
    ]
  }
];

/* ------------------------------------------------------------------ */
/* Puzzle model                                                        */
/* ------------------------------------------------------------------ */

export interface VowelPuzzle {
  /** the full uppercase answer, e.g. "PUZZLE SHIP" */
  phrase: string;
  category: string;
  /** each character of the phrase, including spaces */
  chars: string[];
  /** indices into `chars` that are vowel slots, left-to-right */
  slots: number[];
  /** the correct vowel for each slot (parallel to `slots`) */
  answer: string[];
}

/** Build a puzzle: locate every vowel position as a fillable slot. */
export function buildPuzzle(phrase: string, category: string): VowelPuzzle {
  const chars = phrase.split('');
  const slots: number[] = [];
  const answer: string[] = [];
  chars.forEach((ch, i) => {
    if (isVowel(ch)) {
      slots.push(i);
      answer.push(ch);
    }
  });
  return { phrase, category, chars, slots, answer };
}

/** Masked template: vowels become underscores. Used for tests/validation. */
export function stripVowels(phrase: string): string {
  return phrase
    .split('')
    .map((ch) => (isVowel(ch) ? '_' : ch))
    .join('');
}

/** Reconstruct a phrase by dropping `fills` into the masked underscores. */
export function restore(masked: string, fills: string[]): string {
  let k = 0;
  return masked
    .split('')
    .map((ch) => (ch === '_' ? fills[k++] ?? '_' : ch))
    .join('');
}

export function wordCount(phrase: string): number {
  return phrase.split(' ').length;
}

/* ------------------------------------------------------------------ */
/* Difficulty                                                          */
/* ------------------------------------------------------------------ */

export interface MvConfig {
  /** phrases to solve in the round to win */
  goal: number;
  /** inclusive [min, max] word count */
  words: [number, number];
  /** min total length (incl. spaces) */
  minLen?: number;
  /** max total length (incl. spaces) */
  maxLen?: number;
  /** per-phrase countdown in seconds (extreme only) */
  perPhraseSec?: number;
  /** on extreme the category is hidden until the assist reveals it */
  hideCategory: boolean;
  /** score multiplier, 1..5 */
  mult: number;
  /** wrong submissions (+ timeouts) allowed before losing; undefined = can't lose */
  mistakeBudget?: number;
}

export const MV_CONFIG: Record<Difficulty, MvConfig> = {
  easy: { goal: 5, words: [1, 1], maxLen: 6, hideCategory: false, mult: 1 },
  medium: { goal: 6, words: [2, 2], hideCategory: false, mult: 2 },
  hard: { goal: 6, words: [2, 3], hideCategory: false, mult: 3 },
  pro: { goal: 7, words: [3, 4], hideCategory: false, mult: 4, mistakeBudget: 6 },
  extreme: {
    goal: 7,
    words: [3, 4],
    minLen: 12,
    perPhraseSec: 25,
    hideCategory: true,
    mult: 5,
    mistakeBudget: 4
  }
};

export interface PhraseRef {
  phrase: string;
  category: string;
}

/** Every bank phrase that fits a difficulty's constraints. */
export function eligiblePhrases(cfg: MvConfig): PhraseRef[] {
  const out: PhraseRef[] = [];
  for (const cat of PHRASE_BANK) {
    for (const phrase of cat.phrases) {
      const wc = wordCount(phrase);
      if (wc < cfg.words[0] || wc > cfg.words[1]) continue;
      const len = phrase.length;
      if (cfg.minLen !== undefined && len < cfg.minLen) continue;
      if (cfg.maxLen !== undefined && len > cfg.maxLen) continue;
      out.push({ phrase, category: cat.name });
    }
  }
  return out;
}

/**
 * Draw `goal` distinct phrases for a round. Deterministic when given an
 * `rng` (used by tests); defaults to Math.random.
 */
export function pickPhrases(difficulty: Difficulty, rng: () => number = Math.random): VowelPuzzle[] {
  const cfg = MV_CONFIG[difficulty];
  const pool = eligiblePhrases(cfg);
  // Fisher–Yates shuffle so the draw is unbiased and distinct.
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, cfg.goal).map((r) => buildPuzzle(r.phrase, r.category));
}

/* ------------------------------------------------------------------ */
/* Validation (run by npm run validate)                                */
/* ------------------------------------------------------------------ */

export interface BankReport {
  ok: boolean;
  errors: string[];
}

const PHRASE_RE = /^[A-Z]+( [A-Z]+)*$/;

/**
 * Integrity check for the phrase bank: charset, word count, presence of
 * vowels to remove (and at least one consonant to anchor them), length
 * bounds, uniqueness, and that every difficulty has a deep enough pool.
 */
export function validateVowelBank(): BankReport {
  const errors: string[] = [];

  if (PHRASE_BANK.length < 8) {
    errors.push(`only ${PHRASE_BANK.length} categories (need >= 8)`);
  }

  const seen = new Set<string>();
  for (const cat of PHRASE_BANK) {
    if (cat.phrases.length < 12) {
      errors.push(`${cat.name}: only ${cat.phrases.length} phrases (need >= 12)`);
    }
    for (const p of cat.phrases) {
      if (!PHRASE_RE.test(p)) {
        errors.push(`${cat.name}: bad charset "${p}"`);
        continue;
      }
      const wc = wordCount(p);
      if (wc < 1 || wc > 4) errors.push(`${cat.name}: word count ${wc} out of 1..4 "${p}"`);
      const chars = [...p];
      if (!chars.some(isVowel)) errors.push(`${cat.name}: no vowels to remove "${p}"`);
      if (!chars.some((c) => c !== ' ' && !isVowel(c))) {
        errors.push(`${cat.name}: no consonant anchor "${p}"`);
      }
      const letters = p.replace(/ /g, '').length;
      if (letters < 3 || letters > 22) errors.push(`${cat.name}: ${letters} letters out of 3..22 "${p}"`);
      if (seen.has(p)) errors.push(`duplicate phrase "${p}"`);
      seen.add(p);
    }
  }

  const diffs: Difficulty[] = ['easy', 'medium', 'hard', 'pro', 'extreme'];
  for (const d of diffs) {
    const cfg = MV_CONFIG[d];
    const n = eligiblePhrases(cfg).length;
    if (n < cfg.goal + 2) {
      errors.push(`${d}: only ${n} eligible phrases (need >= ${cfg.goal + 2})`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Roundtrip check: stripping vowels then filling the known answer back in
 * must reproduce the phrase exactly, and slot positions must line up.
 */
export function validateRoundtrip(): BankReport {
  const errors: string[] = [];
  for (const cat of PHRASE_BANK) {
    for (const p of cat.phrases) {
      const puz = buildPuzzle(p, cat.name);
      // slot positions really point at vowels
      for (let k = 0; k < puz.slots.length; k++) {
        if (puz.chars[puz.slots[k]] !== puz.answer[k]) {
          errors.push(`${cat.name}: slot ${k} misaligned in "${p}"`);
        }
      }
      // masking then restoring the answer rebuilds the original
      const masked = stripVowels(p);
      if (masked.replace(/[^_]/g, '').length !== puz.slots.length) {
        errors.push(`${cat.name}: mask has wrong slot count in "${p}"`);
      }
      if (restore(masked, puz.answer) !== p) {
        errors.push(`${cat.name}: roundtrip mismatch in "${p}"`);
      }
      // a puzzle with no slots would be unplayable (consonant-only excluded)
      if (puz.slots.length === 0) errors.push(`${cat.name}: consonant-only phrase "${p}"`);
    }
  }
  return { ok: errors.length === 0, errors };
}
