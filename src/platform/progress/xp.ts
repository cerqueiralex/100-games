/**
 * Player XP and levels — the rules and the arithmetic, nothing else.
 *
 * This module is deliberately DEPENDENCY-FREE (no storage, no registry, no
 * progress import) so `progress.ts` can own the single write path and call
 * in here for the numbers without a module cycle. Awards are decided in
 * `progress.ts`'s recordProgress, where "what just changed" is known.
 *
 * Every award is granted at most once for the thing that earned it: a day
 * is only new once, a landmark unlocks once, a game is swept once. That is
 * what keeps a level honest — XP is a record of what happened, not a
 * currency that can be farmed by replaying the same moment.
 */

/** One level per 100 XP: level 1 at 0 XP, level 2 at 100, level 3 at 200… */
export const XP_PER_LEVEL = 100;

export type XpSource = 'day' | 'play' | 'record' | 'sweep' | 'landmark';

/** The award table. Rare, hard-won things are worth 8 plays. */
export const XP_AWARDS: Record<XpSource, number> = {
  day: 10,
  play: 10,
  record: 10,
  sweep: 80,
  landmark: 80
};

export const XP_SOURCE_LABEL: Record<XpSource, string> = {
  day: 'Daily streak',
  play: 'Game played',
  record: 'Personal record',
  sweep: 'All difficulties beaten',
  landmark: 'Landmark earned'
};

export interface XpEntry {
  source: XpSource;
  xp: number;
  /** which landmark, which difficulty… — shown next to the label */
  detail?: string;
}

export interface XpAward {
  /** XP granted by this one result (0 when nothing new happened) */
  total: number;
  entries: XpEntry[];
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
}

export const NO_AWARD: XpAward = {
  total: 0,
  entries: [],
  levelBefore: 1,
  levelAfter: 1,
  leveledUp: false
};

/**
 * Level for a total XP count. Guards the input: XP arrives from a stored
 * (and, after a backup import, UNTRUSTED) file, and a NaN here would spread
 * to every level readout in the app.
 */
export function levelFromXp(xp: number): number {
  if (!Number.isFinite(xp) || xp < 0) return 1;
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export interface XpMeter {
  level: number;
  /** XP earned inside the current level, 0…XP_PER_LEVEL-1 */
  into: number;
  /** XP still needed to reach the next level */
  remaining: number;
  /** 0…100, for the progress bar width */
  percent: number;
  total: number;
}

export function xpMeter(xp: number): XpMeter {
  const safe = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;
  const level = levelFromXp(safe);
  const into = safe % XP_PER_LEVEL;
  return {
    level,
    into,
    remaining: XP_PER_LEVEL - into,
    percent: (into / XP_PER_LEVEL) * 100,
    total: safe
  };
}

/* ---------- rank crowns (the level ladder) ---------- */

/**
 * Six crowns mark the long climb: a level number alone stops meaning
 * anything past the first few, so each tier gives the player a material to
 * wear — and because the whole ladder is always shown (locked ones greyed),
 * the next crown is visible from level 1.
 *
 * The ladder is the SINGLE source: the level landmarks in progress.ts, the
 * profile row, the home badge and the share card all derive from it, so a
 * new tier is one entry here and nothing else.
 */
export type RankId = 'wood' | 'iron' | 'silver' | 'gold' | 'platinum' | 'challenger';

export interface RankTier {
  id: RankId;
  name: string;
  /** the level that earns this crown */
  level: number;
}

export const RANK_TIERS: RankTier[] = [
  { id: 'wood', name: 'Wood', level: 10 },
  { id: 'iron', name: 'Iron', level: 25 },
  { id: 'silver', name: 'Silver', level: 50 },
  { id: 'gold', name: 'Gold', level: 100 },
  { id: 'platinum', name: 'Platinum', level: 150 },
  { id: 'challenger', name: 'Challenger', level: 200 }
];

/** The highest crown a level has earned — null below the first tier. */
export function rankForLevel(level: number): RankTier | null {
  let out: RankTier | null = null;
  for (const t of RANK_TIERS) if (level >= t.level) out = t;
  return out;
}

/** The crown a total XP count has earned (guards hostile XP via levelFromXp). */
export function rankForXp(xp: number): RankTier | null {
  return rankForLevel(levelFromXp(xp));
}
