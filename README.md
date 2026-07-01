# 100 Games

A minimalist, all-black platform for classic puzzle games. Built as a **PWA** (Progressive Web App): one codebase that runs in any browser on your machine and installs on your iPhone home screen like a native app, with offline support. All data (history, statistics, profile, settings) is stored on-device — no account, no server.

**MVP games:** Sudoku · Crossword

## Running it

Node 22 is installed at `~/.local/opt/node-v22.17.0-linux-x64` (added to your `~/.bashrc` PATH).

```bash
npm run dev        # dev server on http://localhost:5173 (also exposed on your LAN)
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
npm run validate   # verify crossword puzzles + sudoku generator integrity
```

## Playing on your iPhone

**Same Wi-Fi (quick test):** run `npm run dev`, note the "Network" URL it prints (e.g. `http://192.168.1.x:5173`), and open it in Safari on your iPhone.

**Real install (recommended):** deploy `dist/` to any free static host (Vercel, Netlify, GitHub Pages, Cloudflare Pages). Open the HTTPS URL in Safari → Share → **Add to Home Screen**. It launches full-screen with the app icon and works offline. (iOS only activates the offline service worker over HTTPS, which is why a deploy beats the LAN URL.)

## Architecture

```
src/
  platform/            ← everything shared by ALL games
    design/            ← DESIGN SYSTEM: tokens.css (colors/themes), icons.tsx,
                          DESIGN.md — the rules every new feature must follow
    types.ts           ← GameDefinition contract, GameResult, settings types
    registry.ts        ← the list of games (add new games here)
    storage.ts         ← on-device persistence (history, settings, profile)
    stats.ts           ← statistics engine (win rate, streaks, best/avg times…)
    audio.ts           ← WebAudio sound effects (no assets)
    AppState.tsx       ← app-wide state provider
    components/
      GameShell.tsx    ← standard structure around every game: difficulty
                          selection, assist toggles, timer, pause, quit,
                          result recording, completion screen
    pages/             ← Home, Profile (stats + history), Settings
  games/
    sudoku/            ← fully isolated: generator, scoring, board UI
    crossword/         ← fully isolated: engine, puzzles, grid + keyboard UI
```

### Adding a new game

1. Create `src/games/<id>/` with all of the game's logic and UI.
2. Export a `GameDefinition` from its `index.ts` — name, icon, assist
   features, and a component that takes standard `GameProps` and reports
   stats/finish events upward.
3. Register it in `src/platform/registry.ts`.

Difficulty selection, timing, pause, scoring history, statistics, assist
tracking, and settings all come for free from the platform.

### Assist / help tracking

Every assist a game offers is toggleable per game. Whatever is enabled and
whatever is actually used is stored with each `GameResult`, so history and
statistics always distinguish **clean wins** from **wins with help**.

### Puzzle integrity

`npm run validate` rebuilds every hand-crafted crossword (checking all
intersections and catching accidental adjacent words) and generates one
sudoku per difficulty, verifying unique solutions. Run it after editing
`src/games/crossword/logic/puzzles.ts`.
