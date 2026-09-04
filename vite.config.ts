import { execSync } from 'node:child_process';
import { readFileSync, watch as watchFile } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
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
 *   MINOR  package.json's minor, plus the `feat:` commits made SINCE that
 *          version line was last edited, so launching a game or a feature
 *          bumps it by itself
 *   PATCH  the commit count — every push mints a new version
 *
 * Counting features from the version line's own last edit is what keeps
 * package.json HONEST: whatever you write there is exactly what the app
 * shows on the next build, and each later `feat:` adds one. (Counting all
 * feats ever would make the file read 1.5.0 while the app said 1.6 — the
 * kind of quiet disagreement this whole module exists to prevent.) Don't
 * re-base the version in the same commit as a feature: the anchor is that
 * commit, so its own `feat:` would not be counted.
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

/** last commit that edited package.json's `"version":` line */
const VERSION_ANCHOR = String.raw`git log -1 --format=%H -G'^\s*"version":' -- package.json`;

function buildStamp() {
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
  const [major = '0', minorBase = '0'] = String(pkg.version ?? '0.0').split('.');
  const commits = git('git rev-list --count HEAD', '0');
  const anchor = git(VERSION_ANCHOR, '');
  const since = anchor ? `${anchor}..HEAD` : 'HEAD';
  const features = git(`git rev-list --count -E --grep='${FEAT_GREP}' ${since}`, '0');
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

/**
 * The stamp is computed once, when this config loads. A dev server left
 * running therefore keeps serving the version from whenever it started —
 * which is exactly how Settings came to show a version that matched
 * neither package.json nor the commit count. Restarting the server on a
 * commit (or a hand-edited version) re-runs the config, so what dev shows
 * is always what a build right now would produce.
 */
function restampOnGitChange(): Plugin {
  return {
    name: 'restamp-on-git-change',
    apply: 'serve',
    configureServer(server) {
      let pending: ReturnType<typeof setTimeout> | undefined;
      for (const file of ['.git/logs/HEAD', 'package.json']) {
        try {
          // fs.watch, not server.watcher: Vite's watcher ignores **/.git/**
          const watcher = watchFile(resolve(file), () => {
            clearTimeout(pending); // editors/git write in bursts
            pending = setTimeout(() => void server.restart(), 150);
          });
          server.httpServer?.on('close', () => watcher.close());
        } catch {
          // no .git (source tarball) — nothing to watch, stamp stays fixed
        }
      }
    }
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
    restampOnGitChange(),
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
        /* Memory Match's 151 Pokémon sprites are precached with everything
           else: as pixel art the whole set is ~600 KB, so the theme works
           offline from install. (The vector artwork it replaced was 5 MB and
           needed a runtime-cache carve-out to stay off every install — the
           pixel sprites made that complexity unnecessary.) */
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,json,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        /* The Stockfish engine (public/stockfish/, ~7 MB) is deliberately NOT
           precached: installing the app must stay light and 68 games never
           need it. It is cached on FIRST USE instead (CacheFirst below) and
           then works offline like everything else. The file names carry the
           engine version, so a new build is a new URL and an old cache
           entry simply goes unused — never bump the engine without renaming
           the files. */
        globIgnores: ['**/stockfish/**'],
        /* the license opens in a tab — a navigation the SPA fallback must not
           answer with index.html */
        navigateFallbackDenylist: [/\/stockfish\//],
        runtimeCaching: [
          {
            urlPattern: /\/stockfish\/[^/?#]+$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'stockfish-engine',
              expiration: { maxEntries: 6 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
});
