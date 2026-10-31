import type { BrainMetricDef, BrainReferenceAnchor } from '../../../platform/brain/types';
import { zFrom } from '../../../platform/brain/timing';

/**
 * Symbol Coding — the definition's DATA (metrics, reference anchor, the
 * §2.12 "speed" parameters), kept free of React so validate can import it
 * under Node. index.ts adds the components.
 */
export const METRICS: BrainMetricDef[] = [
  {
    id: 'sds90',
    label: 'Correct in 90 s',
    unit: 'correct',
    better: 'higher',
    about: 'Symbols coded correctly in the 90-second block, on the scale of 90-second symbol–digit tests.'
  },
  { id: 'errors', label: 'Errors', better: 'lower', about: 'Wrong numbers tapped in the 90-second block.' },
  { id: 'accuracy', label: 'Accuracy', unit: '%', better: 'higher', about: 'Correct answers as a share of all answers in the 90-second block.' },
  {
    id: 'dm90',
    label: 'Number match',
    unit: 'per 90 s',
    better: 'higher',
    about: 'Six times the correct number matches in the 15-second motor baseline: finger and screen speed on the same scale.'
  },
  {
    id: 'medianGapMs',
    label: 'Time per correct symbol',
    unit: 'ms',
    better: 'lower',
    about: 'Median time between correct answers in the 90-second block.'
  },
  {
    id: 'codingRatio',
    label: 'Coding ratio (diagnostic)',
    better: 'higher',
    decimals: 2,
    about: 'Diagnostic only: correct symbols divided by the number-match score. A ratio of two noisy scores, never a headline.'
  },
  {
    id: 'learningSlope',
    label: 'In-block learning (diagnostic)',
    unit: '/min',
    better: 'higher',
    about: 'Diagnostic only: correct answers per minute in the last 30 s minus the first 30 s of the block.'
  }
];

export const PRIMARY_METRIC = 'sds90';

/** grade C: z = (SDS90 − 54) / 9 (SCIENCE.md §1.11 "Index") */
export const REFERENCE: BrainReferenceAnchor = {
  grade: 'C',
  anchor:
    'Healthy volunteers on a smartphone symbol–digit test, median 54 correct per 90 s (n = 39; Pham et al. 2021), with an SD of about 9 derived from the reliability data of Lam et al. (2022).',
  // pure: reads only the primary metric; higher SDS90 → higher z
  z: (metrics) => zFrom(metrics.sds90, 54, 9)
};

/** the "speed" row of SCIENCE.md §2.12 */
export const PARAMS = {
  runIn: 3,
  noiseFloor: { abs: 3.1 },
  practiceProne: true,
  stateSensitive: true,
  interruption: 'A',
  perWeek: 2
} as const;
