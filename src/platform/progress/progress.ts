import type { CategoryId, Difficulty, GameResult } from '../types';
import { DIFFICULTIES } from '../types';
import { GAMES } from '../registry';
import { activeCategories, CATEGORIES } from '../categories';
import { eligibleGames } from '../daily/rotation';
import { loadHistory, readGameData, writeGameData } from '../storage';
import {
  levelFromXp,
  RANK_TIERS,
  XP_AWARDS,
  type RankId,
  type XpAward,
  type XpEntry,
  type XpSource
} from './xp';

/**
 * Player progress — the streak + landmark (trophy) database, kept in its own
 * store (`100games.v1.progress` via the sanctioned readGameData/writeGameData
 * helpers, so resetAll sweeps it). It is deliberately separate from history:
 * history is a capped log (last 1000 plays), while progress is PERMANENT —
 * days played, games ever played, difficulties ever beaten and unlocked
 * landmarks survive the history cap and "Clear history".
 *
 * All updates funnel through recordProgress() (called by AppState's
 * recordResult, the single sink every finished/abandoned session reaches).
 * A missing or stale-shaped store is reseeded from history, so existing
 * players get retroactive credit on first load.
 */

const PROGRESS_KEY = 'progress';

export interface LandmarkUnlock {
  /** epoch ms of the moment the landmark was earned */
  at: number;
}

/** best time (seconds, lower wins) and best score (higher wins) for one tier */
export interface PersonalBest {
  time: number;
  score: number;
}

export interface PlayerProgress {
  /** local calendar days ('YYYY-MM-DD') with at least one recorded play */
  days: string[];
  /** game ids ever played (any outcome, including abandoned) */
  played: string[];
  /** gameId -> difficulties CLEANLY beaten (see countsAsBeaten) */
  wins: Record<string, Difficulty[]>;
  /** landmarkId -> unlock info; never removed once earned */
  landmarks: Record<string, LandmarkUnlock>;
  /** total XP ever earned — drives the player level (see ./xp.ts) */
  xp: number;
  /**
   * Lifetime counters for the volume ladders. They live HERE, not in
   * history, for the same reason records do: history is capped at 1000 rows
   * and clearable, so counting from it would make a 500-game trophy
   * un-earnable and re-fire the ones already earned.
   *
   * `plays` counts FINISHED sessions (won or lost) — an abandon is not a
   * game played, exactly as it earns no play XP: quitting from the game
   * screen takes two seconds, and a trophy anyone can hold down a button
   * for is worth nothing.
   */
  plays: number;
  /** lifetime clean wins — every result countsAsBeaten() accepts */
  cleanWins: number;
  /**
   * Daily Challenge projections. The daily store owns the records and the
   * live streak; these are the two facts the TROPHIES need, kept here so
   * landmark evaluation stays a pure function of PlayerProgress. The daily
   * completion path is the single writer for both.
   *
   * `dailyBest` is the best streak ever, not the current one: a permanent
   * store must not hold a number that silently decays with the calendar.
   */
  dailyBest: number;
  /** game ids ever completed as a Daily Challenge */
  dailyGames: string[];
  /**
   * gameId -> difficulty -> personal best. Lives HERE rather than being
   * read from history because the XP award for beating your own record must
   * not re-fire after the 1000-entry cap drops the old run, or after
   * "Clear history" — progress is the permanent side of the store.
   */
  records: Record<string, Partial<Record<Difficulty, PersonalBest>>>;
  /**
   * FEATS — one-off moments the trophies remember (see FEATS below).
   *
   * A feat is a MOMENT, not a standing fact. "Played every game" can be
   * re-derived from the store at any time; "won the game right after losing
   * one" cannot — it is only ever true for an instant. Stamping the moment
   * here is what keeps landmark evaluation a pure function of
   * PlayerProgress, which is what lets loadProgress re-evaluate the whole
   * catalogue on every start without a play.
   */
  feats: string[];
  /**
   * gameId -> FINISHED sessions of that game. The play counts are what make
   * "popularity" mean something on a device with no server: your own
   * library, ranked by how much you actually play it (see isDeepCut).
   */
  playCounts: Record<string, number>;
  /** clean wins in a row right now — broken by any finished non-clean game */
  cleanStreak: number;
  /** the longest clean-win run ever; what the ladder UNLOCKS from */
  cleanStreakBest: number;
  /**
   * The outcome of the last FINISHED session, for the comeback feats.
   * Abandons deliberately do not write it: quitting is not "the previous
   * game", and it must not be usable to wipe a loss off the record.
   */
  lastOutcome?: 'won' | 'lost';
  /** `gameId:difficulty` -> failed attempts in a row; cleared by a win */
  fails: Record<string, number>;
  /**
   * The categories played TODAY, for Genre Hopper. Only the current day is
   * kept — a permanent store must not grow a row per calendar day, and
   * yesterday's hop is already recorded as the feat it earned.
   */
  today?: { day: string; cats: CategoryId[] };
}

/* ---------- feats ---------- */

/**
 * The one-off moments trophies are keyed to. Ids are stable strings: they
 * are written into the permanent store (and into backup files), so renaming
 * one would silently un-earn a trophy.
 */
export const FEATS = {
  deepCut: 'deep-cut',
  nightOwl: 'night-owl',
  earlyBird: 'early-bird',
  bounceBack: 'bounce-back',
  thirdTime: 'third-time',
  genreHopper: 'genre-hopper',
  underMinute: 'under-60',
  halfMinute: 'under-30',
  flawless: 'flawless',
  sharedWin: 'shared-win',
  sharedApp: 'share-app',
  backupOut: 'backup-export',
  backupIn: 'backup-import'
} as const;

export type FeatId = string;

/** the feat id (and landmark id) of one game's easter egg */
export function eggFeat(gameId: string, eggId: string): string {
  return `egg-${gameId}-${eggId}`;
}

/** you have to own a library before "the one you never play" means anything */
const DEEP_CUT_MIN_GAMES = 10;
/** the bottom decile of the library, by your own play counts */
const DEEP_CUT_SHARE = 0.1;
/** a clean win this fast, in seconds, earns each speed trophy */
const SPEED_TIERS: { seconds: number; feat: string; title: string; slot: number }[] = [
  { seconds: 60, feat: FEATS.underMinute, title: 'Under a Minute', slot: 7 },
  { seconds: 30, feat: FEATS.halfMinute, title: 'Half a Minute', slot: 5 }
];

/* ---------- day math (local-time calendar days, DST-safe) ---------- */

function keyOf(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function dayKey(ts: number): string {
  return keyOf(new Date(ts));
}

function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/* ---------- streak ---------- */

export interface StreakInfo {
  /** consecutive days ending today, or ending yesterday when today is
      still unplayed (the streak is alive but not yet extended) */
  current: number;
  /** longest run ever */
  best: number;
  playedToday: boolean;
  totalDays: number;
  /** Monday-first current week for the Duolingo-style week row */
  week: { label: string; played: boolean; isToday: boolean }[];
}

const WEEK_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function computeStreak(days: string[], now: Date = new Date()): StreakInfo {
  const set = new Set(days);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const playedToday = set.has(keyOf(today));

  let cursor = playedToday ? today : addDays(today, -1);
  let current = 0;
  while (set.has(keyOf(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of [...set].sort()) {
    const d = parseDay(key);
    run = prev && Math.round((d.getTime() - prev.getTime()) / 86400000) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }

  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const week = WEEK_LABELS.map((label, i) => {
    const d = addDays(monday, i);
    return { label, played: set.has(keyOf(d)), isToday: d.getTime() === today.getTime() };
  });

  return { current, best, playedToday, totalDays: set.size, week };
}

/* ---------- landmark catalogue ---------- */

export type LandmarkKind =
  | 'first'
  | 'streak'
  | 'plays'
  | 'clean-wins'
  | 'clean-streak'
  | 'level'
  | 'daily-first'
  | 'daily-streak'
  | 'daily-collector'
  | 'all-played'
  | 'difficulty'
  | 'category'
  | 'renaissance'
  | 'full-house'
  | 'flawless'
  | 'speed'
  | 'time-of-day'
  | 'comeback'
  | 'genre-hopper'
  | 'deep-cut'
  | 'share'
  | 'backup'
  | 'egg';

export interface LandmarkDef {
  id: string;
  title: string;
  /** the requirement line shown on the card ("Keep a 7-day play streak") */
  requirement: string;
  kind: LandmarkKind;
  /** content-palette slot (--play-N) — the card's identity color */
  slot: number;
  /** celebratory emoji for the shareable card (content, not UI chrome) */
  emoji: string;
  days?: number;
  /** target for the volume ladders (plays / clean wins) */
  count?: number;
  /** target level, and the crown it earns, for the level ladder */
  level?: number;
  rank?: RankId;
  difficulty?: Difficulty;
  category?: CategoryId;
  /**
   * The feat that unlocks this landmark (see FEATS). A landmark with a feat
   * is unlocked by the MOMENT, never by the meter — which is what lets its
   * meter show something live and actionable ("5/8 categories today")
   * without ever taking the trophy back when the day rolls over.
   */
  feat?: string;
  /** speed tiers: the clean-win time to beat, in seconds */
  seconds?: number;
  /** time-of-day tiers: which end of the small hours this one is */
  moment?: 'night' | 'dawn';
  /**
   * Hidden until found: no title, no requirement, mystery art, and its own
   * section in the gallery. Everything else about it is an ordinary
   * landmark — it unlocks, pays XP and shares the same way.
   */
  secret?: boolean;
  /** eggs only: the game that declared it, for the detail card */
  gameId?: string;
}

/** streak tiers — bimester/trimester/quadrimester/semester follow the
    2/3/4/6-month school-calendar ladder */
const STREAK_TIERS: { days: number; title: string; slot: number }[] = [
  { days: 7, title: 'One Week', slot: 3 },
  { days: 14, title: 'Two Weeks', slot: 7 },
  { days: 21, title: 'Three Weeks', slot: 2 },
  { days: 30, title: 'One Month', slot: 8 },
  { days: 60, title: 'Bimester', slot: 15 },
  { days: 90, title: 'Trimester', slot: 5 },
  { days: 120, title: 'Quadrimester', slot: 10 },
  { days: 180, title: 'Semester', slot: 4 },
  { days: 365, title: 'One Year', slot: 6 }
];

/** volume ladders — same 50/100/200/500/1000 rungs for both, so the two
    read as one scale (one counts everything you finish, one only the wins
    you took unaided) */
const PLAY_TIERS: { count: number; title: string; slot: number }[] = [
  { count: 50, title: 'Warmed Up', slot: 4 },
  { count: 100, title: 'Century', slot: 6 },
  { count: 200, title: 'Devoted', slot: 11 },
  { count: 500, title: 'Marathon', slot: 10 },
  { count: 1000, title: 'Thousand Club', slot: 15 }
];

const CLEAN_TIERS: { count: number; title: string; slot: number }[] = [
  { count: 50, title: 'Fair Play', slot: 1 },
  { count: 100, title: 'Purist', slot: 13 },
  { count: 200, title: 'Self-Made', slot: 16 },
  { count: 500, title: 'Untouchable', slot: 3 },
  { count: 1000, title: 'Flawless Thousand', slot: 8 }
];

/** clean wins in a row, across ANY games — the run ends the moment a
    finished game is not a clean win (a helped win breaks it exactly as a
    loss does; an abandon is not a finished game and leaves it alone) */
const CLEAN_STREAK_TIERS: { count: number; title: string; slot: number }[] = [
  { count: 10, title: 'On a Roll', slot: 7 },
  { count: 25, title: 'In the Zone', slot: 2 },
  { count: 50, title: 'Unbroken', slot: 5 },
  { count: 75, title: 'Relentless', slot: 12 },
  { count: 100, title: 'Perfect Hundred', slot: 6 }
];

/** the Daily Challenge streak ladder — deliberately shorter rungs than the
    play streak: one specific board a day is a much harder ask than playing
    anything at all, so 100 days here is worth more than 100 there */
const DAILY_TIERS: { days: number; title: string; slot: number }[] = [
  { days: 7, title: 'Daily Habit', slot: 7 },
  { days: 30, title: 'Daily Devotee', slot: 8 },
  { days: 100, title: 'Daily Centurion', slot: 5 },
  { days: 365, title: 'Daily Year', slot: 6 }
];

/** the plate tint behind each rank crown, matched to its material (the
    crown itself is painted with the fixed --rank-* tokens) */
const RANK_SLOT: Record<RankId, number> = {
  wood: 12,
  iron: 14,
  silver: 6,
  gold: 3,
  platinum: 11,
  challenger: 5
};

const DIFFICULTY_TIERS: Record<Difficulty, { slot: number; emoji: string }> = {
  easy: { slot: 1, emoji: '🥉' },
  medium: { slot: 3, emoji: '🥈' },
  hard: { slot: 7, emoji: '🥇' },
  pro: { slot: 2, emoji: '🏆' },
  extreme: { slot: 5, emoji: '👑' }
};

const CATEGORY_EMOJI: Record<CategoryId, string> = {
  logic: '🧠',
  words: '📚',
  memory: '🐘',
  focus: '🎯',
  numbers: '🔢',
  spatial: '🧭',
  strategy: '♟️',
  reflex: '⚡'
};

/** Display order: first game, streak ladder, collection, difficulty
    sweeps, category masteries. Only categories that actually contain
    games get a landmark (an empty category would unlock vacuously). */
export const LANDMARKS: LandmarkDef[] = [
  {
    id: 'first-game',
    title: 'First Steps',
    requirement: 'Play your first game',
    kind: 'first',
    slot: 3,
    emoji: '🌟'
  },
  ...STREAK_TIERS.map(
    (t): LandmarkDef => ({
      id: `streak-${t.days}`,
      title: t.title,
      requirement: `Keep a ${t.days}-day play streak`,
      kind: 'streak',
      days: t.days,
      slot: t.slot,
      emoji: '🔥'
    })
  ),
  ...PLAY_TIERS.map(
    (t): LandmarkDef => ({
      id: `plays-${t.count}`,
      title: t.title,
      // "finish", not "play": an abandoned session does not count (see
      // PlayerProgress.plays), and the requirement line must not promise
      // something the meter will refuse to credit
      requirement: `Finish ${t.count} games`,
      kind: 'plays',
      count: t.count,
      slot: t.slot,
      emoji: '🎮'
    })
  ),
  ...CLEAN_TIERS.map(
    (t): LandmarkDef => ({
      id: `clean-${t.count}`,
      title: t.title,
      requirement: `Win ${t.count} games with no help`,
      kind: 'clean-wins',
      count: t.count,
      slot: t.slot,
      emoji: '✨'
    })
  ),
  ...CLEAN_STREAK_TIERS.map(
    (t): LandmarkDef => ({
      id: `clean-streak-${t.count}`,
      title: t.title,
      requirement: `Win ${t.count} games in a row with no help`,
      kind: 'clean-streak',
      count: t.count,
      slot: t.slot,
      emoji: '🎯'
    })
  ),
  /* One-off feats: moments rather than totals. Each is stamped when it
     happens (see applyFeats) and unlocked from that stamp, never
     recomputed — "won right after losing" is only true for an instant. */
  {
    id: 'flawless',
    title: 'Spotless',
    requirement: 'Win a game with no mistakes and no help',
    kind: 'flawless',
    feat: FEATS.flawless,
    slot: 11,
    emoji: '💎'
  },
  ...SPEED_TIERS.map(
    (t): LandmarkDef => ({
      id: `speed-${t.seconds}`,
      title: t.title,
      requirement: `Win a game with no help in under ${t.seconds} seconds`,
      kind: 'speed',
      feat: t.feat,
      seconds: t.seconds,
      slot: t.slot,
      emoji: '⏱️'
    })
  ),
  {
    id: 'bounce-back',
    title: 'Bounce Back',
    requirement: 'Win the very next game after a loss',
    kind: 'comeback',
    feat: FEATS.bounceBack,
    count: 1,
    slot: 4,
    emoji: '🔄'
  },
  {
    id: 'third-time',
    title: "Third Time's the Charm",
    requirement: 'Win a game and difficulty you had already failed twice',
    kind: 'comeback',
    feat: FEATS.thirdTime,
    count: 2,
    slot: 3,
    emoji: '🍀'
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    requirement: 'Finish a game between midnight and 4am',
    kind: 'time-of-day',
    feat: FEATS.nightOwl,
    moment: 'night',
    slot: 13,
    emoji: '🦉'
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    requirement: 'Finish a game between 4am and 6am',
    kind: 'time-of-day',
    feat: FEATS.earlyBird,
    moment: 'dawn',
    slot: 6,
    emoji: '🐦'
  },
  {
    id: 'genre-hopper',
    title: 'Genre Hopper',
    requirement: 'Play a game from every category in one day',
    kind: 'genre-hopper',
    feat: FEATS.genreHopper,
    slot: 15,
    emoji: '🎪'
  },
  {
    id: 'deep-cut',
    title: 'Deep Cut',
    requirement: `Finish a game from the bottom 10% of your play counts, once you have played ${DEEP_CUT_MIN_GAMES} different games`,
    kind: 'deep-cut',
    feat: FEATS.deepCut,
    count: DEEP_CUT_MIN_GAMES,
    slot: 10,
    emoji: '💿'
  },
  {
    id: 'show-off',
    title: 'Show Off',
    requirement: 'Make your first shareable win card',
    kind: 'share',
    feat: FEATS.sharedWin,
    slot: 2,
    emoji: '📣'
  },
  {
    id: 'share-app',
    title: 'Spread the Word',
    requirement: "Share the app's link with a friend (Settings → Share the app)",
    kind: 'share',
    feat: FEATS.sharedApp,
    slot: 5,
    emoji: '💌'
  },
  {
    id: 'backup-export',
    title: 'Backup Plan',
    requirement: 'Export a backup of your data',
    kind: 'backup',
    feat: FEATS.backupOut,
    slot: 1,
    emoji: '📤'
  },
  {
    id: 'backup-import',
    title: 'Home Sweet Home',
    requirement: 'Import a backup of your data',
    kind: 'backup',
    feat: FEATS.backupIn,
    slot: 8,
    emoji: '📥'
  },
  /* The Daily Challenge trophies exist only while something is actually in
     the rotation — the same rule that gives an empty category no mastery
     landmark. With nothing eligible the feature is off, its card renders
     nothing, and a gallery of trophies with a 0/0 meter would be five
     promises the app cannot keep. Derived from the registry, never a
     hardcoded "the daily exists" flag. */
  ...(eligibleGames().length > 0
    ? [
        /* the family's front door: any completion at all. Late completions
           count too — `dailyGames` records the game of EVERY completed
           daily, streak or no streak, so the door never depends on the
           calendar being kind. */
        {
          id: 'daily-first',
          title: 'Daily Debut',
          requirement: 'Complete your first Daily Challenge',
          kind: 'daily-first',
          slot: 4,
          emoji: '🌅'
        } as LandmarkDef,
        ...DAILY_TIERS.map(
          (t): LandmarkDef => ({
            id: `daily-streak-${t.days}`,
            title: t.title,
            requirement: `Complete ${t.days} Daily Challenges in a row`,
            kind: 'daily-streak',
            days: t.days,
            slot: t.slot,
            emoji: '📅'
          })
        ),
        {
          id: 'daily-collector',
          title: 'Every Daily',
          requirement: 'Complete a Daily Challenge of every game in the rotation',
          kind: 'daily-collector',
          slot: 11,
          emoji: '🗓️'
        } as LandmarkDef
      ]
    : []),
  ...RANK_TIERS.map(
    (t): LandmarkDef => ({
      id: `level-${t.level}`,
      title: `${t.name} Crown`,
      requirement: `Reach level ${t.level}`,
      kind: 'level',
      level: t.level,
      rank: t.id,
      slot: RANK_SLOT[t.id],
      emoji: '👑'
    })
  ),
  {
    id: 'all-played',
    title: 'Collector',
    requirement: 'Play every game in the app',
    kind: 'all-played',
    slot: 6,
    emoji: '🧩'
  },
  /* The five Grand Slams: the whole library beaten, unaided, on one tier.
     Ids stay `all-<difficulty>` — they are stamped into every player's
     store, and an id is a promise, not a label. */
  ...DIFFICULTIES.map(
    (d): LandmarkDef => ({
      id: `all-${d}`,
      title: `${d[0].toUpperCase()}${d.slice(1)} Grand Slam`,
      requirement: `Beat every game on ${d} with no help`,
      kind: 'difficulty',
      difficulty: d,
      slot: DIFFICULTY_TIERS[d].slot,
      emoji: DIFFICULTY_TIERS[d].emoji
    })
  ),
  ...CATEGORIES.filter((c) => GAMES.some((g) => g.category === c.id)).map(
    (c): LandmarkDef => ({
      id: `master-${c.id}`,
      title: `${c.name} Master`,
      requirement: `Beat every ${c.name} game with no help`,
      kind: 'category',
      category: c.id,
      slot: c.slot,
      emoji: CATEGORY_EMOJI[c.id]
    })
  ),
  /* The two cross-category trophies. Both derive from the live registry
     like everything else here: Renaissance grows a rung whenever a new
     category gets its first game, Full House re-measures the categories
     themselves. Only listed while some category actually has games — the
     same rule that gives an empty category no mastery. */
  ...(activeCategories().length > 0
    ? [
        {
          id: 'renaissance',
          title: 'Renaissance',
          requirement: 'Win a game with no help in every category',
          kind: 'renaissance',
          slot: 16,
          emoji: '🎨'
        } as LandmarkDef,
        {
          id: 'full-house',
          title: 'Full House',
          requirement: 'Beat every game in one category on all five difficulties',
          kind: 'full-house',
          slot: 14,
          emoji: '🏠'
        } as LandmarkDef
      ]
    : []),
  /* Easter eggs last, and hidden: the gallery gives them their own section
     (see Landmarks.tsx). Declared by the games themselves — the catalogue
     spreads whatever the registry holds, exactly as it does for categories,
     so the platform never learns a game id. */
  ...GAMES.flatMap((g) =>
    (g.easterEggs ?? []).map(
      (e): LandmarkDef => ({
        id: eggFeat(g.id, e.id),
        title: e.title,
        requirement: e.requirement,
        kind: 'egg',
        feat: eggFeat(g.id, e.id),
        gameId: g.id,
        secret: true,
        slot: e.slot,
        emoji: e.emoji
      })
    )
  )
];

export function getLandmark(id: string): LandmarkDef | undefined {
  return LANDMARKS.find((d) => d.id === id);
}

/* ---------- per-game completion (the three "beaten" UI surfaces) ---------- */

/** difficulties this game has been cleanly beaten at, in tier order */
export function beatenDifficulties(p: PlayerProgress, gameId: string): Difficulty[] {
  const won = p.wins[gameId] ?? [];
  return DIFFICULTIES.filter((d) => won.includes(d));
}

/** true when the game has been cleanly beaten on every tier, easy → extreme */
export function allDifficultiesBeaten(p: PlayerProgress, gameId: string): boolean {
  return beatenDifficulties(p, gameId).length === DIFFICULTIES.length;
}

/* ---------- evaluation ---------- */

/** progress toward a landmark, for meters ("41/67"). Streak meters show the
    CURRENT streak (what the player can still act on), while unlocking uses
    the best streak ever, so a past run keeps its trophy. */
export function landmarkMeter(
  def: LandmarkDef,
  p: PlayerProgress,
  streak: StreakInfo,
  /** the daily streak still alive today. Same role `streak.current` plays
      for the play-streak meters: it is what the player can act on. The
      progress store deliberately keeps only `dailyBest` (a permanent store
      must not hold a number that decays with the calendar), and it cannot
      read the daily store itself — daily/store.ts imports THIS module, so
      the arrow must not be turned around. Omitted, the meter falls back to
      the best run, which is what unlocking uses. */
  dailyCurrent?: number
): { done: number; total: number } {
  switch (def.kind) {
    case 'first':
      return { done: Math.min(p.played.length, 1), total: 1 };
    case 'streak':
      return { done: Math.min(streak.current, def.days!), total: def.days! };
    case 'plays':
      return { done: Math.min(p.plays, def.count!), total: def.count! };
    case 'clean-wins':
      return { done: Math.min(p.cleanWins, def.count!), total: def.count! };
    case 'clean-streak':
      // the LIVE run, like every other streak meter: it is what the player
      // can still act on. Unlocking uses the best run ever (see `achieved`),
      // so a broken streak never costs a trophy already earned.
      return { done: Math.min(p.cleanStreak, def.count!), total: def.count! };
    case 'level':
      return { done: Math.min(levelFromXp(p.xp), def.level!), total: def.level! };
    case 'daily-first':
      // `dailyGames` gains an entry on every completed daily (late ones
      // included), so a non-empty list IS "has completed at least one" —
      // deliberately not dailyBest, which a late-only player never grows
      return { done: Math.min(p.dailyGames.length, 1), total: 1 };
    case 'daily-streak':
      // the live run when the caller knows it, so a broken streak reads
      // honestly as "start again" instead of freezing at a number the
      // player can no longer build on. Unlocking still uses the best run
      // ever (see `achieved`) — a trophy is never taken back.
      return { done: Math.min(dailyCurrent ?? p.dailyBest, def.days!), total: def.days! };
    case 'daily-collector': {
      const eligible = eligibleGames();
      const done = new Set(p.dailyGames);
      return {
        done: eligible.filter((g) => done.has(g.id)).length,
        total: eligible.length
      };
    }
    case 'all-played': {
      const played = new Set(p.played);
      return { done: GAMES.filter((g) => played.has(g.id)).length, total: GAMES.length };
    }
    case 'difficulty':
      return {
        done: GAMES.filter((g) => (p.wins[g.id] ?? []).includes(def.difficulty!)).length,
        total: GAMES.length
      };
    case 'category': {
      const gs = GAMES.filter((g) => g.category === def.category);
      return { done: gs.filter((g) => (p.wins[g.id] ?? []).length > 0).length, total: gs.length };
    }
    case 'renaissance': {
      const cats = activeCategories();
      const done = cats.filter((c) =>
        GAMES.some((g) => g.category === c.id && (p.wins[g.id] ?? []).length > 0)
      ).length;
      return { done, total: cats.length };
    }
    case 'full-house': {
      /* The category you are CLOSEST to sweeping — the one the meter can
         actually help with. Ties (every category at zero) go to the
         SMALLEST one, which is the shortest road to the trophy. */
      let best: { done: number; total: number } | null = null;
      for (const c of activeCategories()) {
        const gs = GAMES.filter((g) => g.category === c.id);
        if (gs.length === 0) continue;
        const cand = { done: gs.filter((g) => allDifficultiesBeaten(p, g.id)).length, total: gs.length };
        const better =
          !best ||
          cand.done * best.total > best.done * cand.total ||
          (cand.done * best.total === best.done * cand.total && cand.total < best.total);
        if (better) best = cand;
      }
      return best ?? { done: 0, total: 1 };
    }
    case 'genre-hopper': {
      // today's hop only — yesterday's is already stamped as its feat
      const cats = activeCategories();
      const today = p.today?.day === dayKey(Date.now()) ? p.today.cats : [];
      return { done: cats.filter((c) => today.includes(c.id)).length, total: cats.length };
    }
    case 'deep-cut':
      // the gate the player can see coming: how much of the library they
      // have tried. The pick itself (see isDeepCut) is the moment.
      return { done: Math.min(p.played.length, def.count!), total: def.count! };
    case 'flawless':
    case 'speed':
    case 'time-of-day':
    case 'comeback':
    case 'share':
    case 'backup':
    case 'egg':
      // a moment: you have it or you don't
      return { done: p.feats.includes(def.feat!) ? 1 : 0, total: 1 };
  }
}

const NO_STREAK: StreakInfo = { current: 0, best: 0, playedToday: false, totalDays: 0, week: [] };

function achieved(def: LandmarkDef, p: PlayerProgress, bestStreak: number): boolean {
  if (def.kind === 'streak') return bestStreak >= def.days!;
  // both streak ladders unlock from the BEST run ever while their meters
  // show the live one — a trophy is never taken back by a bad day
  if (def.kind === 'clean-streak') return p.cleanStreakBest >= def.count!;
  // a feat is a stamped moment; its meter may legitimately read 0 forever
  // after (today's categories, a play-count gate) without un-earning it
  if (def.feat) return p.feats.includes(def.feat);
  const { done, total } = landmarkMeter(def, p, NO_STREAK);
  return total > 0 && done >= total;
}

/** Stamps any newly earned landmarks (never removes). Returns true when
    something unlocked. */
function evaluateLandmarks(p: PlayerProgress, atMs: number): boolean {
  const best = computeStreak(p.days, new Date(atMs)).best;
  let changed = false;
  for (const def of LANDMARKS) {
    if (p.landmarks[def.id]) continue;
    if (achieved(def, p, best)) {
      p.landmarks[def.id] = { at: atMs };
      changed = true;
    }
  }
  return changed;
}

/* ---------- persistence ---------- */

function emptyProgress(): PlayerProgress {
  return {
    days: [],
    played: [],
    wins: {},
    landmarks: {},
    xp: 0,
    plays: 0,
    cleanWins: 0,
    dailyBest: 0,
    dailyGames: [],
    records: {},
    feats: [],
    playCounts: {},
    cleanStreak: 0,
    cleanStreakBest: 0,
    fails: {}
  };
}

/**
 * Does this result COUNT as beating the tier?
 *
 * Only a clean win: won with zero hints and zero assists used (the
 * `cleanWin` flag every result already carries — passive assists count as
 * used whenever they were enabled, see the assist convention in CLAUDE.md).
 * This is the single gate behind the green ring, the star seal, the game
 * trophy, the difficulty-sweep and category-mastery landmarks, and the
 * "all difficulties" XP award — so every one of those marks means exactly
 * one thing: you did it unaided. A win with help still counts as a play, a
 * streak day, XP, and a history entry; it just isn't a conquest.
 */
export function countsAsBeaten(r: GameResult): boolean {
  return r.outcome === 'won' && r.cleanWin;
}

function addFeat(p: PlayerProgress, id: string): void {
  if (!p.feats.includes(id)) p.feats.push(id);
}

/**
 * Is this game in the bottom 10% of YOUR play counts?
 *
 * "Popularity" on a device with no server can only mean one thing: how much
 * this player actually plays each game. The gate is a library of your own —
 * with fewer than DEEP_CUT_MIN_GAMES games tried, "the one you never play"
 * is every game you own, and the trophy would mean nothing.
 *
 * Ranked ascending with ties sharing the best rank, so the dozens of games
 * sitting at zero all count as the bottom of the pile — which is exactly
 * what a deep cut is.
 */
export function isDeepCut(p: PlayerProgress, gameId: string): boolean {
  if (p.played.length < DEEP_CUT_MIN_GAMES) return false;
  const mine = p.playCounts[gameId] ?? 0;
  const fewer = GAMES.filter((g) => (p.playCounts[g.id] ?? 0) < mine).length;
  return fewer < Math.max(1, Math.ceil(GAMES.length * DEEP_CUT_SHARE));
}

function failKey(gameId: string, difficulty: Difficulty): string {
  return `${gameId}:${difficulty}`;
}

/**
 * Stamps the one-off moments this result earned.
 *
 * Order is load-bearing: the three comeback/obscurity feats are decided
 * against the state BEFORE the result is folded in (you bounced back from
 * the PREVIOUS game's loss; the game was obscure until this play made it
 * one play less obscure), so this runs first and the counters it reads are
 * updated afterwards, in this same function.
 *
 * Only FINISHED sessions EARN anything here, for the same reason `plays`
 * counts only finished sessions: quitting takes two seconds, and a trophy
 * anyone can quit their way into is worth nothing. So an abandon stamps no
 * feat and breaks no clean-win run — with one deliberate exception: it does
 * count as a failed attempt for Third Time's the Charm, because walking out
 * of a board you are losing is exactly the story that trophy is about.
 */
function applyFeats(p: PlayerProgress, r: GameResult): void {
  const finished = r.outcome !== 'abandoned';
  const clean = countsAsBeaten(r);
  const key = failKey(r.gameId, r.difficulty);

  // ---- judged against the state before this result ----
  if (finished && isDeepCut(p, r.gameId)) addFeat(p, FEATS.deepCut);
  if (r.outcome === 'won' && p.lastOutcome === 'lost') addFeat(p, FEATS.bounceBack);
  if (r.outcome === 'won' && (p.fails[key] ?? 0) >= 2) addFeat(p, FEATS.thirdTime);

  // ---- what this result itself was ----
  if (finished) {
    p.playCounts[r.gameId] = (p.playCounts[r.gameId] ?? 0) + 1;
    const hour = new Date(r.finishedAt).getHours();
    // the two windows are disjoint on purpose: one play must not hand out
    // both trophies, so the owl keeps the small hours and the bird gets the
    // two before six
    if (hour < 4) addFeat(p, FEATS.nightOwl);
    else if (hour < 6) addFeat(p, FEATS.earlyBird);

    const day = dayKey(r.finishedAt);
    const cat = GAMES.find((g) => g.id === r.gameId)?.category;
    if (p.today?.day !== day) p.today = { day, cats: [] };
    if (cat && !p.today.cats.includes(cat)) p.today.cats.push(cat);
    const cats = p.today.cats;
    const active = activeCategories();
    if (active.length > 0 && active.every((c) => cats.includes(c.id))) addFeat(p, FEATS.genreHopper);
  }

  if (clean) {
    p.cleanStreak += 1;
    p.cleanStreakBest = Math.max(p.cleanStreakBest, p.cleanStreak);
    // "no mistakes" is the game's own error count; a game that does not
    // count errors reports zero, so for those this is simply a clean win
    if (r.errors === 0) addFeat(p, FEATS.flawless);
    // > 0 guards the held-clock case: a run the timer never started is not
    // a fast win, it is an unmeasured one
    for (const t of SPEED_TIERS) {
      if (r.durationSec > 0 && r.durationSec < t.seconds) addFeat(p, t.feat);
    }
  } else if (finished) {
    p.cleanStreak = 0;
  }

  // a failed attempt is a loss OR an abandon — walking out of a board you
  // are losing is the same story the comeback trophy is about
  if (r.outcome === 'won') delete p.fails[key];
  else p.fails[key] = (p.fails[key] ?? 0) + 1;
  if (finished) p.lastOutcome = r.outcome as 'won' | 'lost';

  // the game's own secrets — declared in the registry, never known here
  const game = GAMES.find((g) => g.id === r.gameId);
  for (const egg of game?.easterEggs ?? []) {
    try {
      if (egg.when(r)) addFeat(p, eggFeat(game!.id, egg.id));
    } catch {
      // a game's predicate must never be able to break the write path that
      // records everybody's play
    }
  }
}

function applyResult(p: PlayerProgress, r: GameResult): void {
  // first: the feats read the state as it was BEFORE this result
  applyFeats(p, r);
  const day = dayKey(r.finishedAt);
  if (!p.days.includes(day)) p.days.push(day);
  if (!p.played.includes(r.gameId)) p.played.push(r.gameId);
  if (r.outcome !== 'abandoned') p.plays += 1;
  if (countsAsBeaten(r)) {
    p.cleanWins += 1;
    const won = p.wins[r.gameId] ?? [];
    if (!won.includes(r.difficulty)) p.wins[r.gameId] = [...won, r.difficulty];
  }
}

/**
 * Folds a win into the personal-best table and reports whether it BEAT the
 * previous best (faster time or higher score). The first win at a tier only
 * sets the bar — there was no record to beat, so it earns no record XP.
 */
function updateRecord(p: PlayerProgress, r: GameResult): boolean {
  if (r.outcome !== 'won') return false;
  const perGame = p.records[r.gameId] ?? (p.records[r.gameId] = {});
  const prev = perGame[r.difficulty];
  if (!prev) {
    perGame[r.difficulty] = { time: r.durationSec, score: r.score };
    return false;
  }
  const beat = r.durationSec < prev.time || r.score > prev.score;
  perGame[r.difficulty] = {
    time: Math.min(prev.time, r.durationSec),
    score: Math.max(prev.score, r.score)
  };
  return beat;
}

/**
 * Retroactive XP for a store that predates levels (or one just reseeded
 * from history), so an existing player is not knocked back to level 1.
 * Only what the permanent store can prove is counted: days, unlocked
 * landmarks, swept games, and the plays still in the (capped) history.
 * Records are not reconstructable and are simply not awarded.
 */
function seedXp(p: PlayerProgress, history: GameResult[]): number {
  const plays = history.filter((r) => r.outcome !== 'abandoned').length;
  const swept = GAMES.filter((g) => allDifficultiesBeaten(p, g.id)).length;
  return (
    p.days.length * XP_AWARDS.day +
    plays * XP_AWARDS.play +
    Object.keys(p.landmarks).length * XP_AWARDS.landmark +
    swept * XP_AWARDS.sweep
  );
}

/** history is stored newest-first; the feats are order-dependent (a
    comeback, a run of clean wins), so every replay walks it forwards */
function chronological(history: GameResult[]): GameResult[] {
  return [...history].sort((a, b) => a.finishedAt - b.finishedAt);
}

function seedFromHistory(): PlayerProgress {
  const p = emptyProgress();
  const history = loadHistory();
  // applyResult also runs up the lifetime plays/cleanWins counters and
  // replays the feats
  for (const r of chronological(history)) applyResult(p, r);
  p.days.sort();
  for (const r of history) updateRecord(p, r);
  p.xp = seedXp(p, history);
  // after the XP, so the level ladder sees the level this history earned
  evaluateLandmarks(p, Date.now());
  return p;
}

/**
 * Feat state for a store written before the feats existed: replay the
 * (capped) history forwards into the feat fields ONLY — everything else in
 * `p` is already loaded, and re-running applyResult would double every
 * lifetime counter.
 *
 * `played` is rebuilt as it goes rather than read from the loaded store, so
 * Deep Cut's "you have tried 10 games" gate is judged at each moment of the
 * replay instead of being granted by hindsight.
 */
function seedFeats(p: PlayerProgress, history: GameResult[]): void {
  p.feats = [];
  p.playCounts = {};
  p.fails = {};
  p.cleanStreak = 0;
  p.cleanStreakBest = 0;
  p.lastOutcome = undefined;
  p.today = undefined;
  const played = p.played;
  p.played = [];
  for (const r of chronological(history)) {
    applyFeats(p, r);
    if (!p.played.includes(r.gameId)) p.played.push(r.gameId);
  }
  p.played = played;
}

/**
 * Lifetime counters for a store written before the volume ladders existed.
 * Only the (capped) history can be counted, so a player with more than 1000
 * recorded games is credited with what is still on the device — the
 * alternative is starting them at zero, which is further from the truth.
 */
function seedCounters(p: PlayerProgress, history: GameResult[]): void {
  p.plays = history.filter((r) => r.outcome !== 'abandoned').length;
  p.cleanWins = history.filter(countsAsBeaten).length;
}

/**
 * shape-guard: a stale/foreign store falls back to a history reseed instead
 * of crashing (see QA ledger, save/resume rule). Exported so backup import
 * can validate an untrusted file with the same rules.
 *
 * `history` overrides what the retroactive backfills count. Backup import
 * MUST pass the file's own rows: an older backup carries no lifetime
 * counters, and filling them from the importing device's history would
 * credit the wrong person's play (zero, on a fresh device).
 */
export function normalizeProgress(raw: unknown, history?: GameResult[]): PlayerProgress | null {
  return normalize(raw, history);
}

/**
 * A lifetime counter (XP, plays, clean wins) from a stored — and after a
 * backup import, UNTRUSTED — file. A NaN, an Infinity or a negative would
 * spread to every level readout, bar width and trophy meter, so anything
 * that is not a sane whole number becomes 0 rather than poisoning the UI.
 * `null` means "no such field at all" (a store written before that counter
 * existed), which the caller backfills retroactively.
 */
function cleanCount(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return 0;
  return Math.floor(raw);
}

/** gameId/key -> whole non-negative count, from an untrusted file */
function cleanCounts(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = cleanCount(v);
    if (n) out[k] = n;
  }
  return out;
}

function cleanToday(raw: unknown): PlayerProgress['today'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const t = raw as Partial<{ day: string; cats: unknown }>;
  if (typeof t.day !== 'string' || !Array.isArray(t.cats)) return undefined;
  const ids = new Set(CATEGORIES.map((c) => c.id));
  return { day: t.day, cats: (t.cats as unknown[]).filter((c): c is CategoryId => ids.has(c as CategoryId)) };
}

function cleanRecords(raw: unknown): PlayerProgress['records'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: PlayerProgress['records'] = {};
  for (const [gameId, perGame] of Object.entries(raw as Record<string, unknown>)) {
    if (!perGame || typeof perGame !== 'object' || Array.isArray(perGame)) continue;
    const tiers: Partial<Record<Difficulty, PersonalBest>> = {};
    for (const [diff, best] of Object.entries(perGame as Record<string, unknown>)) {
      if (!DIFFICULTIES.includes(diff as Difficulty)) continue;
      const b = best as Partial<PersonalBest> | null;
      if (!b || typeof b !== 'object') continue;
      if (!Number.isFinite(b.time) || !Number.isFinite(b.score)) continue;
      tiers[diff as Difficulty] = { time: Number(b.time), score: Number(b.score) };
    }
    if (Object.keys(tiers).length) out[gameId] = tiers;
  }
  return out;
}

function normalize(raw: unknown, backfillFrom?: GameResult[]): PlayerProgress | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<PlayerProgress>;
  if (!Array.isArray(p.days) || !Array.isArray(p.played)) return null;
  if (!p.wins || typeof p.wins !== 'object' || Array.isArray(p.wins)) return null;
  if (!p.landmarks || typeof p.landmarks !== 'object' || Array.isArray(p.landmarks)) return null;
  const xp = cleanCount(p.xp);
  const plays = cleanCount(p.plays);
  const cleanWins = cleanCount(p.cleanWins);
  const out: PlayerProgress = {
    days: p.days.filter((d): d is string => typeof d === 'string'),
    played: p.played.filter((g): g is string => typeof g === 'string'),
    wins: p.wins as Record<string, Difficulty[]>,
    landmarks: p.landmarks as Record<string, LandmarkUnlock>,
    xp: xp ?? 0,
    plays: plays ?? 0,
    cleanWins: cleanWins ?? 0,
    // no history source to rebuild these from — a store that predates the
    // Daily Challenge simply starts it at zero, which is the truth
    dailyBest: cleanCount(p.dailyBest) ?? 0,
    dailyGames: Array.isArray(p.dailyGames)
      ? p.dailyGames.filter((g): g is string => typeof g === 'string')
      : [],
    records: cleanRecords(p.records),
    /* Feats arrive from backup files, so they are untrusted like everything
       else here — but an UNKNOWN feat id is kept rather than dropped: a
       backup written by a newer build (or by a game whose easter egg this
       build has not shipped yet) must not have its trophies quietly
       deleted by an older reader. Only the shape is enforced. */
    feats: Array.isArray(p.feats) ? p.feats.filter((f): f is string => typeof f === 'string') : [],
    playCounts: cleanCounts(p.playCounts),
    cleanStreak: cleanCount(p.cleanStreak) ?? 0,
    cleanStreakBest: cleanCount(p.cleanStreakBest) ?? 0,
    ...(p.lastOutcome === 'won' || p.lastOutcome === 'lost' ? { lastOutcome: p.lastOutcome } : {}),
    fails: cleanCounts(p.fails),
    ...(cleanToday(p.today) ? { today: cleanToday(p.today) } : {})
  };
  // a store from before levels / the volume ladders: backfill from what the
  // device can still prove, so an existing player keeps the level and the
  // counts their play has earned (one history read for both)
  if (xp === null || plays === null || cleanWins === null || !Array.isArray(p.feats)) {
    const history = backfillFrom ?? loadHistory();
    // feats first: seedXp counts landmarks, and the replay can unlock some
    if (!Array.isArray(p.feats)) seedFeats(out, history);
    if (xp === null) out.xp = seedXp(out, history);
    if (plays === null || cleanWins === null) seedCounters(out, history);
  }
  return out;
}

/** Loads (or reseeds) progress and re-evaluates landmarks — cheap, runs at
    app start so retroactive/registry-driven unlocks appear without a play. */
export function loadProgress(): PlayerProgress {
  const raw = readGameData<PlayerProgress>(PROGRESS_KEY);
  /**
   * A store written before levels (or before the lifetime counters) existed.
   * Its retroactive XP and counts MUST be seeded and persisted here, at
   * load — recordProgress runs after the new result is already in history,
   * so seeding there would count that game once in the backfill and again in
   * its award (and could skip the level-up card by inflating the "before"
   * level past a boundary).
   */
  const needsXpSeed =
    !!raw &&
    typeof raw === 'object' &&
    (typeof raw.xp !== 'number' ||
      typeof raw.plays !== 'number' ||
      typeof raw.cleanWins !== 'number' ||
      typeof raw.dailyBest !== 'number' ||
      // a store from before the feats: the replay above filled them in and
      // must be persisted HERE, at load — never at write time (see below)
      !Array.isArray(raw.feats));
  const stored = normalize(raw);
  const p = stored ?? seedFromHistory();
  const changed = evaluateLandmarks(p, Date.now());
  if (!stored || changed || needsXpSeed) writeGameData(PROGRESS_KEY, p);
  return p;
}

/**
 * Grants XP for whatever this result made NEW, then folds it in. Each award
 * is keyed to a state change (first play of a day, a landmark that was not
 * unlocked, a game that was not yet swept, a record that stood), so the same
 * moment can never pay twice.
 *
 * Abandoned sessions earn no `play` XP on purpose: quitting from the game
 * screen takes a couple of seconds, so paying for it would let a player
 * level up without playing anything, and a level nobody earned is worth
 * nothing. They still count for the streak day, which is a real play day.
 */
/**
 * What a finished Daily Challenge contributed, handed down from the shell
 * (which owns the daily store) so the award and the trophies can both be
 * decided in this one place. Every flag here is a STATE CHANGE, not a
 * standing fact, so nothing can be paid twice by replaying the day.
 */
export interface DailyProgressInfo {
  gameId: string;
  /** first time this date was completed — the base award pays once */
  firstCompletion: boolean;
  /** the streak grew on this completion */
  advanced: boolean;
  cleanWin: boolean;
  /** the daily streak's best run after this completion */
  best: number;
}

/**
 * Stamps every landmark this state has earned, in a LOOP: unlocking one
 * pays 80 XP, which can itself carry the player over a level tier whose
 * crown must then unlock in the same breath. Bounded by the catalogue size —
 * each pass stamps at least one landmark and none is ever stamped twice.
 */
function stampLandmarks(p: PlayerProgress, atMs: number, onUnlock: (id: string) => void): void {
  for (let pass = 0; pass < LANDMARKS.length; pass++) {
    const before = new Set(Object.keys(p.landmarks));
    if (!evaluateLandmarks(p, atMs)) break;
    for (const id of Object.keys(p.landmarks)) {
      if (!before.has(id)) onUnlock(id);
    }
  }
}

function awardXp(p: PlayerProgress, r: GameResult, daily?: DailyProgressInfo): XpAward {
  const entries: XpEntry[] = [];
  /* XP lands on p.xp as it is granted, not in one sum at the end: the level
     ladder's landmarks are evaluated against p.xp, so they must see the XP
     this very result just earned. */
  const grant = (source: XpSource, detail?: string) => {
    entries.push({ source, xp: XP_AWARDS[source], detail });
    p.xp += XP_AWARDS[source];
  };

  const isNewDay = !p.days.includes(dayKey(r.finishedAt));
  const sweptBefore = allDifficultiesBeaten(p, r.gameId);
  const levelBefore = levelFromXp(p.xp);

  applyResult(p, r);
  p.days.sort();
  const brokeRecord = updateRecord(p, r);

  if (isNewDay) grant('day');
  if (r.outcome !== 'abandoned') grant('play');
  if (brokeRecord) grant('record');
  if (!sweptBefore && allDifficultiesBeaten(p, r.gameId)) grant('sweep');

  if (daily) {
    // the projections the trophies read; the daily store stays the source
    p.dailyBest = Math.max(p.dailyBest, daily.best);
    if (!p.dailyGames.includes(daily.gameId)) p.dailyGames.push(daily.gameId);
    if (daily.firstCompletion) {
      grant('daily');
      if (daily.cleanWin) grant('dailyClean');
    }
    if (daily.advanced) grant('dailyStreak');
  }

  // landmarks last (see stampLandmarks — the loop is load-bearing)
  stampLandmarks(p, r.finishedAt, (id) => grant('landmark', getLandmark(id)?.title));

  const total = entries.reduce((sum, e) => sum + e.xp, 0);
  const levelAfter = levelFromXp(p.xp);
  return { total, entries, levelBefore, levelAfter, leveledUp: levelAfter > levelBefore };
}

export interface ProgressUpdate {
  progress: PlayerProgress;
  award: XpAward;
}

/** The single write path: fold one finished/abandoned session in, unlock
    anything newly earned, grant XP, persist. Returns a fresh object
    (React state) plus what this result earned, for the results modal. */
export function recordProgress(result: GameResult, daily?: DailyProgressInfo): ProgressUpdate {
  const p = normalize(readGameData<PlayerProgress>(PROGRESS_KEY)) ?? seedFromHistory();
  const award = awardXp(p, result, daily);
  writeGameData(PROGRESS_KEY, p);
  return { progress: p, award };
}

/**
 * The second write path: a feat earned OUTSIDE a game — making a win card,
 * sharing the app's link, exporting or importing a backup. Same rules as a
 * result, minus the game:
 * the moment is stamped once, anything it unlocked is stamped with it and
 * paid the usual landmark XP.
 *
 * Returns null when the feat was already held, so the caller can skip a
 * pointless state update — and so a player who exports ten backups is paid
 * for one, exactly like every other award in this store.
 *
 * No XpAward comes back on purpose: these moments happen on surfaces with
 * no results modal (a settings page, a share sheet), so the XP lands
 * quietly and the trophy itself is what the player sees.
 */
export function recordFeat(feat: string): PlayerProgress | null {
  const p = normalize(readGameData<PlayerProgress>(PROGRESS_KEY)) ?? seedFromHistory();
  if (p.feats.includes(feat)) return null;
  p.feats.push(feat);
  stampLandmarks(p, Date.now(), () => {
    p.xp += XP_AWARDS.landmark;
  });
  writeGameData(PROGRESS_KEY, p);
  return p;
}
