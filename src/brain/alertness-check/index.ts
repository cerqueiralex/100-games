import type { BrainTestDefinition } from '../../platform/brain/types';
import { AlertnessCheckTest } from './AlertnessCheckTest';
import { AlertnessCheckDemo } from './AlertnessCheckDemo';
import { alertnessCheckIcon } from './icon';
import { referenceZ } from './logic/scoring';

/**
 * Alertness Check — the Reaction benchmark: our phone implementation of the
 * 3-minute Psychomotor Vigilance Test, PVT-B (SCIENCE.md §1.10). The protocol
 * lives in logic/protocol.ts, scoring and the anchor in logic/scoring.ts, and
 * scripts/brain-checks/alertness-check.ts proves the Appendix B invariants.
 *
 * Trial log (BrainRunOutcome.trialLog), one row per stimulus or false start,
 * times in ms relative to the block start:
 *   [code, isiMs, onsetMs, rtMs]
 *   code 0 = response (valid), 1 = timeout / OVERRUN (valid, lapse, rt 30000),
 *        2 = false start (rt < 0: tapped with no counter running — how early;
 *            0 ≤ rt < 100 ms + offset: too fast)
 *   response time = onsetMs + rtMs on every row. The device offset used is
 *   the session's ctx.platformOffsetMs; device and frame interval are on the
 *   session's device record.
 */
export const alertnessCheckTest: BrainTestDefinition = {
  id: 'alertness-check',
  domain: 'reaction',
  name: 'Alertness Check',
  paradigm: '3-minute Psychomotor Vigilance Test, PVT-B (Basner, Mollicone & Dinges 2011)',
  tagline: 'Three minutes of staying ready: tap the instant the counter starts.',
  instructions: [
    'Lay the phone flat and rest your index finger on the zone below the panel.',
    'When yellow numbers start counting in the red box, tap the zone at once.',
    'Tapping before they appear is a false start — wait for them.',
    'It lasts three minutes; stay ready the whole time.'
  ],
  skills: ['Alertness', 'Vigilant attention', 'Response speed'],
  durationSec: 195,
  Demo: AlertnessCheckDemo,
  component: AlertnessCheckTest,
  icon: alertnessCheckIcon,
  metrics: [
    {
      id: 'speed',
      label: 'Response speed',
      unit: '/s',
      better: 'higher',
      decimals: 2,
      about: 'Mean of 1000 ÷ reaction time over every valid stimulus, timeouts included — the PVT-B measure most sensitive to sleep loss.'
    },
    {
      id: 'lapses',
      label: 'Lapses',
      better: 'lower',
      decimals: 0,
      about: 'Responses at or above 355 ms plus this device’s latency offset, timeouts included. Approximate on phones — compare within one device.'
    },
    {
      id: 'falseStarts',
      label: 'False starts',
      better: 'lower',
      decimals: 0,
      about: 'Taps with no counter running, or faster than 100 ms plus this device’s latency offset.'
    },
    {
      id: 'ps',
      label: 'Performance score',
      unit: '%',
      better: 'higher',
      decimals: 0,
      about: '100 × [1 − (lapses + false starts) ÷ (valid stimuli + false starts)] — the share of the run free of lapses and false starts.'
    },
    {
      id: 'slowSpeed',
      label: 'Slowest 10% speed',
      unit: '/s',
      better: 'higher',
      decimals: 2,
      about: 'Mean response speed of your slowest tenth of responses — where lapses of attention show first.'
    },
    {
      id: 'fastRt',
      label: 'Fastest 10% RT',
      unit: 'ms',
      better: 'lower',
      decimals: 0,
      about: 'Mean reaction time of your fastest tenth of responses.'
    },
    {
      id: 'medianRt',
      label: 'Median RT',
      unit: 'ms',
      better: 'lower',
      decimals: 0,
      about: 'For display only — the median is not the score (Basner & Dinges 2011).'
    }
  ],
  primaryMetric: 'speed',
  reference: {
    grade: 'C',
    anchor:
      '1,469 adults aged 18–65 on a desktop simple-reaction-time task (Woods et al. 2015), corrected for their hardware delay and shifted by this platform’s measured touch latency (Pronk et al. 2020).',
    z: (metrics, ctx) => referenceZ(metrics.speed, ctx)
  },
  runIn: 1,
  noiseFloor: { abs: 0.16 },
  practiceProne: false,
  stateSensitive: true,
  interruption: 'A',
  perWeek: 7,
  protocolVersion: 1,
  scoringVersion: 1,
  referenceVersion: 1,
  science: {
    summary:
      'Alertness — vigilant attention — is the ability to stay ready and respond quickly, without lapses, at unpredictable moments over several minutes. The 3-minute PVT-B was validated against the 10-minute PVT under total and partial sleep loss, where response speed showed the largest effects, and it shows no systematic practice effect across 16 administrations. Day-to-day changes therefore mostly reflect state — sleep, time of day, fatigue, caffeine — rather than skill; the test does not measure higher cognition.',
    scoring:
      'The score is response speed: the mean of 1000/RT over valid stimuli (RT ≥ 100 ms plus the device offset, lapses and 30 s timeouts included), in responses per second. Lapses (RT ≥ 355 ms plus the offset), false starts and the performance score PS = 100 × [1 − (lapses + false starts)/(valid + false starts)] are shown beside it; the median RT is for display only. The approximate (grade C) index places speed against desktop simple-RT norms (Woods et al. 2015: 213 ms after their hardware delay, SD 26.8 ms, +0.55 ms per year of age, age 46 when none is given) plus this platform’s touch latency (Pronk et al. 2020) — an unvalidated derivation, since the PVT is not a short-interval RT task and the mean of 1/RT is not 1/mean RT, and it is withheld where the latency was never measured. The PVT-B is not interchangeable with the 10-minute PVT (Antler et al. 2022), and phone lapse counts are approximate: your own trend on one device is the signal to trust.',
    deviations: [
      'Runs as a phone web app, not on PVT-192 hardware: the platform’s measured touch-to-display latency (about 58 ms on iOS, Pronk et al. 2020; a 60 ms placeholder elsewhere) is added to the 100 ms false-start and 355 ms lapse thresholds, so counts are approximate.',
      'Display after Grant et al. (2017) and the PVT-B counter: a dark panel, fixed in every theme, with a red-outlined box (60% of the panel’s width) and a yellow millisecond counter; box height and type size are our choice.',
      'Responses are taps in a large zone below the panel, as in Grant et al. (2017); taps on the panel itself are ignored so the finger never hides the counter. On a keyboard the space bar also responds.',
      'ISIs are block-randomised as a shuffled deck of the 31 values 1,000–4,000 ms in 100 ms steps, reshuffled when exhausted, measured from the last response and including the 1 s result display.',
      'A tap while no counter is running — during the wait or the 1 s result display — is a false start: “FS” shows for 1 s and the same interval restarts from the tap. A response under 100 ms plus the offset is also a false start, and the next interval is a new draw.',
      'A short caption under the box spells out “FS” (False start) and “OVERRUN” (no response for 30 seconds); the only sound during the scored block is the OVERRUN alert.',
      'The block ends with the first response — or timeout — after 180 s; a false start after 180 s does not end it, and a block that never reaches a stimulus stops 30 s past its end (it is then invalid).',
      'First lifetime run only: 20 s of unscored practice with coaching; there is no per-session warm-up, and a 3-2-1 countdown (our addition) lets the finger settle before the first interval starts.',
      'A run is invalid with fewer than 40 valid stimuli or more than 10 false starts; leaving the app, losing focus for more than 1 s or rotating the screen also invalidates it (interruption class A).',
      'A valid run with 4 or more false starts carries the flag “responding before the counter” (our rule, not the source’s).',
      'The slowest-10% speed and fastest-10% RT average the k = max(1, round(n/10)) most extreme valid stimuli of the run.'
    ],
    references: [
      {
        label: 'Basner, Mollicone & Dinges (2011) · Acta Astronautica',
        url: 'https://doi.org/10.1016/j.actaastro.2011.07.015',
        note: 'Validated the 3-minute PVT-B against the 10-minute PVT under total and partial sleep loss; response speed had the largest effects.'
      },
      {
        label: 'Basner & Dinges (2011) · Sleep',
        url: 'https://doi.org/10.1093/sleep/34.5.581',
        note: 'Defines the PVT outcome metrics and why response speed (1/RT) is the most sensitive; mean and median RT should not be the primary metric.'
      },
      {
        label: 'Basner et al. (2018) · Sleep',
        url: 'https://doi.org/10.1093/sleep/zsx187',
        note: 'No systematic change in PVT-B speed or lapses across 16 repeated administrations.'
      },
      {
        label: 'Grant et al. (2017) · Behavior Research Methods',
        url: 'https://doi.org/10.3758/s13428-016-0763-8',
        note: '3-minute PVTs on smartphones and tablets under sleep deprivation, tapped in a zone below the stimulus.'
      },
      {
        label: 'Pronk et al. (2020) · Behavior Research Methods',
        url: 'https://doi.org/10.3758/s13428-019-01321-2',
        note: 'Measured how much web apps overestimate RT on each platform — the device offsets used here.'
      },
      {
        label: 'Woods et al. (2015) · Frontiers in Human Neuroscience',
        url: 'https://doi.org/10.3389/fnhum.2015.00131',
        note: 'Simple-RT norms (1,469 adults) and the age slope behind the approximate index.'
      },
      {
        label: 'Antler et al. (2022) · Frontiers in Neuroscience',
        url: 'https://doi.org/10.3389/fnins.2022.815697',
        note: 'The 3-minute and 10-minute PVTs are not interchangeable — scores here are not comparable with the 10-minute test.'
      }
    ]
  }
};
