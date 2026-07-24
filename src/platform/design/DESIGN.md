# 100 Games — Design System

This folder is the single source of truth for the platform's look and feel.
**Every new feature, game, or screen must follow these rules.**

| File | Purpose |
| --- | --- |
| `tokens.css` | All colors, themes, radii, touch-target sizes |
| `effects.css` | Depth: the flat frosted-glass surface standard |
| `icons.tsx` | Every UI-control icon in the platform (monochrome SVG) |
| `gameIcons.tsx` | Game identity icons — colorful sticker SVGs for home cards |
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
   backgrounds, text and borders only. The light theme is deliberately
   **warm paper, never white-and-black**: beige background (`#ebe9e1`),
   warm off-white cards, dark-grey text — keep any new light-theme value
   in that warm family. `AppState` mirrors the active theme's `--bg` into
   `<meta name="theme-color">` so browser/PWA chrome follows along.
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

- All UI-control icons live in `icons.tsx`. Monochrome, single color,
  `24×24` viewBox, stroke width 2, round caps/joins, `currentColor` — they
  inherit the text color of their parent, which is how they pick up theme
  colors.
- **No emojis in UI controls** (buttons, toolbars, tabs, badges). Emojis are
  allowed only as user avatars and celebratory content (win screen, share
  card artwork).
- Default sizes: chrome icons 18–22px, in-button tool icons 16px.

### Game icons (home cards)

Game identity icons are a separate species from UI-control icons: colorful
"sticker"-style SVGs in `gameIcons.tsx`, keyed by `GameDefinition.id` and
rendered on a neutral `--surface-2` plate on the home cards.

- Formula: `64×64` viewBox drawn at 42px, thick warm ink outline (`INK`,
  stroke ~3, round joins), flat saturated fills from the file's shared `C`
  palette, at most one soft highlight — chunky and readable at small size.
- They are game CONTENT (like memory-card faces), so they deliberately use
  their own fixed palette instead of theme tokens and look identical on
  every theme. This is a documented opt-out of the token rule — it applies
  to this file only.
- A new game adds one sticker here (reuse `C` colors so the set stays one
  family) and references it via `icon: gameIcons['<id>']`.

## Components

- **Touch targets**: minimum `44px` (`--touch`) in at least one dimension.
- **Radius scale**: 12 (`--radius-s`) small buttons/cells · 16 (`--radius-m`)
  cards/inputs · 20 (`--radius-l`) game cards · 24 (`--radius-xl`) modals.
- **Buttons**: `primary-btn` (filled, one per screen max), `ghost-btn`
  (neutral), `danger-btn` (destructive, always behind a confirm),
  `icon-btn` (44×44 chrome; the in-game header action row uses 51×51 —
  perfect squares, never stretched), `pad-tool` (in-game toolbar).
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

The platform's depth language is the **extruded "candy / pushable"
style** (2.5D flat): every raised element is a flat fill with a darker
inset bottom edge that reads as the side of a toy block. No textures,
gradients, drop shadows (on resting surfaces), specular edges or 3D
transforms anywhere, in any theme:

- **The edge**: `box-shadow: inset 0 -3px 0 var(--edge)` (4px for large
  cards/tiles). `--edge` is a per-theme token in tokens.css for
  surface-colored elements; SOLID colored fills (accent buttons, game
  tiles like Number Merge/TTT marks, Simon pads) use a plain black
  alpha `rgba(0,0,0,0.2–0.28)` so the edge is always a darker shade of
  the fill itself — never a black or white outline.
- **Pushable press**: buttons sink on `:active` — `translateY(2px)`
  plus the edge shrinking to 1px. NEVER add a press transform to an
  element whose position depends on an inline transform (Word Wheel
  letters): shrink the edge only.
- **`.fx-card`** is THE surface for cards: flat translucent base with
  backdrop blur, hairline border, extruded bottom edge. The rule in
  `effects.css` is applied via `.fx-card` AND bound to every shared
  card-surface class; component CSS must NEVER declare its own card
  `background`/`border` — layout only. New card-like components join
  the fx-card class or the effects.css selector list.
- **Elevation exception**: floating overlays (modals, the results pill,
  sticky start button context) keep `var(--shadow)` — they hover above
  the page, so a drop shadow is information, not decoration.
- **Flat opt-outs**: the home search bar, the in-game info strip, and
  continuous boards whose cells share edges (sudoku, crossword,
  logic-grid) stay completely flat — extrusion belongs to
  gap-separated tiles only.
- **Flat background**: the page background is plain `var(--bg)`.
- Effects use neutral white/black alphas by design — they are the one
  sanctioned exception to the "tokens only" color rule.

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
- **The bottom menu is ONE card**: every game puts ALL of its bottom
  controls — tool rows and any input surface (keyboard, digit pad,
  d-pad) — inside a single `.game-tools fx-card`, never sibling panels.
  The card docks to the viewport bottom (`position: sticky`) so controls
  stay reachable while a tall board scrolls behind it; as a floating
  overlay it carries `var(--shadow)` (see Depth & motion). Because the
  docked card floats above the viewport bottom, `.game-screen`'s
  `padding-bottom` must stay ≥ that sticky lift plus
  `env(safe-area-inset-bottom)` — otherwise the card permanently covers
  the board's last rows on the installed PWA.
- **The bottom menu must not swallow the screen on phones**: at phone
  widths (`max-width: 700px`) the whole docked card stays around a third
  of the viewport or less, so the board keeps the majority of the screen.
  Big content inside it compacts (Word Wheel's wheel shrinks to
  `min(180px, 50vw, 30vh)`) or scrolls internally (Logic Puzzles' clue
  list caps at `18vh`) — the card never grows at the board's expense.
- **`.game-tools` always spans the game column** (`width: 100%` in the
  base rule). Several game roots center their children
  (`align-items: center`); without the explicit width the card
  shrink-wraps and flexible content — the shared keyboard especially —
  collapses to its tiny intrinsic width.

## Keyboard (the on-screen QWERTY standard)

Every letter-input game uses the **`Keyboard`** component from
`platform/components/ui` — never hand-rolled key rows. One shared `.kbd`
CSS block styles it for every game (extruded keys, press-down, phone
compaction), so keyboards look and feel identical everywhere.

- `onKey` receives the tapped letter. The component plays **no sounds** —
  the game's handlers own audio feedback (correct/wrong sounds differ per
  game), so nothing double-fires.
- `keyClass` paints per-letter knowledge: `good`/`bad` (soft tints, e.g.
  Hangman), `correct`/`present`/`absent` (solid heat, Word Guess),
  `shake` (rejected input); `keyNonce` remounts a key so its animation
  can replay.
- `bottomLeft`/`bottomRight` dock wide action keys (Enter, ⌫, submit) at
  the ends of the bottom row; pass `className: 'ready'` for an armed
  solid-accent submit (Word Ladder).
- Current users: Hangman, Word Guess, Word Ladder, Crossword, Cryptogram.
  A new letter game must reuse this component, not fork it.

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

## Mastery guides (required for every game)

Where the tutorial teaches the RULES, the mastery guide teaches how to
WIN and keep improving. Every game declares `mastery: MasteryGuide` on
its `GameDefinition` (a required field — a game without one won't
compile). Convention: a `mastery.ts` file in the game's folder exporting
`export const mastery: MasteryGuide`. The platform surfaces it as a
"How to master {game}" button on the setup screen, directly under "How
to play" and in the same button style, opening the `MasteryModal`
long-form reader. `src/games/sudoku/mastery.ts` is the exemplar.

- **`origins`** — 2–4 sentences of accurate history: who created the
  game, when, where, and in what context. When our version is a variant,
  describe the classic family it derives from and say so honestly.
- **`intro`** — one paragraph defining what mastery of this game looks
  like.
- **`sections`** — 4–6 titled sections of strategy (never rule
  re-explanations): what to scan for first, named techniques in learning
  order, planning heuristics, when-stuck recovery, common traps, and a
  closing "Improving further" section that ties advice to the platform
  (difficulty tiers, assists, clean-win and error/hint statistics).
  Bullets must be concrete and actionable — no filler.
- **Every section ships an `art` illustration**, described as data and
  drawn by the platform's MasteryArt renderer (theme-aware, tokens only
  — never static images): `grid` (rows of single-char cell codes — see
  the legend on `MasteryArt` in types.ts) for board concepts and
  patterns, `row` (chips with `'>'` arrows) for ladders/sequences/
  pipelines, `banner` (2–4 large emoji) only when nothing structural
  fits. Prefer a diagram that teaches the section's core idea; captions
  carry the explanation.
- **Every bullet leads with an emoji marker** (`'🎯 Cross-hatch: …'`) —
  the reader renders it as the list marker. This is sanctioned guide
  CONTENT, like memory-card faces — the no-emoji rule for UI controls
  stands untouched.
- **`references`** — 2–4 further-reading links (open in a new tab).
  Stability rule: prefer Wikipedia articles about the game or its
  techniques; any other site must be a famous canonical resource with a
  certain URL. Never invent deep links.

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
- **Shape-guard the save before trusting it**: `savedState` may be a
  stale snapshot from an older version of the game. Never cast and
  index into nested fields directly — verify the fields the code will
  dereference (`Array.isArray(save.board)` etc.) and fall back to a
  fresh game when the shape doesn't match. A redesigned game must not
  crash at mount because of last month's save.

The shell owns everything else: the header Save button, the saved-game
card on the setup screen, elapsed-time restoration, and clearing the
save when its session finishes. Timed games should resume by replaying
the current sequence/trial rather than mid-animation.

## Games

Games must consume `GameProps` and express all their UI with these tokens
and icons, so a new accent or surface theme restyles every game with zero
game-side changes. Game-specific CSS belongs in `global.css` under a clearly
marked section, still token-only.
