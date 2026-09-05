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

Minimalist, content-first, all-black by default. The palette is
MONOCHROME INK PLUS ONE: `--accent` is white (near-black on the light
theme) and paints interactive state; `--xp` (orange) is the single
secondary color and belongs to progression. Chrome (headers, tabs,
borders) stays neutral, so both colors always mean something.

The accent used to be a six-way user setting. It was removed: six pickable
hues multiplied every surface that had to be checked, for one bit of taste,
and the monochrome option was the one that kept the whole 69-game library
legible on all three surface themes. **Do NOT reintroduce an accent
picker** — no setting may repaint `--accent`, because that is the token
every game's tools read, and 69 games × 6 hues × 3 themes is the surface
that made it unmaintainable.

The **profile color** (below) is the deliberate exception, and it is drawn
exactly there: it retunes `--xp` and the player's own frames and charts —
one token, on three screens nobody plays on — and never touches a game
board. That is the line. A new color setting is allowed only if it stays on
the same side of it.

## Color rules

1. **Never hardcode a color** in components or CSS — reference a token from
   `tokens.css` (`var(--accent)`, `var(--surface)`, …).
2. **Surface themes** (`data-theme`: `black` | `dim` | `light`) control
   backgrounds, text and borders only. The light theme is deliberately
   **warm paper, never white-and-black**: beige background (`#ebe9e1`),
   warm off-white cards, dark-grey text — keep any new light-theme value
   in that warm family. `AppState` mirrors the active theme's `--bg` into
   `<meta name="theme-color">` so browser/PWA chrome follows along.
3. **The accent is fixed, not a setting**: `--accent` is white on the dark
   surfaces and near-black on light, and it controls every tool color across
   all games (toggle active states, hint buttons, selections, same-number
   highlight, crossword word highlight, difficulty pills, share button).
   Only `data-theme` lives on `<html>`, set by `AppState` from settings.
4. **Semantic colors are fixed**: `--good` (green) = success/clean win,
   `--bad` (red) = errors/danger, `--warn` (yellow), `--xp` (orange) =
   progression — player level, XP and streak, the app's secondary color.
   They never follow the accent, so an error is red and a level is orange
   in every theme.
5. Derived tints (`--accent-soft`, `--cell-same`) are computed in
   `tokens.css` via `color-mix` — use them, don't re-mix inline.

### Adding a surface theme

One block in `tokens.css` (`:root[data-theme='x'] { … }`) defining the
surface/text/edge tokens plus `--accent`, and one entry in `THEMES` in
`SettingsPage.tsx`. Nothing else — every component already inherits.

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

### Streak & landmarks (profile trophies)

The play-streak flame (`components/Streak.tsx`) and the landmark trophy
art (`components/Landmarks.tsx`) are game CONTENT, like memory-card
faces: sticker-style SVGs colored from the **content palette
(`--play-*` tokens) with `--ink` outlines**, so they stay colorful and
identical on every surface theme — no opt-out needed, everything is
tokens. Rules:

- The streak flame burns in `--xp` (orange by default — the player's
  profile color once they pick one), so the flame, the level ring and the
  XP bar always agree; each landmark carries a content-palette `slot` on
  its def (`--lm` on the card), fixed, because a trophy is its own thing.
- **Locked landmarks stay fully visible** — same art, same geometry —
  rendered black & white at soft opacity via a CSS
  `filter: grayscale(1)` on the art plate only, behind a `LockIcon`
  badge; unlocking is a paint-only change (color returns, date replaces
  the progress fraction). Never ship separate locked art.
- "Cold" streak states (not yet played today / streak 0) reuse the same
  grayscale treatment as a nudge.
- Landmark cards and the streak hero are `.fx-card` surfaces (layout
  only in their CSS); the shareable landmark card reuses the win card's
  canvas chrome (`drawCardChrome` + `ShareImageModal` in ShareCard.tsx)
  so every shared image stays one family.
- **Two surfaces, two jobs.** The gallery (`LandmarksSection`) is the
  CHECKLIST — the whole catalogue, locked art included, with live meters;
  it is what tells a player what to chase. `LandmarkBadges`, the row at
  the foot of the level card, is the DISPLAY CASE: unlocked only, in
  catalogue order (not newest-first, so the families stay grouped and a
  wall of unlabelled 26px art still reads as a collection), rendering
  nothing at all when nothing is earned. Never let the case grow locked
  plates or meters — it would become a second, worse copy of the gallery,
  and its "badges earned" count would stop being a count of what you own.
  Validate-enforced.
- **Easter eggs are the ONE exception to "locked stays visible", and only
  half of one.** A secret keeps its shape: while unfound it renders a
  dashed mystery egg with a `?`, the title reads `???`, the subtitle
  reads `Hidden`, and the detail modal shows a tease instead of a
  requirement and NO meter — a meter on a secret is a description of the
  secret. What stays visible is that it EXISTS: its own "Easter eggs"
  section under the gallery, with a found/total count, because knowing
  there is something to find is the whole appeal. Found, it is an
  ordinary landmark in every way — real art, real title, shareable card.
  The split lives in the component (`def.secret`), never in progress: a
  secret unlocks, pays XP and is stamped exactly like every other
  trophy.
- **One art per landmark KIND, parameterized by the def** — never one
  drawing per landmark id. Two comebacks are one chart with one dip or
  two (`def.count`); two speed trophies are one stopwatch wearing
  `def.seconds`; two backup trophies are one drive with the arrow
  reversed. A kind whose art cannot be told apart from another kind's at
  26px (the badge row) is the bug to avoid — that is why the clean-win
  RUN is a rosette and not a second hexagon.

### Share cards follow the player's theme

The canvas cards read `--bg`/`--surface`/`--text`/`--accent` through
`cardTheme()` and paint with those, exactly like the results modal behind
them. They were once hardcoded black, which meant a player on the light
appearance opened a share sheet showing a card from a different app.
`drawCardChrome` returns the theme it painted with, so a caller never
re-reads or hardcodes ink; texture and glow strengths switch on
`theme.light` (a strong tint turns the beige paper muddy). Anything
semantic — the green of a clean win, a landmark's `--play-*` identity, a
rank's material — stays fixed across themes, same rule as everywhere else.

Vertical rhythm is part of the design, not an accident: the emblem block
is deliberately small so the bands below the divider (statistics, badge,
footer) get even air. Long game names shrink to fit (`fitFont`) rather
than overflowing the card or wrapping into a layout with no room for a
second line.

### Win celebration (the payoff beat — every game, no exceptions)

When a player wins, the shell plays ONE shared celebration
(`components/WinCelebration.tsx`, `WIN_CELEBRATION_MS` = 3.5s) and only then opens the results
modal. This exists because slamming the statistics over the board the
instant `onFinish` fired **cut off each game's own payoff animation** —
Pipes' water reaching the last tile, a beam landing, a card flipping —
which players read as "something broke", not "I won". The rules:

- **It must never hide the board.** The layer is `pointer-events: none`,
  the green light is a radial gradient that is fully transparent in the
  middle (edges only — an inset shadow tints the whole board and is
  wrong), confetti is thin, and the banner lifts away before the modal
  opens. Whatever the game is still drawing underneath plays in full view.
- **The shell owns the timing, games cooperate in no way.** A game that
  fires `onFinish` mid-transition still gets its moment, so all 69 games
  (and every future one) inherit this for free — never re-implement a
  per-game win animation or delay `onFinish` to fake one.
- **Purely decorative**: the result is already recorded when it mounts, so
  unmounting it early (quit, restart) can never lose data.
- Green is `--good` and the pill reuses the completion-marker family
  (green fill, darker rim, extruded edge, gold/white accents).
- Losses skip it — the results modal opens immediately, as before.
- `prefers-reduced-motion` drops the confetti and rings but keeps the
  same duration, so the delayed results stay consistent for everyone.

### Player level & XP (the progression surfaces)

Progression has ONE color: `--xp`, orange (`--play-7`) by default. It is a
**semantic** token: the accent is monochrome ink, so `--xp` is the one
color the app spends on progression, and it sits beside the streak flame,
which burns in it. Use `--xp` for every XP number, ring, bar and
highlight; `--xp-soft` for the tinted panel behind an award; `--xp-rim`
for the darker rim on an extruded `--xp` fill and `--xp-deep` where white
ink has to sit on it. **Never re-mix `--xp` inline** — and never mix it
toward a darker *orange*: the rims did exactly that (`#6b3200`,
`#7a3d00`), which is invisible while orange is the only progression color
and turns every other profile color muddy the moment one is picked. The
rim tokens mix toward black, which works for any hue. Validate-enforced.

`--xp` is also the one token the player may retune, through their profile
color (below).

Three surfaces, and they mirror the streak's shapes on purpose (they are
neighbours in the header and on the profile):

- **`LevelChip`** — home header, immediately left of the streak pill. Same
  height token (`--head-token`), same pill/edge treatment. Ring + number +
  caption, and on phones (`max-width: 700px`) the caption hides and the art
  shrinks to 26px, exactly as the streak pill does, so the pair stays
  matched as the header tightens.
- **`LevelHero`** — the profile's FIRST section, above the streak. The
  level is the number inside the dial (centred on top), then the XP bar,
  then the numbers, then the rank ladder, then the earned-badge case. The
  level is printed once: a dial that shows "7" over a caption reading
  "Level 7" is a duplicated readout, not emphasis. The badge case arrives
  through a `badges` **slot**, not an import: it lives in Landmarks.tsx,
  which already imports `RankCrown` from Level.tsx, and pulling
  `LandmarkArt` back the other way would close a module cycle for a purely
  visual arrangement. The page composes the two. Each row inside the card
  is separated by the same `border-top` divider, so the card reads as one
  panel of stacked rows rather than three cards fused together.
- **`XpEarned`** — the block inside the results modal. Total in `--xp` with
  one line per source, because an unexplained "+100 XP" reads as a bug
  while "+80 Landmark earned" reads as a reward.

`LevelRing` is dependency-free SVG (`stroke-dasharray` arc), like the
profile charts — never a conic-gradient, which would break the no-gradient
surface rule and the theme tokens with it.

**Level-up card**: opens BETWEEN the win celebration and the results modal
(GameShell gates the results on it), so a new level gets its own moment
instead of competing with a statistics table — the same reasoning as the
win celebration below. It plays `sfx.levelUp()`, deliberately brighter and
longer than `sfx.win()` so the two events never sound alike, and all of its
motion is disabled under `prefers-reduced-motion`.

### Profile color (the player's own chrome)

The one color setting the app has, picked in **Profile → Edit**, stored on
`Profile.color` and defined once in `design/profileColors.ts` — five colors
plus **Standard**. It is not the removed accent picker returning: read the
line drawn in Philosophy before extending it.

What it repaints, and nothing else:

- `--xp`, so every progression surface moves together — level ring and
  number, XP bar, streak flame, streak count, the week row's check discs,
  the Daily Challenge card and its solved cells.
- Three **profile frames** — the home header card and the avatar plate on
  both the home header and the profile page — as a 4px extruded border.
  The stacking order matters: the FRAME is the object that extrudes, so
  the dark rim is the outermost bottom lip (`border-bottom-color:
  var(--xp-rim)`) with the bright face returning as an inset band above it
  (`inset 0 -4px 0 var(--xp)`). The first shipped version had it the other
  way round — bright border outside, dark band inset within — and read as
  an inner shadow on the card, not a 2.5D edge under the frame. The
  padding gives back exactly the 3px the thicker border took so nothing
  shifts.
- The profile page's **charts** (categories, most played, activity), via
  `chartRamp`.

Rules that hold it together:

1. **Standard is the default and a real choice.** `Profile.color` is
   `undefined` until somebody picks, every painted rule hangs off
   `[data-profile-color]`, and `--xp` is `var(--profile, var(--play-7))` —
   so an untouched profile is the app exactly as it shipped, and a player
   who tries a color can always get that back. The picker shows Standard as
   four flat quarters of the content palette (the rainbow the charts keep).
2. **The six hexes live in `profileColors.ts` and nowhere else.**
   `applyProfileColor` is the only writer of `--profile`; no stylesheet may
   set it or branch on `[data-profile-color='x']`. Colors that reuse a
   `--play-*` value do so deliberately — that reuse keeps the app one
   family, and the palette owns those hexes.
3. **Every color clears 3:1 against every theme background** (the WCAG bar
   for non-text UI, which is what these are). `legibleOn` nudges LIGHTNESS
   only — up on black/dim, down on light — so the picked hue survives;
   `profileHex` is just that applied to a catalogue entry. Yellow is 1.3:1
   on warm paper and gets darkened; the lift direction has no shipped color
   needing it today (the deep teal that did was dropped), which is exactly
   why `legibleOn` is exported and validate proves the lift on a raw hex —
   an untested branch is one that has already rotted.
3b. **The picker is ONE row.** `.color-row` is
   `repeat(N+1, minmax(0, 1fr))` — a fixed column per catalogue entry plus
   Standard — so it squeezes instead of wrapping at narrow widths. It was
   a wrapping flex row, which put the last swatch on a line of its own at
   most widths and spent a whole row of modal height on it. Validate
   derives the column count from `PROFILE_COLORS`, so adding a color
   without widening the grid fails rather than silently wrapping again.
   Height stays 46px: DESIGN's 44px touch minimum counts one dimension.
4. **The charts get a gradient, not a scatter — and it must actually
   graduate.** `chartRamp` is monotonic light→dark with a tight ±9° hue
   sweep and flat saturation. Do not interleave it to push neighbouring
   slices apart (it reads as two alternating colors, not a palette) and do
   not widen the sweep (yellow walks out to tan and lime). Separation
   comes from LIGHTNESS instead, and it is real: every profile chart caps
   at **5 series** (`MAX_SERIES` in charts.tsx, tail folded into a grey
   "Other"), and the ramp's span is sized so adjacent steps at that cap
   differ by ≥0.075 lightness — a ten-slice donut of near-identical
   purples shipped once, which is what the cap and the floor exist to
   prevent. Both are validate-enforced; the bright end of the span stays
   where every hue still clears the 1.9:1 card-visibility floor.
5. **Never paint a progression surface with the raw `--play-7`.** It
   resolves to the same orange today, which is exactly why four of them
   stayed literal and turned up orange next to a green flame. Use `--xp`.
   Validate-enforced.

All five are re-proven by `npm run validate` ("Profile color").

### Rank crowns (the level ladder)

Six crowns mark the climb — Wood 10, Iron 25, Silver 50, Gold 100,
Platinum 150, Challenger 200 — defined once in `progress/xp.ts`
(`RANK_TIERS`); the profile row, the home badge, the level landmarks and
the share card all derive from that list, so a new tier is one entry and
nothing else.

- **Materials are FIXED tokens**, `--rank-<id>` plus `--rank-<id>-rim`,
  declared once in `tokens.css` alongside `--good`/`--bad`. A rank is an
  achievement: Gold that turned beige on the light theme would stop being
  gold. This is the same reasoning that keeps `--xp` off the accent.
- **One badge everywhere**: a white crown on the material disc with the
  darker rim every extruded token wears (`RankCrown`). The crown is
  *stroked* in the rim color as well as filled white, because on the pale
  materials a bare white glyph on a bright disc disappears — one formula
  that survives all six beats six special cases.
- **The badge is extruded, and it looks like what it is made of.** The
  disc is drawn as a rim circle with the lit face sitting slightly high
  and small on top, so the bottom crescent IS the darker edge the rest of
  the app gets from `inset 0 -3px 0`; the crown emblem repeats itself in
  rim underneath so it lifts off the face. The face then carries the
  material's own texture — wood grain, brushed iron tool marks, silver and
  gold specular bands (gold keeps a sparkle), platinum's mirror pair,
  challenger's gem facets — plus a dome gloss on everything except matte
  wood. Six flat discs in six hues were six hues, not six materials.
- **The texture lives in ONE table**, `design/rankMaterials.ts`: SVG path
  data with a stroke width and an alpha, painted in the rank's own rim
  colour or in white, never a new hue. The SVG badge and the share card's
  canvas port both read it — canvas takes the same path strings through
  `Path2D` — because they are two drawings of one crown, and separate
  copies are precisely how a shared card ends up showing a different badge
  from the profile. `npm run validate` fails if a rank has no material, if
  a texture path/alpha/width is malformed, or if either renderer stops
  importing the table. The sheens are a sanctioned content-art opt-out
  from the no-gradient surface rule, like the game sticker icons.
- **The whole ladder is always shown** (`RankLadder`, under the XP bar),
  with unearned crowns greyed by the SAME `filter: grayscale(1)` +
  low-opacity treatment as locked landmark plates: "grey means not yet"
  should only have to be learned once. Hiding unearned crowns would hide
  the progression, which is the point of the row.
- **Current crown, two places**: the profile level card's top-right corner
  and immediately left of the home header's level chip. Below level 10
  there is no crown and nothing is drawn — an empty corner is honest,
  a placeholder crown is not.

### Daily Challenge (the one board everybody plays)

The home card sits above "Last played" and below the filter row: it is the
only thing on the page with an expiry, so it leads. It wears a
`--xp`-tinted ring rather than the ordinary border — progression colour,
same reasoning as the level and streak surfaces — and that ring RELAXES to
the plain border once the day is done, so a finished card stops asking for
attention. The countdown to local midnight is the point of the card: "Play"
alone would not tell anyone that waiting costs them the streak.

The daily's **setup screen** wears the same identity, so the moment before
a daily run never reads as an ordinary game setup: the locked-assignment
strip (`.daily-lock`) takes the home card's soft `--xp` ring — the exact
same 45% mix, one language for "this surface is the daily" — with the date
inked `--xp`, and the start button (`.start-btn-daily`) trades the neutral
primary fill for `--xp` + white ink + an `--xp-rim` extruded edge, with
the `PartyIcon` popper beside its label. The popper is a monochrome
`currentColor` icon, not an emoji (UI controls never use emoji); the
festivity comes from the color, which follows the profile color like
every `--xp` surface. White on `--xp` here is the crown count bubble's
documented tradeoff — the escape hatch is the same: deepen the fill to
`--xp-deep`, never darken the ink.

The profile's four-week grid is paint-only state on fixed geometry (see
"Tile grids"): solved-unaided is `--good`, solved-with-help is `--play-7`,
started-and-abandoned is a dashed border, today carries an accent ring —
and every one of those is the same 1px box at the same size, so the grid
never jitters as it fills in.

A solved day wears the **same material as the streak check disc**: a SOLID
fill with the darker inset bottom edge, plus a tick pinned top-right. It
used to be a ~30% tint of the same colour, which reads as "sort of done" —
a finished day should look as finished as a lit streak dot. The one thing
the material must not flatten is the clean/helped split: green for
unaided, orange for helped, because "you did this without help" is one
meaning across the whole app (see "Completion markers"). The `today` ring
composes with the edge through a `--cell-edge` variable rather than
replacing the whole `box-shadow` — a completed today must keep both.

Its trophies use **calendar-page** art, never a flame. The play streak owns
the flame; two streaks that share a badge are two streaks nobody can tell
apart, and these two deliberately measure different things ("played
anything today" vs "played today's board").

### Completion markers (beaten difficulties & swept games)

"You beat this" is ONE visual language everywhere it appears, driven by
the progress store (`beatenDifficulties` / `allDifficultiesBeaten`) —
never recomputed from capped history:

- **Beaten difficulty** = a 3px green ring + the `.beat-seal` pinned to
  the element's top-left corner (green disc, gold `--warn` star, darker
  green rim). Used on the setup screen's difficulty picker and the
  profile's high-score tiles. Adding a third surface reuses these two
  classes rather than inventing a variant.
- **Only a clean win earns a marker.** The green ring, the star seal and
  the game trophy appear only for a win with no hints and no assists (see
  `countsAsBeaten`), so a marker never means "I got there with help". The
  setup screen's assist note says so out loud, and the sweep/mastery
  landmarks spell it out in their requirement line.
- **Green is semantic** (`--good`), never the accent — completion means
  the same thing on every theme, and the green ring is declared
  after `.active` so it still reads on the selected difficulty.
- **The ring must not change geometry**: it is a 1px border plus a 2px
  `inset 0 0 0 2px` ring, so an unbeaten and a beaten tile occupy exactly
  the same box (see "Tile grids"). Never swap `border-width` between
  states.
- **All five tiers beaten** = the `.game-card-trophy` badge: a white
  rosette medal (`RosetteIcon` — the same medal-with-ribbons shape the
  category-mastery landmarks wear) on a `--xp` orange disc with a 3px
  darker-orange rim and the extruded bottom edge. It is deliberately NOT a
  crown: **crowns belong to the rank ladder alone** — this mark was a
  three-pointed crown once, and beside the six rank crowns the two crown
  families read as one ladder. A swept game is the top of the progression
  ladder, so it wears the progression color rather than the green of a
  single beaten tier — the star seals stay green, and the two never get
  confused for one another. It sits inline on the home card and absolutely
  in the top-right corner of the profile's high-score card, where it
  floats above the tiles' seals (`z-index: 2`) and therefore also carries
  a very soft elevation shadow.
- Badge glyphs are **flat solid silhouettes**, not linework: at ~18px a
  2px stroke turns to mush, so `RosetteIcon` fills its shapes, with the
  medal's inner ring CUT OUT of the disc (evenodd) rather than stroked
  (the same trick the cipher glyphs use).
- **Counting them is a marker surface too**, and there are two counters.
  The profile's "Game crowns" KPI is
  `GAMES.filter(g => allDifficultiesBeaten(progress, g.id))` scoped to the
  page's active filter, like every other card in that grid; the
  `GameCrownBadge` in the level card's top-LEFT corner is the same count
  unscoped, because that card is identity and must not move when the page
  below it is filtered. A count derived from `history` would silently
  drift the moment the 1000-row cap bit or the log was cleared — the whole
  reason these markers read the permanent store. Validate-enforced against
  an empty history. Both are labelled/titled "Game crowns", not "Crowns":
  the rank ladder on the same page has six crowns of its own.
- **The counted badge is the same material, not a lookalike.**
  `.crown-badge` and `.game-card-trophy` must declare the same
  `background: var(--xp)` and `border: 3px solid var(--xp-rim)` — validate
  compares the two rules — because one mark that means one thing must be
  made of one thing. The art is shared too: `GameCrownBadge` renders the
  same `RosetteIcon` the inline trophy does, so the mark can never become
  two drawings. Only the size and the number differ, and the level card's
  two corners face each other: rank crown right, game rosette left, both
  absolutely positioned so neither costs the card a row.
- **The two corner badges match in DRAWN pixels, not in props.** Both take
  `size={38}`, but that number is `RankCrown`'s SVG box: inside it the rank
  disc is drawn at `RANK_BADGE.r` (30 of a 64 viewBox → 35.6px) with its
  crown at ~62% of that disc. `GameCrownBadge` therefore derives BOTH from
  the same table — disc `size · 2r / 64`, art `0.724 ·` disc — instead of
  making a 38px CSS disc with its art at 100%, which shipped ~7% wider with
  its jewels ~1px off the rim: bigger and cramped, on the one card where
  the two are side by side. Validate-enforced. When two pieces of art must
  match, matching the prop is not matching the pixels.
- **A count does not go inside the art — it gets its own bubble.** The
  rosette disc stays exactly what it is on a game card (the rank crown's
  drawn diameter, derived as above), and `.crown-badge-count` hangs off its
  bottom-right the way a notification count hangs off an app icon, in the
  SAME material as the disc — `--xp` fill, `--xp-rim` ring, extruded
  bottom edge, white ink — so the two read as one object, which is the
  whole point of splitting them. White on `--xp` is a deliberate call
  taken with the numbers on the table (~3.5:1 on purple and blue, ~2.1:1
  on the default orange, ~1.4:1 on yellow), which is why the digits are
  sized and weighted up. If a color ever reads badly there, deepen the
  FILL to `--xp-deep` — never darken the ink, which is exactly what would
  stop the bubble matching the badge. Three layouts that put the
  number *in* the art (a crown, at the time) all shipped and all failed,
  in three different ways worth remembering: **in the band**, by analogy with `FlameArt`
  printing a streak length inside its white drop — but a flame is a fat
  teardrop with a big soft middle and a crown is mostly points and gaps,
  so the band left about 8px and the digits were illegible; **stacked
  under a half-height crown** — readable, and it destroyed the silhouette
  that carries the meaning; **overlaid across the crown** — readable, and
  it broke the crown's shape. Rules: measure the interior of the specific
  shape before putting type in it, never buy legibility by shrinking the
  thing that carries the meaning, and when a count and an emblem compete
  for the same 38px, separate them instead of nesting them.
  Validate fails on any `<text>` inside the badge art (`GameCrownBadge`
  or `RosetteIcon`).

## Components

- **Touch targets**: minimum `44px` (`--touch`) in at least one dimension.
- **Radius scale**: 12 (`--radius-s`) small buttons/cells · 16 (`--radius-m`)
  cards/inputs · 20 (`--radius-l`) game cards · 24 (`--radius-xl`) modals.
- **Buttons**: `primary-btn` (filled, one per screen max), `ghost-btn`
  (neutral), `danger-btn` (destructive, always behind a confirm),
  `icon-btn` (44×44 chrome; the in-game header action row targets 51×51 —
  perfect squares, never stretched, and flex-shrinking together when the
  row would outgrow the viewport), `pad-tool` (in-game toolbar).
- **Toolbars**: rows of `pad-tool` buttons must use the equal-width grid
  (`.sudoku-controls` / `.cw-tools` pattern: `grid-auto-flow: column;
  grid-auto-columns: 1fr`) so buttons align in width and height. Fixed
  height 46px, icon + short single-word label.
- **Modals**: backdrop blur, `--radius-xl`, actions right-aligned; anything
  destructive or irreversible requires an explicit confirm step.

### Leaving a game (back ≠ home)

The in-game header owns TWO exits, and they are not interchangeable:

- **Back** (`BackIcon`) goes one step out — to this game's own setup screen
  (difficulty, assists, tutorial, Continue card). Wanting a different
  difficulty is the common case; it must not cost a trip through the
  69-game list.
- **Home** (`HomeIcon`) leaves the game entirely for the game list.

Both run the same `leave(to, recordAbandon)` path in `GameShell`, so the
short exit can never become a way to drop a losing game without it
reaching history: an unfinished, unsaved game confirms first and is
recorded as `abandoned` either way; finished games and saved/resumed
sessions leave straight away with nothing to abandon. Only the copy and
the destination differ. Returning to setup clears pause, dismissed-results
and celebration state — a setup screen must never inherit mid-game state.

Header action rows shrink rather than overflow. Six 51px squares plus
12px gaps are wider than a phone viewport, so the gap tightens with the
viewport (`clamp`) and the squares flex down together, holding the 44px
touch target to a 360px screen. The row needs an explicit `width: 100%`:
the header is a centered column, and a row of shrinkable children would
otherwise shrink-wrap to min-content and collapse the squares to icon size
(see QA-LEDGER, same class as `.game-tools`).

### Pausing (hidden board vs. veil)

The shell owns the pause, and a game declares which of two looks it gets
(`GameDefinition.pauseStyle`):

- **`hidden` (default).** The game adds `board-hidden` to its root and its
  board rule hides the board; the shell's opaque `.pause-overlay` says so
  and carries the Resume button. A puzzle must not be studied while the
  clock is stopped — that is the whole reason the board goes away.
- **`translucent` (the Reflex games).** The board STAYS in view under
  `.pause-veil` — a tinted, lightly blurred sheet with one small
  `.pause-veil-card` — and the WHOLE veil is the resume control. A
  real-time game's clock is not its score, and its player must see where
  the snake is before it moves again; hiding the board would turn every
  resume into a crash. A game with this style must not add `board-hidden`
  (validate checks both directions: every Reflex game declares the veil,
  no other game does).

Two things follow for real-time games. They pause from the BOARD — a plain
tap on the canvas (a press that never became a swipe), Space or P — through
`GameProps.requestPause`, because asking the player to look up and travel
to the header while the snake keeps moving is asking them to crash. And
they run a **3-2-1 countdown** before the board moves, at the start and
after every resume, drawn on the canvas as a card in the app's own
material (surface face, extruded edge, a draining ring) with the shell's
clock held through it (`holdClock`), so the recorded time is play time.

Canvas text over saturated content colours (floating points, the GO!) is
heavy white type with a dark rounded outline (`popText` in each game) —
plain `--text` ink is invisible on the grass in one theme and on the
coloured stack in the other.

## Horizontal scrollers (the category row pattern)

A row that would wrap to several lines on a phone (the home category
filter) becomes ONE sideways-scrolling line. Vertical space is the
scarcest thing on a phone — three rows of chips pushed the game list a
third of a screen down. The pattern, in `.cat-scroller` / `.cat-chips`:

- **Bleed to the screen edges** (`margin: 0 -16px` + matching padding) so
  items scroll out at the true edge instead of stopping short of it.
- **Edge fades are class-driven from the scroll position**, shown only on
  a side that really has more content. A permanent fade on both ends fakes
  a cut-off at the extremes and stops meaning anything.
- **Ship arrow controls on EVERY device.** A mouse wheel emits only
  `deltaY`, which a horizontal container ignores — desktop is otherwise
  completely stuck — and on touch the arrow is what tells the player there
  is anything to swipe to. Gate visibility on scroll position, never on
  `pointer:`/`hover:` media queries: a device reporting something
  unexpected must keep a working control (fail open), not silently lose
  the only way to scroll.
- **Translate wheel to sideways scroll**, but release the gesture back to
  the page at either end so hovering the row can never trap page scroll.
- Hide the scrollbar (`scrollbar-width: none` + `::-webkit-scrollbar`),
  set `overscroll-behavior-x: contain`, and give items `flex: 0 0 auto`.
- Small overlay controls still owe the **44px touch target**: keep the
  visible circle small and add an invisible `::after` cushion — and inset
  it far enough that the cushion cannot hang past a full-bleed container
  and add horizontal page overflow.

### Pill rows share ONE height token

The home screen stacks two pill rows — the category filter and the "Last
played" shortcuts (`.recent-row`, three fixed columns, newest on the
left). They are meant to read as the same control, so neither sets its own
height: both take `--home-chip-h`, declared once on the two containers,
exactly like `--head-token` for the header's streak pill and avatar. Two
rows that *look* matched but are sized independently drift apart the first
time one side's padding or font changes.

Where a label must fit a fraction of a phone's width, scale the TYPE, not
the row: `.recent-tile` uses `font-size: clamp(11.5px, 3.1vw, 13px)` so it
matches the chips wherever there is room and only the longest game names
ellipsize on a small screen. Truncation still needs `min-width: 0` on the
flex/grid child — without it a long name widens the track instead of
clipping, and the page scrolls sideways.

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
- **The card surface is ONE rule for every theme.** Themes differ only
  through `--card-fill` and `--card-hairline` in `tokens.css`; the
  `effects.css` selector must never be repeated behind a
  `:root[data-theme='…']` prefix. It was, once: the light copy sat at
  specificity (0,3,0) and outranked every component override, so a card
  that deliberately restyled itself (the Daily Challenge's `--xp` ring,
  the *selected* appearance button, the open dropdown's focus border,
  the press-down edge on Settings rows) looked right on black and dim
  and silently lost the styling on light — the theme most likely to go
  unchecked. A doubled component class (`.daily-card.daily-card`) beats
  the one rule on all three themes. `npm run validate` fails on a
  `[data-theme]`-prefixed `.fx-card` rule and on a missing card token.
- **Elevation exception**: floating overlays (modals, the results pill,
  sticky start button context) keep `var(--shadow)` — they hover above
  the page, so a drop shadow is information, not decoration.
- **Flat opt-outs**: the home search bar, the in-game info strip, and
  continuous boards whose cells share edges (sudoku, crossword,
  logic-grid) stay completely flat — extrusion belongs to
  gap-separated tiles only. Nurikabe is the one continuous board that
  paints depth INSIDE its cells: its blocks are island art (grass on a
  dirt side, foam, animated water) in fixed game-content colours, the
  same opt-out as Reversi's felt — a picture of an island, not a UI
  surface, so the card/tile rules above do not apply to it.
- **Flat background**: the page background is plain `var(--bg)`.
- Effects use neutral white/black alphas by design — they are the one
  sanctioned exception to the "tokens only" color rule.

## Motion & feedback

Transitions 0.12–0.2s ease. Press feedback: `scale(0.98)`. Every meaningful
action can play a `sfx` sound (respecting sound settings). Board state
changes (correct placement) may flash `--good-soft` briefly.

## Avatars

The player's avatar is an emoji or a Pokémon sprite, and both live in one
`Profile.emoji` string (see `design/avatars.tsx`). Every surface renders it
through `<Avatar value={...} />` — never `{profile.emoji}` — so adding a
kind of avatar never means hunting down the places that draw one.

- **A sprite must never be able to break the layout it lands in.** The
  plates (`.home-avatar`, `.profile-avatar`, `.import-avatar`) carry
  `overflow: hidden`, and `.avatar-sprite` carries `max-width`/`max-height`
  on top of its size. An `<img>` has an intrinsic size that beats a
  container which is not explicitly bounding it — see the QA ledger entry;
  inside a `<button>` even `height: 100%` and `inset` failed, and only an
  explicit size against a definite box worked.
- **`image-rendering: pixelated`**: the sprites are 96px pixel art and most
  surfaces draw them smaller or larger; smoothing turns them to mush.

## Game options (the setup screen's pick-one rows)

A game may contribute pick-one settings to its own setup screen
(`GameDefinition.options`). They render as `.option-row` / `.option-btn` —
the difficulty picker's plate and press, on wider tracks because an
option's labels are words rather than tiers.

- **Above Assists, never inside it.** An assist makes the game easier and
  is recorded against the clean-win rule; an option changes what the board
  is made of and costs nothing. Choosing the Pokémon cards must never make
  a win "helped", so it must not sit under a heading that implies it does.
- **A choice may carry a preview `icon`** — a sample of the thing being
  chosen (a Pikachu, a card), so it is game CONTENT and may be colourful;
  the monochrome-icon rule covers UI chrome. The icon lives in a FIXED
  28px box: art that sized itself would push into the label on the tall
  samples and leave a gap on the short ones.
- **Tracks are `minmax(76px, 1fr)`** so four choices still fit one phone
  row. Adding previews to a 112px minimum wrapped the row 3+1.

## Tile grids (stable geometry — required for every tile board)

Tile geometry must never depend on tile *content or state* — revealing a
number, flipping a card, or pressing a tile must not move or resize any
other tile. Concretely:

- **Pin both grid axes** with `repeat(n, minmax(0, 1fr))` plus either
  `grid-auto-rows: 1fr` on the board (when the board carries
  `aspect-ratio`) or `aspect-ratio: 1` on the tile itself. Never leave
  rows as implicit content-sized tracks: a row of empty tiles renders
  shorter than a row with digits, and the board visibly deforms as tiles
  fill in (the original Minesweeper bug).
- **`minmax(0, 1fr)`, never bare `1fr`** — and give the tile `min-width: 0;
  min-height: 0` too. A `1fr` track keeps `min-width: auto`, so a tile
  whose content has a large intrinsic size pushes every column past its
  share and the whole board overflows the page. Text faces never trigger
  it; the moment Memory Match's cards held images they did. Same trap as
  the toolbars (see Tool buttons), one layer down.
- **State classes only change paint, not layout**: background, color,
  border-*color*, opacity, transform, box-shadow. Never border-width,
  padding, font-size, or display between states — keep the border always
  present and swap its color (use `transparent` to hide it).
- **Press feedback is `transform: scale(...)`** (per Motion & feedback),
  never a size/padding change — transforms don't reflow neighbors.
- **Print inside a cell scales with the cell, not the viewport.** A board
  that carries text smaller than its letters (Arrow Crossword's clue cells)
  sizes it from the board's own width through container units
  (`container-type: inline-size` on the board, `calc(100cqw / var(--cols))`
  per cell), so a 6-column and a 10-column board keep the same
  letter-to-cell proportion at every viewport. Give such text a block the
  full width of its padding box (`display: block; width: 100%`) so a long
  single word wraps inside the cell instead of running under the arrowhead
  — a centered grid item shrinks to fit and does not.
- **A silhouette contour must not fight the selection ring.** Arrow
  Crossword draws its notched outline as a 1px border plus a 1px inset
  shadow on each side that faces an empty cell, composed through four
  custom properties (`--sl/--st/--sr/--sb`) so any combination of sides
  works from one `box-shadow` rule; the selected cell then uses `outline`
  (offset inwards) rather than a second `box-shadow`, which would cancel the
  contour — the same trap as the daily calendar's `--cell-edge`.

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
- Current users: Hangman, Word Guess, Word Ladder, Crossword, Arrow
  Crossword, Cryptogram. A new letter game must reuse this component, not
  fork it.

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
- **Assist toggles are the shell's, not the game's.** `GameSave.assists`
  (written by `GameShell`, restored on Continue) is the only place a toggle
  persists — assists are per-session, start off for every new game and are
  never stored in settings. A game stores what it USED (`assistsUsed`),
  never what was switched on.
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

**A snapshot that returns `null` and a disabled Save button must agree.**
Games with a pre-game menu (Maze's size picker, Battleship's fleet
placement, the vs-Robot/vs-Friend menus) have no board to store yet, and
they return `null` from the snapshot — which is why they must also call
`holdClock(true)`, since that is exactly what disables the header Save
button. Skip the hold and the player gets an enabled button that does
nothing, reads it as "saved", leaves, and loses the run. The shell keeps
a backstop for that case ("Nothing to save yet"), but the hold is the
real contract.

**A save belongs to the mode that made it.** `GameSave.daily` records the
Daily Challenge date, and the setup screen only offers a save back in the
mode that created it — restoring a daily board into an ordinary session
would put the player on a board the screen does not claim they are
playing. There is still one slot per game, so the modes overwrite each
other; only the *offer* is mode-aware.

## Games

Games must consume `GameProps` and express all their UI with these tokens
and icons, so a new surface theme restyles every game with zero
game-side changes. Game-specific CSS belongs in `global.css` under a clearly
marked section, still token-only.
