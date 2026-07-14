/**
 * Stroop Match — pure trial logic (no React, headlessly testable).
 *
 * A trial shows a colour WORD painted in a possibly-different INK colour.
 * Depending on the active rule the player must tap the ink colour, the
 * word's meaning, or (extreme) the colour that is neither. All generation
 * is driven by an injected `rng` so it is deterministic under a seed.
 */
import type { Difficulty } from '../../../platform/types';

export type GlyphId = 'circle' | 'triangle' | 'square' | 'star' | 'diamond' | 'hexagon' | 'heart';

/** ink-rule: answer = ink colour · word-rule: answer = word meaning · odd: answer = neither. */
export type StroopRule = 'ink' | 'word' | 'odd';

export interface StroopColor {
  /** stable id used everywhere logic-side */
  id: string;
  /** the label shown as the stimulus word and on the answer button */
  name: string;
  /** the design token that paints this colour (content palette) */
  token: string;
  /** a colourblind-safe shape drawn on the answer swatch */
  glyph: GlyphId;
}

/**
 * The colour palette, ordered so each tier takes a prefix of it. Every
 * colour is a distinct hue from the shared --play-* content palette and
 * carries its own glyph so buttons stay identifiable without colour.
 */
export const PALETTE: StroopColor[] = [
  { id: 'red', name: 'RED', token: '--play-2', glyph: 'circle' },
  { id: 'green', name: 'GREEN', token: '--play-1', glyph: 'triangle' },
  { id: 'blue', name: 'BLUE', token: '--play-4', glyph: 'square' },
  { id: 'yellow', name: 'YELLOW', token: '--play-3', glyph: 'star' },
  { id: 'orange', name: 'ORANGE', token: '--play-7', glyph: 'diamond' },
  { id: 'purple', name: 'PURPLE', token: '--play-5', glyph: 'hexagon' },
  { id: 'pink', name: 'PINK', token: '--play-8', glyph: 'heart' }
];

export function colorById(id: string): StroopColor {
  const c = PALETTE.find((x) => x.id === id);
  if (!c) throw new Error(`stroop: unknown colour "${id}"`);
  return c;
}

export interface Trial {
  /** colour id whose NAME is displayed as the stimulus text */
  word: string;
  /** colour id used to paint the stimulus text (the "ink") */
  ink: string;
  rule: StroopRule;
  /** for the 'odd' rule only: the answer colour (neither word nor ink) */
  odd?: string;
}

export interface TierConfig {
  /** how many colours from the palette prefix are in play */
  colorCount: number;
  /** milliseconds allowed per trial (before assists) */
  trialMs: number;
  /** correct answers needed to win */
  goal: number;
  /** wrong/timeout answers allowed before the run ends */
  lives: number;
  /** difficulty multiplier (1..5) applied to every point earned */
  mult: number;
  /** probability an ink-rule trial is incongruent (ink ≠ word) */
  conflict: number;
  /** probability a trial flips to the word-meaning rule */
  ruleFlipProb: number;
  /** probability a trial uses the "neither" (odd) rule */
  oddProb: number;
}

export const TIERS: Record<Difficulty, TierConfig> = {
  easy: { colorCount: 4, trialMs: 3000, goal: 12, lives: 4, mult: 1, conflict: 0.35, ruleFlipProb: 0, oddProb: 0 },
  medium: { colorCount: 5, trialMs: 2200, goal: 15, lives: 3, mult: 2, conflict: 0.65, ruleFlipProb: 0, oddProb: 0 },
  hard: { colorCount: 6, trialMs: 1600, goal: 18, lives: 3, mult: 3, conflict: 0.85, ruleFlipProb: 0, oddProb: 0 },
  pro: { colorCount: 6, trialMs: 1300, goal: 20, lives: 2, mult: 4, conflict: 0.85, ruleFlipProb: 0.3, oddProb: 0 },
  extreme: { colorCount: 7, trialMs: 1000, goal: 22, lives: 2, mult: 5, conflict: 0.9, ruleFlipProb: 0.35, oddProb: 0.18 }
};

/** Deterministic PRNG for seeded validation (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a single trial from a tier config and an rng returning [0,1). */
export function makeTrial(cfg: TierConfig, rng: () => number): Trial {
  const colors = PALETTE.slice(0, cfg.colorCount);
  const pick = (): string => colors[Math.floor(rng() * colors.length)].id;

  const roll = rng();
  let rule: StroopRule = 'ink';
  if (cfg.oddProb > 0 && roll < cfg.oddProb) rule = 'odd';
  else if (cfg.ruleFlipProb > 0 && roll < cfg.oddProb + cfg.ruleFlipProb) rule = 'word';

  if (rule === 'odd') {
    // three distinct colours: the word, the ink, and the (correct) neither
    const word = pick();
    let ink = pick();
    while (ink === word) ink = pick();
    let odd = pick();
    while (odd === word || odd === ink) odd = pick();
    return { word, ink, rule, odd };
  }

  const word = pick();
  let ink = word;
  // word-rule trials are always incongruent so the task-switch actually bites
  const incongruent = rule === 'word' ? true : rng() < cfg.conflict;
  if (incongruent) {
    ink = pick();
    while (ink === word) ink = pick();
  }
  return { word, ink, rule };
}

/** The single correct answer for a trial. */
export function correctAnswer(t: Trial): string {
  if (t.rule === 'word') return t.word;
  if (t.rule === 'odd') return t.odd as string;
  return t.ink;
}

/**
 * Colour ids that are answerable for this trial. Ink/word rules use the
 * whole tier palette; an odd trial narrows play to its three participating
 * colours (word, ink, answer) so its answer is uniquely determinable.
 */
export function activeColorIds(t: Trial, cfg: TierConfig): string[] {
  if (t.rule === 'odd' && t.odd) return [t.word, t.ink, t.odd];
  return PALETTE.slice(0, cfg.colorCount).map((c) => c.id);
}

/* ----- scoring (kept pure so the note stays honest) ----- */

export const BASE_PTS = 10;
export const SPEED_MAX = 20;
export const HINT_COST = 15;

export function winBonus(cfg: TierConfig): number {
  return 100 * cfg.mult;
}

/** Streak multiplier ramps 1.00 → 3.00 across the first nine correct in a row. */
export function streakMult(streak: number): number {
  return 1 + Math.min(Math.max(streak - 1, 0), 8) * 0.25;
}

/** Points for one correct answer given the new streak and remaining-time fraction. */
export function trialScore(cfg: TierConfig, streak: number, remainingFrac: number): number {
  const frac = Math.max(0, Math.min(1, remainingFrac));
  const speed = Math.round(frac * SPEED_MAX);
  return Math.round((BASE_PTS + speed) * streakMult(streak) * cfg.mult);
}
