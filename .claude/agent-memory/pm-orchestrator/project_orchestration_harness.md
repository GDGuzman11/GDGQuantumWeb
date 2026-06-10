---
name: orchestration-harness-no-subagents
description: This harness exposes no Task/subagent tool, so the PM does implementation + QA in-session despite CLAUDE.md's subagent roster
metadata:
  type: project
---

CLAUDE.md §0 describes specialist subagents (`frontend-engineer`, `backend-engineer`, `security-engineer`, `qa-reviewer`) the PM "delegates" to. In practice this harness exposes NO `Task`/subagent-spawn tool, and no `qa-reviewer.md` agent file exists.

**Why:** Verified 2026-06-10 — `ToolSearch select:Task` returns no match; the deferred-tool list has no delegation tool. The CLAUDE.md briefing pre-authorizes the fallback: "if you cannot spawn subagents, perform the delegation/QA work directly in your own context and say so clearly."

**How to apply:** Do the owning-agent implementation AND the independent QA pass yourself in the main session. Still follow the full §0 protocol (tick CLAUDE.md checkboxes, append PROGRESS.md §5 records crediting the nominal owner e.g. `@frontend-engineer`, run tsc/lint/build as QA, then present the Human Test Gate and STOP for Gabe). State plainly in the PM report that the work was single-session, not delegated. Visual/interaction + real-device acceptance is inherently a Gabe gate item — never self-certify it.

Related environment gotcha: on Windows, a running `next dev` holds an EPERM lock on `.next/trace` that blocks `npm run build`. Stop the dev server (get Gabe's OK before killing his PIDs) and clear `.next` before building. See [[user-gabe-profile]].
