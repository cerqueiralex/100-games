import type { BrainTestDefinition } from '../../platform/brain/types';
import { BlockSpanDemo } from './BlockSpanDemo';
import { BlockSpanTest } from './BlockSpanTest';
import { blockSpanIcon } from './icon';
import { referenceZ } from './logic/reference';

/**
 * Block Span — the Memory benchmark (SCIENCE.md §1.6, §2.12 "memory",
 * Appendix B "Memory"). An adaptive Corsi span with a new random layout on
 * every trial, after the C-SST of Woods et al. (2016). The protocol lives in
 * logic/protocol.ts; the fidelity checks in scripts/brain-checks/block-span.ts.
 */
export const blockSpanTest: BrainTestDefinition = {
  id: 'block-span',
  domain: 'memory',
  name: 'Block Span',
  paradigm: 'Adaptive Corsi block span with randomised layouts (C-SST; Woods et al. 2016)',
  tagline: 'Watch blocks light up, then tap them back in the same order.',
  instructions: [
    'Blocks light up one at a time — remember the order.',
    'When you see “Your turn”, tap them in the same order.',
    'A right answer adds a block; two misses in a row take one away.',
    'Only the order counts. Lost it? Tap “Don’t remember”.'
  ],
  skills: ['Spatial working memory', 'Remembering sequences'],
  durationSec: 175,
  Demo: BlockSpanDemo,
  component: BlockSpanTest,
  icon: blockSpanIcon,
  metrics: [
    {
      id: 'mns',
      label: 'Mean span',
      unit: 'blocks',
      better: 'higher',
      decimals: 2,
      about: 'The sequence length you recall correctly about half the time: 2.5 plus your success rate at each length from 3 to 10.'
    },
    {
      id: 'maxSpan',
      label: 'Longest span',
      unit: 'blocks',
      better: 'higher',
      decimals: 0,
      about: 'The longest sequence recalled in exactly the right order in this run.'
    },
    {
      id: 'correct',
      label: 'Trials correct',
      better: 'higher',
      decimals: 0,
      about: 'Scored trials (out of 14) recalled in exactly the right order.'
    },
    {
      id: 'tapMs',
      label: 'Time per tap',
      unit: 'ms',
      better: 'lower',
      decimals: 0,
      about: 'Mean time from the cue to the first tap and between taps. It depends on the device and is never part of the score.'
    }
  ],
  primaryMetric: 'mns',
  reference: {
    grade: 'C',
    anchor: '187 adults aged 18–82 tested on desktop computers with a mouse (Woods et al. 2016).',
    z: (metrics, ctx) => referenceZ(metrics.mns, ctx.age)
  },
  runIn: 2,
  noiseFloor: { abs: 0.4 },
  practiceProne: false,
  stateSensitive: true,
  interruption: 'B',
  perWeek: 2,
  protocolVersion: 1,
  scoringVersion: 1,
  referenceVersion: 1,
  science: {
    summary:
      'Block Span measures visuospatial working memory: holding a sequence of locations in mind for a few seconds and replaying it in order (Corsi forward span). It implements the adaptive, randomised-layout Corsi of Woods et al. (2016), the C-SST — ten identical blocks in a new random layout on every trial, a 1:2 staircase from 3 blocks and 14 scored trials — which reached a weekly retest ICC of .84 with no significant practice effect. Touch and physical Corsi give equivalent scores, and the test is unspeeded, so touch latency does not bias it.',
    scoring:
      'The primary metric is mean span: MnS = 2.5 + the proportion correct at each length from 3 to 10 (lengths never reached add 0, dips to 2 add nothing), roughly the length recalled correctly half the time. The reference index is 50 + 10z against the C-SST norms: μ = 6.156 − 0.022 × age (5.27 without an age), σ = 1.01. It is grade C because those norms come from desktop computers with a mouse and no touchscreen norms exist, so change from your own baseline is the primary signal.',
    deviations: [
      'Our implementation of the paradigm, not the C-SST software: scores are not interchangeable with published ones.',
      'Timing follows eCorsi (Brunetti et al. 2014): the layout stands still for 1 s, then each block is on 500 ms and off 500 ms (the C-SST uses about 977 ms per item); the recall cue (tone, light haptic, “Your turn”) comes 500 ms after the last block.',
      'Each highlight is an opacity flip applied in a requestAnimationFrame callback and stamped with its frame time; an ON period off by more than 50 ms voids the trial, which is replaced by an uncounted trial of the same length.',
      'Arena S = min(viewport width − 32, 0.6 × viewport height, 420) px with a 264 px floor (the smallest arena the fallback lattice can space; only a landscape phone reaches it); block side b = max(44, round(0.13 S)) px.',
      'Placement by rejection sampling (centres ≥ 1.5 b apart, ≥ 0.5 b + 4 px from the edge) with a budget of 500 candidate draws per layout, then a jittered 4 × 4 lattice of 10 random cells — measured at 0% of layouts on phones 360 px wide and up and about 4% on 320 px phones.',
      'Highlight = an accent fill with a soft halo on neutral blocks — a luminance change, safe for colour-vision deficiency (resting blocks clear 3:1 against the board; rest → lit measures 5.3:1 on black, 4.7:1 on dim and 3.7:1 on light).',
      'Responses register on release (pointerup) inside the block plus 6 px; each tap flashes 150 ms with a soft click; the trial ends 300 ms after the last tap; no undo. Taps during the presentation are ignored with a quiet “wait” hint.',
      '“Don’t remember” ends a trial as incorrect, and 15 s without a tap (from the cue or the last tap) counts as incorrect.',
      'Practice shortened from the C-SST to stay near 3 minutes: the first run has a tutorial and 4 practice trials on a 6-block display from 2 blocks (practice staircase capped at 4) with per-tap corrective feedback — a wrong tap ends that practice trial and replays the order as numbers; every session then has one unscored warm-up trial at 3 blocks with feedback on the result.',
      'Answers are taps or mouse clicks on the blocks (the C-SST itself used a mouse; the test is unspeeded, so the pointer does not bias the score). There is no keyboard mapping: keys would turn a spatial task into a verbal one.',
      'Runs 2–3 get the single warm-up instead of the dossier’s 2 practice trials (2 then 3 blocks): the runner only tells a first run apart, and Appendix C.7 sets one warm-up trial per session.',
      'A 3-2-1 countdown opens the scored block, as well as following every resume.',
      'Interruptions (class B): a pause voids the trial in flight and a fresh trial at the same length follows a 3-2-1. Pauses count from the scored block’s countdown; the run is invalid beyond 2 interruptions or 60 s paused, at 3 timeouts, or at 3 trials voided for timing — and ends as soon as a limit is crossed (pause limits are checked on resume).',
      'Two floors catch a run that measured no recall: no registered tap at all (every trial ended with “Don’t remember”) is invalid as too few answers, and taps without a single correct trial in 14 are invalid as at chance — the staircase drops to 2-block sequences, which anyone attempting gets right, while random taps hit 1 time in 90.',
      'At the 2-block floor the second consecutive miss still resets the miss counter.',
      'Reference: ComputerUse is fixed at its normative mean (5.12); ages outside the 18–82 sample are held at its edges rather than extrapolated.',
      'Paths are not filtered; each trial logs its path length and self-crossings (span depends on path configuration — Facchin et al. 2024).',
      'Between trials the finished layout fades out over 220 ms and the board stays empty for 500 ms.'
    ],
    references: [
      {
        label: 'Woods, Wyma, Herron & Yund (2016) · Frontiers in Human Neuroscience',
        url: 'https://doi.org/10.3389/fnhum.2015.00690',
        note: 'The C-SST: randomised-layout adaptive Corsi span, mean-span scoring, norms with an age regression, ICC .84 and no significant practice effect.'
      },
      {
        label: 'Woods, Kishiyama, Yund et al. (2011) · Journal of Clinical and Experimental Neuropsychology',
        url: 'https://doi.org/10.1080/13803395.2010.493149',
        note: 'Adaptive span testing and the mean-span (MnS) metric, including the 7.08 worked example.'
      },
      {
        label: 'Brunetti, Del Gatto & Delogu (2014) · Frontiers in Psychology',
        url: 'https://doi.org/10.3389/fpsyg.2014.00939',
        note: 'eCorsi on tablets: the 500 ms on / 500 ms off presentation timing.'
      },
      {
        label: 'Siddi, Preti, Lara et al. (2020) · BMC Psychiatry',
        url: 'https://doi.org/10.1186/s12888-020-02716-8',
        note: 'Touch-screen and traditional Corsi block-tapping give equivalent scores.'
      }
    ]
  }
};
