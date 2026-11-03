import type { BrainRunType, ReferenceGrade } from '../types';
import type { StateFlag, StateLabel, TrendLabel, Verdict } from '../analytics';
import { BASELINE_N } from '../analytics';

/**
 * Brain Lab module copy — the ONE place the tab, the runner, the check-in
 * and the dashboard get their sentences from (SCIENCE.md §4.3 "Phrasing",
 * §4.4 "Messages by situation"). Rules every string here keeps:
 *  - no IQ framing, no diagnosis, no population ranking (§4.1);
 *  - NO ALARM: a below-baseline result is never "warning", "decline",
 *    "impaired" — and the `tone` returned is for an arrow glyph only, never a
 *    reason to paint with --bad (callers keep 'down' neutral ink);
 *  - a change is "reliable" only when the §2.6 weekly rule says so, and an
 *    improvement in a practice-prone area always carries the practice
 *    qualifier;
 *  - associations, never causes ("short sleep … commonly cause day-to-day
 *    dips", never "you are tired").
 * Dependency-free apart from types and one constant, so validate can import
 * it under Node and scan it.
 */

/** §2.6 / §4.4 — the practice qualifier every improvement in a practice-prone area carries */
export const PRACTICE_QUALIFIER = 'Part of this is practice on the test itself.';

/** §4.4 — the benign causes a below-range day lists */
export const BELOW_RANGE_NOTE =
  'Short sleep, fatigue, stress, caffeine timing and distractions commonly cause day-to-day dips.';

/** §4.4 — the reliable-decline message (only after the two-week verdict, never from one day) */
export const RELIABLE_DECLINE_NOTE =
  'This area has been below your baseline for two weeks. Common reasons include short sleep, illness, stress, a different time of day, distractions, or a change of device. If you notice persistent problems with memory or thinking in daily life, consider talking to a health professional.';

export type CopyTone = 'up' | 'down' | 'neutral';

/**
 * The weekly reliable-change verdict (SCIENCE.md §2.6 table, §4.4 wording).
 * `tone` picks an arrow; it is NEVER a colour cue for alarm.
 */
export function verdictCopy(v: Verdict, practiceProne: boolean): { title: string; body?: string; tone: CopyTone } {
  switch (v) {
    case 'reliably-above':
      return {
        title: 'Reliably above your baseline',
        body: `Reliably above your baseline on this test for two weeks.${practiceProne ? ` ${PRACTICE_QUALIFIER}` : ''}`,
        tone: 'up'
      };
    case 'reliably-below':
      return { title: 'Reliably below your baseline', body: RELIABLE_DECLINE_NOTE, tone: 'down' };
    case 'possibly-above':
      return {
        title: 'Possibly above — check again next week',
        body: `Last week was above your baseline. Two weeks in a row would make it a reliable change.${practiceProne ? ` ${PRACTICE_QUALIFIER}` : ''}`,
        tone: 'up'
      };
    case 'possibly-below':
      return {
        title: 'Possibly below — check again next week',
        body: 'Last week was below your baseline. One week on its own is often day-to-day variation — sleep, stress or a different time of day are common reasons.',
        tone: 'down'
      };
    case 'within':
      return {
        title: 'Within your normal range',
        body: 'Last week sat inside your usual ups and downs.',
        tone: 'neutral'
      };
    case 'pending':
      return {
        title: 'Baseline set',
        body: 'Your first weekly verdict comes after a full week of scored runs.',
        tone: 'neutral'
      };
    case 'none':
    default:
      return {
        title: 'No baseline yet',
        body: `Weekly verdicts start once your baseline is set (${BASELINE_N} scored runs on different days).`,
        tone: 'neutral'
      };
  }
}

/** today vs your typical range (SCIENCE.md §2.5 labels) */
export function stateCopy(l: StateLabel): string {
  switch (l) {
    case 'within':
      return 'Within your typical range';
    case 'above':
      return 'Above your typical range';
    case 'below':
      return 'Below your typical range';
    case 'well-above':
      return 'Well above your typical range';
    case 'well-below':
      return 'Well below your typical range';
  }
}

/** the extra line a below-range day shows (§4.4); undefined for every other label */
export function stateNote(l: StateLabel): string | undefined {
  return l === 'below' || l === 'well-below' ? BELOW_RANGE_NOTE : undefined;
}

/** the arrow a state label points (never a colour for alarm) */
export function stateTone(l: StateLabel): CopyTone {
  return l === 'above' || l === 'well-above' ? 'up' : l === 'below' || l === 'well-below' ? 'down' : 'neutral';
}

/**
 * The grade badge on a reference index (SCIENCE.md §2.2, §4.2): grade C is
 * "approximate" with a tooltip naming the anchor sample; grade P has no
 * reference at all, so its index is personal.
 */
export function gradeCopy(grade: ReferenceGrade, anchor?: string): { badge: string; tooltip: string } {
  const anchorLine = anchor ? ` Anchor: ${anchor}` : '';
  switch (grade) {
    case 'A':
      return {
        badge: 'Reference',
        tooltip: `Reference scale from norms for this protocol on comparable phones.${anchorLine}`
      };
    case 'B':
      return {
        badge: 'Reference',
        tooltip: `Reference scale from norms for this paradigm on other hardware, with a measured device correction.${anchorLine}`
      };
    case 'C':
      return {
        badge: 'Approximate',
        tooltip: `Reference scale, approximate: anchored to the published range of a related protocol or device, so treat it as orientation. Change from your own baseline is the main signal.${anchorLine}`
      };
    case 'P':
    default:
      return {
        badge: 'Personal',
        tooltip:
          'No published reference exists for this test, so its index is personal: 50 is your own baseline and every 10 points is one step of your usual day-to-day variation.'
      };
  }
}

/** how a recorded run was used (analytics.ts classifies it) */
export function roleCopy(role: BrainRunType): string {
  switch (role) {
    case 'run-in':
      return 'Calibrating';
    case 'baseline':
      return 'Baseline run';
    case 'tracking':
      return 'Scored';
    case 'practice':
      return 'Practice · not scored';
    case 'invalid':
    default:
      return 'Not valid · not scored';
  }
}

/** the four-week trend label (SCIENCE.md §2.7) */
export function trendCopy(t: TrendLabel | null): string {
  switch (t) {
    case 'rising':
      return 'Trending up over 4 weeks';
    case 'falling':
      return 'Trending down over 4 weeks';
    case 'steady':
      return 'Steady over 4 weeks';
    default:
      return 'A 4-week trend needs 8 scored runs over 3 weeks';
  }
}

/**
 * The trend label with the practice qualifier a rising trend in a
 * practice-prone area must carry (SCIENCE.md §2.6, §4.1). `short` is the
 * area-card form.
 */
export function trendLine(t: TrendLabel | null, practiceProne: boolean, short = false): string {
  if (t === 'rising' && practiceProne) {
    return short ? 'Trending up · partly practice' : `${trendCopy(t)}. ${PRACTICE_QUALIFIER}`;
  }
  return trendCopy(t);
}

/** the run-in line (SCIENCE.md §4.4 "Calibrating") */
export function calibratingCopy(done: number, runIn: number): string {
  if (done >= runIn) {
    return `Calibration done — your baseline forms over your next ${BASELINE_N} scored runs, one per day.`;
  }
  return `Calibrating — your first sessions teach you the test, so scores usually rise. Your baseline starts after session ${runIn}.`;
}

/** "Calibrating 1/3" — the short label for chips and cards */
export function calibratingShort(done: number, runIn: number): string {
  return `Calibrating ${Math.min(done, runIn)}/${runIn}`;
}

/**
 * the baseline-forming note (between the run-in and a frozen baseline) —
 * every surface prints "Baseline forming k/5" right above it, so it never
 * repeats that label
 */
export function baselineFormingCopy(k: number): string {
  const left = Math.max(0, BASELINE_N - Math.min(k, BASELINE_N));
  return `One scored run a day builds it${left ? ` (${left} to go)` : ''}; then it is frozen, so later days have something fixed to be compared with.`;
}

/** "Baseline 2/5" — the short label while a personal-only area's baseline forms (area card, chips) */
export function baselineFormingShort(k: number): string {
  return `Baseline ${Math.min(k, BASELINE_N)}/${BASELINE_N}`;
}

/** the area card's line for a personal-only area whose baseline is forming: when its index will exist */
export function personalIndexAfter(k: number): string {
  const left = Math.max(1, BASELINE_N - k);
  return `Index after ${left} more scored ${left === 1 ? 'day' : 'days'}`;
}

/**
 * A personal-only (grade P) area between calibration and its frozen
 * baseline (SCIENCE.md §2.1, §2.9): there is no number yet BY DEFINITION —
 * a personal index is measured from that baseline — so say why, and how far
 * along it is, instead of reading as lapsed.
 */
export function personalFormingCopy(k: number): string {
  const left = Math.max(0, BASELINE_N - Math.min(k, BASELINE_N));
  return `No published reference exists for this test, so its index is personal — 50 is your own baseline. It appears once ${BASELINE_N} scored runs on different days have set that baseline${left ? ` (${left} to go)` : ''}. One run a day counts; more runs that day are stored as practice.`;
}

/** the check-in context flags (SCIENCE.md §2.8 — context icons, never a verdict) */
export function stateFlagCopy(f: StateFlag): { label: string; detail: string } {
  switch (f) {
    case 'sleepy':
      return { label: 'Sleepy', detail: 'You rated your sleepiness 5 or more on the Stanford scale.' };
    case 'short-sleep':
      return { label: 'Short sleep', detail: 'Under 6 hours, or 1.5 hours less than your usual.' };
    case 'high-stress':
    default:
      return { label: 'High stress', detail: 'You rated stress 4 or 5 out of 5.' };
  }
}

/**
 * A validity flag in plain words (SCIENCE.md C11: invalid runs are kept and
 * shown WITH their reason). Known shared flags are spelled out; a test's own
 * flag id falls back to a readable version of itself.
 */
export function flagCopy(flag: string): string {
  const known: Record<string, string> = {
    interrupted: 'The run was interrupted — the app was left, the screen rotated or the test was paused past its limit — so it could not be scored.',
    practice: 'Practice run — nothing was recorded.',
    'fixture-invalid': 'Marked invalid by the dev fixture.',
    'too-many-interruptions': 'Paused too often or for too long to be comparable with your other runs.',
    'too-fast': 'Too many responses came faster than a decision can be made, so the run did not measure the skill.',
    'too-few': 'Too few answers to score this run.',
    'too-few-correct': 'Too few correct answers to score this run.',
    'too-few-items': 'Too few puzzles were answered to estimate a level.',
    rushed: 'Accuracy was too low to score — speed alone does not measure the skill.',
    'low-accuracy': 'Accuracy was too low to score — speed alone does not measure the skill.',
    careless: 'Too many answers came in under a second and a half — a run of guesses cannot be scored.',
    'at-chance': 'The answers you gave were too close to guessing, so the run did not measure the skill. Unanswered items never count against this.',
    'not-comparable': 'The screen was too small to draw the test at its standard size.',
    'too-many-false-starts': 'Too many taps came before the counter started, so the run could not be scored.',
    'too-many-timeouts': 'Too many trials ended without an answer to score this run.',
    'unstable-timing': 'The display stalled on several trials, so their timing could not be trusted.',
    'long-gap': 'You stopped answering for a long stretch during the timed block — far longer than your own pace — so the run is not comparable with your others.',
    'items-exhausted': 'Every prepared item was used before time ran out, so the run could not continue at its standard length.',
    // quality notes on a valid run — kept with the run, never a reason to doubt it on their own
    'responding-before-the-counter': 'A few taps came before the counter started. They were not counted as responses.',
    'probable-mis-taps': 'A few responses came in under 200 ms — probably mis-taps. They still count.',
    rescored: 'Re-checked under the updated validity rules: a slow pace no longer stops a run from counting, so this run is now scored.',
    'double-taps': 'Some taps came too close together and were ignored as double taps.',
    'practice-below-criterion': 'Practice ended below its usual criterion — keep that in mind when reading this run.',
    'no-digit-matches': 'No answers were recorded in the number-matching part, so the finger-speed comparison is missing for this run.',
    'time-cap': 'The run reached its time limit before every puzzle was answered.',
    'items-replaced': 'A puzzle on screen during a pause was replaced, so nothing you saw counts twice.',
    'time-did-not-rise-with-angle': 'Answer times did not rise with the turn angle, as they usually do in this task.',
    'no-correct-answer-at-one-angle': 'No pair was answered correctly at one of the angles, so the angle pattern could not be checked.',
    'errors-on-unturned-pairs': 'Several errors on pairs that were not turned at all — usually the easiest ones.',
    'fitts-signature-violated': 'The hardest targets were reached faster than the easiest ones, which is unusual for this task.'
  };
  if (known[flag]) return known[flag];
  const words = flag.replace(/[-_]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) + '.' : 'Flagged.';
}

/** a session result's index caption */
export function indexCaption(grade: ReferenceGrade, personal: boolean): string {
  if (personal || grade === 'P') return 'Personal index';
  return grade === 'C' ? 'Reference scale · approximate' : 'Reference scale';
}

/** the Mean's label (SCIENCE.md §2.1, §4.2 — never "brain score") */
export function meanLabel(m: number): string {
  return `Mean — average of ${m} areas`;
}

/** the "Today" composite label (SCIENCE.md §2.1) */
export const TODAY_COMPOSITE_LABEL = 'Today — compared with your typical range';

/* ---------- runner, check-in and tab copy ---------- */

/** "Not measured yet" — an area with no valid run */
export const NOT_MEASURED = 'Not measured yet';

/** §2.9 — a run-in result's label */
export const CALIBRATING_RESULT = 'Calibrating — practice is still raising your score';

/** C6 — shown before a run when today's score for the area is already taken */
export const C6_BEFORE =
  'Today’s score for this area is already in. Another run today is stored as practice and is not scored — one score per area per day.';

/** C6 — shown on a result that was stored as practice */
export const C6_AFTER =
  'Stored as practice — today’s score for this area was already taken, so this run is not scored (one score per area per day).';

/** practice mode (the intro's Practice button) records nothing */
export const PRACTICE_MODE_NOTE = 'Practice complete — nothing was recorded.';

/** C5 class A — the interrupted screen */
export const INTERRUPTED_TITLE = 'Interrupted';
export const INTERRUPTED_BODY =
  'Fixed-time tests can’t be paused: leaving the app, switching windows or rotating the screen ends the run. It is kept as not valid and doesn’t count toward your scores.';

/** C7 — standardisation prompts on the runner intro */
export function standardisationPrompts(opts: { usualTime: string | null; reaction: boolean }): string[] {
  const out = ['Portrait orientation, with Do Not Disturb on.', 'Same device and posture as last time.'];
  out.push(
    opts.usualTime
      ? `You usually measure around ${opts.usualTime} — a similar time (±1 h) keeps days comparable.`
      : 'Try to measure at a similar time each day (±1 h).'
  );
  if (opts.reaction) out.push('Not within 30–60 minutes of waking up — sleep inertia slows everyone down.');
  return out;
}

/** §4.2 — every training card: "Practice for <skill>." */
export function practiceFor(subtitle: string): string {
  return `Practice for ${subtitle.charAt(0).toLowerCase()}${subtitle.slice(1)}.`;
}

/** the About sheet's "how scoring works", in plain words (§2.1–§2.6) */
export const SCORING_STEPS: { title: string; body: string }[] = [
  {
    title: 'Calibration',
    body: 'Your first one to three runs of each test are calibration. You are still learning the test, so these runs are labelled “Calibrating” and never count toward your levels.'
  },
  {
    title: 'Baseline',
    body: `The next ${BASELINE_N} runs, each on a different day, form your personal baseline — then it is frozen, so later changes have something fixed to be compared with.`
  },
  {
    title: 'Typical range',
    body: 'Each day’s score is shown against your recent typical range: within, above or below. One day reflects your state that day — sleep, stress, time of day — not progress.'
  },
  {
    title: 'Weekly verdicts',
    body: 'Progress is judged by week. A change is called reliable only when two weeks in a row are beyond your normal day-to-day ups and downs.'
  },
  {
    title: 'The scale',
    body: 'Every index uses one scale: 50 + 10 × z. On a reference index, 50 is the middle of a published sample for that kind of test and 10 points is one standard deviation. It is not a percentile and not an IQ score.'
  },
  {
    title: 'Grades',
    body: '“Approximate” means the reference comes from a related protocol or device, so treat it as orientation. “Personal” means there is no reference at all: 50 is your own baseline. Change from your own baseline is always the main signal.'
  }
];

/** the About sheet's claims panel (§4.1) */
export const CLAIMS: string[] = [
  'No IQ, no brain age, no “brain score”.',
  'No diagnosis — it cannot detect or rule out any condition.',
  'No ranking against other people.',
  'One device, one series: a new phone starts a new baseline.'
];
