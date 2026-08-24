import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * The build stamp shown at the bottom of Settings (see platform/version.ts).
 *
 * The WHOLE version is derived from git — nothing here is ever edited to
 * ship a release, because a number somebody has to remember to bump is a
 * number that goes stale:
 *
 *   MAJOR  package.json — the one editorial part (a redesign, or a change
 *          that breaks saved data; both are judgement calls)
 *   MINOR  package.json's minor as a BASE plus the number of `feat:`
 *          commits, so launching a game or a feature bumps it by itself
 *   PATCH  the commit count — every push mints a new version
 *
 * The `feat:` convention is Conventional Commits, and CLAUDE.md's
 * versioning rule is what keeps it honest: a commit that launches a game
 * or a user-facing feature MUST be subject-prefixed `feat:`/`feat(scope):`.
 * Audit any time with `git log -E --grep='^feat(\(.+\))?!?: '`.
 *
 * Every git read falls back instead of throwing: a build from a source
 * tarball (no .git) must still succeed, just with an unknown build id.
 * NOTE: CI must check out with `fetch-depth: 0` or the counts are 1 and 0.
 */
function git(cmd: string, fallback: string): string {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || fallback;
  } catch {
    return fallback;
  }
}

/** Conventional-Commits feature subjects: `feat: …`, `feat(games): …`, `feat!: …` */
const FEAT_GREP = String.raw`^feat(\(.+\))?!?: `;

function buildStamp() {
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
  const [major = '0', minorBase = '0'] = String(pkg.version ?? '0.0').split('.');
  const commits = git('git rev-list --count HEAD', '0');
  const features = git(`git rev-list --count -E --grep='${FEAT_GREP}' HEAD`, '0');
  const minor = Number(minorBase) + Number(features);
  // -uno: untracked scratch files (backlog.txt) must not mark a build dirty
  const dirty = git('git status --porcelain -uno', '') !== '';
  return {
    version: `${major}.${minor}.${commits}`,
    commits: Number(commits),
    features: Number(features),
    sha: git('git rev-parse --short=7 HEAD', 'unknown') + (dirty ? '+' : ''),
    // the COMMIT date, not the build date, so rebuilding a commit is identical
    date: git('git log -1 --format=%cI', '')
  };
}

export default defineConfig({
  define: {
    __APP_BUILD__: JSON.stringify(buildStamp())
  },
  // GitHub Pages serves the app under /100-games/ — the deploy workflow
  // sets VITE_BASE; local dev and LAN play keep the root path.
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: '100 Games',
        short_name: '100 Games',
        description: 'Classic puzzle games — Sudoku, Crosswords and more.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,json,woff2}']
      }
    })
  ]
});
