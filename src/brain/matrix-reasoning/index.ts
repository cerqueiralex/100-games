import type { BrainTestDefinition } from '../../platform/brain/types';
import { zFrom } from '../../platform/brain/timing';
import { MatrixReasoningTest } from './MatrixReasoningTest';
import { MatrixReasoningDemo } from './MatrixReasoningDemo';
import { matrixReasoningIcon } from './icon';
import { rescoreRun } from './logic/protocol';

/**
 * Matrix Reasoning — the Analysis benchmark (SCIENCE.md §1.8): generated 3×3
 * figural matrices from the Sandia rule set, a balanced 8-option answer set,
 * MaRs-IB timing and a 12-item adaptive test scored by EAP under a 3PL model.
 * Pure logic in ./logic (validate imports it), fidelity check in
 * scripts/brain-checks/matrix-reasoning.ts.
 */
export const matrixReasoningTest: BrainTestDefinition = {
  id: 'matrix-reasoning',
  domain: 'analysis',
  name: 'Matrix Reasoning',
  paradigm: 'Generated figural matrices with adaptive IRT (Sandia Matrices — Matzen et al. 2010; MaRs-IB timing — Chierchia et al. 2019)',
  tagline: 'Find the rule, complete the pattern',
  instructions: [
    'Each 3×3 pattern follows rules along its rows and columns.',
    'Pick the piece that completes it: tap to select, tap again (or Confirm) to answer.',
    '12 patterns, 30 s each, adapting to your level. No feedback until the end.'
  ],
  skills: ['Pattern reasoning', 'Rule finding', 'Juggling several relations'],
  durationSec: 200,
  Demo: MatrixReasoningDemo,
  component: MatrixReasoningTest,
  icon: matrixReasoningIcon,
  metrics: [
    {
      id: 'theta',
      label: 'Ability (θ)',
      unit: 'logits',
      better: 'higher',
      decimals: 2,
      about: 'Adaptive ability estimate (EAP, 3PL model). 0 is the difficulty an average Sandia norming participant solved 56% of the time.'
    },
    {
      id: 'se',
      label: 'Estimate precision (SE)',
      unit: 'logits',
      better: 'lower',
      decimals: 2,
      about: 'Posterior SD of θ — about 0.55 after 12 well-targeted patterns.'
    },
    {
      id: 'accuracy',
      label: 'Accuracy',
      unit: '%',
      better: 'higher',
      decimals: 0,
      about: 'Valid patterns solved (timeouts count as wrong). Items adapt to you, so accuracy stays similar as ability changes — θ is the score.'
    },
    {
      id: 'opAccuracy',
      label: 'Operation accuracy',
      unit: '%',
      better: 'higher',
      decimals: 0,
      about: 'Of the three attributes each answer set varies, how many your chosen piece got right (operation-level scoring, as in HeiQ).'
    },
    {
      id: 'rtCorrect',
      label: 'Time to a correct answer',
      unit: 's',
      better: 'lower',
      decimals: 1,
      about: 'Median time from the pattern appearing to a correct answer (30 s when none was correct).'
    },
    { id: 'timeouts', label: 'Timeouts', better: 'lower', decimals: 0, about: 'Patterns that ran out of the 30-s window (scored as wrong).' },
    {
      id: 'rapidGuesses',
      label: 'Rapid guesses',
      better: 'lower',
      decimals: 0,
      about: 'Answers under 1.5 s — left out of θ; 3 or more make the run invalid.'
    }
  ],
  primaryMetric: 'theta',
  reference: {
    grade: 'C',
    anchor:
      'θ = 0 is the difficulty that the average participant of the Sandia matrices norming sample — 80 college students, 4 responses per item (Matzen et al. 2010) — solved 56% of the time; a coarse anchor, probably above the population average.',
    z: (metrics) => zFrom(metrics.theta, 0, 1, 'higher')
  },
  runIn: 3,
  noiseFloor: { abs: 0.55 },
  practiceProne: true,
  stateSensitive: false,
  interruption: 'B',
  perWeek: 1,
  protocolVersion: 1,
  /** v2 (2026-11-03): C13 validity — a run the time cap cuts short is scored, not discarded; v1 runs are rescored from their logs */
  scoringVersion: 2,
  referenceVersion: 1,
  rescore: rescoreRun,
  science: {
    summary:
      'Fluid reasoning: inferring the relations that govern a figural pattern you have never seen and applying them to complete it. Matrices are the canonical language-free marker of it; this version builds every item from Carpenter’s rule types as operationalised in the Sandia generator, so there are no fixed items to memorise and no copyrighted content. Eight options per item are built so that elimination, counting and other strategies that ignore the matrix stay at chance, and 12 items are chosen adaptively so each session works near your level.',
    scoring:
      'θ is the expected-a-posteriori ability under a 3PL model (a = 1, c = 1/8, a fixed difficulty b per class derived from Sandia norming accuracy, prior N(0, 1), quadrature −4…4 in 0.05 steps); its SE is the posterior SD, about 0.55 after 12 items. Answers under 1.5 s are excluded as rapid guesses, and 3 or more of them make the run invalid. A run the 240-s cap cuts short is scored from the items it answered — a slow run is a low score, never an invalid one (SCIENCE.md C13) — and its SE, shown as ± index points, carries the lower precision. The reference index is 50 + 10θ (grade C, approximate): θ = 0 is the difficulty an average participant of the Sandia sample (80 college students) solved 56% of the time. Change from your own baseline is the primary signal, and early gains are partly practice on the test (run-in of 3 sessions).',
    deviations: [
      'Our implementation of the paradigm, not the original instrument: items come from our own generator following the Sandia rule set and MaRs-IB timing, so scores are not interchangeable with Sandia, MaRs-IB, Raven or ICAR scores.',
      'Attributes and levels are design choices: 5 shapes ordered by number of sides, 5 sizes (40–100% of the cell in 15% steps), 5 shades of the theme’s ink (luminance only, never hue — MaRs-IB’s colour-vision caveat), 8 rotations of 45° made visible by a marker dot, 1–4 copies, 9 sub-grid positions, and a ring of 6 rays as the logic layer.',
      'Distribution of three and diagonal repetition are generated as one rule with two directions: on a 3×3 grid every Latin square is a diagonal repetition ((c − r) or (r + c) constant).',
      'Outward progression is v = s + k·max(r, c) — our reading of Sandia’s “outward” direction, not verified against its source.',
      'Progressions also run down columns; steps of ±2 (90° turns) are used only for rotation and only from class D4 up (“±2 at high levels”).',
      'Copies, sub-grid positions and the ray ring use a fixed figure size, because a 15% step of a small figure is not distinct on a phone; layouts are drawn one figure 60%, copies 20%, sub-grid position 20%, and position only carries categorical rules (constant, diagonal).',
      'One item never uses the same rule kind twice, and a class-purity guard rejects any item that an easier rule family also explains, so the class (and its b) is the easiest way the item can be solved.',
      'D7 is drawn half “three relations including outward”, half figure addition/subtraction; D9 pairs XOR/AND rays with one progression or diagonal on a second attribute (its b = +1.9 is extrapolated and provisional).',
      'Wrong values are misapplications whose correct/wrong pairs are exchangeable: another row’s or column’s value, stepping the wrong way, another diagonal value, the opposite corner for outward, another logic operator (else another row’s result) with the same ray count, and the adjacent level for constant attributes. “Repeating the adjacent cell” is not used for progressions, because at the ends of a 5-level scale it lets the more extreme option be guessed without the matrix.',
      'The ambiguity guard also checks the reversed subtraction and every logic operator applied down the columns.',
      'Select-then-confirm answering (tap twice, or tap and Confirm); the response time is taken at the commit.',
      'No countdown before the block (§1.8 lists none): each item starts after its 500-ms blank. The 5-s countdown ring from 25 s ticks softly each second.',
      'First-run practice is untimed and ends after 3 correct items or 8 attempts (classes D1, D2, D5, D3, D7, D8, D4, D6 in that order); the per-session warm-up (one D2 item) is timed like scored items and shows the answer, which C1 allows.',
      'During the 500-ms blank the empty cell frames and answer tiles stay on screen — only their content is blank — so nothing moves at onset.',
      'Desktop keys: 1–8 select an option, the same key again or Enter answers.',
      'The optional post-block review screen is not implemented in version 1.',
      'Interruptions: the 240-s cap counts active time only; a pause while an item is showing voids it and a new item from the same class follows; a pause during the blank replays the same item; a 4th void makes the run invalid.',
      'When no answer was correct, the median correct time is reported as 30 s (the window) so the metric stays finite.',
      'The starting θ0 uses the last 5 valid sessions stored on this device; it only steers the first item — the prior stays N(0, 1). Exact ties in item selection go to the easier class.',
      'Voided items stay in the trial log (kinds 2 and 3) for audit; they never enter scoring.'
    ],
    references: [
      {
        label: 'Matzen et al. (2010) · Behavior Research Methods',
        url: 'https://doi.org/10.3758/BRM.42.2.525',
        note: 'The Sandia generator: rule types, directions, the 2×4 answer layout and norming accuracy by number of relations — the source of the difficulty classes.'
      },
      {
        label: 'Chierchia et al. (2019) · Royal Society Open Science',
        url: 'https://doi.org/10.1098/rsos.190232',
        note: 'MaRs-IB: the 500-ms blank, 30-s window with a countdown from 25 s, the 3-correct practice criterion and the colour-vision caveat.'
      },
      {
        label: 'Zorowitz et al. (2024) · Behavior Research Methods',
        url: 'https://doi.org/10.3758/s13428-023-02067-8',
        note: 'IRT analysis of MaRs-IB: 12-item forms reach reliability ≈ .70; retest r = .71.'
      },
      {
        label: 'Carpenter, Just & Shell (1990) · Psychological Review',
        url: 'https://doi.org/10.1037/0033-295x.97.3.404',
        note: 'The five rule types matrices are built from.'
      },
      {
        label: 'Pallentin, Danner & Rummel (2023) · Journal of Intelligence',
        url: 'https://doi.org/10.3390/jintelligence11040073',
        note: 'HeiQ: operation-oriented distractors and operation-level scoring.'
      },
      {
        label: 'Arendasy & Sommer (2013) · Intelligence',
        url: 'https://doi.org/10.1016/j.intell.2013.03.006',
        note: 'Answer sets that block response elimination improve construct validity.'
      },
      {
        label: 'Scharfen, Peters & Holling (2018) · Intelligence',
        url: 'https://doi.org/10.1016/j.intell.2018.01.003',
        note: 'Retest gains on reasoning tests plateau by the third administration — the 3-session run-in.'
      }
    ]
  }
};
