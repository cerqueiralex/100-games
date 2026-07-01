# 100 Games — Design System

This folder is the single source of truth for the platform's look and feel.
**Every new feature, game, or screen must follow these rules.**

| File | Purpose |
| --- | --- |
| `tokens.css` | All colors, themes, radii, touch-target sizes |
| `icons.tsx` | Every icon in the platform (monochrome SVG) |
| `DESIGN.md` | The rules (this file) |
| `/public/icons/icon.svg` | App logo — source for all PWA/app icons |

## Philosophy

Minimalist, content-first, all-black by default. One accent color at a time.
Chrome (headers, tabs, borders) stays neutral; the accent is reserved for
interactive state and game assists so it always means something.

## Color rules

1. **Never hardcode a color** in components or CSS — reference a token from
   `tokens.css` (`var(--accent)`, `var(--surface)`, …).
2. **Surface themes** (`data-theme`: `black` | `dim` | `light`) control
   backgrounds, text and borders only.
3. **Accent themes** (`data-accent`: `orange` (default) | `blue` | `green` |
   `red` | `purple`) control every tool color across all games: toggle
   active states, hint buttons, selections, same-number highlight, crossword
   word highlight, difficulty pills, share button.
   Both attributes live on `<html>` and are set by `AppState` from settings.
4. **Semantic colors are fixed**: `--good` (green) = success/clean win,
   `--bad` (red) = errors/danger, `--warn` (yellow). They never follow the
   accent, so an error is red in every theme.
5. Derived tints (`--accent-soft`, `--cell-same`) are computed in
   `tokens.css` via `color-mix` — use them, don't re-mix inline.

### Adding an accent theme

One block in `tokens.css` (`:root[data-accent='x'] { --accent: #hex; }`),
one entry in `ACCENTS` in `SettingsPage.tsx`, one value in the `AccentId`
type. Nothing else — every component already inherits.

## Icons

- All icons live in `icons.tsx`. Monochrome, single color, `24×24` viewBox,
  stroke width 2, round caps/joins, `currentColor` — they inherit the text
  color of their parent, which is how they pick up theme colors.
- **No emojis in UI controls** (buttons, toolbars, tabs, badges). Emojis are
  allowed only as user avatars and celebratory content (win screen, share
  card artwork).
- Default sizes: chrome icons 18–22px, in-button tool icons 16px.

## Components

- **Touch targets**: minimum `44px` (`--touch`) in at least one dimension.
- **Radius scale**: 12 (`--radius-s`) small buttons/cells · 16 (`--radius-m`)
  cards/inputs · 20 (`--radius-l`) game cards · 24 (`--radius-xl`) modals.
- **Buttons**: `primary-btn` (filled, one per screen max), `ghost-btn`
  (neutral), `danger-btn` (destructive, always behind a confirm),
  `icon-btn` (44×44 chrome), `pad-tool` (in-game toolbar).
- **Toolbars**: rows of `pad-tool` buttons must use the equal-width grid
  (`.sudoku-controls` / `.cw-tools` pattern: `grid-auto-flow: column;
  grid-auto-columns: 1fr`) so buttons align in width and height. Fixed
  height 46px, icon + short single-word label.
- **Modals**: backdrop blur, `--radius-xl`, actions right-aligned; anything
  destructive or irreversible requires an explicit confirm step.

## Typography

System font stack (SF Pro on Apple devices). Weights: 800 page titles,
700 headings/buttons, 600 labels, 400–500 body. Numbers that update live
(timers, scores, stats) use `font-variant-numeric: tabular-nums`.

## Motion & feedback

Transitions 0.12–0.2s ease. Press feedback: `scale(0.98)`. Every meaningful
action can play a `sfx` sound (respecting sound settings). Board state
changes (correct placement) may flash `--good-soft` briefly.

## Tutorials (required for every game)

Every game ships an illustrated how-to-play, declared as `tutorial` on its
`GameDefinition` (the field is required — a game without one won't compile).
Convention: a `tutorial.tsx` file in the game's folder exporting
`TutorialStep[]`.

- **3–6 steps**, each with a short title (2–5 words), 1–2 sentences of text,
  and an illustration.
- Illustrations are **composed from the `.tut-*` CSS primitives** in
  `global.css` (`tut-cell`, `tut-key`, `tut-pads`, `tut-mcard`, `tut-grid`,
  `tut-row/col`, `tut-arrow`, `tut-label`, `tut-big`, plus the standard
  `chip` tones) — never static images or screenshots, so every tutorial
  follows the active theme automatically.
- Step order tells a story: the goal → how to interact → scoring/special
  mechanics → assists (and that they count as help).
- The platform shows tutorials in two places automatically: a "How to play"
  button on the game's setup screen and a help icon in the in-game header
  (which pauses the game). Games never render tutorials themselves.

## Games

Games must consume `GameProps` and express all their UI with these tokens
and icons, so a new accent or surface theme restyles every game with zero
game-side changes. Game-specific CSS belongs in `global.css` under a clearly
marked section, still token-only.
