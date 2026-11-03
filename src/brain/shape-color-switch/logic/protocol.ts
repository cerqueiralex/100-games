/**
 * Shape–Color Switch — the protocol (SCIENCE.md §1.12: a cued DCCS task
 * faithful to the Mobile Toolbox Shape-Color Sorting test, Novack et al.
 * 2024). Pure data and arithmetic: no DOM, no React, so validate drives it
 * under Node.
 *
 * Every number here is part of the measurement. Changing one changes what
 * the score means, so it MUST bump `protocolVersion` in ../index.ts (which
 * starts a new baseline segment) and update SCIENCE.md in the same commit.
 *
 * The stimulus world:
 *  - two TARGET CARDS, always visible: card A = shape A in colour 1,
 *    card B = shape B in colour 2 (which card sits on the left is drawn
 *    per session from the seed);
 *  - a TEST PICTURE that is always bivalent and response-incongruent:
 *    shape A in colour 2 (`pic 0`) or shape B in colour 1 (`pic 1`), so the
 *    shape rule and the colour rule always point at opposite cards;
 *  - a CUE WORD, "shape" or "color", 500 ms before the picture.
 */

export const PROTOCOL = {
  /** the scored block */
  testTrials: 30,
  shapeTrials: 24,
  colorTrials: 6,
  /** the blank interval before each cue — half of each, order shuffled */
  isiMs: [300, 1000] as const,
  /** cue word → test picture; constant, because preparation time changes switch costs (Monsell 2003) */
  cueLeadMs: 500,
  /** the response window from picture onset; a timeout is an error and adds 2.5 s to ΣRT */
  deadlineMs: 2500,
  /** a response faster than this from picture onset is an anticipation: an error, counted */
  anticipationMs: 200,
  /** at least this many shape trials between two colour trials */
  minShapeGap: 2,
  /** at most this many shape trials in a row [DC] */
  maxShapeRun: 6,
  /** at most this many identical correct sides (and identical pictures) in a row [DC] */
  maxSameRun: 4,
  /** the per-session warm-up: 5 mixed trials with ✓/✗, repeated once below 4 correct */
  practiceTrials: 5,
  practicePass: 4,
  practiceRounds: 2,
  /** validity: more anticipations than this invalidates the run ('too-fast') */
  maxAnticipations: 3,
  /**
   * validity, scoring v2 (SCIENCE.md C13): below this accuracy ON THE
   * ANSWERED TRIALS the answers are too close to guessing between the two
   * cards ('at-chance') [DC]. A timeout is a slow trial for the score (2.5 s,
   * not correct), never a wrong answer for validity: v1 took 70% of all 30
   * trials, counting every timeout as wrong, so a slow, careful player was
   * thrown out as "rushed".
   */
  minAccuracy: 0.7
} as const;

/** the cue on a trial: 0 = "shape", 1 = "color" */
export type Cue = 0 | 1;
export const SHAPE: Cue = 0;
export const COLOR: Cue = 1;
export const CUE_WORD: Record<Cue, string> = { 0: 'shape', 1: 'color' };

/** the test picture: 0 = shape A in colour 2, 1 = shape B in colour 1 */
export type Pic = 0 | 1;

/** 0 = left card, 1 = right card */
export type Side = 0 | 1;

/** where the cards sit for a whole session (drawn from the seed, stored through it) */
export interface Layout {
  /** card A (shape A in colour 1) is the LEFT card */
  aLeft: boolean;
}

/** one generated trial */
export interface TrialSpec {
  cue: Cue;
  pic: Pic;
  /** the blank interval before the cue, ms */
  isi: number;
  /** the correct card */
  side: Side;
}

/**
 * The card a rule points to. Shape rule: the card sharing the picture's
 * shape (pic 0 has shape A → card A). Colour rule: the card sharing its
 * colour (pic 0 is in colour 2 → card B). The two rules never agree.
 */
export function ruleCard(cue: Cue, pic: Pic): 'A' | 'B' {
  return (cue === SHAPE) === (pic === 0) ? 'A' : 'B';
}

/** the side of the correct card under this session's layout */
export function correctSide(cue: Cue, pic: Pic, layout: Layout): Side {
  const isA = ruleCard(cue, pic) === 'A';
  return isA === layout.aLeft ? 0 : 1;
}

/** the picture's identity as (shape, colour): shape 'A'|'B', colour 1|2 */
export function picParts(pic: Pic): { shape: 'A' | 'B'; color: 1 | 2 } {
  return pic === 0 ? { shape: 'A', color: 2 } : { shape: 'B', color: 1 };
}

/** what each side's card is: shape and colour */
export function cardAt(side: Side, layout: Layout): { shape: 'A' | 'B'; color: 1 | 2 } {
  const isA = (side === 0) === layout.aLeft;
  return isA ? { shape: 'A', color: 1 } : { shape: 'B', color: 2 };
}
