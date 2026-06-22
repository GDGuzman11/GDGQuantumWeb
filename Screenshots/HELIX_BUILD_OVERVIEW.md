# HELIX — Complete Build Overview & Showcase Reference

> **Private working document** — lives in the gitignored `References/` folder, not committed. Written as a reference for showcasing the project across platforms.
> Last updated: 2026‑06‑17.

---

## 0. TL;DR (the elevator pitch)

**Helix** is a local‑first personal AI assistant for Windows 11. It wakes on a spoken wake word, listens, thinks with Claude (with a fully‑local fallback), and replies in a calm British voice. It renders as a set of **frameless, transparent HUD windows** that float on the desktop like an Iron Man interface, and it runs a team of **six background AI agents** 24/7. Its defining feature is an **intelligent, persistent memory** — a three‑layer "brain" that decides what's worth remembering, resolves contradictions, forgets gracefully over time, and visualizes everything it knows as a **live 3D neural graph** you can fly through.

Everything runs on a 4 GB‑VRAM laptop. No cloud database. Secrets never touch disk in plaintext.

---

## 1. What Helix Is (Feature Tour)

- **Voice‑first** — wake word (OpenWakeWord), speech‑to‑text (faster‑whisper), Claude reasoning, text‑to‑speech (ElevenLabs custom British voice). Type‑to‑chat fallback when no mic.
- **Six HUD windows** float on the desktop: the central **orb** (identity/voice state), **Reasoning** (live token stream + tool cards + memory‑confirm prompts), **Communications** (Slack + Gmail), **Agents** (six live agent cards + mission control), **Tools** (per‑agent permission matrix), and the **Memory brain** (3D neural graph).
- **Six background agents** (Atlas/Lead, Ben/Frontend, Kado/Backend, Sentinel/Security, Vega/Marketing, Quill/Content) with live status, direct task submission, and task logs.
- **Intelligent memory** — captures important facts (personal + project + per‑agent), skips chatter, asks before storing when unsure, color‑codes by category, and shows it all as a living 3D brain that flashes the neurons it recalls.
- **Sandboxed tools** — web search, browser automation (Playwright), workspace file ops, RestrictedPython code runner.
- **Security‑first** — all secrets in the Windows Credential Manager; backend bound to `127.0.0.1` only; voice input sanitized; audit log; recalled memory wrapped in an untrusted‑content boundary.

---

## 2. The Software Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.12 · FastAPI · WebSockets · Uvicorn |
| **Primary AI** | Anthropic Claude API — `claude-opus-4-7` (streaming + prompt caching) |
| **Memory extraction** | Claude **Haiku 4.5** (`claude-haiku-4-5`) — cheap/reliable structured JSON; **Ollama `phi3.5`** offline fallback |
| **Local AI fallback** | Ollama — `phi3.5` (3.8B, ~2.4 GB VRAM), `qwen2.5-coder:3b` |
| **Wake word** | OpenWakeWord (`hey_jarvis` model, fully local, Apache 2.0) |
| **Speech‑to‑text** | faster‑whisper (`base.en`, local) |
| **Text‑to‑speech** | ElevenLabs (custom Paul Bettany × Anthony Hopkins British voice) |
| **Frontend** | Tauri 2 · React 19 · TypeScript 5 · Vite 6 |
| **Styling** | Tailwind CSS 4 · custom HUD theme (champagne‑gold / near‑black / white + aqua accent) |
| **3D / animation** | Three.js · React‑Three‑Fiber · `@react-three/drei` · `@react-three/postprocessing` (bloom, opaque windows only) · framer‑motion |
| **State** | Zustand 5 · single WebSocket hub for cross‑window sync |
| **Database** | SQLite (aiosqlite), WAL mode |
| **Vector memory** | FAISS (`IndexFlatIP`) + sentence‑transformers (`all-MiniLM-L6-v2`, 384‑dim) |
| **Credentials** | Windows Credential Manager via `keyring` |
| **Integrations** | Slack Bolt · Gmail API (OAuth 2.0) |
| **Logging** | structlog |
| **Testing** | pytest + pytest‑asyncio (243 backend tests); `pnpm build` (tsc + Vite) for the frontend |
| **Hardware target** | NVIDIA RTX 3050 Ti Laptop (4 GB VRAM) · i7‑1180H · 16 GB RAM · Windows 11 |

**Tooling / workflow** — built with Claude Code using a **multi‑agent orchestration model**: a `production-manager` agent reads the master control doc (`CLAUDE.md`), then routes work to specialized sub‑agents (`backend-agent`, `frontend-agent`, `security-agent`, `debugger-agent`). Every task is verified by the debugger agent before it's considered done. Some heavy design passes were run through a cloud "Ultraplan" session.

---

## 3. How It Was Built From Scratch

The project follows a **phased, additive philosophy**: *enhance what exists, never rewrite*. A single living document (`CLAUDE.md`) is the source of truth — it lists active work, archives completed phases, and routes each phase to the right agent. Each phase ends only when a targeted test passes.

**Architecture in one breath:** a FastAPI backend on `127.0.0.1:8000` runs the voice pipeline, the six‑agent runtime, the tool registry, and the memory system; it streams events over a single WebSocket hub. A Tauri shell launches six independent, transparent React windows, each a renderer process that subscribes to the hub and renders its slice of state (Zustand). The orb and memory brain are React‑Three‑Fiber scenes; the data windows are HUD‑styled React.

**Phase arc (1 → 17):**
1. **Foundation** — repo, config, FastAPI skeleton.
2. **Backend Core** — WebSocket hub, event schema, SQLite.
3. **Voice Pipeline** — wake → listen → think → speak loop.
4. **Agent System** — six background agents, task queue, status broadcast.
5. **Integrations** — Slack + Gmail (OAuth).
6. **Tools** — registry + per‑agent permission matrix + sandboxed runners.
7. **Multi‑Window UI** — Tauri + React HUD windows.
8. **Security Hardening** — credential manager, loopback binding, sandboxing, audit log.
9. **Testing** — pytest suite.
10. **Polish & Packaging.**
11. **Live Usage.**
12. **Three‑Layer Memory** — the first real "brain."
13. **Agent Direct Interaction** — submit tasks to agents from the UI.
14. **Neural Link Animation.**
15. **Neural Intelligence Orb.**
15B. **WebSocket Event Wiring** *(this session)*.
16A–16F. **Memory Intelligence + the 3D Memory Brain** *(this session)*.
17. **Computer Eyes & Hands** — *planned* (desktop vision + control).

Phases 1–15 were built first (early June). The work documented here in detail is the **2026‑06‑16 → 06‑17 sprint**, which hardened the foundation, wired the live data, rebuilt the entire visual identity, and turned the memory system from "stores & recalls" into a genuinely intelligent, self‑managing brain.

---

## 4. Build Timeline

| Date | Milestone |
|---|---|
| **2026‑06‑02** | Build started — Phase 1 foundation. |
| **2026‑06‑02 → 06‑06** | Phases 1–15 built: backend core, voice pipeline, six agents, Slack/Gmail, tools, multi‑window UI, security, testing, polish, three‑layer memory, agent interaction, neural orb. |
| **2026‑06‑06** | Phase 15A verified — Neural Intelligence Orb (350‑neuron sphere). |
| **2026‑06‑16** | Full project audit (`HEALTH.md`) — found 3 live issues: WS contract drift, secret‑scan failures, weak memory recall. Sprint begins. |
| **2026‑06‑16** | **Tier 0 hygiene** — Jarvis → Helix rename (33 backend + frontend files), OAuth client‑id scrub → **144/144 green**, WAL‑safe SQLite backup. |
| **2026‑06‑16** | **Phase 15B** — wired the 3 missing WebSocket events (`tool_call`, `comms`, `tool_permissions`) + shutdown; 3 windows went from skeletons to live data. |
| **2026‑06‑16** | **Phase 16A–16D** — the memory‑intelligence core: safety + multi‑signal recall + LLM extraction + bi‑temporal/decay/contradiction handling. Suite 161 → 196. |
| **2026‑06‑16** | **Hub redesign** — cyan HUD → champagne‑gold/black/white + aqua; clean `jarvis-*` → `helix-*` token rename; a new (later‑removed) command‑bar window. |
| **2026‑06‑16** | **Orb redesign saga** — neuron sphere → molten fire → arc‑reactor → **double helix** → the final **"Ethereal Halo"** (white double helix + 50 free‑flowing dots + 2 counter‑rotating aqua rings). Power button split into its own window. |
| **2026‑06‑16** | **Open‑loop reminder fix** + randomized startup greeting. Suite → 210. |
| **2026‑06‑17** | **Phase 16F** — the data‑driven **3D Memory Brain** window (endpoint + live event + R3F brain). Suite → 221. |
| **2026‑06‑17** | **Memory Capture Overhaul** — LLM‑as‑judge, 10‑category taxonomy, confirm‑when‑unsure, category colors. Suite → 233. |
| **2026‑06‑17** | **Memory brain polish** — recall‑flash, hover fix, legacy domain backfill. Suite → **243**. |

---

## 5. Memory Engineering — Comprehensive Technical Breakdown

Helix's memory is a **three‑layer brain** with an intelligence pipeline layered on top.

### 5.1 The three layers
1. **Episodic (SQLite `conversations`)** — every turn is written verbatim. On each new turn the last ~10 turns are prepended to the model call. Immediate short‑term recall, zero vector overhead.
2. **Distilled facts (`memory_facts`)** — compact declarative statements ("User's mother is named Ramona.") extracted from conversation, with rich metadata: `importance`, `confidence`, `created_by`, `access_count`, `last_recalled_at`, bi‑temporal `valid_from`/`valid_to`, `strength`, `half_life_days`, `write_policy`, `conflicting_fact_ids`, signal `category`, and the new 10‑category `domain`.
3. **Semantic (FAISS)** — high‑value facts are embedded with `all-MiniLM-L6-v2` and stored in an `IndexFlatIP` index over L2‑normalized vectors (inner product = cosine). Plus per‑agent working memory (each agent persists its last turns under an `agent:<id>` channel and reloads on restart).

### 5.2 Phase 16A — Foundation & Safety
- **Prompt‑injection boundary**: recalled facts are wrapped in an `<untrusted_memory>` delimiter and stripped of control characters before injection into the system prompt — so a malicious email/Slack body that later becomes a fact can't hijack the model.
- **Activated `last_recalled_at`**: a dormant column is now written on every recall (`mark_facts_recalled`), unlocking recency scoring.
- **Quality columns** added: `confidence`, `created_by`, `source_turn_id`, `access_count`.

### 5.3 Phase 16B — Multi‑Signal Re‑Ranking
Recall is no longer similarity‑only. FAISS returns a candidate pool, then each candidate is scored by a **weighted composite**:
`0.40 × semantic(cosine) + 0.20 × keyword(BM25/FTS5) + 0.20 × recency(1/(1+days)) + 0.10 × importance + 0.10 × frequency(log access_count)`.
Recently‑recalled, important, and frequently‑used facts now outrank equally‑similar stale ones. `access_count` increments on every recall hit. Pure Python math, deterministic ordering, bounded cost.

### 5.4 Phase 16C — LLM‑Driven Extraction
Brittle keyword extraction is replaced by an LLM that reads each turn and emits structured JSON ops: **ADD / UPDATE / DELETE / NOOP** per fact, with `confidence` and provenance. **Claude Haiku 4.5** is the primary judge; **Ollama `phi3.5`** is the offline fallback; if both fail it degrades to the old rule pass. It runs **asynchronously off the voice hot path**. Paraphrases ("I moved to Boston" / "Boston is where I live now") collapse into one fact via FAISS‑similarity dedup (> 0.85 → UPDATE in place rather than a duplicate).

### 5.5 Phase 16D — Bi‑Temporal + TOKI + Ebbinghaus
- **Bi‑temporal facts** — `valid_from`/`valid_to`; superseding a fact archives the old one (sets `valid_to`) rather than deleting it.
- **TOKI contradiction operators** — each fact type carries a `write_policy`: `last-write-wins` (locations/status), `evidence-weighted` (preferences/allergies — higher confidence wins), `merge` (employment history — both valid in different windows), `await-confirmation` (cross‑link conflicts, surface later).
- **Ebbinghaus decay** — a nightly job decays each fact's `strength` by `strength × exp(−days_since_recalled / half_life_days)`; facts below `strength < 0.1` are archived (not deleted).
- **FAISS tombstoning** — superseded/deleted/decayed vectors are tombstoned so stale vectors never resurface in recall or dedup (an `IndexFlatIP` has no efficient removal, so a tombstone set is filtered at search time).

### 5.6 Phase 16F — The 3D Memory Brain (visualization)
- **Backend** `GET /api/memory/graph` returns `{nodes, edges}`: nodes are active facts (+ people), extensible to future "project" nodes; edges are pairwise FAISS cosine (> 0.5) computed by reconstructing the live vectors and one matrix multiply. A `memory_update` WS event fires when a fact is added so the brain grows a neuron live.
- **Frontend** — a dedicated opaque Tauri window renders an R3F scene: a glowing core, instanced "neuron" spheres in a hand‑rolled 3D force layout (similarity attraction + repulsion + core tether + drift), tether/edge lines, orbit/zoom, a hover HUD panel, bloom, and search. Neurons are colored by category.

### 5.7 Memory Capture Overhaul (the big correctness fix)
The original gate required a keyword score ≥ 0.65 *before* the LLM ever ran — so a birthday ("my birthday is June 5") scored `general` (0.20) and was silently dropped. Rebuilt as **LLM‑as‑judge**:
- The keyword pass shrinks to a cheap **chatter‑skip** (pleasantries/very‑short turns); everything with substance reaches the LLM, which judges importance, classifies into a **10‑category domain taxonomy** (Personal + the six agents + Project + People + General), and `NOOP`s fluff.
- **Confirm‑when‑unsure** — high‑confidence (≥ 0.70) or an explicit "remember this" stores silently; a borderline band (0.45–0.70) is held in a pending store and a **"🧠 Remember this? Yes/No" card** appears in the Reasoning window; below 0.45 is dropped.
- **Safety**: the new `domain` value lives in a *separate* column so the existing signal `category` (used by the 16D contradiction policy) is untouched.
- **Category color‑coding** in the brain (Personal gold, Kado green, Sentinel red, etc.) with a legend.

### 5.8 Recall flash
When Helix recalls facts to answer a question, the backend emits the recalled fact‑ids and the brain **flashes those neurons** (white‑hot pulse, ~1.5 s decay) — you literally watch it light up the memories it's reaching for.

---

## 6. Memory Engineering — In Simple Terms

Think of Helix's memory like a **person's memory**, not a database.

- **It keeps a diary** of everything you say (the episodic layer) — but a diary is too much to re‑read every time.
- So it also keeps a set of **sticky notes** — short, important facts it pulled out of conversations ("your mom is Ramona", "you prefer X"). A small, cheap AI reads each conversation and decides, *"is anything here worth a sticky note?"* — and writes a clean one if so.
- When you ask a question, it doesn't just grab notes that *sound* similar. It weighs **how related, how recent, how important, and how often used** a note is — the way you'd recall a recent, meaningful fact faster than an old trivial one.
- It **doesn't blindly hoard.** If you change something ("I moved cities"), it updates the old note instead of keeping both. If two notes clash, it has rules for which wins. And like a real memory, notes it never revisits slowly **fade** and get filed away.
- It **asks before remembering when it's unsure** — a little "Remember this? Yes/No" pops up — so it doesn't fill up with junk or get things wrong.
- And you can **see the whole mind** as a glowing 3D web of dots (each dot is a memory), color‑coded by topic, where related memories cluster together — and when Helix recalls something to answer you, those exact dots **flash**.

The big fix this sprint: it used to only remember things that matched a rigid keyword list, so it **dropped birthdays and personal details**. Now a smart AI decides what matters, so it actually keeps the things that count.

---

## 7. All Bugs Encountered & How We Fixed Them

| # | Bug | Root cause | Fix |
|---|---|---|---|
| 1 | Secret‑scan failing (test suite stuck at 143/144) | A real Google OAuth **client ID hardcoded** in `get_gmail_token.py` and a doc | Parameterized the script (CLI arg / env var), redacted the doc → **144/144 green** |
| 2 | SQLite backups could be **torn/stale** | Raw file‑copy of the `.db` under WAL mode misses un‑checkpointed pages | Switched to `sqlite3.Connection.backup()` (consistent online snapshot) + regression test |
| 3 | 3 windows rendered **skeletons** (Reasoning/Comms/Tools) | WS **contract drift** — frontend handled 9 event types, backend emitted 6; 3 of the 4 missing event *classes* didn't even exist | Added the event classes + broadcast `tool_call` / `comms` / `tool_permissions` with secret scrubbing |
| 4 | Recall was weak / dropped relevant memories | Similarity‑only ranking; `last_recalled_at` column never written | Multi‑signal re‑ranking (16B) + activated recency tracking (16A) |
| 5 | Frontend build broke after a cloud patch | A stray `</content>` artifact appended to `index.css` | Removed the artifact |
| 6 | The floating orb rendered as a **black square** | Bloom's `EffectComposer` writes an opaque framebuffer, killing the transparent window's alpha | Removed the composer for the orb (additive‑sprite glow instead); reserved bloom for the *opaque* Memory window only |
| 7 | Orb looked "tacky / like a kid drew it" (multiple iterations) | Hand‑placed primitives + no bloom looked cheap; wrong aesthetic | Iterated: neuron sphere → fire → arc‑reactor → **double helix** → final "Ethereal Halo" |
| 8 | The double helix "looked like a spring" | Pitch‑per‑turn was smaller than the diameter → compressed coil | Opened the helix (fewer turns, bigger pitch, taller, more rungs, deeper tilt) |
| 9 | Startup greeting **nagged the same 6 reminders forever** | Open loops were **write‑only** — created, never resolved; keyword detector also stored garbage fragments ("anymore", "s, no need to") | Added a resolve function; routed create/resolve through the LLM; "remove that reminder" now resolves (and never re‑creates); randomized the greeting |
| 10 | Helix **wouldn't remember a birthday** | A keyword gate (`score < 0.65`) blocked the LLM judge before it ran; a birthday scored `general` (0.20) | Rebuilt as LLM‑as‑judge with a light chatter‑skip; the LLM now decides importance |
| 11 | Mom's name showed under **"Project"** in the brain | A **legacy fact** (pre‑category) had no `domain`; the fallback wrongly mapped its old signal type `correction → project` | Fixed the fallback map + an LLM **backfill** at startup re‑classifies all legacy facts → mom → Personal |
| 12 | **Memory & Power windows wouldn't drag** | Tauri capability allowlist only listed the original 5 windows; the new two lacked `start-dragging` permission | Added `memory` + `shutdown` to the capability `windows` list |
| 13 | Power button: holding it to move risked a shutdown | The button blocked dragging and click = shutdown | Click‑vs‑drag with a movement threshold (quick click = power off, hold+drag = move) |
| 14 | Searching the brain — matches didn't visibly "glow" | Search dimmed non‑matches but didn't brighten the hit | Matched neurons now boost brightness/size + aqua tint |
| 15 | Hovering a neuron — **sometimes no panel** | The central core, its glow, and the connection lines stole the hover raycast | Made the core/glow/lines non‑pickable so only neurons are hover targets; enlarged the hit area |
| 16 | A 16C test failed after the capture overhaul | A 0.6‑confidence fact now lands in the new "confirm" band (held pending, not stored) | Bumped that test's confidence above the auto‑store line — correct new behavior |
| 17 | Latent dedup bug (found during 16D) | `find_similar_fact_id` searched FAISS directly, bypassing the `valid_to` filter → could match a superseded vector | FAISS tombstoning excludes stale vectors from *all* callers |
| 18 | Work interrupted by **session usage limits** mid‑task | Long agent runs hit the rate limit | Resumed/finished the partial work, re‑ran the suite, and verified |

---

## 8. Up Next (Roadmap)

- **Phase 16E (optional)** — ColBERT cross‑encoder re‑ranking for high‑value queries; a nightly self‑reflection routine (sample facts, ask the local model to flag contradictions).
- **Phase 17 — Computer Eyes & Hands** — desktop **vision** (screenshots via `mss` → Claude Vision) and **control** (window/app control via `pywinauto`, an allowlisted launcher). The agentic tool‑calling loop gets fully wired.
- **Agent design** — give the six agents real "thinking" and persistence; per the locked convention, any memory an agent stores is tagged with that agent's category/color (Atlas=platinum, Ben=blue, Kado=green, Sentinel=red, Vega=magenta, Quill=amber).
- **Per‑agent memory tagging** end‑to‑end + tuning the confidence bands.
- **Packaging** — `pnpm tauri build` → a real Windows installer; clean‑machine install verification.
- **Voice & mic** *(blocked on a dedicated microphone)* — E2E voice tests, silence/interrupt tuning, and training a custom **`hey_helix`** wake‑word model to retire `hey_jarvis`.
- **Proactive notifications** — Helix speaks up when important Slack/Gmail arrives; voice control of agent tasks.

---

## 9. Stats Snapshot (as of 2026‑06‑17)

- **Backend tests:** 243 passing (from 143 at the start of the sprint) · secret‑scan green.
- **Frontend:** `pnpm build` clean (tsc + Vite).
- **Windows:** 6 live HUD windows (orb, reasoning, communications, agents, tools, memory) + a tiny power window + first‑run setup wizard.
- **Memory:** 3 storage layers · 12+ metadata columns per fact · multi‑signal recall · LLM extraction · bi‑temporal contradiction handling · nightly decay · 10‑category taxonomy · live 3D visualization.
- **Agents:** 6 background agents.
- **Footprint:** runs entirely local on a 4 GB‑VRAM laptop; secrets in the Windows Credential Manager; backend loopback‑only.

---

*Generated as a private showcase reference. Keep it local — `References/` is gitignored.*
