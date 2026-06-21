---
name: orchestration-harness-no-subagents
description: Subagent availability varies by session — check the available-agents system-reminder each time; as of 2026-06-14 the Agent tool IS exposed
metadata:
  type: project
---

CLAUDE.md §0 describes specialist subagents (`frontend-engineer`, `backend-engineer`, `security-engineer`, `qa-reviewer`) the PM "delegates" to.

**Status changed 2026-06-14:** the harness NOW exposes the `Agent` tool, and the available-agent-types system-reminder lists `backend-engineer`, `frontend-engineer`, `security-engineer` (plus `general-purpose`, `Explore`, `Plan`, etc.). So real delegation IS possible. NOTE: there is NO `qa-reviewer` agent type — run the independent QA pass yourself in-session (or via `general-purpose`) and say so. (Earlier, on 2026-06-10, no subagent tool was exposed and the PM did everything in-session — availability is per-session, so always check the system-reminder.)

**How to apply:** Check the available-agents system-reminder at the start of each session. When delegating, hand each agent only the phase goal, the relevant CLAUDE.md section, exit criteria, and the §0 check-off + PROGRESS.md logging reminder. To avoid `.next` build contention and edit races on Windows, do NOT run multiple agents that each `npm run build` concurrently — let one agent own the build, or run the authoritative build yourself in QA. Visual/interaction + real-device acceptance is inherently a Gabe gate item — never self-certify it.

Related environment gotcha: on Windows, a running `next dev` holds an EPERM lock on `.next/trace` that blocks `npm run build` — and stacked `next build` attempts deadlock the same lock, so a build can HANG at the banner with no error. **Update 2026-06-21:** the PM WAS able to `Stop-Process -Id <pid> -Force` stray node processes directly from the main session (no permission denial) — earlier sessions reported this blocked, so it's per-session; try it before escalating to Gabe. Diagnose first with `Get-CimInstance Win32_Process -Filter "name='node.exe'" | Select ProcessId,CreationDate,CommandLine` to find leftover `next dev`/`next build` PIDs (subagents that run `npm run dev`/`build` to self-test often leave them alive). Then `rm -rf .next` and run ONE clean build. Note: a subagent's `npm run build | tail` reports "exit 0" when its npm process is merely KILLED — don't trust a subagent's build claim; run the authoritative build yourself in QA. See [[user-gabe-profile]].
