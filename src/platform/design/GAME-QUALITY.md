# The premium floor — game & test quality

`src/platform/design/GAME-QUALITY.md`. **DESIGN.md says what the app looks
like; this file says how it must FEEL** — the minimum of responsiveness,
feedback, motion, legibility, flow and accessibility that every game and
every Brain Lab test clears before it ships. Brain Lab tests also follow
`src/platform/brain/SCIENCE.md`: where one of its measurement conventions
(C1–C12) is stricter than a rule here, the measurement rule wins, and the
rule below says so where they meet.

Why it exists: the LOOK of the library is consistent because tokens, the
candy edge and the one-card bottom menu are written rules, several of them
validate-enforced. The FEEL never was, so every game invented its own. An
audit in 2026-10 counted 271 unique keyframes, 35 easing curves and no
motion tokens, 28 separate shake animations, 8 hand-built digit pads, 5
different 3-2-1 countdowns, lives pips green in some games and red in
others, reflex controls that registered on finger-lift, 2 live regions and 2
focus rings in the whole app, and 6 reduced-motion blocks. None of it was a
mistake on its own; it is what a premium bar becomes when it lives only in
taste. This file is the bar.

**Scope — the ratchet.**

- Every NEW game, every Brain Lab test and every new shared surface meets
  every rule here.
- The 71 games that predate this file are grandfathered: they are not
  refactored now. No change may move one of them further from the floor,
  and a game that is reworked substantially comes up to it in the same
  change.
- **Where a rule names a shared primitive, using it IS the rule.** A
  hand-rolled copy is a violation even when it looks identical, because
  copies drift — five hand-built keyboards did, until one broke (QA-LEDGER).

**How each rule is checked** (the tag after each rule):

- **[v]** a static scan `npm run validate` can run. Most are candidates, not
  yet written — see "How enforcement grows" at the end.
- **[h]** the headless pass (CLAUDE.md "Verification workflow"): bounding
  boxes at 360×640 and 390×844, a layout-shift observer,
  `page.emulateMediaFeatures` for reduced motion,
  `page.emulateVisionDeficiency`.
- **[c]** a required field the compiler already enforces.
- **[r]** review — checked by hand against the Premium checklist below.

Rules are numbered **Q1…Q44** so a review, a commit or a validate message can
cite one ("GAME-QUALITY Q17").

---

## A. Input — the press answers first

**Q1. Every press answers in the next frame.** Every control has a pressed
state that changes paint or transform only: the pushable press
(`translateY(2px)` plus the edge shrinking to 1px — DESIGN.md "Depth &
motion") on extruded controls, a `scale()` on flat tiles. Outcome feedback
is triggered from the input handler itself — never from an effect waiting on
another state change, a `setTimeout` or an `animationend`. A control that
sits still for a frame reads as a missed tap and gets tapped again.
[v] floor CSS gives every game-button class an `:active` (or `[data-down]`)
rule unless it is a shared primitive · [h] dispatch a pointerdown, assert the
pressed paint within one animation frame.

**Q2. Timed answers commit on `pointerdown`, stamped with the event's own
time.** Anything whose latency is measured or felt — every Brain Lab
response, a reflex game's controls, a speed round's answers — is a
`ResponseButton` (or a `NumberPad`) and uses the time it hands over
(`eventTime(e)`, the `performance.now()` clock). `click` is for untimed
controls only (`PadTool`). A click fires on RELEASE, ~80–120 ms after the
finger lands on touch (SCIENCE.md C2): Snake's D-pad committed turns on
`onClick`, so a reflex game ran one finger-lift behind its player. A held,
auto-repeating control (Block Drop's DAS) keeps its own pointer-capture
handler — `press()` in `BlockDropGame.tsx` is the model.
[v] answer handlers in floor folders are `ResponseButton`s or
`onPointerDown`, never `onClick`.

**Q3. Response surfaces are inert to the browser.** `touch-action:
manipulation` on buttons (no double-tap zoom), `none` on drag, aim and
stimulus surfaces; no text selection, no iOS callout, no context menu.
`ResponseButton` and `.resp-btn` ship all of it. A long-press that opens the
magnifier or selects a word mid-trial ruins the trial. [v]

**Q4. Decoration never gates input.** The moment a trial or a move allows an
answer, input is accepted — nothing waits for a flash, shake or slide to
finish (SCIENCE.md C3). A speed game that cannot act on an input yet
BUFFERS it (Snake queues up to three turns) instead of dropping it.
[r] · [h] press during a feedback animation and assert it registered.

**Q5. One press, one action.** Primary pointer only, key auto-repeat and
modifier chords ignored, and a pointerdown never followed by its own click
firing a second time. `ResponseButton` does all three; a hand-rolled handler
must too. [r]

**Q6. Every answer has a key on desktop.** Answers map to keys
(`ResponseButton keys`, `NumberPad hardware`) and the instructions name them
("F / J", "1–9", arrows, Space). The app is played on desktop too, and two
on-screen pads clicked with a mouse measure the mouse, not the player.
[h] drive one full run by keyboard alone.

## B. Feedback — one family, never one channel

**Q7. One feedback family.** Correct rises, wrong falls, everywhere.
`useFeedback()` returns `good(at, { step })`, which plays `sfx.correct(step)`
(a soft two-note chime, one semitone higher per streak step, capped at 8),
bursts a ring, sparks and a ✓ at the point touched, and calls
`haptic('good')`; and `bad(at)`, which plays `sfx.wrong()` (a short, low,
falling buzz that never reads as an alarm) with a ✕ burst and
`haptic('bad')`. Never invent a per-game "correct": `playNote` ladders, `pop`
standing in for correct and `hint` reused for a level-up all shipped, and
each taught the player a different sound for the same news.
[v] floor folders import `useFeedback` and contain no `playNote(` unless the
game's content is musical (Simon).

**Q8. Never by colour alone.** Every colour-coded state also differs by
glyph, shape, text or position. The burst carries ✓ or ✕; Stroop's
swatches carry a colour-blind glyph (the model); Schulte's extreme tier tells
its two sequences apart by red vs blue only (the counter-example). Area
colours in Brain Lab always sit beside the area's name.
[h] screenshots under `emulateVisionDeficiency('deuteranopia')` and
`('protanopia')` — every state still tellable.

**Q9. Never by sound or vibration alone.** The player's main device is the
installed PWA on an iPhone: its ring/silent switch silences Web Audio, and
iOS Safari has no Vibration API (`haptic()` is a silent no-op there). The
visual is the primary channel; sound and haptics are bonuses, and a player
with sound off loses nothing. [r] · [h] run once muted.

**Q10. Distinct outcomes get distinct feedback.** "Too early" (an
anticipation or false start — `sfx.early()`), "too slow" (a timeout, which is
NOT a wrong answer) and "wrong" are three states, each with its own words,
glyph and sound. Stroop and Math Sprint show a timeout exactly like a wrong
answer, so the player cannot tell whether they misjudged or were late. [r]

**Q11. Wrong answers teach — where the protocol allows.** In games and in
practice blocks, show the right answer or where it was: Number Trail
re-reveals the numbers and pulses the next tile, Math Sprint and Backwards
Span show the right answer. In a scored measurement block the paradigm
decides (Q12). [r]

**Q12. Feedback integrity in measurements (SCIENCE.md C3).** During a scored
Brain Lab block, correctness feedback appears only where the paradigm
prescribes it — Attention on every trial, Precision hit or miss, Reaction
its RT display plus false start and overrun. Every other scored block
acknowledges a press with `useFeedback().neutral` (a quiet ring, silent by
default) and nothing else: no ✓/✕, no streak counter, no points, no "+N", no
pulsing timer. Sounds and haptics are as the spec says and identical in
every session. Expecting feedback changes speed (Thompson 2024), so a
block's feedback is part of its protocol; the results screen AFTER the block
may be as rich as desired. [r] against the test's SCIENCE.md section.

**Q13. Feedback never lands on the next stimulus.** Feedback plays on the
element that was touched or in the `fx-layer` — never on the stimulus that
replaces it — and in a measured task the gap before the next onset is at
least the feedback's own duration (`--dur-feedback`, 360 ms). Stroop advanced
while its card was still shaking, so the NEW word shook. [r] · a test's
brain-check can assert that the inter-trial interval covers the feedback.

**Q14. Errors recover.** An error never dead-ends: the next action is
obvious (retry, next trial, Restart); irreversible actions confirm first;
undo exists wherever the game's rules allow it; an interrupted Brain Lab run
says why and offers an immediate restart (C5); and an enabled control never
silently does nothing (QA-LEDGER, "Nothing to save yet"). Errors measure
answers, never touch accuracy (CLAUDE.md, "Errors measure answers") — a
mis-tap on a key is not a wrong answer. [r] · [h]

## C. Motion — tokens, purpose, restraint

**Q15. Durations and easings are tokens, never literals.** CSS reads them
from `tokens.css`; JS and canvas use their twins in `platform/motion.ts`
(`DUR`, `easeOut`, `spring`), and the two sets move together. Pick by job:

| Token | ms | Use it for |
| --- | --- | --- |
| `--dur-press` · `DUR.press` | 80 | the pushable press and its release |
| `--dur-fast` · `DUR.fast` | 140 | hover tint, colour and state swaps, a small icon change |
| `--dur-base` · `DUR.base` | 220 | a card, sheet, modal or phase arriving or leaving |
| `--dur-feedback` · `DUR.feedback` | 360 | correct/wrong bursts, a flash, a shake |
| `--dur-emphasis` · `DUR.emphasis` | 600 | one-off emphasis: a countdown digit, a results headline, a ring filling |

| Curve | Use it for |
| --- | --- |
| `--ease-out` · `easeOut()` | the default — anything arriving or responding |
| `--ease-in` | anything leaving |
| `--ease-in-out` | a move from A to B on screen (the demo finger) |
| `--ease-spring` · `spring()` | a small overshoot for the pop or land of a decorative element — never on a timed stimulus or a response target |

Content animation with a timing of its own (the 3.5 s win celebration,
Untangle's rope physics, a 90 s draining block) keeps it — the tokens are
for interface motion — and its constant lives in one named place, never
scattered literals. [v] no `cubic-bezier(` and no literal duration in floor
CSS outside `tokens.css` · [v] `DUR` matches the `--dur-*` tokens.

**Q16. Animate paint and transform only.** `transform`, `opacity`, `color`,
`background-color`, `border-color`, `box-shadow`, `filter` — never `width`,
`height`, `padding`, `margin`, `top`/`left`, `font-size` or grid tracks on
anything in the flow: those reflow the neighbours and drop frames on a phone.
[v] transitions and keyframes in floor CSS name only these properties.

**Q17. Stimulus onsets never animate.** A measured stimulus appears in ONE
frame: flip it visible with `opacity` (or a canvas draw) inside a
`requestAnimationFrame` callback and take that callback's timestamp as the
onset — `revealOnFrame` in `brain/timing.ts` — through a ref or DOM write,
not React state, which paints a frame or more later. No fade-in, scale-in or
slide-in on a stimulus; no CSS animation or transition timing one (on iOS,
CSS-animation timing hit the intended frame on ~18–24% of trials against
100% for rAF plus opacity — Pronk 2020); no stimulus shorter than 100 ms;
and response targets never move or resize (C2, C3). [r] · brain-checks

**Q18. One emphasis per element per event; loops only for attention.** An
element plays at most one emphasis animation per event — not a pop plus a
glow plus a shake. `infinite` loops are for a state that needs attention
right now (time running low, an armed button), at most two on screen, and
they stop when the state ends. Nothing loops or pulses during a scored
measurement block. [v] count `infinite` in floor CSS · [r]

**Q19. Reduced motion is honoured everywhere, by default.** Under
`prefers-reduced-motion: reduce` every `--dur-*` token collapses to 1 ms and
`--motion` becomes 0, so CSS built on the tokens is already compliant.
Beyond that:

- movement becomes a fade or a colour change, and information never depends
  on movement — the feedback burst drops its ring and sparks and keeps its
  ✓/✕;
- JS and canvas read `useReducedMotion()` (live) or `prefersReducedMotion()`:
  a demo parks on a frame that explains itself (`useDemoClock(period,
  stillAt)`), the radar skips its grow-in, a count-up shows the final number;
- **flow timing does not change.** When the next screen appears is decided in
  JS and stays the same, exactly as the win celebration keeps its 3.5 s with
  the confetti gone;
- never `animation: none` on an element whose code waits for `animationend`:
  the tokens collapse to 1 ms precisely so that event still fires (Block
  Drop's level toast removes itself on `animationend` and would stay on
  screen forever).

[v] floor JS/canvas animation imports `useReducedMotion` · [h] a run under
emulated reduce shows no transform animation and still finishes.

**Q20. Screens arrive; they don't pop in.** A card, phase or sheet enters
over `--dur-base` with `--ease-out` as an opacity fade plus at most ~8 px of
travel (`PhaseCard`'s `phase-in` is the model) and leaves with `--ease-in`.
Nothing slides across a running measurement. [r]

## D. Sound & haptics

**Q21. One catalogue, one meaning per sound.** Every sound comes from `sfx`
in `audio.ts` (synthesized, no files):

| Sound | Means | Played by |
| --- | --- | --- |
| `tap` | a UI press | `PadTool`, unless `silent` |
| `correct(step)` · `wrong()` | an answer judged right · wrong | `useFeedback` |
| `early()` | a response before it was allowed | the test or game |
| `countdown(n)` · `go()` | a 3-2-1 beat · the start | `Countdown` |
| `complete()` | a block or measurement finished — calm, never `win` | the Brain Lab results |
| `hint()` | an active assist used | the game |
| `win()` · `lose()` · `levelUp()` | a game won · lost · a new level | `GameShell` only |

`playNote` is for musical content only (Simon's pads). A new meaning gets a
new named sound in this table, never a borrowed one. [v] no `playNote(` in
floor folders outside a musical game.

**Q22. Every scored event has a sound, and every sound has a visual.**
Paired, from the same handler (Q1). The exception is Q12: a measurement's
sounds are what its protocol specifies. [r]

**Q23. Never two sounds for one event.** `PadTool` plays `tap` unless
`silent`; `ResponseButton`, `NumberPad` and `Keyboard` play nothing;
`useFeedback` sounds `good`/`bad`. So a timed answer is a silent press plus
ONE feedback sound, and a `PadTool` whose handler plays its own sound is
`silent`. [r]

**Q24. Haptics go through `haptic()`.** Never `navigator.vibrate` directly:
`motion.ts` guards for support and for the throw some browsers raise outside
a user gesture. It works on Android only, so it is a bonus by construction —
and `useFeedback` already calls it. [v] no `navigator.vibrate` outside
`motion.ts`.

## E. Legibility & layout — at 360 px

**Q25. Type floors** (rendered size on a 360 px-wide phone):

| Text | Floor |
| --- | --- |
| A stimulus — the thing being judged (word, digit, arrow, symbol) | 28 px, and the largest thing on screen |
| An answer label on a response pad | 16 px |
| Live numbers (timer, score, count) | 15 px, `tabular-nums` |
| Reading text — instructions, at-play status, results insight, verdicts | 14 px, line-height ≥ 1.4 |
| Captions — demo captions, metadata, secondary lines | 13 px |
| Micro labels — all-caps kickers, chart ticks, badge captions | 11 px, weight ≥ 600, never the only place a value appears |

Scale type with `clamp()` or container units, never the row (DESIGN.md
"Pill rows share ONE height token"). SVG text counts at its RENDERED size,
not its user units: a chart drawn in a 320-unit viewBox at 300 px wide
shrinks every label in it. [v] floor CSS fails on a `font-size` under 11 px ·
[h] computed sizes at 360 px.

**Q26. Contrast on every background of every theme.** Text ≥ 4.5:1 (large
text — ≥ 24 px, or ≥ 18.7 px bold — 3:1); non-text UI that carries meaning
(a control's boundary, a state mark) ≥ 3:1; measured against `--bg`,
`--surface` and `--surface-2` on black, dim AND light. What that means with
today's tokens:

- light `--text-dim` is 3.7 / 4.2 / 3.4:1 on bg / surface / surface-2 —
  below AA, a platform gap (see "Known platform gaps"). Until the token is
  fixed, `--text-dim` is for text that annotates something said elsewhere; a
  stimulus, an instruction needed mid-block, a score or a verdict is `--text`;
- **semantic and area colours are fills and marks, never text ink.** On
  light, `--good` is 1.9:1, `--warn` 1.3:1, `--bad` 3.2:1, `--xp` 1.9:1, and
  five area slots are under 2:1. Words stay `--text`; the colour goes in a
  disc, dot, bar, ring or icon beside them;
- a glyph ON a semantic fill is `--ink` (≥ 4.9:1 on all four); white on
  `--xp`/`--xp-deep` is the documented exception (DESIGN.md "Completion
  markers").

Measure with `contrast()` / `legibleOn()` from `profileColors.ts` — validate
already does, for the profile colours. [v] floor CSS never sets
`color: var(--good|--bad|--warn|--xp|--play-N)` · [h] spot-check computed
pairs on the light theme.

**Q27. Touch targets.** Every in-game input and every close button is
≥ 44 × 44 px in BOTH dimensions (DESIGN.md's general rule counts one; the
floor tightens it for new surfaces). Two-choice response pads are ≥ 96 px
tall (`ResponseButton variant="big"` is `clamp(96px, 15vh, 136px)`): a
measured choice must never turn into an aiming task. Neighbouring targets
keep ≥ 8 px apart or form one segmented group, and a small visual gets an
invisible `::after` cushion (DESIGN.md "Horizontal scrollers").
[h] measure every `button` and `[role=button]` at 360×640.

**Q28. Zero layout shift during a run.** Nothing moves because a number
changed or a message appeared. HUD values sit in fixed-width slots
(`tabular-nums` plus a `min-width` in `ch`); a status line reserves the
height of its longest copy (`min-height`, as `.demo-caption` does); a row
that grows mid-run scales or reserves its space (Backwards Span's 40 px
slots wrap from span 7 on a 360 px phone); tracks are `minmax(0, 1fr)` with
`min-width: 0` items; state changes are paint-only (DESIGN.md "Tile grids").
[h] a `layout-shift` PerformanceObserver over a scripted run totals ≤ 0.01 ·
[v] no bare `1fr` track in floor CSS.

**Q29. The stage keeps the screen.** Portrait first; no horizontal page
scroll at 360 px; safe-area insets respected; the docked bottom card around
a third of the viewport or less (DESIGN.md "Tool buttons"); and during a
timed block the stimulus and the response surface fit one screen with no
scrolling. [h]

## F. Flow — from first open to the last screen

**Q30. Onboarding shows, then lets you try.** The first time someone meets a
game or a test they see the core interaction ANIMATED, not described:
`DemoStage` + `useDemoClock` + `demoStep` + `DemoFinger` — a looping
miniature in which a fingertip taps what the player will tap, under a
caption that carries the meaning (the art is `aria-hidden`). Then they try
it, unscored.

- **Brain Lab:** `instructions` (2–4 lines) and `Demo` are required fields
  [c]; a first run starts with that test's practice, with corrective
  feedback (C1); practice is never recorded.
- **New games:** the first "How to play" step is an animated demo of the
  core move (a `TutorialStep.art` may hold a `DemoStage`); static `.tut-*`
  art stays fine for the steps after it.

Under reduced motion the demo parks on a frame that still explains itself.
[c] · [r]

**Q31. A timed block has one shape.** Every timed block — every Brain Lab
test, every timed game round — runs: a `PhaseCard` saying what comes next
("Warm-up · not scored", one primary action) → `Countdown` (3-2-1-Go,
`sfx.countdown` / `sfx.go`; paused, it holds and restarts from the top,
because a half-seen countdown is not a countdown) → the block → its
results. A real-time game counts down at the start AND after every resume
(DESIGN.md "Pausing"); inside `GameShell`, hold the shell clock
(`holdClock(true)`) while the countdown shows, so the recorded time is play
time. `TimerBar` is decorative: a block ends on its own `performance.now()`
clock, never on a CSS animation's end. [v] floor folders use `Countdown`
(canvas games draw the same card on the canvas) and contain no local
3-2-1 loop.

**Q32. A hidden app never keeps playing.** No timer runs while the page is
hidden: a real-time game pauses (Snake and Block Drop stop their loops on
`document.hidden`); a Brain Lab class-A run is invalidated and offers a
restart; a class-B run voids the trial in flight (C5). `GameShell` does not
auto-pause on `visibilitychange` yet, so until it does a timed game handles
it itself. [h] hide the page mid-run.

**Q33. The last screen gives an insight.** A run ends with its OWN headline
metric and unit (not a generic "Score"), the comparison that matters — a
game: personal best and recent runs; a Brain Lab test: today against your
typical range and your baseline (SCIENCE.md §2.5) — and one plain-language
sentence (for Brain Lab, from `ui/copy.ts` only). The headline number counts
up over `--dur-emphasis`, instantly under reduced motion. No meaningless
cells (no "Errors 0 · Hints 0" in a game that has neither) and "Puzzle
complete!" only for puzzles. A Brain Lab results card keeps the same layout
every run (C1), sounds `sfx.complete()` — played by the RUNNER as the card
opens, so a test's own block end plays only the neutral lock `sfx.place()`
(five tests once chimed at block end too, doubling it) — and never celebrates: no confetti, no
win banner — one day is state, not progress (SCIENCE.md §0.7). Games: the
shell's results modal cannot show a game's own metric yet (see gaps); until
it can, the board's own end state carries it (Schulte's over/under-par
chips). [r] · [h]

**Q34. Loading, empty and error states are designed.** Anything slower than
~300 ms shows a progress meter or a skeleton within 300 ms; a load that can
hang fails LOUDLY after a timeout, with Retry and, where one exists, a
fallback (the chess engine loader: a download meter, then "Try again" /
"Built-in robot" after 30 s of silence). An empty state is an icon, a title,
one sentence and one primary action — never a bare grey sentence. A first
open is designed as carefully as a full one: Brain Lab with no data shows
the onboarding and the first step, not nine empty cards, and a calibrating
test says "Calibrating" and how many runs remain. [r] · [h] with
`?brainFixture=fresh`.

**Q35. Sheets and modals behave.** Escape closes; focus moves into the
dialog when it opens and back to its trigger when it closes; the dialog is
`aria-labelledby` its title; it arrives and leaves over `--dur-base`; its
close target is ≥ 44 px; and `aria-hidden` never wraps anything focusable.
The shared `Modal` does none of the first four yet (see gaps) — a new sheet
implements them until it does. [h] Tab and Escape through every sheet.

**Q36. Words are short, concrete and honest.** Say what to do in the fewest
words, in the second person ("Tap the side the middle arrow points to");
every number carries its unit; the play screen never shows jargon — d′, z
and σ live in the science sheet, not on a button. Brain Lab copy also
follows SCIENCE.md §4 to the letter: no IQ, no diagnosis, no percentiles,
the honest area subtitles, the verbatim disclaimer, the practice qualifier.
[r] · [v] scan `ui/copy.ts` and `domains.ts` for the words §4.1 bans.

## G. Accessibility

**Q37. Every control has a name that includes its state.** Icon-only
controls carry `aria-label`; toggles expose `aria-pressed` (`PadTool` and
`ResponseButton` do it through `active`); a cell's name says what it shows
("7, found"). [h] the accessibility tree has no unnamed button.

**Q38. Status is announced; decoration is hidden.** The at-play instruction
or status line is a polite live region (`role="status"`); a countdown is
assertive (`Countdown` does it); bursts, demo art and confetti are
`aria-hidden` — so whatever they show ALSO appears as text in a live region.
A progress bar that reports a value carries `aria-valuenow`/`-min`/`-max`
and a label (`TimerBar` is decorative and has none, by design).
[v] floor components contain an `aria-live` or `role="status"`.

**Q39. Focus is visible and ordered.** Every interactive element shows a
`:focus-visible` ring (a 2 px `--accent` outline, offset 2 px — never removed
without a replacement); focus order follows reading order; Tab never lands
inside hidden UI. [h] tab through every screen.

## H. Performance

**Q40. Per-frame work lives in `requestAnimationFrame`.** Never
`setInterval` for animation. A loop stops on pause, on `document.hidden` and
on unmount, and resumes from the same state. State the loop mutates lives in
refs; React state carries only what the HUD prints, synced through a "last
shown" ref compared every frame (QA-LEDGER: the Block Drop HUD). [r]

**Q41. No layout thrash.** Read layout (`getBoundingClientRect`) once per
frame or on resize, then write; coalesce pointer moves into one commit per
frame (QA-LEDGER: drags); never commit React state on every pointer event.
[r] · [h] no long task over 50 ms during a scripted run.

**Q42. Canvas is sized once and capped.** A canvas takes its size from a
`ResizeObserver` and multiplies by `devicePixelRatio` capped at 3 (Snake's
precedent; 2 for heavy scenes), reads its colours from the tokens through
`getComputedStyle` and re-reads them on a `data-theme` /
`data-profile-color` change, and redraws only while something moves. [r]

**Q43. Mount is instant.** Board or item generation inside a `useMemo`
finishes well under 50 ms on a phone; anything slower is baked offline
(Gridlock's bank) or deferred behind a progress meter. Heavy runtimes stay
out of the precache and load on demand (Stockfish). [r] · [h] time the
mount on the phone viewport.

**Q44. Seeds, never `Math.random`, for anything a measurement shows.** Every
Brain Lab item comes from the run's stored seed (`rng(seed)` and friends in
`brain/timing.ts`, SCIENCE.md C8), so validate can replay a protocol exactly
and two runs never share a form. Render-time decoration hashed from stable
ids is fine (Nurikabe's scenery); `Math.random` during render is not. [r] ·
brain-checks replay seeds.

---

## Premium checklist — before a game or test ships

Run it on the phone viewport (390×844) and at 360×640, on the dark AND the
light theme.

- [ ] Every press sinks in the next frame; timed answers fire on pointerdown
      (Q1, Q2).
- [ ] A full run works with the keyboard alone on desktop (Q6, Q39).
- [ ] Correct and wrong use `useFeedback` — the shared sounds, a ✓/✕ glyph,
      never a colour alone (Q7, Q8); timeouts and early presses say so (Q10).
- [ ] Muted and in deuteranopia emulation, every outcome is still readable
      (Q8, Q9).
- [ ] Measurement blocks show only the feedback their paradigm allows (Q12).
- [ ] No feedback animation lands on the next stimulus (Q13).
- [ ] No literal duration or curve in new CSS; only paint and transform
      animate (Q15, Q16).
- [ ] Under reduced motion nothing travels, demos hold still, the flow keeps
      its timing (Q19).
- [ ] One sound per event, every sound has a visual (Q21–Q23).
- [ ] No text under its floor; nothing important in `--text-dim` on light;
      no coloured text (Q25, Q26).
- [ ] Every target ≥ 44 × 44; two-choice pads ≥ 96 px tall (Q27).
- [ ] No layout shift during the run (Q28); no horizontal scroll (Q29).
- [ ] First open: animated demo, then practice (Q30).
- [ ] Phase card → countdown → block → results; the countdown restarts after
      a pause (Q31).
- [ ] Hiding the app mid-run pauses or invalidates it (Q32).
- [ ] The last screen names the run's own metric, the comparison and one
      sentence (Q33).
- [ ] Loading, empty, calibrating and error states each designed (Q34).
- [ ] Sheets close on Escape and return focus (Q35).
- [ ] Copy is short, carries units, shows no jargon, and Brain Lab copy
      passes SCIENCE.md §4 word for word (Q36).
- [ ] Every measured item comes from the run's seed (Q44).
- [ ] Status lines are live regions; decorative art is hidden (Q38).
- [ ] No long task during play; loops stop when paused or hidden (Q40–Q42).

## Primitives — the shared piece for each need

| Need | Use | Notes |
| --- | --- | --- |
| An untimed tool (hint, undo, toggle) | `PadTool` (`components/ui`) | fires on click, plays `tap` unless `silent`, `active` = `aria-pressed` |
| A timed answer, a reflex control | `ResponseButton` (`components/fx`) | pointerdown + `eventTime`, hardware `keys`, no sound; `variant` `tool` · `big` (two-choice, ≥ 96 px) · `key` |
| Numeric input | `NumberPad` (`components/fx`) | `phone` (1-2-3 on top, ⌫ 0 ✓) or `digits9`; hardware digits, Backspace, Enter |
| Letter input | `Keyboard` (`components/ui`) | per-letter state via `keyClass`, plays no sound |
| Correct / wrong / neutral feedback | `useFeedback()` → `good` · `bad` · `neutral` · `layer` | render `layer` once in a `position: relative` stage; positions are % of it |
| A one-off burst | `FeedbackBurst` | ring + sparks + glyph; reduced motion keeps the glyph only |
| 3-2-1-Go | `Countdown` | sounds the beats; restarts after a pause; hold the shell clock in games |
| Time remaining | `TimerBar` | decorative CSS drain; restart with `runKey`, pause with `running` |
| Between phases | `PhaseCard` | kicker, title, body, one primary action |
| An animated demonstration | `DemoStage` · `useDemoClock` · `demoStep` · `DemoFinger` | % coordinates; parks on `stillAt` under reduced motion |
| Durations and curves | `--dur-*` · `--ease-*` (`tokens.css`); `DUR` · `easeOut` · `spring` (`motion.ts`) | never literals |
| Reduced motion in JS / canvas | `useReducedMotion()` · `prefersReducedMotion()` (`motion.ts`) | CSS gets it free through the tokens |
| Vibration | `haptic('tap' \| 'good' \| 'bad')` (`motion.ts`) | Android only; never the only cue |
| Sounds | `sfx` (`audio.ts`) | the table in Q21 |
| Stimulus onset · response time | `revealOnFrame` · `eventTime` · `now` (`brain/timing.ts`) | one monotonic clock |
| Seeded items | `rng` · `randInt` · `pick` · `shuffle` · `shuffleNoRuns` (`brain/timing.ts`) | never `Math.random` |
| A card surface | `.fx-card` (`effects.css`) | never a hand-made card background |
| Icons | `design/icons.tsx` | add a missing one there, never inside a game folder |
| Contrast maths | `contrast()` · `legibleOn()` (`profileColors.ts`) | measure, don't eyeball |
| The win payoff (games) | `WinCelebration` — shell-owned | games never add their own |
| Pausing | `GameShell` (`pauseStyle`) · the Brain Lab runner (class A / B) | games never draw their own pause screen |

## Known platform gaps (rules the platform cannot fully meet yet)

Each gap names the rule it blocks. Fix the platform once, rather than
patching around it per game.

- **No auto-pause on `visibilitychange` in `GameShell`** (Q32). A Stroop
  trial timeout fires on return and costs a life; Math Sprint's clock keeps
  draining in a background desktop tab.
- **`Modal` has no Escape, focus management, `aria-labelledby` or motion**
  (Q35); `.finish-close` is 36 px and `.tut-close` about 30 px (Q27).
- **Light `--text-dim` misses AA** (Q26). Darkening it to `#686359` clears
  4.5:1 on every light surface (4.9 / 5.6 / 4.5 on bg / surface /
  surface-2) — one token, but every screen moves, so it needs a visual
  pass. There are no `-ink` variants of the semantic colours either, which
  is why the platform's own "Clean win" chip is 1.9:1 on warm paper.
- **The results modal is four fixed cells** (Q33): `FinishPayload` has no
  summary or insight, a game's `headline` shows only with `hideStats`, and
  `GameResult.extra` is never displayed — Schulte's millisecond time, the
  span reached and the best streak are recorded and never shown.
- **Tutorials never open on first play** (Q30).
- **Reduced motion follows the OS only** — there is no in-app setting — and
  there is no haptics toggle (Q19, Q24).
- **`audio.ts` has no master bus or limiter** (Q21): every tone goes
  straight to the destination, so stacked tones can clip.
- **`index.html` disables pinch zoom** (`user-scalable=no,
  maximum-scale=1`). The per-surface `touch-action` rule (Q3) is what should
  stop double-tap zoom; lifting the viewport lock needs a pass over every
  game's double-tap behaviour first.
- **Missing shared HUD pieces**: a lives meter (one meaning — solid = left,
  grey outline = lost; today green pips in some games, red in others), a
  streak meter, progress dots ("trial 7 of 20"), a fixed-width HUD stat, a
  timer ring, and canvas helpers (token read, theme observer, DPR fit — now
  duplicated in Snake and Block Drop). Build each before the second game
  needs it.
- **`DemoFinger` travels by a `left`/`top` transition** (Q16) — harmless on
  an absolutely positioned decoration nothing measures, but it should become
  a `translate`.
- **Legacy debt the ratchet retires**: 93 font sizes under 12 px, 30 icon
  components drawn inside game folders, 8 hand-built digit pads, 5
  countdowns, 28 shake keyframes, bare-`1fr` boards in six of the eight
  games audited, and answers on `click` in Stroop, Schulte, Number Trail,
  Pattern Recall, the Math Sprint and Backwards Span keys and the Snake
  D-pad.

## How enforcement grows

- **The exemption list.** Validate gets a frozen `FLOOR_EXEMPT` list of
  today's 71 game ids that may only shrink; every **[v]** rule then runs on
  everything else — every Brain Lab test from day one. Rewriting a game
  takes it off the list.
- **Scans read code, not prose** (strip comments first — a comment
  explaining why a pattern is banned must not trip the ban), and every scan
  is proven on a deliberately broken copy before it is trusted (QA-LEDGER,
  "Validate scans").
- **Brain Lab fidelity** lives in `scripts/brain-checks/<test-id>.ts` — one
  check per benchmark, asserting what the player experiences: generated
  items, the scoring of a scripted run, seeds that replay (CLAUDE.md "Brain
  Lab").
- **The headless pass** is one script per new surface at 360×640 and
  390×844, dark and light, plus reduced motion and deuteranopia — with
  screenshots under `$HOME`, since the sandbox `/tmp` is not the host's.
- A rule that gains a check says so here (and in QA-LEDGER when a bug
  earned it). A rule without one is still a rule.
