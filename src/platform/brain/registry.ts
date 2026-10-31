import type { BrainDomainId, BrainTestDefinition } from './types';
import { alertnessCheckTest } from '../../brain/alertness-check';
import { symbolCodingTest } from '../../brain/symbol-coding';
import { arrowSquaredTest } from '../../brain/arrow-squared';
import { shapeColorSwitchTest } from '../../brain/shape-color-switch';
import { blockSpanTest } from '../../brain/block-span';
import { arithmeticSprintTest } from '../../brain/arithmetic-sprint';
import { mirrorTwinsTest } from '../../brain/mirror-twins';
import { targetRingTest } from '../../brain/target-ring';
import { matrixReasoningTest } from '../../brain/matrix-reasoning';

/**
 * The Brain Lab test registry. To add a test:
 *  1. Build it in its own folder, src/brain/<id>/, faithful to a validated
 *     paradigm (SCIENCE.md) and to the premium bar (design/GAME-QUALITY.md).
 *  2. Export a BrainTestDefinition from src/brain/<id>/index.ts.
 *  3. List it here. The area cards, the check-in rotation, the dashboard and
 *     every analytic derive from this list — never enumerate tests anywhere
 *     else (validate proves every area has a benchmark).
 *
 * The FIRST test listed for an area is that area's benchmark: the one the
 * daily check-in schedules and the area score is anchored to.
 *
 * LIST ORDER IS THE CANONICAL SESSION ORDER (SCIENCE.md C12): on days with
 * several benchmarks they always run Reaction → Processing Speed →
 * Attention → Flexibility → Memory → Calculation → Spatial → Precision →
 * Analysis, so fatigue and warm-up effects stay constant across days.
 */
export const BRAIN_TESTS: BrainTestDefinition[] = [
  alertnessCheckTest, // reaction
  symbolCodingTest, // processing speed
  arrowSquaredTest, // attention
  shapeColorSwitchTest, // flexibility
  blockSpanTest, // memory
  arithmeticSprintTest, // calculation
  mirrorTwinsTest, // spatial
  targetRingTest, // precision
  matrixReasoningTest // analysis
];

export function getBrainTest(id: string): BrainTestDefinition | undefined {
  return BRAIN_TESTS.find((t) => t.id === id);
}

export function testsForDomain(domain: BrainDomainId): BrainTestDefinition[] {
  return BRAIN_TESTS.filter((t) => t.domain === domain);
}

/** the area's benchmark — the first test registered for it */
export function benchmarkFor(domain: BrainDomainId): BrainTestDefinition | undefined {
  return BRAIN_TESTS.find((t) => t.domain === domain);
}
