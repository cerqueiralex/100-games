---
name: commit-and-push
description: Review all working-tree changes, sync CLAUDE.md and README.md with any new logic/architecture, then commit and push to main (which deploys to GitHub Pages). Use when the user asks to commit, push, ship, or deploy the current changes.
---

# Commit & push (with docs sync)

Ship the current working tree in three phases: **review → docs → commit+push**.
Never skip phase 2 — stale docs are treated as a bug in this repo.

Environment: Node is not on PATH. Prefix every npm/node/git-hook-touching
command with:

```bash
export PATH="$HOME/.local/opt/node-v22.17.0-linux-x64/bin:$PATH"
```

## 1. Review every change

- `git status --short` and `git diff` (plus `git diff --staged` if anything
  is staged) — read the full diff, not just file names. Also list untracked
  files and read the new ones.
- `backlog.txt` is the user's personal scratch file: NEVER stage, commit,
  or delete it.
- Delete leftover temp/verification scripts (e.g. `.verify-*.mjs`) instead
  of committing them.
- Build a mental changelog: new features, changed game mechanics, new
  platform standards, new content rules, removed files.

## 2. Sync the documentation

Compare the changelog from step 1 against both docs and update whatever no
longer matches reality:

- **CLAUDE.md** — the guide for future Claude sessions. Update: game list &
  descriptions, architecture/contract changes (GameDefinition, GameShell,
  assist rules), content-authoring rules (which files `npm run validate`
  covers), design-standard changes (keep in sync with
  `src/platform/design/DESIGN.md`), commands, deployment notes. Keep it
  dense and durable — no transient details, no per-session narration.
- **README.md** — the human-facing overview. Update: the Games table (each
  game's one-line description must match current mechanics), platform
  features, screenshots/instructions if flows changed.
- If a game was overhauled (mechanics replaced, not tweaked), rewrite its
  entries in both files rather than patching words.

## 3. Gate, commit, push

1. Run the gates — both must pass before committing:
   ```bash
   npm run validate && npm run build
   ```
2. Stage the intended files explicitly (`git add <paths>`) — never
   `git add -A` blindly; re-check `git status` to confirm `backlog.txt`
   and scratch files are excluded.
3. Commit in the repo's style: one short imperative summary line
   (optionally `;`-separated clauses), matching `git log --oneline -5`.
   End the message with:
   `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
4. Push to `main`. The remote is SSH
   (`git@github.com:cerqueiralex/100-games.git`) — HTTPS has no credentials
   on this machine.
5. Pushing `main` triggers `.github/workflows/deploy.yml` → GitHub Pages at
   https://cerqueiralex.github.io/100-games/. Optionally confirm with
   `gh run list --limit 1`. If a deploy fails within seconds with
   "Branch main is not allowed to deploy", the `github-pages` environment's
   branch policy was changed — report it, don't try to fix it by adding
   `actions/configure-pages` (the token lacks admin rights).

Report back: what was committed (summary), which docs were updated and why,
and the deploy status/URL.
