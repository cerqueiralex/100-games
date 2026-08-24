/**
 * The app's version, stamped at build time by vite.config.ts.
 *
 * Scheme (SemVer-shaped, `MAJOR.MINOR.PATCH`), all of it derived:
 *   MAJOR  a redesign, or a change that breaks saved data — the only
 *          editorial part, set in package.json
 *   MINOR  package.json's minor as a base + the number of `feat:` commits,
 *          so launching a game or feature bumps it with no manual edit
 *   PATCH  the repository's commit count
 *
 * Every part is a separate integer, never a decimal: 1.9 is followed by
 * 1.10, not 2.0. Deriving MINOR and PATCH from history means the number
 * can only ever go up and can never drift from the deployed commit; the
 * short sha below it names the exact commit for bug reports.
 *
 * What the player sees is the version of the build they are RUNNING, which
 * for an installed PWA is whatever the service worker has cached — that is
 * the point: it answers "which build is on this phone", not "what is on
 * GitHub right now".
 */

export interface BuildInfo {
  version: string;
  commits: number;
  /** `feat:` commits in history — the amount MINOR has risen above its base */
  features: number;
  sha: string;
  date: string;
}

export const BUILD: BuildInfo = __APP_BUILD__;

/**
 * `v1.1.44-prod` — the channel the build came from, so a hand-built local
 * bundle is never mistaken for the deployed one. (SemVer would read the
 * suffix as a pre-release identifier; this is a display label, not a
 * published package version, so that never comes up.)
 */
export const VERSION_LABEL = `v${BUILD.version}-${import.meta.env.DEV ? 'dev' : 'prod'}`;

/**
 * `build 5f2a1c9 · 23 Aug 2026` — the identity line under the version.
 * Both halves are optional: a tarball build has no sha, and a machine with
 * no git has no date, and neither may leave a dangling separator.
 */
export function buildLine(): string {
  const parts: string[] = [];
  if (BUILD.sha && BUILD.sha !== 'unknown') parts.push(`build ${BUILD.sha}`);
  const stamped = BUILD.date ? new Date(BUILD.date) : null;
  if (stamped && !Number.isNaN(stamped.getTime())) {
    parts.push(
      stamped.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    );
  }
  return parts.join(' · ');
}
