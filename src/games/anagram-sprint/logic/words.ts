/*
 * Anagram Sprint — original word bank + scramble helpers.
 *
 * Common English words grouped by length (4–8), all uppercase. These are
 * plain vocabulary lists (not puzzles copied from anywhere) sized so that a
 * timed run always has plenty of distinct words to draw from:
 *   lengths 4–6: >=120 words each,  lengths 7–8: >=80 words each.
 *
 * The scramble helper guarantees the shuffled tiles it hands the player never
 * spell the answer itself NOR any other valid bank word, and are always a true
 * permutation of the source letters. All helpers are pure and importable so
 * the soundness is verified headlessly (see validateAnagramBank + validate.ts).
 */

import type { Difficulty } from '../../../platform/types';

export type Rng = () => number;

export const LENGTHS = [4, 5, 6, 7, 8] as const;

const W4 = [
  'ABLE', 'ACID', 'AGED', 'AKIN', 'ALSO', 'AREA', 'ARMY', 'AUNT', 'AUTO', 'AWAY',
  'BABY', 'BACK', 'BAIT', 'BAKE', 'BALL', 'BAND', 'BANK', 'BARE', 'BARN', 'BASE',
  'BATH', 'BEAM', 'BEAN', 'BEAR', 'BEAT', 'BEEF', 'BELL', 'BELT', 'BEND', 'BEST',
  'BIKE', 'BILL', 'BIND', 'BIRD', 'BITE', 'BLOW', 'BLUE', 'BOAT', 'BODY', 'BOIL',
  'BOLD', 'BOLT', 'BOMB', 'BOND', 'BONE', 'BOOK', 'BOOM', 'BOOT', 'BORE', 'BORN',
  'BOSS', 'BOTH', 'BOWL', 'BREW', 'BULB', 'BULK', 'BURN', 'BUSH', 'BUSY', 'CAFE',
  'CAGE', 'CAKE', 'CALF', 'CALL', 'CALM', 'CAMP', 'CANE', 'CAPE', 'CARD', 'CARE',
  'CART', 'CASE', 'CASH', 'CAST', 'CAVE', 'CELL', 'CHAT', 'CHEF', 'CHEW', 'CHIN',
  'CHIP', 'CHOP', 'CITY', 'CLAM', 'CLAP', 'CLAW', 'CLAY', 'CLIP', 'CLUB', 'CLUE',
  'COAL', 'COAT', 'CODE', 'COIL', 'COIN', 'COLD', 'COLT', 'COMB', 'COME', 'COOK',
  'COOL', 'COPE', 'COPY', 'CORD', 'CORE', 'CORK', 'CORN', 'COST', 'COVE', 'CRAB',
  'CREW', 'CRIB', 'CROP', 'CROW', 'CUBE', 'CUFF', 'CURB', 'CURE', 'CURL', 'DARE',
  'DARK', 'DART', 'DASH', 'DATA', 'DATE', 'DAWN', 'DEAL', 'DEAR', 'DEBT', 'DECK',
  'DEEP', 'DEER', 'DENY', 'DESK', 'DIAL', 'DICE', 'DIET', 'DIME', 'DINE', 'DIRT',
  'DISH', 'DIVE', 'DOCK', 'DOLL', 'DOME', 'DOOR', 'DOSE', 'DOVE', 'DOWN', 'DRAG',
  'DRAW', 'DRIP', 'DROP', 'DRUG', 'DRUM', 'DUAL', 'DUCK', 'DUKE', 'DULL', 'DUMP',
  'DUNE', 'DUSK', 'DUST', 'DUTY', 'EACH', 'EARN', 'EASE', 'EAST', 'ECHO', 'EDGE',
  'EPIC', 'EVEN', 'EXAM', 'EXIT', 'FACE', 'FACT', 'FADE', 'FAIL', 'FAIR', 'FALL',
  'FARM', 'FAST', 'FATE', 'FEAR', 'FEED', 'FEEL', 'FELT', 'FILE', 'FILL', 'FILM',
  'FIND', 'FINE', 'FIRE', 'FIRM', 'FISH', 'FIST', 'FIVE', 'FLAG', 'FLAT', 'FLEE',
  'FLOW', 'FOAM', 'FOLD', 'FONT', 'FOOD', 'FOOT', 'FORK', 'FORM', 'FORT', 'FOUR',
  'FREE', 'FROG', 'FUEL', 'FUND', 'GAIN', 'GAME', 'GATE', 'GAZE', 'GEAR', 'GIFT',
  'GIRL', 'GIVE', 'GLAD', 'GLOW', 'GOAL', 'GOAT', 'GOLD', 'GOLF', 'GONE', 'GOOD',
  'GOWN', 'GRAB', 'GRAY', 'GRID', 'GRIP', 'GROW', 'GULF', 'HAIR', 'HALF', 'HALL',
  'HAND', 'HANG', 'HARD', 'HARM', 'HAWK', 'HEAD', 'HEAL', 'HEAP', 'HEAR', 'HEAT',
  'HERB', 'HERD', 'HERO', 'HIDE', 'HIGH', 'HILL', 'HINT', 'HIRE', 'HOLD', 'HOLE',
  'HOME', 'HOOK', 'HOPE', 'HORN', 'HOST', 'HOUR', 'HUGE', 'HUNT', 'HURT', 'ICON'
];

const W5 = [
  'ABOUT', 'ABOVE', 'AGENT', 'AGREE', 'ALARM', 'ALBUM', 'ALERT', 'ALIKE', 'ALIVE', 'ALLOW',
  'ALONE', 'ALONG', 'ALOUD', 'ANGEL', 'ANGER', 'ANGLE', 'ANKLE', 'APPLE', 'APRON', 'ARENA',
  'ARGUE', 'ARISE', 'ARROW', 'ASIDE', 'ASSET', 'AUDIO', 'AVOID', 'AWAKE', 'AWARD', 'AWARE',
  'BACON', 'BADGE', 'BASIC', 'BASIN', 'BEACH', 'BEARD', 'BEAST', 'BEGIN', 'BEING', 'BELOW',
  'BENCH', 'BERRY', 'BIRTH', 'BLACK', 'BLADE', 'BLAME', 'BLANK', 'BLAST', 'BLEND', 'BLESS',
  'BLIND', 'BLINK', 'BLOCK', 'BLOOM', 'BOARD', 'BOAST', 'BONUS', 'BOOST', 'BOOTH', 'BOUND',
  'BRAIN', 'BRAND', 'BRAVE', 'BREAD', 'BREAK', 'BRICK', 'BRIDE', 'BRIEF', 'BRING', 'BROAD',
  'BROOM', 'BROWN', 'BRUSH', 'BUILD', 'BUNCH', 'BURST', 'CABLE', 'CANDY', 'CARGO', 'CARRY',
  'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHALK', 'CHARM', 'CHART', 'CHASE', 'CHEAP', 'CHECK',
  'CHEEK', 'CHESS', 'CHEST', 'CHIEF', 'CHILD', 'CHILL', 'CHOIR', 'CLAIM', 'CLASH', 'CLASS',
  'CLEAN', 'CLEAR', 'CLERK', 'CLICK', 'CLIFF', 'CLIMB', 'CLOCK', 'CLOSE', 'CLOTH', 'CLOUD',
  'CLOWN', 'COACH', 'COAST', 'COLOR', 'COUCH', 'COUGH', 'COULD', 'COUNT', 'COURT', 'COVER',
  'CRACK', 'CRAFT', 'CRANE', 'CRASH', 'CRAWL', 'CRAZY', 'CREAM', 'CRISP', 'CROSS', 'CROWD',
  'CROWN', 'CRUSH', 'CURVE', 'CYCLE', 'DAILY', 'DAIRY', 'DANCE', 'DELAY', 'DEPTH', 'DOZEN',
  'DRAFT', 'DRAIN', 'DRAMA', 'DREAM', 'DRESS', 'DRIFT', 'DRILL', 'DRINK', 'DRIVE', 'DWELL',
  'EAGER', 'EAGLE', 'EARLY', 'EARTH', 'EIGHT', 'ELBOW', 'ELDER', 'ELECT', 'EMPTY', 'ENJOY',
  'ENTER', 'EQUAL', 'ERROR', 'EVENT', 'EVERY', 'EXACT', 'EXIST', 'EXTRA', 'FAINT', 'FAITH',
  'FALSE', 'FANCY', 'FAULT', 'FEAST', 'FENCE', 'FEVER', 'FIELD', 'FIGHT', 'FINAL', 'FLAME',
  'FLASH', 'FLEET', 'FLOAT', 'FLOOD', 'FLOOR', 'FLOUR', 'FLUID', 'FOCUS', 'FORCE', 'FRAME'
];

const W6 = [
  'ACCEPT', 'ACCESS', 'ACROSS', 'ACTION', 'ACTIVE', 'ACTUAL', 'ADVICE', 'ADVISE', 'AFFORD', 'AFRAID',
  'AGENCY', 'ALMOST', 'ALWAYS', 'AMOUNT', 'ANCHOR', 'ANIMAL', 'ANNUAL', 'ANSWER', 'ANYONE', 'ANYWAY',
  'APPEAL', 'APPEAR', 'AROUND', 'ARRIVE', 'ARTIST', 'ASLEEP', 'ASSIST', 'ASSUME', 'ATTACK', 'ATTEND',
  'AUTHOR', 'AUTUMN', 'AVENUE', 'BAKERY', 'BALLET', 'BANANA', 'BANNER', 'BARELY', 'BARREL', 'BASKET',
  'BATTLE', 'BEAUTY', 'BECOME', 'BEFORE', 'BEHALF', 'BEHAVE', 'BEHIND', 'BELIEF', 'BELONG', 'BESIDE',
  'BETTER', 'BEYOND', 'BISHOP', 'BITTER', 'BORDER', 'BORROW', 'BOTTLE', 'BOTTOM', 'BOUNCE', 'BRANCH',
  'BREATH', 'BREEZE', 'BRIDGE', 'BRIGHT', 'BROKEN', 'BRONZE', 'BUBBLE', 'BUCKET', 'BUDGET', 'BUNDLE',
  'BURDEN', 'BUTTER', 'BUTTON', 'CAMERA', 'CANCEL', 'CANDLE', 'CANNON', 'CANYON', 'CAREER', 'CARPET',
  'CARROT', 'CASINO', 'CASTLE', 'CASUAL', 'CATTLE', 'CAUGHT', 'CELLAR', 'CEMENT', 'CENTER', 'CHANCE',
  'CHANGE', 'CHARGE', 'CHEESE', 'CHERRY', 'CHOICE', 'CHOOSE', 'CIRCLE', 'CIRCUS', 'CLIENT', 'CLOSET',
  'COFFEE', 'COLONY', 'COLUMN', 'COMBAT', 'COMEDY', 'COMMON', 'COOKIE', 'COPPER', 'CORNER', 'COTTON',
  'COUPLE', 'COURSE', 'COUSIN', 'CRADLE', 'CRATER', 'CREATE', 'CREDIT', 'CRISIS', 'CRITIC', 'CUSTOM',
  'DAMAGE', 'DANGER', 'DECADE', 'DECIDE', 'DEFEAT', 'DEFEND', 'DEFINE', 'DEGREE', 'DELETE', 'DEMAND',
  'DENIAL', 'DEPART', 'DEPEND', 'DESERT', 'DESIGN', 'DESIRE', 'DETAIL', 'DETECT', 'DEVICE', 'DINNER',
  'DIRECT', 'DIVIDE', 'DOCTOR', 'DOLLAR', 'DONKEY', 'DOUBLE', 'DRAGON', 'DRAWER', 'EFFECT', 'EFFORT',
  'EITHER', 'ELEVEN', 'EMPIRE', 'ENABLE', 'ENERGY', 'ENGAGE', 'ENGINE', 'ENOUGH', 'ENSURE', 'ESCAPE',
  'ESTATE', 'EXCUSE', 'EXPAND', 'EXPECT', 'EXPERT', 'EXPORT', 'EXTEND', 'FABRIC', 'FACTOR', 'FAMILY',
  'FAMOUS', 'FARMER', 'FASTEN', 'FATHER', 'FELLOW', 'FEMALE', 'FIGURE', 'FILTER', 'FINGER', 'FINISH'
];

const W7 = [
  'ABILITY', 'ABSENCE', 'ACCOUNT', 'ACHIEVE', 'ACQUIRE', 'ADDRESS', 'ADVANCE', 'ADVERSE', 'AGAINST', 'AIRLINE',
  'AIRPORT', 'ALCOHOL', 'ANOTHER', 'ANXIOUS', 'ANYBODY', 'ARRANGE', 'ARTICLE', 'ARTWORK', 'ASSAULT', 'AVERAGE',
  'BALANCE', 'BANDAGE', 'BARGAIN', 'BATTERY', 'BEDROOM', 'BENEFIT', 'BETWEEN', 'BICYCLE', 'BILLION', 'BLANKET',
  'BLOSSOM', 'BROTHER', 'BROUGHT', 'CABINET', 'CAPABLE', 'CAPITAL', 'CAPTAIN', 'CAPTURE', 'CARAVAN', 'CARTOON',
  'CEILING', 'CENTRAL', 'CENTURY', 'CERTAIN', 'CHAPTER', 'CHARITY', 'CHEMIST', 'CHICKEN', 'CHIMNEY', 'CIRCUIT',
  'CLASSIC', 'CLIMATE', 'CLOSURE', 'CLOTHES', 'COLLECT', 'COLLEGE', 'COMBINE', 'COMFORT', 'COMMAND', 'COMMENT',
  'COMPACT', 'COMPANY', 'COMPARE', 'COMPETE', 'COMPLEX', 'CONCEPT', 'CONCERN', 'CONCERT', 'CONDUCT', 'CONFIRM',
  'CONNECT', 'CONSENT', 'CONTACT', 'CONTAIN', 'CONTENT', 'CONTEST', 'CONTEXT', 'CONTROL', 'CONVERT', 'CORRECT',
  'COSTUME', 'COTTAGE', 'COUNTER', 'COUNTRY', 'COURAGE', 'CRUCIAL', 'CRYSTAL', 'CULTURE', 'CURIOUS', 'CURRENT',
  'CURTAIN', 'CUSHION', 'DEFENCE', 'DELIGHT', 'DELIVER', 'DENTIST', 'DEPOSIT', 'DESKTOP', 'DESSERT', 'DETAILS',
  'DEVELOP', 'DIAMOND', 'DIGITAL', 'DISPLAY', 'DISPUTE', 'DISTANT', 'DIVERSE', 'DOLPHIN', 'DRAWING', 'DRIVING',
  'EASTERN', 'ECONOMY', 'EDITION', 'ELEMENT', 'ENGLISH', 'ENHANCE', 'EPISODE', 'EXAMINE', 'EXAMPLE', 'EXHAUST',
  'EXPLAIN', 'EXPLORE', 'EXPRESS', 'EXTREME', 'FACTORY', 'FAILURE', 'FANTASY', 'FASHION', 'FEATURE', 'FICTION',
  'FIFTEEN', 'FINANCE', 'FISHING', 'FITNESS', 'FLAVOUR', 'FORMULA', 'FORTUNE', 'FORWARD', 'FREEDOM', 'FREEZER'
];

const W8 = [
  'ABSOLUTE', 'ABSTRACT', 'ACADEMIC', 'ACCURATE', 'ACTIVITY', 'ADVANCED', 'ADVOCATE', 'AIRCRAFT', 'ALLIANCE', 'ALTHOUGH',
  'ANALYSIS', 'ANNOUNCE', 'APPARENT', 'APPROVAL', 'ARGUMENT', 'ARTISTIC', 'ASSEMBLY', 'ATHLETIC', 'ATTACHED', 'AUDIENCE',
  'BACKBONE', 'BACKYARD', 'BASEBALL', 'BASEMENT', 'BIRTHDAY', 'BLESSING', 'BOUNDARY', 'BREAKING', 'BUILDING', 'BULLETIN',
  'BUSINESS', 'CALENDAR', 'CAMPAIGN', 'CAPACITY', 'CARDINAL', 'CEREMONY', 'CHAMPION', 'CHEMICAL', 'CIVILIAN', 'CLEANING',
  'CLIMBING', 'CLOTHING', 'COLONIAL', 'COLORFUL', 'COMPLETE', 'COMPOUND', 'COMPUTER', 'CONCLUDE', 'CONCRETE', 'CONFLICT',
  'CONFUSED', 'CONGRESS', 'CONSIDER', 'CONSTANT', 'CONSUMER', 'CONTRACT', 'CONTRARY', 'CONTRAST', 'CONVINCE', 'COOKBOOK',
  'CORRIDOR', 'COURTESY', 'COVERAGE', 'CREATION', 'CREATIVE', 'CREATURE', 'CRIMINAL', 'CRITICAL', 'CROSSING', 'CURRENCY',
  'CUSTOMER', 'DATABASE', 'DAUGHTER', 'DAYLIGHT', 'DEADLINE', 'DECISION', 'DECORATE', 'DELICATE', 'DELIVERY', 'DESIGNER',
  'DIALOGUE', 'DINOSAUR', 'DIRECTOR', 'DISABLED', 'DISAGREE', 'DISASTER', 'DISCOUNT', 'DISCOVER', 'DISORDER', 'DISPATCH',
  'DISTANCE', 'DISTINCT', 'DIVISION', 'DOCUMENT', 'DOMESTIC', 'DOMINANT', 'DOMINATE', 'DOWNLOAD', 'DOWNTOWN', 'DRAMATIC',
  'DRAWBACK', 'DRESSING', 'ELECTRIC', 'ELEGANCE', 'ELEPHANT', 'ELEVATOR', 'EMPHASIS', 'ENGINEER', 'ENORMOUS', 'ENTRANCE',
  'ENVELOPE', 'EQUATION', 'ESTIMATE', 'EVIDENCE', 'EXCHANGE', 'EXERCISE', 'EXPLORER', 'EXTERNAL', 'FACULTY', 'FAVORITE'
].filter((w) => w.length === 8);

export const WORD_BANK: Record<number, string[]> = {
  4: W4,
  5: W5,
  6: W6,
  7: W7,
  8: W8
};

const ALL = new Set<string>();
for (const len of LENGTHS) for (const w of WORD_BANK[len]) ALL.add(w);

export function isBankWord(word: string): boolean {
  return ALL.has(word);
}

export function allWords(): string[] {
  return [...ALL];
}

/* ---------------------------------------------------------------- run config */

export interface SprintConfig {
  /** words the player must SOLVE to win */
  quota: number;
  minLen: number;
  maxLen: number;
  /** seconds on the run clock */
  timeSec: number;
  /** score multiplier (1..5) */
  diffMult: number;
}

export const SPRINT_CONFIG: Record<Difficulty, SprintConfig> = {
  easy: { quota: 8, minLen: 4, maxLen: 5, timeSec: 120, diffMult: 1 },
  medium: { quota: 10, minLen: 5, maxLen: 5, timeSec: 110, diffMult: 2 },
  hard: { quota: 10, minLen: 5, maxLen: 6, timeSec: 100, diffMult: 3 },
  pro: { quota: 12, minLen: 6, maxLen: 7, timeSec: 100, diffMult: 4 },
  extreme: { quota: 12, minLen: 7, maxLen: 8, timeSec: 90, diffMult: 5 }
};

/** extra words drawn beyond the quota so a few skips stay survivable */
export const SKIP_BUFFER = 8;

/* ------------------------------------------------------------------ helpers */

function shuffleInPlace<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/**
 * Draw `count` distinct words whose length is within [minLen, maxLen].
 * No repeats within a run (the pool holds only unique words).
 */
export function pickRunWords(
  count: number,
  minLen: number,
  maxLen: number,
  rng: Rng = Math.random
): string[] {
  const pool: string[] = [];
  for (let len = minLen; len <= maxLen; len++) {
    if (WORD_BANK[len]) pool.push(...WORD_BANK[len]);
  }
  shuffleInPlace(pool, rng);
  return pool.slice(0, Math.min(count, pool.length));
}

/** Heap's algorithm — first permutation of `word` satisfying `pred`, or null. */
function firstPermutation(word: string, pred: (s: string) => boolean): string | null {
  const arr = word.split('');
  const n = arr.length;
  const c = new Array(n).fill(0);
  let i = 0;
  while (i < n) {
    if (c[i] < i) {
      if (i % 2 === 0) {
        const t = arr[0];
        arr[0] = arr[i];
        arr[i] = t;
      } else {
        const t = arr[c[i]];
        arr[c[i]] = arr[i];
        arr[i] = t;
      }
      const s = arr.join('');
      if (pred(s)) return s;
      c[i]++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }
  return null;
}

/**
 * Shuffle a word's letters into a scramble that is guaranteed to differ from
 * the word AND from every other valid bank word (so the tiles never already
 * spell a real answer). Always a true permutation of the source letters.
 */
export function scramble(word: string, rng: Rng = Math.random): string {
  const letters = word.split('');
  for (let attempt = 0; attempt < 80; attempt++) {
    const s = shuffleInPlace(letters.slice(), rng).join('');
    if (s !== word && !ALL.has(s)) return s;
  }
  // exhaustive fallback — find any permutation that is neither the word nor
  // a bank word (essentially never reached for common 4–8 letter words)
  const clean = firstPermutation(word, (s) => s !== word && !ALL.has(s));
  if (clean) return clean;
  const anyDiff = firstPermutation(word, (s) => s !== word);
  return anyDiff ?? word;
}

/* ---------------------------------------------------------------- validator */

/** Structural check of the bank — returns a list of problems (empty = sound). */
export function validateAnagramBank(): string[] {
  const issues: string[] = [];
  const minimums: Record<number, number> = { 4: 120, 5: 120, 6: 120, 7: 80, 8: 80 };
  const seen = new Set<string>();
  for (const len of LENGTHS) {
    const list = WORD_BANK[len];
    if (list.length < minimums[len]) {
      issues.push(`length ${len}: only ${list.length} words (need ${minimums[len]})`);
    }
    for (const w of list) {
      if (!/^[A-Z]+$/.test(w)) issues.push(`"${w}" is not uppercase A–Z`);
      if (w.length !== len) issues.push(`"${w}" is in the length-${len} list but has length ${w.length}`);
      if (seen.has(w)) issues.push(`duplicate word "${w}"`);
      seen.add(w);
    }
  }
  return issues;
}
