---
name: qa-everything
description: Full quality-assurance sweep of the whole app — find and FIX bugs, loose ends, design/UX standard violations across all games, and stale docs. Use when the user asks to QA, audit, or health-check the app.
---

# QA everything

A full audit-and-fix pass over the platform and all games. The output is
not a report — it is fixes. Track findings in a checklist (TodoWrite),
fix them, and re-verify. Only leave something unfixed if it needs a user
decision; list those separately at the end.

Environment: prefix every npm/node command with
`export PATH="$HOME/.local/opt/node-v22.17.0-linux-x64/bin:$PATH"`.

## 1. Gates first

```bash
npm run check && npm run validate && npm run build
```

Any failure here is finding #1 — fix before continuing.

## 2. Code review — platform contracts

Review `src/platform/` and every `src/games/<id>/` against the contracts
in CLAUDE.md and `src/platform/types.ts`:

- **GameDefinition**: valid `category` from `categories.ts`; `tutorial`
  present with 3–6 steps; `scoringNote` matches the game's actual scoring
  constants; assist descriptions match behavior.
- **GameProps flow**: `events.onFinish` guarded to fire exactly once
  (`done` ref); `events.onStats` reports continuously so abandons capture
  state; board generated in `useMemo`, remount via shell `key`.
- **Save & resume**: snapshot registered in a dependency-less effect;
  every state initializer (including refs like `assistsUsed` and derived
  counters) hydrates from `savedState`; snapshot is JSON-serializable
  (no Sets/Maps).
- **Assist tracking**: passive assists added to `assistsUsed` whenever
  enabled (including mid-game toggles); active assists added on use and
  incrementing `hintsUsed`; nothing blurs the cleanWin distinction.
- **Pause**: timers/effects keyed on `paused`; timed games resume by
  replaying the current trial; board hidden via `.board-hidden` on real
  pause only.
- Games never import from each other; shared logic lives in platform.

## 3. Design / layout / UI / UX standards

Audit against `src/platform/design/DESIGN.md` (the rulebook). Grep-driven
checks that catch most violations:

- Hardcoded colors outside `tokens.css`:
  `grep -n "#[0-9a-fA-F]\{3,6\}\|rgba\?(" src/styles/global.css` — allowed
  only for the sanctioned neutral white/black alphas in effects; everything
  else must be a token.
- Hand-written tool buttons: `grep -rn 'className="pad-tool' src/games` —
  must be zero (use `PadTool`).
- Emojis in UI controls: scan game JSX for emoji in buttons/toolbars
  (emojis are allowed only as game content and celebration).
- Icons: all from `design/icons.tsx`, monochrome `currentColor`.
- **Bottom menu standard**: ONE `.game-tools fx-card` per game holding all
  tool rows AND the input surface (keyboard/d-pad/digit pad), docked
  sticky to the viewport bottom — never sibling bottom panels.
- Extruded candy style: flat fills + inset bottom edge; no gradients, no
  drop shadows on resting surfaces (floating overlays keep `--shadow`);
  press = translateY(2px) + edge shrink, but never on elements positioned
  by inline transforms.
- Tile grids: both axes pinned; state classes change paint only (never
  border-width/padding/font-size).
- Cards: surfaces come from `.fx-card`/effects.css binding — component CSS
  must not declare its own card background/border.
- In-app URLs use `import.meta.env.BASE_URL`, never absolute `/` paths
  (subpath hosting on Pages).
- localStorage only via `src/platform/storage.ts` versioned keys.

## 4. Runtime QA — play every game

Drive the real app (see CLAUDE.md "Verification workflow"):

1. `npm run dev` in the background; launch host Chrome:
   `host-spawn google-chrome --headless --remote-debugging-port=9222
   --user-data-dir=/tmp/claude-chrome-qa about:blank`.
2. With `puppeteer-core` (connect via `browserURL`, script run from the
   project root so imports resolve), for EVERY game in the registry:
   - open it, start a game on easy, interact a few moves;
   - watch for `pageerror` / console errors (any error = a finding);
   - exercise pause/resume, save/resume, and restart;
   - where feasible, reach a win (stub `Math.random` via
     `evaluateOnNewDocument` for determinism, or use hint/reveal tools)
     and confirm the completion modal and result recording;
   - screenshot anything suspicious (write screenshots under `$HOME`,
     never sandbox `/tmp`); check both a phone viewport (~390×720) and
     desktop, and spot-check the light theme + a second accent.
3. Check the loose-knot list: leftover temp files in the repo root, dead
   CSS classes, unused exports, TODO/FIXME comments, stale saves handling
   (old-format `savedState` must not crash a redesigned game).

## 5. Docs freshness

Read CLAUDE.md and README.md and diff them against reality (game list,
mechanics one-liners, commands, standards). Update whatever drifted —
especially game descriptions after overhauls and any new platform
standard adopted since the last doc touch.

## 6. Fix, re-verify, report

- Fix every finding (code, CSS, content, docs). Re-run step 1 gates and
  re-test the affected flows in the browser.
- Clean up: remove QA scripts from the repo, kill the dev server and the
  headless Chrome.
- Report: findings found → fixed (grouped: bugs / standards / loose ends /
  docs), anything intentionally left open and why, and whether the gates
  pass. Do NOT commit — leave that to /commit-and-push unless the user
  asks.
