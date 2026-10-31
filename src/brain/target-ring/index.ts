import type { BrainTestDefinition } from '../../platform/brain/types';
import { TargetRingTest } from './TargetRingTest';
import { TargetRingDemo } from './TargetRingDemo';
import { targetRingIcon } from './icon';
import { REF_TP_MEAN, REF_TP_SD, referenceZ } from './logic/reference';

/**
 * Target Ring — the Precision benchmark. SCIENCE.md §1.9 is its spec; any
 * change to the protocol, the scoring or the anchor updates that section and
 * bumps the matching version below.
 */
export const targetRingTest: BrainTestDefinition = {
  id: 'target-ring',
  domain: 'precision',
  name: 'Target Ring',
  paradigm: 'ISO 9241-411 multidirectional tapping, scored by effective throughput (Soukoreff & MacKenzie 2004; MacKenzie 2015)',
  tagline: 'Tap each lit circle as the light jumps across the ring — speed and accuracy as one number.',
  instructions: [
    'Hold the phone in one hand and tap with the other index finger (or rest it on a table) — the same way every time.',
    'Tap the lit circle to start a ring.',
    'The light jumps across the ring: tap each lit circle as quickly and accurately as you can.',
    'An occasional miss is fine — every tap counts.'
  ],
  skills: ['Touch aiming', 'Speed–accuracy balance', 'Eye–hand coordination'],
  durationSec: 105,
  Demo: TargetRingDemo,
  component: TargetRingTest,
  icon: targetRingIcon,
  metrics: [
    {
      id: 'tp',
      label: 'Throughput',
      unit: 'bits/s',
      better: 'higher',
      decimals: 2,
      about: 'Effective throughput (ISO 9241-411): how much aiming information your taps deliver per second — speed and accuracy in one number.'
    },
    {
      id: 'mtMs',
      label: 'Time per tap',
      unit: 'ms',
      better: 'lower',
      decimals: 0,
      about: 'Mean time between taps, averaged over the four ring sizes.'
    },
    {
      id: 'errorRate',
      label: 'Misses',
      unit: '%',
      better: 'lower',
      decimals: 1,
      about: 'Taps that landed outside the lit circle. Around 4% is typical when speed and accuracy are balanced.'
    },
    {
      id: 'tightness',
      label: 'Tightness',
      unit: 'mm',
      better: 'lower',
      decimals: 1,
      about: 'Effective width on the 7 mm targets: the spread of your taps along the movement (4.133 × its SD). Smaller is tighter.'
    },
    {
      id: 'pxPerMm',
      label: 'Screen scale',
      unit: 'px/mm',
      better: 'higher',
      decimals: 2,
      about: 'CSS pixels per millimetre assumed for this screen (the uncalibrated default). Recorded for comparability — not a performance measure.'
    },
    {
      id: 'scale',
      label: 'Board scale',
      unit: '×',
      better: 'higher',
      decimals: 2,
      about: 'How large the rings were drawn (1 = full size; below 0.9 the run is flagged as not comparable). Recorded — not a performance measure.'
    }
  ],
  primaryMetric: 'tp',
  reference: {
    grade: 'C',
    anchor: `16 young adults (mean age 24.3) tapping with a finger on a Nexus 4 phone in a 20-target ISO ring averaged ${REF_TP_MEAN} bits/s (MacKenzie 2015); the SD of ${REF_TP_SD} is a working estimate.`,
    z: (metrics) => referenceZ(metrics.tp)
  },
  runIn: 1,
  noiseFloor: { relative: 0.03 },
  practiceProne: false,
  stateSensitive: false,
  interruption: 'B',
  perWeek: 1,
  protocolVersion: 1,
  scoringVersion: 1,
  referenceVersion: 1,
  science: {
    summary:
      'Target Ring measures touch-aiming precision with the ISO 9241-411 multidirectional tapping task: 13 targets on a ring, the highlight jumping straight across it, every tap a selection. Its score, effective throughput in bits per second, folds speed and accuracy into one number that stays roughly constant whether you choose to be quick or careful (MacKenzie & Isokoski 2008). It is a psychomotor skill — aiming with your finger on this screen — not intelligence and not general dexterity.',
    scoring:
      'Each tap gives its signed overshoot dx along the movement and an effective amplitude ae (the serial-task method of MacKenzie 2015). For each of the four ring sizes, pooling its three rings after exclusions, We = 4.133 × SD(dx), IDe = log2(mean ae / We + 1) and TP = IDe / mean time between taps; the session throughput is the mean of the four (the "mean of means" of Soukoreff & MacKenzie 2004), never a pooled or single-tap value. The index, 50 + 10 × (TP − 6.39) / 0.9, is anchored to one small study of 16 young adults on a Nexus 4 phone, so it is approximate (grade C); change from your own baseline is the signal that matters.',
    deviations: [
      'No bank-card calibration in this version: every device uses the documented default of 6.2 CSS px per mm, so physical sizes are approximate (phones differ by roughly ±15%). The px/mm value and the board scale s are stored with every run.',
      'The board scale is s = min(1, board side / (52 mm × px/mm)); on a smaller board all geometry, the hit radius and the 20 mm gross-miss rule shrink by s, and s < 0.9 is flagged "not comparable".',
      'For the first scored tap of a ring, "from" is the start tap\'s touch point; for later taps it is the previous target\'s centre, the previous overshoot entering through dx_prev (dx = 0 at the start of each ring). The dx chain continues through excluded taps.',
      'The unscored start tap must land within W/2 + 3 mm of target 0; a tap elsewhere is ignored (a neutral ring) so every ring starts from a defined point.',
      'A hit is a touch within W/2 of the target centre — the drawn disc.',
      'Error rate = misses / counted (non-excluded) taps of the scored rings; the ≤ 25% validity rule uses the same number.',
      'A ring with more than 3 exclusions is invalid and contributes no taps; its slot is re-run once at the end, and a failed re-run leaves the slot invalid.',
      'Interruptions: a pause, hidden page, rotation or a board resize of 2 px or more during a ring voids it and appends a replacement at the end; a pause between rings voids nothing, and practice / warm-up rings simply restart. More than 2 voided scored rings make the run invalid (the limit Memory uses).',
      'Round order: each round is a seeded shuffle of the four ring sizes, redrawn so a round never repeats the previous round\'s order and no size runs twice in a row across rounds.',
      'Target 0 sits at 12 o\'clock and targets are numbered clockwise. A faint guide circle joins the 13 positions, and the lit disc has the app\'s extruded bottom edge drawn inside its outline (its silhouette is exactly W).',
      'The 1.2 s card between rings lives in the bottom card, so the new ring stays in view as it fades in; input is locked until target 0 lights.',
      'Sounds: a soft tick for a hit and a thud for a miss; no haptics (the spec names none, and iOS has no vibration API). Under reduced motion the hit pulse and the miss ring fade without scaling.',
      'Time per tap is the mean of the four per-condition mean intervals; tightness is the mean We of the two 7 mm conditions. The Fitts fit MT = a + b × IDe (least squares over the four conditions) is shown as a highlight only.',
      'First run only: a 3-step animated tutorial, then 2 practice rings — the easiest (D 20, W 12) and the hardest (D 40, W 7) — each followed by corrective coaching on its hits and pace. Nothing from them is stored.',
      'There is no countdown: every ring starts on the player\'s own tap.',
      'The session\'s pointer type is fixed by its first touch and other pointer types are ignored. Mouse and pen sessions are flagged (input-mouse / input-pen): the touch anchor does not apply to them, but the shared reference function cannot see the input kind.'
    ],
    references: [
      {
        label: 'MacKenzie (2015) · HCI International 2015, LNCS 9170',
        url: 'https://www.yorku.ca/mack/hcii2015a.html',
        note: 'Smartphone finger throughput (6.39 bits/s in 2D) and the serial-task computation of effective amplitude and width.'
      },
      {
        label: 'Soukoreff & MacKenzie (2004) · International Journal of Human-Computer Studies',
        url: 'https://www.yorku.ca/mack/ijhcs2004.html',
        note: 'The ISO 9241-9 / 411 procedure: effective width from endpoint scatter and throughput as the mean of per-condition means.'
      },
      {
        label: 'MacKenzie & Isokoski (2008) · CHI 2008',
        url: 'https://www.yorku.ca/mack/chi2008-p1633.pdf',
        note: 'Throughput stays stable when people trade speed for accuracy or the reverse.'
      },
      {
        label: 'Bi, Li & Zhai (2013) · CHI 2013',
        url: 'https://research.google/pubs/pub41645/',
        note: 'Finger-touch error rates by target size — why targets are at least 7 mm — and the gross-miss outlier rule.'
      },
      {
        label: 'Pronk et al. (2020) · Behavior Research Methods',
        url: 'https://doi.org/10.3758/s13428-019-01321-2',
        note: 'Touchscreen timing in browsers: requestAnimationFrame onsets and the touch-latency jitter that adds about 2% noise here.'
      }
    ]
  }
};
