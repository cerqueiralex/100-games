import type { BrainTestDefinition } from '../../platform/brain/types';
import { mirrorTwinsIcon } from './icon';
import { MirrorTwinsDemo } from './MirrorTwinsDemo';
import { MirrorTwinsTest } from './MirrorTwinsTest';
import { FIT_UNITS, VIEW_UNITS } from './logic/geometry';
import { ANGLES } from './logic/protocol';
import { REF_MEAN, REF_SD, referenceZ } from './logic/scoring';

/**
 * Mirror Twins — the Spatial benchmark (SCIENCE.md §1.13): Shepard–Metzler
 * 3D mental rotation, same vs mirror, on the Ganis & Kievit (2015) angle grid.
 * Every parameter below is the dossier's; the deviations list says where and
 * why this implementation differs from the source protocol.
 */
export const mirrorTwinsTest: BrainTestDefinition = {
  id: 'mirror-twins',
  domain: 'spatial',
  name: 'Mirror Twins',
  paradigm: 'Shepard–Metzler 3D mental rotation, same vs mirror (Shepard & Metzler 1971; angles and anchors from Ganis & Kievit 2015)',
  tagline: 'Same shape turned — or its mirror image?',
  instructions: [
    'Two 3D shapes appear side by side.',
    'Tap Same if the right one is the left one turned; tap Mirror if it is its mirror image.',
    'No turn ever lines up a mirror image. Be quick, but accurate.',
    'On a keyboard: F for Same, J for Mirror.'
  ],
  skills: ['Mental rotation', '3D visualisation', 'Speed with accuracy'],
  durationSec: 155,
  Demo: MirrorTwinsDemo,
  component: MirrorTwinsTest,
  icon: mirrorTwinsIcon,
  metrics: [
    {
      id: 'rcs',
      label: 'Rotation efficiency',
      unit: '/min',
      better: 'higher',
      decimals: 1,
      about: 'Correct pairs per minute of answering time (rate-correct score): speed and accuracy in one number.'
    },
    {
      id: 'accuracy',
      label: 'Accuracy',
      unit: '%',
      better: 'higher',
      decimals: 0,
      about: 'Pairs judged correctly; a timeout counts as an error. Young adults on a desktop averaged about 88.8% (Ganis & Kievit 2015).'
    },
    {
      id: 'medianRt',
      label: 'Median time (correct)',
      unit: 'ms',
      better: 'lower',
      decimals: 0,
      about: 'Your typical time to a correct answer.'
    },
    {
      id: 'ies',
      label: 'Inverse efficiency',
      unit: 'ms',
      better: 'lower',
      decimals: 0,
      about: 'Median correct time divided by accuracy — a second speed–accuracy composite.'
    },
    ...ANGLES.map((a) => ({
      id: `rt${a}`,
      label: `Time at ${a}°`,
      unit: 'ms',
      better: 'lower' as const,
      decimals: 0,
      about:
        a === 0
          ? 'Median correct time when the right shape is not turned at all.'
          : `Median correct time when the right shape is turned ${a}°. Time rising with the angle is the signature of turning a shape in your mind.`
    }))
  ],
  primaryMetric: 'rcs',
  reference: {
    grade: 'C',
    anchor: `54 young adults (mean age 22.3) judged shaded 3D figures with a desktop keyboard at 0–150° (Ganis & Kievit 2015); ${REF_MEAN} ± ${REF_SD} correct pairs per minute is derived from their published group means, so the index is approximate.`,
    z: (metrics) => referenceZ(metrics)
  },
  runIn: 3,
  noiseFloor: { relative: 0.05 },
  practiceProne: true,
  stateSensitive: false,
  interruption: 'B',
  perWeek: 2,
  protocolVersion: 1,
  scoringVersion: 1,
  referenceVersion: 1,
  science: {
    summary:
      'Visuospatial processing (CHC Gv) through its best-studied component, mental rotation: deciding whether two differently oriented 3D figures are the same object or mirror images (Shepard & Metzler 1971). Response time rises roughly linearly with the angle between them, the signature of turning one figure in your mind, which gives every run a built-in check. Figures are generated from each run’s seed and checked for chirality, so no item repeats across sessions and every mirror pair has a right answer.',
    scoring:
      'The primary score is rotation efficiency, the rate-correct score: correct pairs divided by the summed response time of all valid pairs, in minutes. Timeouts count as errors at 7 s; anticipations under 250 ms and interrupted pairs are excluded. The index is 50 + 10z with z = (RCS − 20.4) / 6, a grade-C anchor derived from the group means of Ganis & Kievit (2015) — mean RT ≈ 2.61 s and accuracy ≈ 88.8% — whose SD of 6 per minute is an assumption. The RT-vs-angle slope (anchor 9.56 ms per degree) is a diagnostic only, shown at most as a 5-session rolling estimate: single-session slopes are unreliable (Hirschfeld et al. 2013), so change from your own baseline is the primary signal.',
    deviations: [
      'Stimuli are procedurally generated, flat-toned polycubes (10 cubes, 4 arms of 2–4 cubes, 3 right-angle bends) drawn on a phone, not Ganis & Kievit’s rendered shaded objects — scores are not interchangeable with theirs.',
      '40 scored trials (θ 0/50/100/150° × same/mirror × 5) instead of their 96, and a 7,000 ms timeout instead of 7,500 ms.',
      'Answers on two on-screen pads read on pointerdown (F/J on a keyboard) instead of a desktop keyboard; touch adds about 58–70 ms to every RT (Pronk et al. 2020), constant within one device.',
      'Mirror twins are reflected in the picture’s frame (left–right) and then turned s·θ about the vertical axis, so at 0° a mirror twin is the reference flipped left–right and θ means the same for both answers.',
      'Acceptance rule 2 is read literally: a corner cube belongs to both of its arms, so a 2-cube middle arm (whose two corners touch) is rejected and 2-cube arms only occur at the ends.',
      'Visibility rule: in both views a trial shows, every cube keeps at least 25% of one face visible, counting only faces whose full projection is at least 0.2 of a unit square (near edge-on slivers cannot satisfy it), measured on a 12-pixel-per-edge raster; no arm within 15° of the line of sight (never possible at 25° elevation, still checked).',
      `Every view must fit ${FIT_UNITS} cube edges and is drawn in a square ${VIEW_UNITS} edges wide centred on its own bounds, so cube size is the same on both plates and across the session; the reference yaw is redrawn up to 6 times, then a new figure, until both views pass.`,
      'Three flat face tones (top, left-facing, right-facing) derived from the Spatial area colour with a 1.5 px darker edge; the reference sits on the left plate, the comparison on the right, with a fixation dot centred between them during the 300 ms blank.',
      'The turn direction s is near-balanced inside every angle × answer cell (3/2 or 2/3) rather than drawn independently.',
      'Anticipations (< 250 ms) are excluded and the trial re-queued once at the end of the block with a fresh figure of the same condition; a second anticipation loses the trial. A timed-out pair gets no acknowledgement (nothing was pressed).',
      'Validity: invalid below 65% accuracy (raised from 60%: a pure guesser reaches 60% in about 13% of 40-trial runs, 65% in about 4%), or when anticipations plus timeouts exceed 20% of the 40 planned trials (8). Quality flags that never invalidate: no positive RT-vs-angle slope, accuracy at 0° under 75%, an angle with no correct answer (its median is then reported at the 7,000 ms ceiling).',
      'Interruptions (class B): a pause or leaving the page voids the pair on screen and replaces it with a fresh figure of the same condition; the scored block resumes after a 3-2-1. More than 3 pauses or more than 60 s paused in the scored block makes the run invalid (limits chosen to match the Memory benchmark).',
      'A 3-2-1 countdown precedes the scored block; the source protocol has none, and it changes nothing inside the block.',
      'Scored-block feedback is neutral only — the pressed pad’s press flash, a quiet ring and a tap sound, identical for every answer. The every-run warm-up (4 pairs, one per angle, two same and two mirror) shows corrective feedback with a coach line: right, wrong, too slow and too quick each have their own words, glyph and sound, and a too-quick warm-up pair is shown once more with a new figure.',
      'First-run practice: 8 pairs ramping 0° → 150° (one same and one mirror pair per angle) with corrective feedback and an animated turn-back of the right figure (a same pair lines up; a mirror pair lands reversed across a mirror line); a too-quick answer re-shows the pair with a new figure; repeated with new figures until 6 of 8 are right, at most 3 rounds in all (then the run continues).'
    ],
    references: [
      {
        label: 'Shepard & Metzler (1971) · Science',
        url: 'https://doi.org/10.1126/science.171.3972.701',
        note: 'The paradigm: same-or-mirror judgements of rotated cube figures, with time rising linearly with the angle.'
      },
      {
        label: 'Ganis & Kievit (2015) · Journal of Open Psychology Data',
        url: 'https://doi.org/10.5334/jopd.ai',
        note: 'A validated 3D figure set at 0/50/100/150° — the angle grid and the RT, error and slope anchors.'
      },
      {
        label: 'Hirschfeld, Thielsch & Zernikow (2013) · BioMed Research International',
        url: 'https://doi.org/10.1155/2013/340568',
        note: 'Overall speed is reliable, single-figure slopes are not — why efficiency, not the slope, is the score.'
      },
      {
        label: 'Uttal et al. (2013) · Psychological Bulletin',
        url: 'https://doi.org/10.1037/a0028446',
        note: 'Spatial skills are trainable and retesting alone improves them — why the run-in and the practice qualifier.'
      },
      {
        label: 'Vandierendonck (2017) · Behavior Research Methods',
        url: 'https://doi.org/10.3758/s13428-016-0721-5',
        note: 'Compares speed–accuracy composites, including the rate-correct score.'
      },
      {
        label: 'Pronk et al. (2020) · Behavior Research Methods',
        url: 'https://doi.org/10.3758/s13428-019-01321-2',
        note: 'Timing on touchscreens: frame-locked opacity onsets and the latency touch adds.'
      }
    ]
  }
};
