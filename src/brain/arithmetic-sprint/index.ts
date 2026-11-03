import type { BrainTestDefinition } from '../../platform/brain/types';
import { ArithmeticSprintDemo } from './ArithmeticSprintDemo';
import { ArithmeticSprintTest } from './ArithmeticSprintTest';
import { arithmeticSprintIcon } from './icon';
import { META, referenceZ } from './logic/protocol';
import { rescoreRun } from './logic/scoring';

/**
 * Calculation benchmark — SCIENCE.md §1.7 "Calculation: arithmetic fluency
 * sprint". Every protocol number lives in logic/protocol.ts; the item rules
 * in logic/items.ts; scoring and validity in logic/scoring.ts; validate's
 * fidelity check in scripts/brain-checks/arithmetic-sprint.ts.
 */
export const arithmeticSprintTest: BrainTestDefinition = {
  id: 'arithmetic-sprint',
  domain: 'calculation',
  name: 'Arithmetic Sprint',
  paradigm:
    'Arithmetic fluency sprint: Math4Speed item rules (Loenneker et al. 2025), answers typed in mixed order as in the BGU-MF (Gliksman et al. 2022)',
  tagline: 'Two minutes of mental arithmetic — as many correct answers as you can.',
  instructions: [
    'Work out each problem in your head and type the answer.',
    'Press ✓ to submit — the next problem appears at once.',
    'Be accurate and quick: 2 minutes, no right or wrong marks until the end.',
    'No paper, no calculator.'
  ],
  skills: ['Arithmetic fluency', 'Fact retrieval', 'Carrying & borrowing'],
  durationSec: 140,
  Demo: ArithmeticSprintDemo,
  component: ArithmeticSprintTest,
  icon: arithmeticSprintIcon,
  metrics: [
    {
      id: 'cpm',
      label: 'Correct per minute',
      unit: '/min',
      better: 'higher',
      decimals: 1,
      about: 'Correct answers in the 2-minute block, divided by 2 — speed and accuracy in one number.'
    },
    {
      id: 'accuracy',
      label: 'Accuracy',
      unit: '%',
      better: 'higher',
      decimals: 0,
      about: 'Correct answers as a share of every answer you submitted.'
    },
    {
      id: 'rtCorrect',
      label: 'Time per correct answer',
      unit: 's',
      better: 'lower',
      decimals: 1,
      about: 'Median time from a problem appearing to ✓, over correct answers.'
    },
    {
      id: 'firstDigit',
      label: 'Time to first digit',
      unit: 's',
      better: 'lower',
      decimals: 1,
      about: 'Median time from a problem appearing to its first key, over correct answers.'
    },
    {
      id: 'addRate',
      label: 'Addition rate',
      unit: '/min',
      better: 'higher',
      decimals: 1,
      about: 'Correct additions per minute spent on additions — only a handful of items each run, so read it over weeks.'
    },
    {
      id: 'subRate',
      label: 'Subtraction rate',
      unit: '/min',
      better: 'higher',
      decimals: 1,
      about: 'Correct subtractions per minute spent on subtractions — only a handful of items each run, so read it over weeks.'
    },
    {
      id: 'mulRate',
      label: 'Multiplication rate',
      unit: '/min',
      better: 'higher',
      decimals: 1,
      about: 'Correct multiplications per minute spent on multiplications — only a handful of items each run, so read it over weeks.'
    },
    {
      id: 'divRate',
      label: 'Division rate',
      unit: '/min',
      better: 'higher',
      decimals: 1,
      about: 'Correct divisions per minute spent on divisions — only a handful of items each run, so read it over weeks.'
    }
  ],
  primaryMetric: 'cpm',
  reference: {
    grade: 'C',
    anchor:
      '1,063 adults of the Math4Speed sample excluding Greece (median age 20, 77% university students), writing answers by hand in single-operation blocks (Loenneker et al. 2025).',
    z: (metrics) => referenceZ(metrics)
  },
  runIn: META.runIn,
  noiseFloor: { abs: META.noiseFloor.abs },
  practiceProne: META.practiceProne,
  stateSensitive: META.stateSensitive,
  interruption: META.interruption,
  ownTimerBar: true,
  perWeek: META.perWeek,
  protocolVersion: 1,
  /** v2 (2026-11-03): C13 validity — no minimum number of answers, a pace-relative stop rule; v1 runs are rescored from their logs */
  scoringVersion: 2,
  referenceVersion: 1,
  rescore: rescoreRun,
  science: {
    summary:
      'Arithmetic fluency — the speed and accuracy of whole-number mental arithmetic — measured in the format published fluency tests share: as many correct answers as possible in a fixed time. The items follow the Math4Speed class rules (two-digit addition and subtraction with and without a carry or borrow, single-digit and 1-digit × teen multiplication, and the matching divisions), regenerated from each run’s seed so there is no list to memorise, and mixed in order like the computerised BGU-MF. It is a learned skill that also draws on processing speed and working memory, so gains are first of all skill at this task.',
    scoring:
      'CPM = correct answers ÷ 2 minutes; accuracy, median times and per-operation rates are diagnostics. The index is 50 + 10z against 10.1 ± 4.0 CPM (grade C, approximate): that sample was young and wrote answers by hand in single-operation blocks, so typing in mixed order is expected to score lower by an unknown amount. Change from your own baseline is the primary signal. A slow run is a low CPM, never an invalid one (SCIENCE.md C13): a run is invalid only with no answer, accuracy below 85% (a single wrong answer alone excepted), or a stop of 30–60 s without an answer.',
    deviations: [
      'Mixed-order 2-minute block (cycles of 8: every operation twice, half of them complex) instead of Math4Speed’s handwritten single-operation blocks — a principled derivative, not a normed instrument.',
      'Answers are typed on an on-screen phone keypad and submitted with ✓ (as in the online Math4Speed and the BGU-MF), not handwritten; up to 3 digits, compared as numbers.',
      'Multiplication complex uses 3–9 × 12–19: ×2 (trivial doubling) is dropped from Math4Speed’s 2–9.',
      'Addition complex keeps the simple class’s a ≠ b rule (units 1–9 already follows from the carry).',
      'Problem size: within each class, draws alternate between answers at or below the class median and above it — simple classes start below, complex classes above — so every run of 2 and every cycle holds one small and one large item (for division the size is the quotient).',
      'No problem repeats within a session, and flipped operand order (7 × 8 / 8 × 7, 38 + 47 / 47 + 38) counts as the same problem, because practice transfers across it (Rickard et al. 1994); the practice items never reappear in the block.',
      'The 4-item practice (one simple item per operation, right/wrong feedback, the correct answer after an error, a missed item repeated once) runs on the first run and in Practice mode only — SCIENCE.md Appendix C.7 lists no per-session warm-up for Calculation. Every run starts with the intro card and a 3-2-1 countdown, so a returning run lasts about 140 s rather than the dossier’s 155 s (which includes the practice); the missed practice item comes back after the others, not straight away.',
      'The scored block shows no correctness at all: every key gets the same press flash and tick, every ✓ the same ring and sound, right or wrong.',
      'Timing: each problem is drawn inside the animation frame that stamps its onset; keys register on pointerdown with the event timestamp, and a key stamped before the current problem’s onset is ignored.',
      'The block ends 120.0 s after the first problem’s onset; the problem on screen then is discarded, not scored as an error.',
      'If a run gets through all 120 pre-generated items before the 120 s are up (at least one answer a second, beyond any honest pace), the block ends there and the run is invalid (“too-fast”).',
      'Accuracy below 85% makes the run invalid (“rushed”) rather than only flagged (SCIENCE.md A24), though a single wrong answer alone never invalidates a run [DC]. Scoring v2 (SCIENCE.md C13 — a slow run is a low score, never an invalid one): there is no minimum number of answers (v1 required 8, an ability floor about 1.5 SD below the reference mean); a run with no answer at all is invalid (“too-few”), and so is a stop — no submission for longer than 4 × the run’s own median interval, held between 30 and 60 s, counted from the first onset and up to the 120-s lock (“long-gap”) [DC]. Answers faster than 400 ms still count toward CPM but are left out of the time medians.',
      'Per-operation rates count every submission (correct ÷ summed submit time); the cross-session RT diagnostics (last 7 valid runs, per operation × complexity) are left to the trial log.'
    ],
    references: [
      {
        label: 'Loenneker et al. (2025) · Canadian Journal of Experimental Psychology',
        url: 'https://doi.org/10.1037/cep0000347',
        note: 'Math4Speed: the item-class rules, the 10.1 ± 4.0 correct-per-minute anchor and its retest reliability (ρ .81 after 1–9 days).'
      },
      {
        label: 'Gliksman, Berebbi & Henik (2022) · Brain Sciences',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8945962',
        note: 'Math fluency measured with the computerised BGU-MF (typed answers, problems drawn at random) — the typed, mixed format this test follows.'
      },
      {
        label: 'Liesefeld & Janczyk (2019) · Behavior Research Methods',
        url: 'https://doi.org/10.3758/s13428-018-1076-x',
        note: 'Why correct-per-minute is kept instead of IES / RCS / LISAS speed–accuracy composites.'
      },
      {
        label: 'Pronk et al. (2020) · Behavior Research Methods',
        url: 'https://doi.org/10.3758/s13428-019-01321-2',
        note: 'Timing accuracy of web apps on phones: frame-locked onsets land on the intended frame; touch adds tens of milliseconds, small next to a ~6-second item.'
      },
      {
        label: 'Zamarian et al. (2018) · PLoS One',
        url: 'https://doi.org/10.1371/journal.pone.0193529',
        note: 'Adults of all ages keep building arithmetic retrieval speed with practice — why this test is practice-prone.'
      }
    ]
  }
};
