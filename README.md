# 100 Games

A minimalist platform for classic puzzle and brain games — flat surfaces with an extruded "candy button" depth style. Built as a **PWA** (Progressive Web App): one codebase that runs in any browser on your machine and installs on your iPhone home screen like a native app, with offline support. All data (history, statistics, profile, settings) is stored on-device — no account, no server.

## Games

| Game | What it is |
| --- | --- |
| **Sudoku** | Runtime-generated puzzles with guaranteed-unique solutions; notes mode plus 6 toggleable assists (smart hints, error limit, rule-out blocks, region highlight, same-number highlight, points) |
| **Crossword** | Hand-crafted criss-cross puzzles (2 per difficulty) with on-screen keyboard, auto-check, check and reveal assists |
| **Memory Match** | Flip cards to find pairs (4×4 up to 7×8), streak bonuses, peek assists |
| **Simon** | Repeat growing color+tone sequences; reach round 8–24 to win (faster every tier); lives, slow playback and replay assists |
| **N-Back** | Press Match when the lit position repeats from N steps back (N = 1–5); ≥70% accuracy wins |
| **Dual N-Back** | Positions AND letters tracked at once on independent channels; ≥65% accuracy wins |
| **Word Wheel** | Spell words from a letter wheel in two modes: fill a hand-crafted criss-cross grid, or hunt every hidden word on a random wheel |
| **Number Merge** | Drag chains of equal/doubling numbers to merge toward the goal tile (256 up to 4096) |
| **Color Connect** | Flow-style: link every dot pair and cover the board; levels freshly generated every game |
| **Tic-Tac-Toe** | Race the robot to 3 round wins; AI scales from sloppy to near-flawless minimax (on extreme it opens every round) |
| **Image Puzzle** | Sliding photo tiles (3×3 up to 7×7), always solvable — add your own photos (see below) |
| **Maze** | Generated labyrinths — tap or drag one step at a time, classic sizes or custom boards; beat the shortest path for max score |
| **Cryptogram** | Picture-code word puzzle: clued rows share a pictogram cipher and a shaded column spells a hidden answer; icon-echo and hint assists |
| **Minesweeper** | Classic mines with protected first tap, flag mode, long-press flags and chording |
| **Logic Puzzles** | Logic grid deduction: 25 original presets in 5 tiers plus endless generated puzzles, all guess-free with a unique solution |
| **Battleship** | Place your fleet, then trade salvos with an AI that scales from scattershot to probability-density hunting; hits earn another shot, fleet panel tracks damage and sinkings |

## Platform features (shared by every game)

- **Five difficulty tiers** (easy / medium / hard / pro / extreme), pause, restart, quit — all via the standard game shell; after finishing you can close the results popup to review the solved board
- **Save & resume**: a save button in every game's header snapshots the running game; a "Continue saved game" card on the start screen restores board, timer, score and assist usage — even after closing the app
- **Illustrated tutorials**: every game ships a step-by-step "How to play" with theme-aware illustrations, on the game's start screen and behind the help button while playing
- **Assist / help tracking**: every assist is toggleable (some in-game); whatever you use is stored per game, so history and stats always distinguish **clean wins** from **wins with help**
- **Statistics & history**: win rate, best/avg time, best/avg score, streaks, errors, hints, time played, high scores per difficulty, filterable per game (Profile tab)
- **Profile**: name + avatar, totals across games
- **Share cards**: on any win, generate a 1080×1350 PNG win card — native share sheet on iPhone (WhatsApp etc.), download or long-press-copy anywhere
- **Themes**: 3 surface themes (pure black / dim / warm-paper light) × 6 accent colors (orange default, blue, green, red, purple, and a black & white monochrome) that recolor every tool in every game
- **Progress charts** on the profile: a most-played donut, a 30-day stacked activity timeline colored per game, and a per-game improvement trend (score / win time / win % / errors)
- **Pinned favorites**: star any game to move it into a Pinned section at the top of the menu
- **Search** on the home page to find games as the catalog grows
- Sound effects synthesized with WebAudio (no assets), volume control, data export/reset

## Running it

Node 22 is installed at `~/.local/opt/node-v22.17.0-linux-x64` (added to `~/.bashrc` PATH).

```bash
npm run dev        # dev server on http://localhost:5173 (also exposed on your LAN)
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
npm run check      # typecheck only
npm run validate   # verify all hand-authored/generated game content (see below)
```

## Playing on your iPhone

**Same Wi-Fi (quick test):** run `npm run dev`, note the "Network" URL it prints (e.g. `http://192.168.1.x:5173`), and open it in Safari on your iPhone.

**Real install (recommended):** the app auto-deploys to GitHub Pages on
every push to `main` (see `.github/workflows/deploy.yml`) at:

> **https://cerqueiralex.github.io/100-games/**

Open that URL in Safari on your iPhone → Share → **Add to Home Screen**.
It launches full-screen with the app icon and works offline. (iOS only
activates the offline service worker over HTTPS, which is why the deploy
beats the LAN URL.) The workflow builds with `VITE_BASE=/100-games/`;
in-app URLs must use `import.meta.env.BASE_URL` rather than absolute `/`
paths so they survive subpath hosting.

## Architecture

```
src/
  platform/              ← everything shared by ALL games
    design/              ← DESIGN SYSTEM — the rules every feature must follow
      tokens.css         ← all colors: surface themes, accent themes, radii
      effects.css        ← the shared flat card surface (one rule, whole app)
      icons.tsx          ← every UI icon (monochrome SVG, inherits theme color)
      gameIcons.tsx      ← game identity icons (colorful sticker SVGs, home cards)
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
                            save/resume, result recording, completion + share
      ShareCard.tsx      ← canvas-rendered shareable win card
      Tutorial.tsx       ← illustrated how-to-play viewer (every game ships one)
      charts.tsx         ← dependency-free SVG charts (donut, stacked bars, trend)
    pages/               ← Home (+ search), Profile (stats + history), Settings
  games/                 ← one isolated folder per game, all its logic inside
    sudoku/  crossword/  word-wheel/  memory-match/  simon/  nback/
    dual-nback/  number-merge/  color-connect/  tic-tac-toe/  image-puzzle/
    maze/  cryptogram/  minesweeper/  logic-grid/  battleship/
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
the platform. Two per-game requirements: an illustrated `tutorial.tsx`
and save/resume support (hydrate from `savedState`, register a snapshot
provider). Follow `src/platform/design/DESIGN.md` for all UI.

### Assist / help tracking

Every game result stores `assistsEnabled`, `assistsUsed`, `hintsUsed` and a
`cleanWin` flag. Passive assists (highlights, auto-check, slow pace) count
as used whenever enabled — even if toggled on mid-game; active assists
(hint/peek/reveal/replay buttons) count when used. This keeps clean wins
permanently distinguishable from assisted ones in history and statistics.

### Content integrity

`npm run validate` rebuilds every hand-crafted crossword and Word Wheel
level (checking all intersections and catching accidental words), generates
sudokus verifying unique solutions, checks the Cryptogram word bank and
test-generates its picture puzzles, re-verifies all 25 Logic Puzzles presets
plus its endless generator (unique, deduction-only solutions), and
stress-tests the Color Connect level generator for full-coverage
solvability. Run it after editing `src/games/crossword/logic/puzzles.ts`,
`src/games/word-wheel/logic/levels.ts`, or
`src/games/cryptogram/logic/words.ts`.

### Custom Image Puzzle photos

The sliding puzzle picks a random photo from `public/puzzles/`. To add your
own: drop a square-ish image into that folder and add its filename to
`public/puzzles/manifest.json`. The bundled five come from Lorem Picsum.
