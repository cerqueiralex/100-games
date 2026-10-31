import { clamp, zFrom } from '../../../platform/brain/timing';

/**
 * Block Span — the literature anchor (SCIENCE.md §1.6 "Index (grade C)",
 * §2.12 "memory"). Woods et al. (2016) C-SST norms, N = 187 adults aged
 * 18–82, desktop computers with a mouse:
 *
 *   MnS = 5.68 − 0.022·age + 0.093·ComputerUse, SD 1.01
 *
 * with ComputerUse fixed at its normative mean (5.12) because the app
 * cannot administer that scale → μ(age) = 6.156 − 0.022·age. Without an
 * age, μ = 5.27 (the normative mean; mean age 41.1).
 *
 * z = (MnS − μ) / 1.01 and the index is 50 + 10z (indexFromZ). Grade C:
 * desktop/mouse norms; touch Corsi is score-equivalent but no touchscreen
 * C-SST norms exist — the personal baseline is the primary signal.
 */
export const REFERENCE = {
  intercept: 6.156,
  ageSlope: -0.022,
  sd: 1.01,
  meanWithoutAge: 5.27,
  /** [DC] ages outside the normative sample are held at its edges — no extrapolation */
  ageMin: 18,
  ageMax: 82
} as const;

/** the age-expected mean span, or the normative mean when no age is known */
export function referenceMean(age?: number): number {
  if (age === undefined || !Number.isFinite(age)) return REFERENCE.meanWithoutAge;
  return REFERENCE.intercept + REFERENCE.ageSlope * clamp(age, REFERENCE.ageMin, REFERENCE.ageMax);
}

/** z of a mean span against the anchor (higher is better) */
export function referenceZ(mns: number, age?: number): number {
  return zFrom(mns, referenceMean(age), REFERENCE.sd);
}
