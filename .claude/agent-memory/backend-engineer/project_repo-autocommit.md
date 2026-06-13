---
name: repo-autocommit
description: This repo auto-commits file edits, so working-tree edits land as commits before you stage them
metadata:
  type: project
---

Editing files in this repo triggers an automatic commit (commit messages look like `Update: <files>;  N files changed, ...`). After an Edit/Write, the change is often already committed (not just staged) before you run `git add`.

**Why:** A harness/hook on this project auto-commits edits. Observed 2026-06-13: schema.prisma + package.json edits appeared as auto-commit `c571c7d` while only the later PROGRESS.md edit was left unstaged.

**How to apply:** Don't assume your edits are still in the working tree — run `git log --oneline` / `git show <hash>` to confirm what landed and that nothing stray was bundled. The PM/Gabe expects to push, so verify the unpushed-commit list matches your intended changes before reporting "left staged." Never push unless asked.
