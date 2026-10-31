import type { BrainTestDefinition } from '../../platform/brain/types';
import ShapeColorSwitchTest from './ShapeColorSwitchTest';
import ShapeColorSwitchDemo from './ShapeColorSwitchDemo';
import { shapeColorSwitchIcon } from './icon';

/**
 * Flexibility benchmark — SCIENCE.md §1.12. Grade P: no population norms
 * exist for this protocol, so there is NO reference anchor (and one must not
 * be invented); the area only ever shows a personal index and sits beside
 * the Mean, not in it (§2.1). Protocol constants: logic/protocol.ts.
 */
export const shapeColorSwitchTest: BrainTestDefinition = {
  id: 'shape-color-switch',
  domain: 'flexibility',
  name: 'Shape–Color Switch',
  paradigm: 'MTB Shape-Color Sorting — a cued dimensional change card sort (Novack et al. 2024)',
  tagline: 'Match each picture by shape or by color — whichever the word says.',
  instructions: [
    'A word appears first: shape or color.',
    'Tap the card that matches the picture by that rule.',
    'It is mostly shape — stay ready for color.',
    'Be quick and accurate: each picture waits 2.5 s.'
  ],
  skills: ['Rule switching', 'Overriding a habit', 'Speed with accuracy'],
  durationSec: 100,
  Demo: ShapeColorSwitchDemo,
  component: ShapeColorSwitchTest,
  icon: shapeColorSwitchIcon,
  metrics: [
    {
      id: 'lnRcs',
      label: 'Rate-correct score (log)',
      better: 'higher',
      decimals: 3,
      about: 'Natural log of correct answers per second of response time — the scale personal change is tracked on.'
    },
    {
      id: 'rcs',
      label: 'Correct per second',
      unit: '/s',
      better: 'higher',
      decimals: 2,
      about: 'Correct answers divided by the total response time of the 30 trials (a timeout counts 2.5 s).'
    },
    { id: 'accuracy', label: 'Accuracy', unit: '%', better: 'higher', decimals: 0, about: 'Share of the 30 trials answered correctly.' },
    {
      id: 'medRtShape',
      label: 'Median time · shape',
      unit: 'ms',
      better: 'lower',
      decimals: 0,
      about: 'Median time of correct answers on shape trials, from picture to tap.'
    },
    {
      id: 'medRtColor',
      label: 'Median time · color',
      unit: 'ms',
      better: 'lower',
      decimals: 0,
      about: 'Median time of correct answers on the rarer color trials.'
    },
    {
      id: 'anticipations',
      label: 'Anticipations',
      better: 'lower',
      decimals: 0,
      about: 'Taps less than 200 ms after the picture — faster than a decision, scored as errors.'
    },
    { id: 'timeouts', label: 'Timeouts', better: 'lower', decimals: 0, about: 'Pictures left unanswered for 2.5 s — scored as errors.' },
    {
      id: 'switchCostRt',
      label: 'Switch cost · time',
      unit: 'ms',
      better: 'lower',
      decimals: 0,
      about: 'Exploratory: median correct time right after a rule change minus when the rule repeats. Unreliable from one run — read it pooled over your last 7 valid runs.'
    },
    {
      id: 'switchCostErr',
      label: 'Switch cost · errors',
      unit: 'pts',
      better: 'lower',
      decimals: 0,
      about: 'Exploratory: error rate right after a rule change minus when it repeats, in percentage points. Read it pooled over your last 7 valid runs.'
    }
  ],
  primaryMetric: 'lnRcs',
  reference: null,
  runIn: 3,
  noiseFloor: { abs: 0.05 },
  practiceProne: true,
  stateSensitive: false,
  interruption: 'A',
  perWeek: 2,
  protocolVersion: 1,
  scoringVersion: 1,
  referenceVersion: 1,
  science: {
    summary:
      'Cognitive flexibility — dropping one rule and applying another the moment the cue changes. This is a cued dimensional change card sort faithful to the Mobile Toolbox Shape-Color Sorting test: every picture matches one card by shape and the other by color, and a word says which rule applies, mostly "shape" with an occasional "color". The MTB version had a two-week retest ICC of .78, split-half reliability of .93–.94 and r ≈ .70 with the NIH Toolbox DCCS, with no significant practice effect (Novack et al. 2024).',
    scoring:
      'The primary metric is the rate-correct score — correct answers divided by the summed response time of the 30 scored trials (a timeout adds 2.5 s; an anticipation under 200 ms adds its own time and counts as an error) — tracked as its natural log. No population norms exist for this protocol, so there is no reference index: the area only ever shows a personal index, 50 + 10 × (ln RCS − baseline) / σ_w with a 0.05 floor, beside the Mean rather than in it. Switch costs are exploratory diagnostics with poor single-run reliability (Hedge et al. 2018), meaningful only pooled over the last 7 valid runs; raw scores are never comparable across devices or with published values.',
    deviations: [
      'Original vector pictograms in the MTB pairs (balloon and house scored, dog and car for practice), not MTB’s artwork; the two colors are a blue and an orange that differ in hue and lightness (ΔL* ≈ 26), never red/green [DC].',
      'Cue lead fixed at 500 ms — MTB’s value was not verified; it is held constant because preparation time changes switch costs (Monsell 2003) [DC].',
      'Card sides are drawn per session from the seed; the shape–color pairing on the cards is fixed (balloon blue, house orange; practice dog blue, car orange), and in practice each color keeps the side it has in the scored block [DC].',
      'Trial order [DC]: trial 1 is a shape trial; color trials are never adjacent, at least 2 shape trials apart and never last (6 switches into color, 6 back); at most 6 shape trials in a row; each picture 15 times; correct side 12/12 within shape and 3/3 within color; at most 4 identical pictures or correct sides in a row.',
      'Blank intervals are 15 × 300 ms and 15 × 1,000 ms in shuffled order rather than independent coin flips, so every session has the same timing [DC].',
      'ΣRT counts a timeout as 2.5 s and an anticipation as its own time — MTB’s exact handling is unverified [DC].',
      'An anticipation is a tap under 200 ms after the picture, scored as an error; taps before the picture appears are ignored by scoring (logged) [DC].',
      'Validity [DC]: a run is invalid with more than 3 anticipations or accuracy below 70 %, and when it is interrupted (class A).',
      'Every-session warm-up: 5 mixed trials with a tick or cross, a one-line rule reminder and the right card outlined after an error; repeated once below 4 correct, after which the scored block starts regardless [DC: repeat rule].',
      'First run only: an untimed, coached practice — 2 shape trials, 2 color trials, then one picture under both rules — where a wrong answer is shown and asked again (up to 3 tries) [DC].',
      'A 3-2-1 countdown precedes the scored block (not part of the MTB description), identical in every session [DC].',
      'Cue words are lowercase English ("shape", "color") because the app is English-only; a future translation would be locked per series [DC].',
      'During the scored block every tap gets the same neutral acknowledgement — a soft ring and click, right or wrong — and no correctness feedback, as in MTB [DC: acknowledgement].',
      'The median-time metrics and the time switch cost are left out of a run that has no eligible correct trials of that kind (for example, every color trial wrong) rather than invented; such a run is still valid if it meets the rules above.',
      'On desktop, ← or F answers the left card and → or J the right card.'
    ],
    references: [
      {
        label: 'Novack et al. (2024) · Journal of the International Neuropsychological Society',
        url: 'https://doi.org/10.1017/S1355617724000225',
        note: 'Mobile Toolbox Shape-Color Sorting: the protocol copied here, its rate score, retest ICC .78 and validity.'
      },
      {
        label: 'Zelazo et al. (2014) · Journal of the International Neuropsychological Society',
        url: 'https://doi.org/10.1017/S1355617714000472',
        note: 'The NIH Toolbox dimensional change card sort in adults — the paradigm MTB adapted to phones.'
      },
      {
        label: 'Monsell (2003) · Trends in Cognitive Sciences',
        url: 'https://doi.org/10.1016/S1364-6613(03)00028-7',
        note: 'Switch costs and the preparation effect — why the cue lead is held constant.'
      },
      {
        label: 'Hughes et al. (2014) · Behavior Research Methods',
        url: 'https://doi.org/10.3758/s13428-013-0411-5',
        note: 'Rate-based scores are more reliable and valid than switch costs in task switching.'
      },
      {
        label: 'Hedge, Powell & Sumner (2018) · Behavior Research Methods',
        url: 'https://doi.org/10.3758/s13428-017-0935-1',
        note: 'The reliability paradox: why switch costs make poor individual scores.'
      }
    ]
  }
};
