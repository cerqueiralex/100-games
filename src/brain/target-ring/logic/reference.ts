import { zFrom } from '../../../platform/brain/timing';

/**
 * The provisional literature anchor (SCIENCE.md §1.9 "Index (grade C)"):
 * 2D smartphone finger throughput of 6.39 bits/s (MacKenzie 2015: N = 16,
 * mean age 24.3, Nexus 4, 20-target ring, IDs 1.14–3.17). The study gave no
 * SD; 0.9 bits/s is a working value of about range/4 [U]. Index = 50 + 10z
 * (indexFromZ) — e.g. 7.29 bits/s → 60, 5.49 bits/s → 40.
 */
export const REF_TP_MEAN = 6.39;
export const REF_TP_SD = 0.9;

/** z of a throughput against the anchor, higher = better; NaN for a non-finite TP */
export function referenceZ(tp: number): number {
  return zFrom(tp, REF_TP_MEAN, REF_TP_SD, 'higher');
}
