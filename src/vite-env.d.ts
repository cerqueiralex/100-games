/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * Build stamp injected by vite.config.ts's `define` (see platform/version.ts).
 * It is a compile-time constant, not a runtime global — read it through
 * platform/version.ts, never directly.
 */
declare const __APP_BUILD__: {
  /** MAJOR from package.json, MINOR = base + `feat:` commits, PATCH = commit count */
  version: string;
  commits: number;
  features: number;
  /** short commit sha, suffixed `+` when built from a dirty tree */
  sha: string;
  /** ISO commit date, or '' when git was unavailable at build time */
  date: string;
};
