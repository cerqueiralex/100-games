/**
 * Minimal ambient shim so `scripts/validate.ts` can read a file under
 * `tsc --noEmit`. The repo deliberately carries no `@types/node` (nothing
 * in `src/` is allowed to touch node APIs), and validate already declares
 * `process` inline for the same reason.
 *
 * If `@types/node` is ever added, DELETE this file — a real `node:fs` would
 * turn this ambient declaration into a conflicting module augmentation.
 */
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: string): string;
}
