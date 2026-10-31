/**
 * Minimal typing for the one `node:url` call `scripts/validate.ts` makes:
 * turning `new URL('../x', import.meta.url)` into a filesystem path. Reading
 * `.pathname` instead keeps spaces percent-encoded, so every file read failed
 * from a checkout under a path like "Claude Code/…" (CI paths have no
 * spaces, which is how it went unnoticed). The repo deliberately has no
 * @types/node — see node-fs.d.ts.
 */
declare module 'node:url' {
  export function fileURLToPath(url: URL | string): string;
}
