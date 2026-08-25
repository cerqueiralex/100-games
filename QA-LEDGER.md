# QA ledger

Institutional memory for QA and development sessions. Each entry is one
CLASS of mistake that actually happened in this repo: symptom, root
cause, and the rule that prevents it. Read this before auditing or
building anything non-trivial; `/qa-everything` reads it first (its
watch items are re-checked every run) and appends new findings via the
promotion ladder. Curate — merge duplicates, promote watch items when
they gain enforcement, delete entries obsoleted by code removal.

## Promoted to standards (enforced — the rule exists because of the bug)

- **2026-07-23 · generators · silent fallback shipped as the game.**
  Laser Mirrors' construction loop failed 600/600 attempts on odd-bend
  tiers (a walk mutated `dir` and the mutated value was returned as the
  source's firing direction), so medium/pro silently shipped the trivial
  1-mirror emergency fallback — for months, with validate green. Color
  Connect's rejection sampler similarly fell back to a ~4-color snake on
  extreme. Rule: any generator with a fallback or rejection loop gets a
  validate assertion that the REAL generator ran and the tier's shape
  parameters hold. Enforced: validate's Laser Mirrors fallback-shape +
  mirrors/targets-count checks; Color Connect exact-colors-per-tier
  check.
- **2026-07-23 · validate philosophy · internal soundness ≠ player
  experience.** "Solvable by construction" passed while starts were
  already solved at first paint (the not-solved guard flipped a mirror
  that wasn't on the winning beam's path). Rule: validate must assert
  player-facing invariants — "the start is not already won", "N colors
  on screen" — not only internal consistency. Enforced: laser-mirrors
  `starts already solved` check; promotion-ladder rung 1 in the QA
  skill.
- **2026-07-23 · CSS layout · shrink-wrapped container collapses flexible
  content.** Game roots with `align-items: center` shrink-wrapped
  `.game-tools`, and flex children with tiny intrinsic width (keyboards:
  `flex: 1; min-width: 0` keys) collapsed to slivers (Hangman, then Word
  Guess — same bug twice). Struck a THIRD time 2026-08-23: giving
  `.game-header-actions` shrinkable buttons (`flex: 0 1 51px`) so six
  controls fit a phone made the row shrink-wrap inside the centered header
  column — every square collapsed to the 20px icon. Rule: **the moment a
  child of a centered flex column is given shrinkable content, it needs an
  explicit `width: 100%`.** Enforced: `width: 100%` in the `.game-tools`
  and `.game-header-actions` base rules + DESIGN.md bottom-menu bullet and
  "Leaving a game" section. Caught by measuring rendered button boxes in
  the headless pass — screenshots alone at one viewport would have looked
  merely "compact".
- **2026-07-23 · CSS layout · `1fr` tracks overflow the phone viewport.**
  `grid-auto-columns: 1fr` tracks have `min-width: auto`, so nowrap labels
  (Battleship's "To battle") pushed the row off-screen. Rule: toolbar
  tracks are `minmax(0, 1fr)`, labels ellipsize, pad-tools compact under
  480px. Enforced: global.css `.sudoku-controls`/`.cw-tools` + CLAUDE.md
  toolbar bullet. **Struck again 2026-08-24 on a BOARD**: Memory Match's
  `repeat(cols, 1fr)` was fine for years of text faces, and broke the
  instant the Pokémon theme put images on the cards — intrinsic image
  width pushed every column wide and the board ran off the page both ways.
  The rule is not about toolbars, it is about any track holding content
  with an intrinsic size: `minmax(0, 1fr)` on the track AND `min-width: 0;
  min-height: 0` on the item. Now in DESIGN.md "Tile grids" too.
- **2026-07-23 · duplication · five hand-rolled QWERTY keyboards
  drifted until one broke.** Per-game copies of the same keyboard markup/
  CSS diverged (wrong container assumptions, inconsistent styling). Rule:
  letter games use the platform `Keyboard` component + shared `.kbd`
  block; new letter games may not fork it. Enforced: `Keyboard` in
  `platform/components/ui.tsx`, DESIGN.md "Keyboard" section, QA grep.
- **2026-07-23 · board geometry · oversized absolute pieces clip at
  board edges.** Hashi islands render 1.18× a cell but were centered half
  a cell from the card edge — edge rows poked outside the board. Rule:
  when pieces exceed a cell, map the grid into a padded coordinate space
  (positions, aspect-ratio AND pointer hit-math shift together — see
  hashi `EDGE`). Enforced: DESIGN-adjacent pattern; re-check any new
  %-positioned board (watch item below covers the sweep).

- **2026-07-24 · save/resume · stale saves must be shape-guarded.** Six
  games (lights-out, image-puzzle, make-24, pipes, binary-grid,
  number-trail) cast `savedState` and indexed into nested fields with no
  guard — a save from an older version of the game would crash at mount.
  Rule: verify the fields the code dereferences (`Array.isArray` etc.)
  and fall back to a fresh game on mismatch. Enforced: DESIGN.md
  "Save & resume" shape-guard bullet; all 67 games audited compliant.

- **2026-08-23 · UX · a modal that fires on the winning move steals the
  payoff.** Every game slammed the results modal over the board the
  instant `onFinish` fired, cutting off the game's OWN win animation
  (Pipes' water reaching the last tile most painfully — a playtester read
  it as "deu errado", the game feeling broken rather than won). Rule: the
  shell plays one shared `WinCelebration` (3.5s) over the finished board —
  never covering or tinting it — and only then opens the results. Games
  must not delay `onFinish` or roll their own win animation. Enforced:
  `celebrating` gate in GameShell + DESIGN.md "Win celebration".

- **2026-08-23 · CI · a gate that re-rolls the dice is not a gate.**
  Most generator checks in validate called `Math.random` fresh every run,
  so an unlucky draw failed the whole gate and blocked the deploy with
  nothing actually broken — it killed two deploys (025f2eb, e3d8c48),
  never reproduced in ~20 consecutive local runs, and could not be
  diagnosed because Actions logs need an authenticated `gh`/token this
  machine does not have (the public check-annotations API only says
  "Process completed with exit code 1"). Hammering the prime suspects
  (colour connect, word-wheel hunts, cryptogram, sudoku) at 2000
  iterations each found nothing, so the culprit is elsewhere and rare.
  Rule: **validate is deterministic** — `Math.random` is seeded at the
  top of `scripts/validate.ts` (`VALIDATE_SEED`, default fixed), so every
  run exercises the same cases and a red validate means a real
  regression. Fuzzing is now deliberate: `VALIDATE_SEED=<n> npm run
  validate` sweeps other draws, and a failing seed reproduces exactly,
  which is also how to finally pin the original flake. Never "fix" a
  flaky check by widening its tolerance. Enforced: the seed block in
  scripts/validate.ts.

- **2026-08-24 · async · a `try/finally` around a callback does NOT wrap an
  async one.** The Daily Challenge seeds boards by swapping `Math.random`
  for the duration of one generator call. Handed an `async` callback, the
  function returns its promise at the first `await`, so `finally` restored
  `Math.random` *before* the generator drew a number — every board came out
  unseeded, which for this feature means every player silently gets a
  different puzzle. Caught only because the validate check compared two runs
  of the real generators rather than trusting the helper. Rule: any helper
  that installs and restores global state around a callback must reject
  async callbacks outright — and the test for it must exercise the real
  caller, not the helper alone. Enforced: `withSeededRandom` throws on a
  thenable, plus the validate case that drives the real generators twice.

- **2026-08-24 · CSS specificity · a per-theme copy of a shared rule
  outranks every component override.** `effects.css` defined the card
  surface twice: once at `.fx-card.fx-card` (0,2,0) and again behind
  `:root[data-theme='light']` (0,3,0). Every deliberate card override
  therefore worked on black and dim and silently lost on **light** — the
  Daily Challenge card's `--xp` ring, the *selected* appearance button in
  Settings (no highlight at all, so nothing showed which theme was on), the
  open dropdown's accent focus border, and the press-down edge on the
  Settings action rows. Four visible bugs, one root cause, and light is the
  theme least likely to be spot-checked. Rule: a shared surface rule is
  ONE rule for all themes; the theme difference lives in tokens
  (`--card-fill`, `--card-hairline`). Enforced: validate fails on a
  `[data-theme]`-prefixed `.fx-card` rule or a missing card token; DESIGN.md
  "Depth & motion" + CLAUDE.md design bullet. Corollary worth carrying:
  when a component override "doesn't apply", suspect a theme-prefixed copy
  of the base rule before rewriting the component.

- **2026-08-24 · UX · an enabled control that does nothing reads as
  success.** `GameShell.saveGame()` returned silently when the snapshot was
  null, so a game with a pre-game menu could offer a Save button that
  neither saved nor said anything — the player reads that as "saved",
  leaves, and loses the run. Today no game reaches it (the pre-game menus
  all `holdClock(true)`, which disables the button), but the coupling was
  implicit. Rule: the null-snapshot state and the disabled Save button must
  agree — a game whose snapshot can return null MUST hold the clock there.
  Enforced: shell backstop ("Nothing to save yet" instead of a no-op) +
  DESIGN.md "Save & resume" contract + CLAUDE.md. General form: never let a
  user-initiated action fail silently; say what happened.

- **2026-08-24 · trophies · a whole FAMILY can unlock vacuously, not just a
  single landmark.** The empty-category rule ("no games in a category → no
  mastery landmark, or it unlocks on 0/0") had a sibling nobody had checked:
  the Daily Challenge trophies were spread into `LANDMARKS` unconditionally,
  so a rotation with nothing eligible would have shown five trophies with
  0/0 meters that could never be earned. Rule: any landmark family derived
  from a filtered list is spread in only when that list is non-empty.
  Enforced: validate's daily-family check (no family with an empty rotation,
  Collector total == eligible count, rungs as documented). Related split
  worth remembering: a permanent store must not hold a number that decays
  with the calendar, so the daily METER reads the live streak passed in
  while UNLOCKING falls back to the stored best — validate pins both.

- **2026-08-24 · art · one drawing rendered twice will drift.** The rank
  crown exists as an SVG badge (`RankCrown`, every DOM surface) and as a
  canvas port (`drawRankCrown`, the shareable win card). They were two
  independent copies of the same geometry, so the moment the badge gained
  material texture the share card would have kept shipping the old flat
  disc — a player's card showing a different crown from their profile.
  Rule: when the same artwork must exist in two renderers, the *shape data*
  lives in one table both read (canvas takes SVG path strings through
  `Path2D`), never in two drawings. Enforced: `design/rankMaterials.ts` +
  validate (every rank has a material; both files still import the table).

- **2026-08-24 · UI · a "done" state drawn as a low-opacity tint reads as
  half-done.** The profile's Daily Challenge calendar painted a solved day
  as a ~30% mix of its colour into the surface, next to a streak row whose
  played days are solid discs with an extruded edge — so the finished day
  looked weaker than the thing it was meant to celebrate. Rule: a completed
  state gets the SAME material as the app's other completion marks (solid
  fill + inset bottom edge + an explicit mark), never a wash of the
  incomplete one; and adding it must not flatten the clean/helped split.
  Enforced: DESIGN.md "Daily Challenge". Watch for the sibling trap it
  raised — a state that adds `box-shadow` and a state that sets
  `box-shadow` will silently cancel each other; compose through a custom
  property (`--cell-edge`) instead.

- **2026-08-24 · art · "drawn to spec" is not "recognisable"; render it and
  look.** Memory Match's zodiac theme first drew each sign as its CREATURE
  at 16×16 — a ram's head, a crab, an archer. Geometrically fine, palette
  fine, validate green; on screen a lion's mane and a sunflower were the
  same forty pixels and the player could not tell one card from another,
  which in a memory game is the whole mechanic. Redrawn as the signs'
  GLYPHS (arcs, bars, zigzags — what a pixel grid actually holds) they read
  instantly. Two card-deck sprites failed the same way: a jester's cap that
  looked like a crab, and a rank glyph that fused with its pip because the
  layout left no gap between them. Rule: pixel art and icon work is not
  done when it compiles — render every sprite in a grid, look at it, and
  redraw what does not read. Enforced as far as it can be: validate rejects
  ragged rows, off-palette characters, near-empty sprites and two faces
  that draw the same picture — but "recognisable" needs eyes, so the
  render-and-inspect pass is part of the job, not a nicety.

- **2026-08-24 · CSS · an `<img>` brings its own size, and percentages do not
  always contain it.** Pokémon profile avatars overflowed their plate in the
  picker: `width/height: 100%` on the image resolved to `auto` inside a
  `<button>`, so the sprite's intrinsic aspect ratio took over and the tall
  ones (Pikachu's ears, Charmander's tail) grew out of the button. Switching
  to `position: absolute; inset: 5px` did NOT fix it either — an absolutely
  positioned REPLACED element with `height: auto` takes its height from the
  intrinsic ratio and ignores the offsets. Only an explicit size against a
  definite box (`width/height: calc(100% - 10px)` on the positioned image)
  constrains it. Rule: when dropping an image into a fixed-size control,
  size it explicitly, add `overflow: hidden` on the container, and MEASURE
  the rendered boxes — this is the third bug in this repo (after the toolbar
  and board grids) where intrinsic content size beat the layout that was
  supposed to bound it, and all three looked fine until content changed.

- **2026-08-24 · design/tokens · a SEMANTIC token and the literal value it
  resolves to are not interchangeable — and the difference is invisible
  until the token moves.** `--xp` was `var(--play-7)`, so four progression
  surfaces (the home streak count, the profile streak count, the week-row
  check disc, its dashed today-border) were painted `var(--play-7)`
  directly, plus a fifth on the daily calendar cell. Identical output,
  zero visual difference — until the profile color made `--xp` movable,
  and the first player who picked green got a green flame beside an orange
  number and an orange disc. Same class as the hardcoded rims:
  `--xp-rim`/`--xp-deep` had been mixed toward a fixed dark ORANGE
  (`#6b3200`, `#7a3d00`), which is invisible while orange is the only
  progression color and turns every other hue muddy the moment one is
  picked; they mix toward black now. Rule: paint a surface with the token
  that carries its MEANING, never the one that happens to look the same
  today, and derive a token's relatives from the token itself.
  Validate-enforced: the "Profile color" block scans every rule whose
  selector is a progression surface (`.streak-*`, `.week-day*`, `.level-*`,
  `.xp-*`, `.daily-cell`) and fails on any `var(--play-N)` in its body, and
  rejects a hue-specific hex mixed into `--xp`.

- **2026-08-24 · design/color · a user-pickable color needs a contrast
  floor against every theme, applied as a LIGHTNESS nudge.** Two of the six
  requested profile colors were unusable as given: deep teal `#043f52` is
  1.9:1 on the black theme (invisible 4px frame, unreadable level number)
  and yellow is 1.3:1 on the warm-paper light theme. `profileHex` now walks
  the lightness away from the background until the color clears 3:1 (the
  WCAG non-text-UI bar), never touching hue or saturation, so the picked
  color survives. Rule: never paint a user-chosen color raw on a surface
  the user didn't choose it against — nudge it, and assert the ratio rather
  than the mechanism. Validate-enforced, both directions, plus that a color
  already clear of the bar is passed through untouched. (The teal was later
  dropped from the picker for layout reasons, so no shipped color exercises
  the LIFT branch any more — which is why the nudge was split out as the
  exported `legibleOn` and validate proves the lift on a raw hex. An
  untested branch is one that has already rotted.)

- **2026-08-24 · design/art · type placed on art needs the art measured,
  and an outline if it crosses more than one ground.** The swept-games
  crown badge took THREE tries, each shipped and each rejected on sight.
  (1) Digits inside the crown's band, reasoning from `FlameArt`, which
  prints a streak length inside its white drop — but a flame is a fat
  teardrop with a big soft middle and a crown is mostly points and gaps, so
  the band left roughly 8px of height and the number was illegible.
  (2) Crown above, number below, each with half the badge: readable, but it
  halved the crown and the mark stopped looking like the one on the game
  cards — solving legibility by destroying the identity. (3) The number
  overlaid across the full-height crown: legible, and it broke the crown's
  shape. All three failed the same way — the count does not belong INSIDE
  the art. It is its own bubble now, hanging off the bottom-right like a
  notification count, in the same material as the disc (`--xp` fill,
  `--xp-rim` ring, extruded edge) with `--ink` digits. Rules: measure the
  interior of the specific shape before putting type in it; never buy
  legibility by shrinking the thing that carries the meaning; when a count
  and an emblem compete for the same 38px, separate them instead of nesting
  them. The digits are WHITE, matching the crown, which is a deliberate
  call by the owner after the contrast was put on the table (~3.5:1 on
  purple and blue, ~2.1:1 on the default orange, ~1.4:1 on yellow) — the
  bubble matching the crown was worth more than the ratio, and the digits
  are sized/weighted up to compensate. Recorded because the escape hatch
  matters if it ever bites: deepen the FILL to `--xp-deep` (validate proves
  that clears 4:1 for every picker color), never darken the ink, which is
  exactly what would stop the bubble matching the crown. Validate also
  fails on any `<text>` inside the crown SVG.

- **2026-08-24 · design/charts · "distinguishable" and "a palette" are
  different goals, and optimising for the first destroys the second.** The
  first chart ramp interleaved its lightness ladder so neighbouring donut
  slices and bar rows would never sit next to their nearest match — maximum
  local contrast, and it read as two alternating colors rather than one
  gradient. A wide analogous hue sweep (±23°) compounded it by walking
  yellow out to tan at one end and lime at the other, so the charts stopped
  looking like the color that was picked. `chartRamp` is monotonic with a
  ±9° sweep and flat saturation now. Rule: in an ORDERED chart, neighbours
  are meant to be close — the legend carries identity, the ramp carries
  rank. Validate-enforced: strictly monotonic lightness, every step a
  distinct color on the picked hue (≤12° drift), all readable on the card.

## Watch items (re-check every QA — not yet machine-enforced)

- **2026-08-24 · tooling · a file-scanning validate check must scan CODE,
  and must exempt deliberate reuse — prove it on the real file before
  trusting a red.** Two of these fired on correct code the same day. A
  scan for "the profile hexes must not appear in CSS" flagged five of
  them, because they deliberately reuse `--play-*` values — that reuse is
  what keeps the app one family, and the palette owns those hexes; it now
  skips any hex the `--play-N` table already defines. A scan for "the
  badge panel must not render locked state" flagged the panel's own
  doc comment explaining why it doesn't — it now strips comments and looks
  for a `locked` **class**, not the word. Rule: when adding a grep-shaped
  check, run it against the current file FIRST (it must pass), then
  against a deliberately broken copy (it must fail). A check that cries
  wolf on correct code is worse than no check — it is the one everybody
  learns to work around.

- **2026-08-24 · data · a retroactive backfill must count the RIGHT
  source, and run exactly once.** Adding the lifetime `plays`/`cleanWins`
  counters meant older stores had to be filled in from history — and
  `parseBackup` normalized the imported progress against *the importing
  device's* history, so an old backup restored onto a fresh phone would
  have claimed 0 games played. `normalizeProgress` now takes the history
  to count (backup passes the file's own rows), and the backfill is
  persisted in `loadProgress`, never in `recordProgress` (which runs
  after the new result is already in history — that is the double-count
  that once ate a level-up card). Rule: whenever a store gains a derived
  field, ask both questions — *which* history proves it, and *where* does
  the fill happen so it cannot repeat or double-count.

- **2026-08-23 · UX · state that must survive a screen change belongs to
  the parent.** Leaving a game dropped the player at the top of the
  67-game list (HomePage unmounts while playing, taking scroll, search
  and filter with it) — a playtester had to re-scroll after every game
  they sampled. Rule: browsing state (scroll offset, query, category)
  lives in `App.tsx`'s `Shell`. Re-check whenever a page gains state a
  user would expect to find again on return.

- **2026-07-23 · CSS · `clip-path` silently clips `box-shadow`.** Any
  element with a clip-path silhouette (Tower of Hanoi hex nuts) loses
  outer box-shadows and rings — use `filter: drop-shadow(...)` for
  glows/shadows on clipped shapes. Grep hint:
  `grep -n "clip-path" src/styles/global.css` then check those blocks
  for box-shadow glows. (Re-checked 2026-07-24: clean.)
- **2026-07-24 · logic · ternary chains for direction math end in
  copy-paste defaults.** `reflect(N,'\\')` returned 'N' instead of 'W'
  because the last ternary branch was a stale copy. Prefer exhaustive
  lookup maps for direction/reflection math; when touching such code,
  sanity-check symmetry (reflecting twice = identity). Laser Mirrors'
  reflect is now validate-enforced (double-reflect identity + 90° turn
  check); keep watching other games' direction ternaries (klondike suit
  maps re-checked clean 2026-07-24).
- **2026-07-23 · logic · loop-mutated variables returned as results.**
  A construction walk mutated `dir` and the return used the final value
  where the initial was meant (Laser Mirrors source.dir). After any
  walk/loop, verify returned structs capture values from BEFORE
  mutation.
- **2026-07-23 · logic · expectation tables must move with config.**
  validate's SIZE table for Laser Mirrors had to be updated in lockstep
  with the tier config; a mismatch fails honestly, but any *derived*
  expectation left stale can also mask real regressions. When a tier
  config changes, grep validate for that game's hardcoded expectations.
- **2026-07-24 · UX · drag interactions must not commit React state per
  pointer event.** 120 Hz pointers flood renders and feel rough. Either
  rAF-coalesce into one commit per frame (Tangram, Untangle, Jigsaw —
  the latter two fixed 2026-07-24; flush the pending position on
  pointer-up so the drop lands under the finger) or drive inline styles
  imperatively from a physics loop and re-apply them in a
  dependency-less `useLayoutEffect` so mid-drag re-renders can't wipe
  them (Tower of Hanoi, Klondike). Cell-quantized drags that only
  commit on cell change (Number Merge, Color Connect) are fine as-is.
- **2026-07-23 · theming · fixed content colors are sanctioned opt-outs
  but must be checked in ALL surface themes.** Gridlock's asphalt/yellow,
  Hanoi's steel, Reversi's felt are deliberate non-token content colors —
  verify legibility on black, dim AND light whenever one is added or a
  theme changes.
- **2026-07-23 · UX · dates get a calendar, not a Dropdown.** A dropdown
  of date strings is unusable; `CalendarPicker` (platform ui) is the
  standard for any date-valued filter. Check new date UIs use it.
- **2026-07-23 · charts · unbounded series counts make charts
  unreadable.** Donut/stacked charts must cap named series (top-N) and
  fold the tail into a neutral "Other" (`OTHER_ID` in charts.tsx) —
  check any new chart obeys this.

## History

- 2026-07-23 — ledger created; seeded from the session that overhauled
  Color Connect, Battleship, Bridges, keyboards, Gridlock, Tangram,
  Reversi, Laser Mirrors, Pipes, Hangman, Tower of Hanoi and the profile
  page.
- 2026-07-24 — first full /qa-everything run: gates green; all 67 games
  driven headlessly (start/interact/pause/save/restart) with zero page
  or console errors; contract fan-out (onFinish/onStats, save-resume,
  assists, design greps) found 6 stale-save crash risks (fixed +
  promoted), 2 per-event drag commits (fixed), duplicated Undo icon
  (promoted to platform `UndoIcon`); reflect physics validate check
  added; light-theme content colors verified; README refreshed.
- 2026-08-24 — /qa-everything over the Daily Challenge work: gates green;
  all 67 games re-driven headlessly at 390×780 (one `.game-tools` card, no
  horizontal overflow, tools ≤42% of the viewport) with zero page or
  console errors; the daily surfaces checked on all three themes at phone
  and desktop widths. Found and fixed the per-theme `.fx-card` copy (four
  light-theme regressions, promoted with a validate check), the vacuous
  daily trophy family, the daily meter reading the wrong streak, text
  glyphs used as icons on the daily card plus a dead identical-branch
  ternary, a silent no-op Save, and the missing validate coverage of the
  daily XP award path. Same run, on the user's design notes: the solved-day
  calendar cell was rebuilt in the streak disc's solid extruded material
  with a tick, and the rank crowns gained extrusion plus per-material
  texture from a new shared table both renderers read. Every new check was
  proved to bite by breaking the code under it first.
