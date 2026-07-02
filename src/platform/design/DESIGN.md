# 100 Games — Design System

This folder is the single source of truth for the platform's look and feel.
**Every new feature, game, or screen must follow these rules.**

| File | Purpose |
| --- | --- |
| `tokens.css` | All colors, themes, radii, touch-target sizes |
| `effects.css` | Depth & motion: the frosted-glass surface standard |
| `Tilt.tsx` | Mouse-reactive 3D tilt + cursor glow wrapper |
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
   `red` | `purple` | `white` for monochrome black & white) control every
   tool color across all games: toggle
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

## Depth & motion (the surface standard)

The platform's card look is **flat frosted glass**, defined once in
`effects.css` — no textures, patterns or gradients anywhere in the UI
(the only sanctioned radial gradient is the transient `.fx-glow` cursor
light):

- **`.fx-card`** is THE surface for cards: a flat translucent base with
  backdrop blur + saturation, hairline borders (lighter top edge), and
  delicate drop shadows. Game logo chips are flat accent fills with no
  shadows.
- **One rule styles everything**: the glass rule in `effects.css` is
  applied via `.fx-card` AND bound directly to every shared card-surface
  class (settings rows, toggles, theme/accent pickers, search bar,
  dropdown, history rows…). Component CSS in `global.css` must NEVER
  declare its own `background`/`border` for card-like surfaces — layout
  only. This is what guarantees every screen (Settings included)
  automatically receives future surface redesigns. When adding a new
  card-like component: either give it the `fx-card` class or add its
  class to the effects.css selector list — never a flat
  `var(--surface)` background.
- **Flat background**: the page background is plain `var(--bg)` — no
  ambient glows, flares or gradients behind the content.
- **`<Tilt>`** (Tilt.tsx) wraps large interactive cards only (game cards,
  hero surfaces — never small buttons): a ≤4° mouse-following 3D tilt with
  an accent glow that tracks the cursor. It is a no-op on touch devices.
  Load-bearing invariant: the outer `.fx-tilt` box NEVER transforms — all
  motion (tilt + press scale) lives on `.fx-tilt-inner`, and the wrapped
  interactive element must not carry its own `:active` transform. Breaking
  this desyncs hit-testing from the visuals and clicks start missing the
  card (the "3 clicks to open a game" bug).
- **3D logos**: `.game-card-icon` chips are glassy accent gradients with
  bevel shadows that float on `translateZ` inside tilted cards.
- Effects use neutral white/black alphas by design — they are the one
  sanctioned exception to the "tokens only" color rule, and they live
  exclusively in `effects.css`.

## Motion & feedback

Transitions 0.12–0.2s ease. Press feedback: `scale(0.98)`. Every meaningful
action can play a `sfx` sound (respecting sound settings). Board state
changes (correct placement) may flash `--good-soft` briefly.

## Tile grids (stable geometry — required for every tile board)

Tile geometry must never depend on tile *content or state* — revealing a
number, flipping a card, or pressing a tile must not move or resize any
other tile. Concretely:

- **Pin both grid axes.** `grid-template-columns: repeat(n, 1fr)` plus
  either `grid-auto-rows: 1fr` on the board (when the board carries
  `aspect-ratio`) or `aspect-ratio: 1` on the tile itself. Never leave
  rows as implicit content-sized tracks: a row of empty tiles renders
  shorter than a row with digits, and the board visibly deforms as tiles
  fill in (the original Minesweeper bug).
- **State classes only change paint, not layout**: background, color,
  border-*color*, opacity, transform, box-shadow. Never border-width,
  padding, font-size, or display between states — keep the border always
  present and swap its color (use `transparent` to hide it).
- **Press feedback is `transform: scale(...)`** (per Motion & feedback),
  never a size/padding change — transforms don't reflow neighbors.

## Tool buttons (the in-game toolbar standard)

Every in-game tool (hint, erase, flag mode, undo, assist toggles, …) is a
**`PadTool`** from `platform/components/ui` — never a hand-written
`<button className="pad-tool">`. The component and its CSS provide the
standard for free:

- **Accent paint**: tools are tinted with the active accent
  (`--accent-soft` fill, accent text/border) so they read as interactive
  in every theme — never gray/`--text-dim`.
- **Hover** strengthens the tint (hover-capable devices only), **press**
  scales down (`scale(0.96)`). The toggled state (`active` prop) is a
  **solid accent fill with `--on-accent` ink** and `aria-pressed` — an
  ON tool must be unmistakable next to an OFF one, never just a slightly
  stronger tint.
- **Click sound**: `PadTool` plays `sfx.tap()` on every click. Pass
  `silent` when the handler plays its own sound (hints play `sfx.hint()`,
  submit-style actions play their own success/error sounds) so nothing
  double-fires.
- Toolbars remain rows of equal-width tools
  (`grid-auto-flow: column; grid-auto-columns: 1fr`).

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

## Save & resume (required for every game)

Every game must support mid-game saving via two `GameProps` members:

- **`registerSnapshot(fn)`** — call it in a dependency-less `useEffect`
  (re-registering every render so it never goes stale) with a function
  returning a JSON-serializable snapshot: the generated content (board,
  solution, level/def) plus all progress (values, score, errors, hints,
  `assistsUsed` as an array — Sets/Maps must be converted).
- **`savedState`** — when present, every state initializer must hydrate
  from it instead of generating fresh content, including refs like
  `assistsUsed` and derived counters.

The shell owns everything else: the header Save button, the saved-game
card on the setup screen, elapsed-time restoration, and clearing the
save when its session finishes. Timed games should resume by replaying
the current sequence/trial rather than mid-animation.

## Games

Games must consume `GameProps` and express all their UI with these tokens
and icons, so a new accent or surface theme restyles every game with zero
game-side changes. Game-specific CSS belongs in `global.css` under a clearly
marked section, still token-only.
