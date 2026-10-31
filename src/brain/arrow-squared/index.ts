import type { BrainTestDefinition } from '../../platform/brain/types';
import ArrowSquaredTest from './ArrowSquaredTest';
import ArrowSquaredDemo from './ArrowSquaredDemo';
import { arrowSquaredIcon } from './icon';
import { REF_MU, REF_SD, SCHEDULE, referenceZ } from './logic/protocol';

/**
 * Arrow Squared — the Attention benchmark. SCIENCE.md §1.5 is its spec
 * (Flanker Squared, Burgoyne et al. 2023, adapted for phones); every
 * parameter below comes from there or from §2.12. Pure logic lives in
 * logic/ (items, scoring, protocol) so validate can replay it under Node.
 */
export const arrowSquaredTest: BrainTestDefinition = {
  id: 'arrow-squared',
  domain: 'attention',
  name: 'Arrow Squared',
  paradigm: 'Flanker Squared (Burgoyne, Tsukahara, Mashburn, Pak & Engle, 2023)',
  tagline: 'Pick the option whose middle arrow matches the target’s outer arrows — 90 seconds.',
  instructions: [
    'The top row is the target. Look at its outer arrows.',
    'Tap the option whose middle arrow points the same way.',
    'Ignore the target’s middle arrow and the options’ outer arrows.',
    'Right +1, wrong −1: as many as you can in 90 seconds.'
  ],
  skills: ['Attention control', 'Ignoring distraction', 'Speed with accuracy'],
  durationSec: 135,
  Demo: ArrowSquaredDemo,
  component: ArrowSquaredTest,
  icon: arrowSquaredIcon,
  metrics: [
    {
      id: 'net',
      label: 'Net score',
      unit: 'pts',
      better: 'higher',
      decimals: 0,
      about: 'Right minus wrong answers in the 90-second block; about 0 is chance.'
    },
    { id: 'accuracy', label: 'Accuracy', unit: '%', better: 'higher', decimals: 1, about: 'Share of your answers that were right.' },
    {
      id: 'throughput',
      label: 'Correct per second',
      unit: '/s',
      better: 'higher',
      decimals: 2,
      about: 'Right answers per second of the 90-second block.'
    },
    {
      id: 'medianRt',
      label: 'Median time (correct)',
      unit: 'ms',
      better: 'lower',
      decimals: 0,
      about: 'Median time from an item appearing to a right answer.'
    }
  ],
  primaryMetric: 'net',
  reference: {
    grade: 'C',
    anchor: '290 adults aged 18–35 tested in the lab on desktop computers with a mouse (Burgoyne et al. 2023, Study 2, first session).',
    z: (metrics) => referenceZ(metrics)
  },
  runIn: SCHEDULE.runIn,
  noiseFloor: { abs: SCHEDULE.noiseFloorAbs },
  practiceProne: SCHEDULE.practiceProne,
  stateSensitive: SCHEDULE.stateSensitive,
  interruption: SCHEDULE.interruption,
  ownTimerBar: true,
  perWeek: SCHEDULE.perWeek,
  protocolVersion: 1,
  scoringVersion: 1,
  referenceVersion: 1,
  science: {
    summary:
      'Measures attention control: holding a goal while the screen pulls you the other way. In Flanker Squared the conflict sits in the target AND in both answers, and the score is a throughput (right minus wrong in 90 s) rather than a reaction-time difference — which is why it is far more reliable than the classic flanker effect: split-half .94–.97 and a one-month retest r of .74, with practice effects near zero (d = −0.07).',
    scoring: `Net score = right − wrong answers inside the 90.0-second block (about 0 is chance); a net of 0 or less, or more than 10% of answers under 200 ms, makes the run invalid. The reference index is 50 + 10z with z = (net − ${REF_MU}) / ${REF_SD}, anchored to Burgoyne et al.'s first in-lab session (N = 290, ages 18–35, desktop and mouse) — grade C, approximate: their unsupervised online sample averaged 27.4 and the same people tested at home 31.8, so a home phone score near 30 (index ≈ 43) is ordinary, and thumbs on glass may shift scores in either direction. Change from your own baseline is the primary signal; one session differs reliably from another only by about 20 points, a 5-session mean from another by about 9.`,
    deviations: [
      'Phone adaptation: answered with two thumbs on a touchscreen instead of a desktop mouse; the target row sits in the upper stage and the two option pads side by side in the bottom card (about 44% of the width each, at least 120 px tall) — layout sizes are our choice, not the source’s.',
      'Arrows are drawn as SVG chevrons, about 9% of the stage width in the target row and 6% in the options.',
      'The correct option’s side is drawn with p = .5 but is never the same more than 3 times in a row (the source does not state a constraint).',
      'Feedback on every trial is a tick with a soft chime or a cross with a low buzz, shown beside the score for about 250 ms (gone by 300 ms) so it never covers the next item, which appears on the very next frame; the chime has one constant pitch. The source showed text feedback.',
      'The 30-second practice block with feedback and a running score is repeated as an unscored warm-up in every session (the source ran it once).',
      'First run only: the worked fully incongruent example is interactive (you choose, then both options are explained), followed by four guided items — one per trial type, with a corrective explanation after a wrong tap. Unscored; the source had the worked example only.',
      'The 90.0-second clock starts at the first item’s onset; touches after time-out are ignored and the item on screen at time-out is not scored.',
      'Answers under 200 ms (the FlankerDL mis-tap cut-off) still count toward the score but are flagged in the trial log and on the run; more than 10% of them invalidates the run.',
      'Timing: each item becomes visible through an opacity switch inside requestAnimationFrame (that frame’s timestamp is the onset) and answers register on pointerdown with the event’s timestamp; any touch registers, including a second thumb that lands while the first is still on the glass.',
      'Desktop keyboard: ← or F answers left, → or J answers right.',
      'Leaving the app for more than 1 s or rotating the screen voids the run (interruption class A); the source was proctored in the lab or run online without such a rule.',
      'During the warm-up only, a one-line reminder of the rule sits under the target.',
      'Between the warm-up and the countdown, a card waits for a tap on “Start test”, so the scored block begins when you are ready; the first warm-up item appears about 0.5 s after “Start warm-up”.'
    ],
    references: [
      {
        label: 'Burgoyne, Tsukahara, Mashburn, Pak & Engle (2023) · Journal of Experimental Psychology: General',
        url: 'https://doi.org/10.1037/xge0001408',
        note: 'Flanker Squared: the paradigm, its 30-s practice + 90-s test, reliability (.94–.97 split-half, r = .74 retest) and the reference sample.'
      },
      {
        label: 'Hedge, Powell & Sumner (2018) · Behavior Research Methods',
        url: 'https://doi.org/10.3758/s13428-017-0935-1',
        note: 'The reliability paradox: the classic flanker RT cost is unreliable for individuals, which is why the score is a throughput.'
      },
      {
        label: 'Draheim, Tsukahara, Martin, Mashburn & Engle (2021) · Journal of Experimental Psychology: General',
        url: 'https://englelab.gatech.edu/articles/2021/Draheim%20et%20al.%20(2021)%20toolbox.pdf',
        note: 'The attention-control toolbox; source of the 200 ms mis-tap cut-off (FlankerDL).'
      },
      {
        label: 'Pronk, Wiers, Molenkamp & Murre (2020) · Behavior Research Methods',
        url: 'https://doi.org/10.3758/s13428-019-01321-2',
        note: 'Timing accuracy of web apps on touchscreens: requestAnimationFrame + opacity for onsets.'
      }
    ]
  }
};
