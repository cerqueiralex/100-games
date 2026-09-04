/**
 * Minimal typing for the one child-process call `scripts/validate.ts` makes
 * (spawning Node on the shipped Stockfish loader for the UCI smoke test).
 * The repo deliberately has no @types/node — see node-fs.d.ts — and the
 * call site narrows the import to the exact shape it uses.
 */
declare module 'node:child_process' {
  export function spawn(command: string, args: string[], options?: unknown): unknown;
}
