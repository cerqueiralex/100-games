/**
 * The contract of a Brain Lab fidelity check (SCIENCE.md Appendix B). One
 * file per benchmark, `scripts/brain-checks/<test-id>.ts`, exporting
 * `check`; `scripts/validate.ts` runs every one of them through a map that
 * is coverage-checked against the registry (a benchmark without its check,
 * or a check without its benchmark, fails the gate).
 *
 * Rules for a check:
 *  - import only the benchmark's pure logic modules (no DOM at import) — it
 *    runs under plain Node via tsx;
 *  - draw randomness from `rng(seed)`, never from Math.random (validate
 *    seeds Math.random globally, so draws would depend on earlier blocks);
 *  - assert what the PLAYER experiences (the generated items, the scoring of
 *    a scripted run), and prove at least one check catches a broken input;
 *  - report problems through `bad`, return the one-line ✓ summary.
 */
export interface BrainCheckContext {
  bad: (msg: string) => void;
  rng: (seed: number) => () => number;
}

export type BrainCheck = (ctx: BrainCheckContext) => string | Promise<string>;
