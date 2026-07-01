# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Node is NOT on the default PATH on this machine (Flatpak VS Code sandbox). Prefix every npm/node command with:

```bash
export PATH="$HOME/.local/opt/node-v22.17.0-linux-x64/bin:$PATH"
```

- `npm run dev` — dev server on :5173, also exposed on the LAN (`--host`)
- `npm run build` — typecheck (`tsc --noEmit`) + production build to `dist/`
- `npm run check` — typecheck only
- `npm run validate` — integrity checks for game content: rebuilds every hand-authored crossword (intersections, accidental adjacent words) and test-generates sudoku puzzles. **Run this after any edit to `src/games/crossword/logic/puzzles.ts`.**

There is no test framework or linter; `npm run build` and `npm run validate` are the gates. The GitHub remote uses SSH (`git@github.com:cerqueiralex/100-games.git`) — the HTTPS URL has no credentials on this machine.

## What this is

An offline-first PWA of classic puzzle games (React 18 + Vite + TypeScript, no backend, no router — navigation is component state in `App.tsx`). Six games so far: Sudoku, Crossword, Memory Match, Simon, N-Back, Dual N-Back. All persistence is localStorage under versioned keys (`100games.v1.*`) via `src/platform/storage.ts`. It is used on desktop browsers and installed on iPhone via Safari's Add to Home Screen (PWA config in `vite.config.ts`).

`backlog.txt` at the repo root is the user's personal scratch file — leave it untracked and don't delete it.

## Architecture: platform vs. games

The core invariant: **games live in isolated folders under `src/games/<id>/`; everything shared lives in `src/platform/`**. Games never import from each other (small helpers are duplicated rather than shared across game folders).

A game plugs in by exporting a `GameDefinition` (see `src/platform/types.ts`) from its `index.ts` and being added to the list in `src/platform/registry.ts`. That's the entire integration surface. The platform's `GameShell` (`src/platform/components/GameShell.tsx`) then provides for free: difficulty selection (easy/medium/hard), assist toggles persisted per game, the timer, pause (board must hide — games get a `paused` prop AND the shell overlays), restart and quit (both record the game as `abandoned`), result recording, the completion modal, and the shareable win card.

Data flows one way: the shell passes `GameProps` down (`difficulty`, `assists`, `paused`, `elapsedSec`, `onToggleAssist`); the game reports upward through `events.onStats(...)` (continuously, so abandons capture the latest state) and `events.onFinish(...)` (exactly once — games guard with a `done` ref). Games generate their board in a `useMemo`; the shell remounts them via a `key` to start a new game.

### Assist/help tracking (user-mandated, preserve it)

Every game result stores both `assistsEnabled` and `assistsUsed`; `cleanWin` = won with zero hints and zero assists used. Convention: **passive** assists (highlights, auto-check, slow pace) are added to `assistsUsed` whenever enabled — including when toggled on mid-game; **active** assists (hint/peek/reveal/replay buttons) are added on use and usually also increment `hintsUsed`. History and statistics distinguish clean wins from assisted wins everywhere — new features must not blur this.

## Design system (mandatory)

`src/platform/design/DESIGN.md` is the rulebook for ALL UI work; the user has explicitly required it be followed. The load-bearing rules:

- Colors only via tokens in `design/tokens.css`. Surface themes (`data-theme`: black/dim/light) and accent themes (`data-accent`: orange default, blue/green/red/purple) are attributes on `<html>` set by `AppState`. The accent recolors every tool in every game; semantic colors (`--good`, `--bad`) never follow the accent.
- Icons only from `design/icons.tsx` — monochrome SVG, `currentColor`. **No emojis in UI controls** (emojis are fine as game content, e.g. memory-card faces, and celebratory content).
- In-game toolbars are rows of `pad-tool` buttons in equal-width grids (`grid-auto-flow: column; grid-auto-columns: 1fr`).
- All CSS lives in `src/styles/global.css` (game sections are marked); tokens/themes live in `design/tokens.css`, imported at its top.

## Game content notes

- Sudoku puzzles are generated at runtime with a uniqueness-guaranteeing solver (`src/games/sudoku/logic/generator.ts`).
- Crossword puzzles are hand-authored coordinate/word lists; the engine derives and validates the grid. `validatePuzzle` rejects mismatched intersections and any letter run without a matching entry — this is what `npm run validate` runs.
- Timed/sequence games (Simon, N-Back, Dual N-Back) drive trials with timeout chains inside effects keyed on `paused` — pausing clears timers and resuming replays the current sequence/trial rather than resuming mid-flight.

## Verification workflow used here

UI changes are verified by running the dev server and driving the app with `puppeteer-core` (already a devDependency; connect with `browserURL`, no browser download) against the host machine's headless Chrome (`host-spawn google-chrome --headless --remote-debugging-port=9222 --user-data-dir=/tmp/... about:blank`). The sandbox's `/tmp` is not shared with the host — write screenshots to a path under `$HOME`. Games pick puzzles with `Math.random`; stub it via `page.evaluateOnNewDocument` when a deterministic board is needed (e.g. auto-solving a crossword to reach the win screen).
