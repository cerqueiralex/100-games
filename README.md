# 100 Games

A minimalist, all-black platform for classic puzzle and brain games. Built as a **PWA** (Progressive Web App): one codebase that runs in any browser on your machine and installs on your iPhone home screen like a native app, with offline support. All data (history, statistics, profile, settings) is stored on-device — no account, no server.

## Games

| Game | What it is |
| --- | --- |
| **Sudoku** | Runtime-generated puzzles with guaranteed-unique solutions; notes mode plus 7 toggleable assists (smart hints, error limit, color assistance, region highlight, same-number highlight, points, remaining numbers) |
| **Crossword** | Hand-crafted criss-cross puzzles (2 per difficulty) with on-screen keyboard, auto-check, check and reveal assists |
| **Memory Match** | Flip cards to find pairs (4×4 / 5×6 / 6×6), streak bonuses, peek assists |
| **Simon** | Repeat growing color+tone sequences; reach round 8/12/16 to win; lives, slow playback and replay assists |
| **N-Back** | Press Match when the lit position repeats from N steps back (N = 1/2/3); ≥70% accuracy wins |
| **Dual N-Back** | Positions AND letters tracked at once on independent channels; ≥65% accuracy wins |

## Platform features (shared by every game)

- **Difficulty levels** (easy / medium / hard), pause, restart, quit — all via the standard game shell
- **Illustrated tutorials**: every game ships a step-by-step "How to play" with theme-aware illustrations, on the game's start screen and behind the help button while playing
- **Assist / help tracking**: every assist is toggleable (some in-game); whatever you use is stored per game, so history and stats always distinguish **clean wins** from **wins with help**
- **Statistics & history**: win rate, best/avg time, best/avg score, streaks, errors, hints, time played, high scores per difficulty, filterable per game (Profile tab)
- **Profile**: name + avatar, totals across games
- **Share cards**: on any win, generate a 1080×1350 PNG win card — native share sheet on iPhone (WhatsApp etc.), download or long-press-copy anywhere
- **Themes**: 3 surface themes (pure black / dim / light) × 5 accent colors (orange default, blue, green, red, purple) that recolor every tool in every game
- **Search** on the home page to find games as the catalog grows
- Sound effects synthesized with WebAudio (no assets), volume control, data export/reset

## Running it

Node 22 is installed at `~/.local/opt/node-v22.17.0-linux-x64` (added to `~/.bashrc` PATH).

```bash
npm run dev        # dev server on http://localhost:5173 (also exposed on your LAN)
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
npm run check      # typecheck only
npm run validate   # verify crossword puzzles + sudoku generator integrity
```

## Playing on your iPhone

**Same Wi-Fi (quick test):** run `npm run dev`, note the "Network" URL it prints (e.g. `http://192.168.1.x:5173`), and open it in Safari on your iPhone.

**Real install (recommended):** deploy `dist/` to any free static host (Vercel, Netlify, GitHub Pages, Cloudflare Pages — build command `npm run build`, output `dist`). Open the HTTPS URL in Safari → Share → **Add to Home Screen**. It launches full-screen with the app icon and works offline. (iOS only activates the offline service worker over HTTPS, which is why a deploy beats the LAN URL.)

## Architecture

```
src/
  platform/              ← everything shared by ALL games
    design/              ← DESIGN SYSTEM — the rules every feature must follow
      tokens.css         ← all colors: surface themes, accent themes, radii
      icons.tsx          ← every icon (monochrome SVG, inherits theme color)
      DESIGN.md          ← the rulebook (read before any UI work)
    types.ts             ← GameDefinition contract, GameProps, GameResult
    registry.ts          ← the list of games (add new games here)
    storage.ts           ← on-device persistence (history, settings, profile)
    stats.ts             ← statistics engine (win rate, streaks, best times…)
    audio.ts             ← WebAudio sound effects and tones (no assets)
    AppState.tsx         ← app-wide state provider (settings/profile/history)
    components/
      GameShell.tsx      ← standard structure around every game: difficulty
                            selection, assist toggles, timer, pause, restart,
                            quit, result recording, completion + share
      ShareCard.tsx      ← canvas-rendered shareable win card
    pages/               ← Home (+ search), Profile (stats + history), Settings
  games/                 ← one isolated folder per game, all its logic inside
    sudoku/    crossword/    memory-match/    simon/    nback/    dual-nback/
```

### Adding a new game

1. Create `src/games/<id>/` with all of the game's logic and UI.
2. Export a `GameDefinition` from its `index.ts` — name, icon, assist
   features, scoring note, an illustrated tutorial (`tutorial.tsx`,
   required), and a component that takes standard `GameProps` and reports
   upward via `events.onStats(...)` / `events.onFinish(...)`.
3. Register it in `src/platform/registry.ts`.

Difficulty selection, timing, pause/restart, scoring history, statistics,
assist tracking, share cards, themes and settings all come for free from
the platform. Follow `src/platform/design/DESIGN.md` for all UI.

### Assist / help tracking

Every game result stores `assistsEnabled`, `assistsUsed`, `hintsUsed` and a
`cleanWin` flag. Passive assists (highlights, auto-check, slow pace) count
as used whenever enabled — even if toggled on mid-game; active assists
(hint/peek/reveal/replay buttons) count when used. This keeps clean wins
permanently distinguishable from assisted ones in history and statistics.

### Content integrity

`npm run validate` rebuilds every hand-crafted crossword (checking all
intersections and catching accidental adjacent words) and generates one
sudoku per difficulty, verifying unique solutions. Run it after editing
`src/games/crossword/logic/puzzles.ts`.
