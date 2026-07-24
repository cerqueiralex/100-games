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
- **2026-07-23 · CSS layout · shrink-wrapped bottom card collapses
  flexible content.** Game roots with `align-items: center` shrink-wrapped
  `.game-tools`, and flex children with tiny intrinsic width (keyboards:
  `flex: 1; min-width: 0` keys) collapsed to slivers (Hangman, then Word
  Guess — same bug twice). Rule: `.game-tools` carries `width: 100%` in
  its base rule. Enforced: global.css base rule + DESIGN.md bottom-menu
  bullet.
- **2026-07-23 · CSS layout · `1fr` toolbar tracks overflow the phone
  viewport.** `grid-auto-columns: 1fr` tracks have `min-width: auto`, so
  nowrap labels (Battleship's "To battle") pushed the row off-screen.
  Rule: toolbar tracks are `minmax(0, 1fr)`, labels ellipsize, pad-tools
  compact under 480px. Enforced: global.css `.sudoku-controls`/`.cw-tools`
  + CLAUDE.md toolbar bullet.
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

## Watch items (re-check every QA — not yet machine-enforced)

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
