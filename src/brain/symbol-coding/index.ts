import type { BrainTestDefinition } from '../../platform/brain/types';
import { METRICS, PARAMS, PRIMARY_METRIC, REFERENCE } from './logic/meta';
import { SymbolCodingTest } from './SymbolCodingTest';
import { SymbolCodingDemo } from './SymbolCodingDemo';
import { symbolCodingIcon } from './icon';

/**
 * Processing Speed benchmark — symbol–digit coding (SCIENCE.md §1.11).
 * Every number below is the dossier's; deviations are listed in
 * `science.deviations`.
 */
export const symbolCodingTest: BrainTestDefinition = {
  id: 'symbol-coding',
  domain: 'speed',
  name: 'Symbol Coding',
  paradigm:
    'Symbol Digit Modalities Test, smartphone self-test version with a new key every session (van Oirschot et al. 2020; Pham et al. 2021), plus a 15-second digit-matching motor baseline (Woelfle et al. 2021)',
  tagline: 'See a symbol, tap its number — as many as you can in 90 seconds.',
  instructions: [
    'The key at the top pairs nine symbols with the numbers 1 to 9.',
    'Find the symbol shown in the middle in the key and tap its number.',
    'Work as fast as you can without mistakes, for 90 seconds.',
    'Ten practice symbols and a 15-second number match come first.'
  ],
  skills: ['Processing speed', 'Visual scanning', 'Symbol–number matching'],
  durationSec: 140,
  Demo: SymbolCodingDemo,
  component: SymbolCodingTest,
  icon: symbolCodingIcon,
  metrics: METRICS,
  primaryMetric: PRIMARY_METRIC,
  reference: REFERENCE,
  ...PARAMS,
  protocolVersion: 1,
  scoringVersion: 1,
  referenceVersion: 1,
  science: {
    summary:
      'Processing speed is how fast simple, well-practised operations run under time pressure, and symbol–digit substitution is its standard marker: valued for sensitivity (it moves with sleep restriction, depression, alcohol, sedating drugs and age) rather than specificity, because it also draws on motor speed, visual scanning and incidental learning. The smartphone version is the best-validated self-administered phone test of cognition (ICC .86–.90), and a new random key every session gives unlimited alternate forms of matched difficulty.',
    scoring:
      'The primary score is SDS90, the number of symbols coded correctly in the 90-second block; errors, accuracy, DM90 (6 × correct number matches in the 15-second motor baseline) and the median time between correct answers are secondary, and the coding ratio SDS90/DM90 and the within-block learning slope are diagnostics only. The reference index is 50 + 10z with z = (SDS90 − 54)/9, grade C: 54 is the healthy-volunteer median on a smartphone test (Pham et al. 2021) and 9 is derived from Lam et al. 2022 (SDC 8.58, ICC .882), a sample that mixed people with multiple sclerosis and controls. Phone versions score about 8–12% below the paper and oral SDMT and no age adjustment is applied yet, so change from your own baseline is the primary signal.',
    deviations: [
      'Original abstract glyphs instead of the published SDMT symbols: a fixed pool of 40 glyphs of 2–3 strokes (lines or curves) on a 3×3 lattice, each spanning the whole lattice with 4.85–6.9 lattice units of ink, chosen from about 50,000 enumerated candidates and screened by eye to exclude anything resembling a Latin letter, a digit, a common symbol or a familiar icon [DC].',
      'No two pool glyphs are rotations or mirror images of each other, and the rule is extended to near-misses: two glyphs whose inked areas overlap by an intersection-over-union of 0.6 or more under any rotation or mirror image are never drawn into the same key (no pool pair reaches 0.75), so every key is an alternate form of similar difficulty [DC]. Each session draws 9 test glyphs and 9 different practice glyphs in a random glyph-to-digit order from the run seed — a new key every session, as in the smartphone test.',
      'All 9 glyphs are used from the first item (as in the sSDMT; the paper SDMT starts with 6), in back-to-back shuffled sets of 9 with no immediate repeat across set boundaries; 200 coding items are pre-generated [DC].',
      'The answer pad is a 3×3 phone-order keypad that deliberately does not mirror the 1→9 key strip, so the digit has to be read rather than matched by position [DC].',
      'Practice runs every session: 10 untimed items on the practice key with green/red feedback for 250 ms; at least 8 of 10 must be right, otherwise practice repeats once, and a run still below 8/10 after the repeat continues with the quality flag practice-below-criterion instead of being stopped [DC].',
      'After a wrong practice answer the correct key cell stays lit for 700 ms before the next item (corrective feedback); right answers advance after the specified 250 ms [DC].',
      'The first run adds three guided items before the practice (the symbol\'s key cell lit for items 1–2, its pad key also lit for item 1; a miss is retried with the answer shown); they are not logged [DC].',
      'A 3-2-1 countdown also precedes the 15-s motor baseline (the dossier lists one only before the coding block), so both timed parts start from the same ready position rather than from the Start button [DC].',
      'The scored key stays hidden until the first coding item appears at Go (it is revealed in the same frame), so it cannot be studied before the clock starts [DC].',
      'Neutral acknowledgement in the timed parts: the pressed key\'s paint-only press animation and one identical soft tick (plus a haptic tap where supported) for every registered response, and the same neutral lock sound when each timed part ends; no correctness signal, no score or timer on the stage (elapsed time shows only as the runner\'s progress bar) [DC].',
      'On a computer the number keys 1–9 answer as well as the on-screen pad; both register on key-down or pointer-down with the event\'s own timestamp [DC].',
      'Sizes follow the phone rather than fixed pixels: the target glyph is about 108–136 px tall (the dossier says about 96 px) and the key glyphs about 32 px (about 28 px), in 9 key cells at least 36 px wide, with keypad keys 56–68 px tall [DC].',
      'Taps less than 120 ms after the previous registered response are ignored and logged, as are taps that arrive before an item\'s frame ran; more than 5 ignored taps across both timed parts flags the run (double-taps) without invalidating it [DC].',
      'Validity: invalid with fewer than 20 correct (the MS sherpa outlier rule), accuracy below 80% [DC], any gap over 5 s without a response, counted from the first item\'s onset to the first answer and from the last answer to the 90-s lock as well [DC], or all 200 items used before 90 s [DC]. Hiding the page, losing focus for over 1 s or rotating invalidates the run (class A, enforced by the runner).',
      'The learning slope counts correct answers per minute (last 30 s minus first 30 s) [DC]; the coding ratio is reported as 0, with the flag no-digit-matches, when the motor baseline had no correct match. Both are diagnostics only.',
      'The frame-interval distribution of the coding block is stored as one summary row (frames, median, 95th percentile, maximum, frames over 50 ms) rather than every interval, and the same row carries the app version that ran the session [DC].',
      'The index uses a grade C literature anchor without age bands: Kiely et al. 2014 and Strober et al. 2020 age norms, minus the 8–12% phone offset, are a future calibration task.'
    ],
    references: [
      {
        label: 'Pham et al. (2021) · npj Digital Medicine',
        url: 'https://doi.org/10.1038/s41746-021-00401-y',
        note: 'Smartphone symbol–digit test: healthy median 54 per 90 s (the anchor), ICC .87–.90, learning plateau after about 8 sittings.'
      },
      {
        label: 'Lam et al. (2022) · Multiple Sclerosis Journal',
        url: 'https://doi.org/10.1177/13524585211018103',
        note: 'Single-test ICC .882 and SDC 8.58 (the anchor SD of about 9), weekly-mean reliability, morning–evening difference.'
      },
      {
        label: 'van Oirschot et al. (2020) · JMIR mHealth and uHealth',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7573704/',
        note: 'Validation of the sSDMT with a random key each session; ICC .86–.87 and the practice curve in controls.'
      },
      {
        label: 'Woelfle et al. (2021) · Journal of Medical Internet Research',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8663564/',
        note: 'Long-term practice effects of the smartphone SDMT and the digit-matching (dexterity) correction.'
      },
      {
        label: 'Benedict et al. (2017) · Multiple Sclerosis Journal',
        url: 'https://doi.org/10.1177/1352458517690821',
        note: 'The SDMT as a cognitive outcome measure; the group-level responder change of about 4 points or 10%.'
      }
    ]
  }
};
