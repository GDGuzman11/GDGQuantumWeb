# CLAUDE.md — GDG Quantum

This file is the single source of truth for building the GDG Quantum marketing site. Claude Code's **main session acts as the PM / Orchestrator** and operates strictly by the protocol in this file. It does not write feature code itself — it **delegates each phase to the specialist subagents** and **stops at every test gate for human (Gabe) verification** before proceeding.

There are **two tracking files**:
- **`CLAUDE.md` (this file) — the source of truth.** The full plan. Tasks live here as checkboxes and get ticked `[x]` as they complete, so live status is always visible at a glance. The plan text is never deleted.
- **`PROGRESS.md` — the completion log / reference of what's been done.** Append-only. Every completed task and every approved phase gate is recorded here in detail (files touched, summary, verify steps, QA result, date). This is where the *record* of finished work lives so this file stays lean.

---

## 0. Orchestration protocol (read first, every session)

**Roles** (each is a subagent in `.claude/agents/`, except the PM which is the main session):

| Agent | Scope |
|---|---|
| **PM / Orchestrator** (main session) | Owns this plan + both tracking files. Delegates phases/steps, enforces gates, records approved gates to `PROGRESS.md`, never lets a phase start before the prior gate is human-approved. |
| `frontend-engineer` | Next.js, TypeScript, Tailwind, GSAP snap engine, animations, hero, a11y, performance. |
| `backend-engineer` | Prisma/Postgres, contact Server Action, Zod, email, env wiring, Vercel deploy + migrations. |
| `security-engineer` | Validation hardening, bot/spam/rate-limit, security headers/CSP, secrets, email-injection defenses. |
| `qa-reviewer` | After every phase, independently verifies the phase's exit criteria + that completed tasks are correctly checked off and logged. Read-only on app code and on both tracking files; may run builds/tests/scanners. |

### Task tracking & the completion log (applies to every agent)

1. **Checking off:** When an owning agent finishes a delegated **task**, it ticks that task's checkbox in this file (`[ ]` → `[x]`) **and** appends a task record to `PROGRESS.md` using the format in §5. Only the checkbox state and `PROGRESS.md` are edited — never the plan's wording or structure.
2. **Verification before trust:** A ticked task is *claimed* done. `qa-reviewer` verifies it. If QA fails a ticked task, the owning agent reverts the checkbox to `[ ]`, fixes it, and re-logs on re-completion. QA never edits checkboxes or `PROGRESS.md` — it only reports.
3. **Gate records:** After QA returns PASS **and** Gabe approves the phase's Human Test Gate, the **PM** confirms all that phase's task boxes are `[x]`, appends a "GATE APPROVED" record to `PROGRESS.md` (§5), and updates the Status block below.
4. **Bootstrapping:** If `PROGRESS.md` does not exist at project start, the PM creates it from the header template in §5.
5. **Source of truth:** When in doubt about scope or current plan, `CLAUDE.md` wins. `PROGRESS.md` is history/reference only and is never used to redefine scope.

**Hard rules for the PM:**
1. Work **one phase at a time, in order.** Never begin Phase N+1 until Phase N's gate is approved by Gabe.
2. For each phase: delegate the tasks to the owning agent(s) → invoke `qa-reviewer` → present the **Human Test Gate** checklist to Gabe → **STOP and wait.**
3. When delegating, hand the subagent only what it needs: the phase goal, the relevant section of this file, the acceptance criteria, and a reminder of the check-off + logging step.
4. If `qa-reviewer` returns FAIL, route fixes back to the owning agent and re-run QA before showing Gabe the gate.
5. On gate approval, record it to `PROGRESS.md` and update Status. Keep Status current (current phase, last approved gate, blockers).
6. Never improvise scope. If something is ambiguous, ask Gabe rather than guessing.

**Status** (PM keeps this current):
```
Current phase: Phase 5 — Security hardening (NOT STARTED — awaiting Gabe's go-ahead; do NOT begin before Gabe approves). Phase 4 GATE APPROVED by Gabe 2026-06-10 (migration `20260611040603_init` applied; live form submit persisted a row AND both owner+sender emails delivered via Resend — Gabe-confirmed). Phases 3R / 3R.1 / 3R.2 GATES APPROVED by Gabe 2026-06-10. The cinematic landing is BUILT and on `main` — LIVE STATE after the 2026-06-10 structure update (detail in the STRUCTURE UPDATE note below): THREE panels `Welcome → Projects → Contact` (About removed); FULL-DARK site-wide (dark token scope on `<body>`, all panels transparent over one continuous dark gradient+grain backdrop, dark chrome on all panels, `color-scheme:dark`); a SITE-WIDE GPU particle tunnel (calm at rest on every page) with cinematic colour drift + coordinated sparks; and the cinematic light-speed WARP DIVE as the transition on EVERY leg in both directions (Welcome↔Projects, Projects↔Contact). Plus GitHub + LinkedIn social marks in the hero. Code/build QA PASS (tsc 0, lint 0, `npm run build` exit 0; `/` 138 kB First Load with three.js/R3F/drei isolated in an async chunk so `<h1>` stays LCP; no `scroll-snap-type`; headless WebGL render clean — no shader errors, warp confirmed on both legs, social links resolve). All Phase 3R / 3R.1 / 3R.2 TASK boxes checked off; Human Test Gates 3R / 3R.1 / 3R.2 APPROVED by Gabe 2026-06-10 (visual/interaction sign-off). Spec: `C:\Users\User\.claude\plans\floating-popping-nygaard.md`.
Last approved gate: Phase 4 — Backend (data + contact pipeline) — approved by Gabe 2026-06-10 (Phases 3R / 3R.1 / 3R.2 approved 2026-06-10; Phase 2 approved 2026-06-09)
Blockers: none. The blocking `next dev` server (PIDs 12280/7240/15788) was stopped with Gabe's approval 2026-06-10; `.next` cleared; baseline + Phase-3R builds both exit 0. (Note: PM orchestration runs in the main session per §0; this harness exposes no Task/subagent tool, so the PM performed both the `frontend-engineer` implementation and the independent QA pass in-session — flagged on the record. Visual/interaction + real-device acceptance is inherently a Gabe gate item, not certifiable by static review.)

STRUCTURE UPDATE (Gabe, in-session 2026-06-10, AFTER the Phase 3R work above): the site was reduced from FOUR panels to THREE — the **About** panel was removed, **Landing→Welcome**, **Systems→Projects** (placeholder copy "Selected work, coming soon."). The directional deck (0↔1 down / 1↔2 side / 2↔3 up) was REPLACED: the cinematic warp dive is now the transition on EVERY leg (Welcome↔Projects and Projects↔Contact), in both directions (the `lib/warp.ts` dive scalar is now "0 at rest, 0→1 pulse per leg", not "1 at About"). Added GitHub + LinkedIn social marks to the hero. Internal ids/hashes unchanged (`#home`/`#systems`/`#contact`); "Projects" still deep-links at `/#systems`. Verified: tsc 0, lint 0, `npm run build` exit 0, First Load 138 kB (three.js still async-isolated), headless WebGL render clean (no shader errors; warp confirmed on both legs; social links resolve). The repo is published at https://github.com/GDGuzman11/GDGQuantumWeb. NOTE: this is a Gabe-driven direct change outside the agent/gate flow; the Phase 3R/3R.x gates remain not-formally-approved and now describe the prior 4-panel/directional structure (kept as history).

PROJECTS SHOWCASE UPDATE (Gabe, in-session 2026-06-12, AFTER the structure update above): the **Projects** panel is no longer a placeholder — it is now the interactive centrepiece, and the abandoned spiral-galaxy particle experiment was removed first. Gabe-driven, outside the agent/gate flow; logged here + in PROGRESS.md. Build/QA PASS each step (tsc 0, lint 0, `npm run build` exit 0; `/` First Load 171 kB — +6 kB for the showcase, GSAP/react-dom already bundled, three.js still async-isolated). Done this session (all committed on `main`, pending push at the time of writing):
- [x] **Spiral galaxy REMOVED** — `components/hero/tunnel/{TunnelCanvas,TunnelStage}.tsx` restored to their gate-approved base-tunnel state (no `uForm`/`GAL_*`/forming); deleted `References/{GALAXY.jpg,ANDROID.png,TREX.png}`. The plain site-wide tunnel (flow + proximity + colour drift + sparks + warp) is back exactly as approved.
- [x] **Projects showcase BUILT** — three glassmorphic terminal cards (`components/sections/projects/{ProjectCard,TypingTerminal,ProjectsShowcase}.tsx`, data in `lib/projects.ts`) with cursor 3D tilt + a hover-accelerated cyan scan-line; each typing terminal holds at the `[SYSTEM]` line with a blinking caret and RESUMES typing on hover, the hovered card growing to fit (all three rest equal-height via a clamped 2-line tagline). Clicking a card opens a full-screen, SCROLL-LOCKED case study (`ProjectCaseStudy.tsx`, portaled to `document.body`): cinematic zoom out of the card's rect → sections Command Center (live latency dashboard + glowing `[ ⤺ ESCAPE_SYSTEM ]`), JSON-log brief, video + tilted gallery (graceful placeholders, auto-upgrade from `public/projects/`), read-only copy-able log terminal, neon CTAs; Esc + the escape button reverse the zoom. An animated `NeuralField.tsx` canvas (16 nodes, ~20 white neurons travelling the lines, flashing colour where paths cross) sits behind the case study. Reduced-motion / mobile fall back to static + instant + native scroll.
- [x] **Snap engine — deck lock added** (reopens approved Phase 2): `DeckContext.lockDeck(locked)` + `PanelDeck` disables the GSAP Observer (it captures wheel/touch on `window` with preventDefault — would otherwise eat the overlay's scroll), gates keyboard/hash/`goToPanel`, and locks `<html>` overflow in native mode; restored instantly on exit.
- [x] **Landing-first on load** — `PanelDeck` `init()` now always opens on Welcome (index 0) and clears a stale URL hash. TRADE-OFF Gabe accepted: a shared deep-link like `/#systems` no longer lands on Projects on FIRST load (it opens Welcome); in-session deep-links (nav clicks, back/forward) still work. This narrows the Phase 3R/Phase 6 "/#systems deep-link" gate item — flag for Phase 6.
WATCH (carried): real-display legibility of the case study over the neural field + tunnel; case-study video/gallery are placeholders until assets land in `public/projects/`; visual/interaction + real-device acceptance remains a Gabe item (not certifiable by static review).

>>> PHASE 4 RESUME POINT (Backend — data + contact pipeline; 2026-06-10) — ✅ COMPLETE, GATE APPROVED 2026-06-10 (Gabe set `.env`, migration applied, live submit persisted + both emails delivered). The "REMAINING" steps below are kept as history. NEXT: Phase 5 — Security hardening, on Gabe's go-ahead. <<<
DB CHOICE CONFIRMED: PostgreSQL + Prisma + Resend (Gabe considered Firebase/Firestore 2026-06-10 and decided to KEEP the planned Postgres/Prisma stack; recommended provider = Neon). Hosting stays Vercel (Phase 7).
ALL Phase 4 CODE IS BUILT AND VERIFIED (tsc 0, lint 0, `npm run build` exit 0; `/` First Load 165 kB — the +27 kB vs 138 is react-hook-form + zod now in the client bundle, a Phase 6 code-split candidate; three.js still async-isolated). Built this session (committed):
  - `prisma/schema.prisma` — Prisma 6 `ContactSubmission` model (id/name/email/message/ipHash?/userAgent?/createdAt, @@index createdAt); client generated; `postinstall: prisma generate` added (for Vercel).
  - `lib/db.ts` — Prisma client singleton (globalThis cache for dev hot-reload).
  - `lib/schema.ts` — SHARED Zod schema (client + server single source of truth).
  - `lib/email.ts` — Resend (owner notification + sender confirmation; HTML-escaped; degrades gracefully to `sent:false` if RESEND_API_KEY/CONTACT_OWNER_EMAIL unset so persistence still works).
  - `app/actions/contact.ts` — Server Action `submitContact`: re-validate → [Phase 5 SECURITY GATE PLACEHOLDER] → persist → email → typed `ContactResult`. (No public JSON endpoint.)
  - `components/sections/ContactForm.tsx` — RHF + zodResolver, inline field errors, in-place success/error (no nav away); maps server fieldErrors back to fields.
  - `components/ui/Field.tsx` — made RHF-ready (forwardRef + spreads register + accessible error). `components/sections/Contact.tsx` — swapped the visual-only form for `<ContactForm/>`. `.env.example` — now says copy to `.env` (Prisma CLI + Next both read it).
REMAINING (BLOCKED ON GABEّS `.env` — provisioning steps were given in chat: Neon pooled `DATABASE_URL` + direct `DIRECT_URL`, Resend `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_OWNER_EMAIL`):
  1. Gabe creates `.env` from `.env.example` with the 5 values (secrets NOT pasted into chat).
  2. Run `npx prisma migrate dev --name init` → creates the `ContactSubmission` table.
  3. Live test: `npm run dev`, submit the Contact form → verify (a) a row persisted in the DB AND (b) BOTH emails arrived = the Phase 4 Human Test Gate → present to Gabe to approve.
  4. On approval: tick the remaining Phase 4 boxes, log to PROGRESS.md, record the gate, then STOP for Phase 5 (security) — do NOT start Phase 5 before Gabe approves Gate 4.
```

---

## 1. Project facts (locked)

- **Product:** GDG Quantum — single-page, scroll-snapped premium studio site.
- **Experience:** Visitor lands on a hero, then **snaps panel-to-panel** through three full-viewport sections: `Welcome → Projects → Contact`. *(Updated 2026-06-10: the About panel was removed; "Landing" relabelled "Welcome"; "Systems" relabelled "Projects". See the Panels table + the §0 Status note.)*
- **Hosting:** Vercel. Custom domain already purchased (Gabe to provide).
- **Aesthetic north stars:** the restraint of joffreyspitzer.com, the full-screen section transitions of mont-fort.com/trading, the percentage preloader + numbered nav of fame-estate.com. The supplied GDG comps are the source of truth where references disagree.

### Design tokens (wire into Tailwind `theme.extend` + CSS vars — never hard-code)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FAF9F6` | Canvas (warm off-white) |
| `--ink` | `#0E1116` | Primary text |
| `--accent` | `#2563EB` | Links, CTAs, focus rings |
| `--muted` | `#6B7280` | Secondary text |
| `--hairline` | `rgba(14,17,22,0.10)` | 1px rules / underlines |

- **Display/headings:** Instrument Serif or Playfair Display — large, tight leading, regular weight.
- **Body/UI:** Inter (variable). Self-host both via `next/font`; size-adjusted fallback to kill CLS.
- **Motion language:** subtle, ease-out, 0.6–1.2s, no bounce/spin. Do less.

### Panels

> **Updated 2026-06-10 (Gabe, in-session):** the four-panel layout below was reduced to **three**. The **About** panel was removed; **Landing → Welcome**; **Systems → Projects** (now a placeholder until the work showcase is designed). The warp dive is now the transition on **every** leg (Welcome↔Projects and Projects↔Contact), in both directions. Internal ids/hashes are unchanged (`#home`, `#systems`, `#contact`), so the "Projects" panel still deep-links at `/#systems`. The original table is kept below for history, struck through where it no longer applies.

| # | Panel | Hash | Notes |
|---|---|---|---|
| 01 | Welcome (was Landing) | `#home` | Hero, brand, headline, sub, CTA, scroll cue, particle tunnel + GitHub/LinkedIn social marks |
| ~~02~~ | ~~About~~ — **removed** | ~~`#about`~~ | ~~Philosophy statement~~ |
| 02 | **Projects** (was Systems) | `#systems` | Interactive showcase (built 2026-06-12): 3 glassmorphic terminal cards (hover-resumed typing, 3D tilt, scan-line) → full-screen scroll-locked case study (cinematic zoom, neural-field bg, latency dashboard, brief, media, log terminal, CTAs). Label is a single swappable constant (`SYSTEMS_LABEL`). |
| 03 | Contact | `#contact` | Contact form + footer |

---

## 2. Stack & locked technical decisions

- **Next.js 14 (App Router)** + **TypeScript `strict: true`**.
- **Tailwind CSS** with the tokens above.
- **GSAP** for all motion and the snap engine. GSAP's full toolset (incl. ScrollTrigger, Observer, ScrollSmoother, SplitText) is **free** since the Webflow acquisition — no license needed.
- **React Hook Form + Zod** for the form; the **Zod schema is shared between client and server** (one file, one source of truth).
- **Backend:** Prisma + managed **PostgreSQL** (Supabase/Neon/Vercel Postgres) with a **pooled** connection string. Contact handled by a **Next.js Server Action** (no public JSON endpoint).
- **Email:** **Resend** preferred (serverless-friendly). SMTP/Nodemailer is the documented fallback only if Gabe supplies SMTP creds.

**Decisions that are easy to get wrong — enforce these:**
- **Snap engine = GSAP `Observer` panel deck** (one gesture = one panel, input-locked during transition). **Do NOT use CSS `scroll-snap-type`** — it's janky and uncontrollable.
- Any component touching `window`, WebGL, or GSAP **must** start with `"use client"`, and the hero 3D should be `dynamic(() => ..., { ssr: false })`.
- `prefers-reduced-motion` **disables snapping/smoothing and the hero float**, falling back to native scroll + instant reveals. This is a correctness requirement, not a nice-to-have.
- **Do not run `npx shadcn add <arbitrary-registry-url>`.** If a component is wanted, vendor it in manually after review.
- Secrets live only in Vercel env vars; nothing sensitive is `NEXT_PUBLIC_`.

### Conventions
- ESLint + Prettier enforced; conventional commits; small, reviewable commits per task.
- File layout: `app/`, `components/ui/` (hand-built primitives), `components/sections/`, `lib/` (zod schema, email, db), `prisma/`.
- Provide `.env.example` + README updates as features land.

---

## 3. Phase plan

Each phase lists **Tasks** (checkboxes the owning agent ticks + logs as they complete), **Exit criteria**, and a **Human Test Gate** Gabe runs. The PM delegates, runs QA, then presents the gate and **stops**.

### Phase 0 — Foundation & design system
**Owner:** `frontend-engineer`

**Tasks**
- [x] Scaffold Next.js 14 + TS strict + Tailwind + ESLint/Prettier.
- [x] Wire design tokens into Tailwind + CSS vars; self-host fonts via `next/font`.
- [x] Establish folder structure; commit `.env.example` skeleton.
- [x] Add a single `siteConfig` (panel labels incl. the swappable "Systems").

**Exit criteria:** app builds and runs; tokens + fonts render; lint passes; no TS errors.
**Human Test Gate 0:**
- [ ] `npm run dev` boots with no errors.
- [ ] A test element using `bg-[--bg]`/`text-[--ink]`/accent shows correct colors.
- [ ] Headings render in the serif, body in Inter; no font flash/shift.
- [ ] `npm run lint` and `tsc --noEmit` are clean.

### Phase 1 — Static panel shell + nav + preloader
**Owner:** `frontend-engineer`

**Tasks**
- [x] Build the four panels as static, full-viewport (`100svh`) sections with real copy/layout (no snap yet).
- [x] Top bar (hex mark + `GDG QUANTUM` + nav links).
- [x] Numbered section nav (01–04) + progress indicator (visual only for now).
- [x] Preloader overlay with real-progress percentage counter (fonts + key assets), tasteful min duration.

**Exit criteria:** all four panels look right when scrolled normally; preloader shows then reveals; nav renders.
**Human Test Gate 1:**
- [ ] Scrolling normally shows all four panels with correct layout/copy.
- [ ] Preloader counts 0→100 then clears to the hero.
- [ ] Section nav lists 01 Landing · 02 About · 03 Systems · 04 Contact.
- [ ] Responsive: nothing broken at mobile/tablet/desktop widths.

### Phase 2 — GSAP snap engine
**Owner:** `frontend-engineer`

**Tasks**
- [x] Implement the `Observer` panel deck: `goToPanel(index)` as the single entry point for wheel/touch, keyboard (`Arrow/PageUp/Down/Home/End`), nav clicks, and hash deep-links.
- [x] Input lock during transitions (no double-skip); `100svh` handling; ScrollTrigger refresh on resize.
- [x] `prefers-reduced-motion` fallback to native scroll.
- [x] Mobile strategy: tuned Observer **or** documented fallback below ~768px. Document the choice.

**Exit criteria:** crisp, reliable panel-to-panel snapping across all input methods; reduced-motion + mobile paths verified.
**Human Test Gate 2:**
- [ ] One scroll/swipe moves exactly one panel; never skips or traps.
- [ ] Keyboard arrows, nav clicks, and `/#systems` deep-link all land on the right panel.
- [ ] OS "reduce motion" on → normal scroll, no snapping, nothing broken.
- [ ] Real iOS Safari + Android Chrome tested; address bar / scroll behave.

### Phase 3 — Hero + entrance & reveal animations
**Owner:** `frontend-engineer`

**Tasks**
- [x] Hero glass object: ship **Tier 1** (optimized `next/image` render + GSAP float + pointer parallax + soft shadow) with a static fallback. Spline/R3F only if explicitly approved later.
- [x] Staggered hero reveal on preloader-complete (SplitText line reveal, CTA underline draw, object scale-in).
- [x] Per-panel entrance reveals as each becomes active.

**Exit criteria:** hero animates in cleanly; object renders/floats; reveals feel calm; LCP stays fast.
**Human Test Gate 3:**
- [ ] Hero headline reveals line-by-line; CTA underline draws; object floats subtly.
- [ ] Each panel's content animates in on arrival, once, smoothly.
- [ ] Hero image is the LCP element and paints fast (quick Lighthouse check, LCP < 2s).
- [ ] Reduced-motion: object is static, reveals instant.

### Phase 3R — Cinematic Landing redesign: particle-tunnel hero + directional transitions
**Owner:** `frontend-engineer`

> **Scope change, approved by Gabe 2026-06-10.** The Phase 3 hero glass object was removed entirely (see PROGRESS.md removal entry); this phase replaces it. It **reopens approved Phase 2** (the snap engine gains directional transitions) and **introduces a full-dark palette site-wide**. Full design detail lives in the approved plan file `C:\Users\User\.claude\plans\floating-popping-nygaard.md`. Locked decisions: minimal pinned 3D core (`three@0.169.0` + `@react-three/fiber@8.18.0` + `@react-three/drei@9.122.0`); **GSAP-only** motion (no framer-motion / react-spring); **full-dark site, particle tunnel Landing-only**; **system + Landing first** (other sections get only their transition direction now, polished later); **overlay grain + in-shader glow** (no `@react-three/postprocessing`).
>
> **Palette decision reversed by Gabe 2026-06-10 (after first gate presentation).** Was "dark Landing / light rest"; now **dark background everywhere, tunnel stays Landing-only**. About/Systems/Contact show the SAME dark atmospheric gradient + grain (no particles) and use the dark token scope. Implemented via `data-theme="dark"` on `<body>` (site-wide), every panel transparent over a site-wide dark backdrop, chrome dark on all panels, and only the WebGL tunnel canvas fading in/out by `activeIndex`. The "Dark Landing theming" task wording below predates this reversal; the dark scope is now applied site-wide, not Landing-only.
>
> **▶ Current state — PARTLY SUPERSEDED (2026-06-10 structure update; see §0 Status + §1 Panels).** The 4-panel directional deck described in the tasks/exit-criteria/gate below was changed AFTER this phase: (1) the **About panel was removed** — the site is now `Welcome → Projects → Contact`; (2) the directional slides (`0↔1 down / 1↔2 side / 2↔3 up`) were **replaced by the 3R.2 warp dive on EVERY leg** (the slide engine is gone); (3) the particle tunnel is now **site-wide** on every page (the "Landing-only" decision in the blockquote above was itself reversed in 3R.2). Full-dark site-wide remains current. The task & gate text below is kept verbatim as the original Phase 3R record.

**Tasks**
- [x] Re-add the pinned React-18-line 3D core to `package.json` and install (`three@0.169.0`, `@react-three/fiber@8.18.0`, `@react-three/drei@9.122.0`); keep `gsap`.
- [x] Dark Landing theming: add a `[data-theme="dark"]` token scope in `app/globals.css` (overrides `--bg/--ink/--muted/--hairline/--accent`); apply it to the Landing `Panel`; make `TopBar` + `SectionNav` adapt via `deck.activeIndex === 0` (light chrome on Landing, ink elsewhere); make `Preloader` dark so the reveal into the tunnel is seamless.
- [x] Particle tunnel: recreate `lib/webgl.ts` probe; build `components/hero/tunnel/TunnelStage.tsx` (DOM host, no three import, gated lg+ + motion-on + WebGL + post-`onReveal`, `dynamic(import,{ssr:false})`, fixed `inset-0 pointer-events-none`, opacity tied to `activeIndex`); `components/hero/tunnel/TunnelCanvas.tsx` (R3F GPU `Points` flowing toward camera, recycling for an endless tunnel, additive in-shader glow, subtle cursor drift); soft-grain overlay; `components/hero/HeroBackdropFallback.tsx` (static dark gradient + grain).
- [x] Directional transition engine: rework `PanelDeck` deck-mode from the vertical `yPercent` track to absolutely-stacked panels with per-pair GSAP timelines (**0↔1 down, 1↔2 side, 2↔3 up**); sync tunnel/background crossfade on the `0↔1` legs; handle non-adjacent nav/deep-link jumps; preserve Observer (1 gesture = 1 panel), `goToPanel` single entry, input-lock, keyboard, hash, focus mgmt, and the native-scroll fallback unchanged.
- [x] Landing hero content: keep the single `<h1>` (LCP) + sub + CTA + scroll cue and the existing SplitText `onReveal` entrance; tune to minimal typography on dark with legible contrast over the tunnel; mount the tunnel host in the deck chrome.
- [x] Fallbacks (correctness): `prefers-reduced-motion` OR mobile (<768px) OR no-WebGL OR pre-reveal → no canvas (static `HeroBackdropFallback`), native vertical scroll, instant section changes, no directional animation.

**Exit criteria:** build/lint/tsc clean with three.js isolated in an async chunk (`<h1>` stays LCP); Landing renders a dark, flowing particle tunnel with soft grain; the dark atmospheric background (gradient + grain) is site-wide with the tunnel particles Landing-only; directional transitions (down/side/up) feel crisp with one-gesture-one-panel and no light flash between sections; chrome legible on every dark section; reduced-motion/mobile/no-WebGL fall back to a static dark backdrop + native scroll; LCP fast.
**Human Test Gate 3R:**
- [ ] Landing shows a flowing particle tunnel + soft grain on a dark atmospheric background; headline reveals and paints fast (LCP < 2s).
- [ ] The whole site is dark: About/Systems/Contact show the same dark gradient + grain WITH NO particles; their content (incl. the Contact form fields/button and the Systems list) is legible on dark.
- [ ] One scroll/swipe moves exactly one section; 0↔1 moves vertically (emerging from the Landing tunnel into About as the tunnel particles recede), 1↔2 slides sideways, 2↔3 moves vertically (up). Never skips or traps; no light flash between sections.
- [ ] Nav clicks + `/#systems` deep-link land on the right section; keyboard arrows work.
- [ ] Top bar + section nav stay legible on every dark section.
- [ ] OS reduce-motion on (and on mobile / no-WebGL): static dark backdrop, normal scroll, instant section changes, nothing broken.

### Phase 3R.1 — Landing tunnel feel (cinematic lighting) — PENDING GABE VISUAL CONFIRMATION
**Owner:** `frontend-engineer` (being prototyped directly in the main session at Gabe's request; fold into the Gate 3R record once the look is approved).

> All changes are confined to `components/hero/tunnel/TunnelCanvas.tsx` (shaders + geometry attributes) — no architecture change, no per-frame CPU work, all constants live-tunable. Prototyped in-session so Gabe can confirm the look before it is ratified into the Phase 3R gate.
>
> **▶ Current state (2026-06-10): BUILT and on `main`** — all three tasks live in `TunnelCanvas.tsx`. Ticked below. UNAFFECTED by the structure update (shader-only). Gate 3R.1 below remains a Gabe visual item.

**Tasks**
- [x] Speed control: slow constant base per particle (`0.5 + aRand*0.55`) plus a SMALL, hard-bounded proximity lift toward the tunnel mouth (`+ uProximity*0.3`, max ~30% over base). Speed never depends on time, so it cannot creep up the longer you sit there (the original runaway bug), and the proximity term is capped tiny so the cursor-centre boost stays subtle and can never run away fast like the old `uProximity*2.6` version. Cursor proximity also adds a brightness glow.
- [x] Cinematic colour flashing: each particle drifts slowly through a cool cinematic palette (blue → teal → indigo → white), phase-offset by its per-particle random so the colours shimmer scattered across the field, never synchronised. Subtle.
- [x] Occasional coordinated sparks: particles are binned into small spatial clusters (`aGroup` = angular sector × depth slice). Each cluster rolls on its own desynced clock; ~10% fire per cycle, lighting their 2+ neighbours bright together for a brief instant (quick exp decay) → a spark between neighbours. Sparse and quick, never constant.

**Exit criteria:** tunnel speed is visibly constant and slow across a long dwell (no creep-up, cursor position irrelevant to speed); particles softly shift colour over time; sparks fire occasionally between neighbouring particles; build/lint/tsc clean; no WebGL shader errors in the console.
**Human Test Gate 3R.1:**
- [ ] Cursor near centre eases the flow up subtly; away from centre it's slow. With the cursor parked dead-centre for a minute it stays only slightly quicker and calm — never the runaway fast from before, and it doesn't keep accelerating over time.
- [ ] Particles subtly shift colour over time (cool cinematic palette, scattered not synchronised).
- [ ] Every so often two or more neighbouring particles flash bright together (a spark), then fade.
- [ ] No console shader/WebGL errors; reduced-motion / mobile / no-WebGL still fall back to the static dark backdrop.

### Phase 3R.2 — Landing↔About "dive into the void" transition — PENDING GABE CONFIRMATION (decisions locked)
**Owner:** `frontend-engineer` (prototyped directly in the main session at Gabe's request; fold into the Gate 3R record once approved).

> Replaces ONLY the Landing↔About (0↔1) directional slide with a coordinated WebGL **warp dive**. The other legs (1↔2 side, 2↔3 up) are unchanged. **Locked decisions (Gabe, 2026-06-10):** (1) **Arrival = WARP STRAIGHT THROUGH** — continuous, no black gap; About fades up out of the receding starfield in one unbroken motion. (2) **Intensity = SUBTLE & CINEMATIC** — gentle acceleration / restrained streaking within the 0.6–1.2s calm motion language, no jolt.
>
> **CLARIFIED by Gabe (2026-06-10, after first build):** "the hero" = the particle ANIMATION, NOT the headline text. Three consequences, all confirmed visually in-session:
> - **Tunnel is now SITE-WIDE** — calm particles visible on About/Systems/Contact too, not just Landing. This **REVERSES** the earlier "particle tunnel Landing-only" decision. Canvas is full-opacity and always running on every page; only the warp changes per-leg.
> - **Warp is a transient PULSE** (`uWarp = sin(dive·π)`) on the Landing↔About leg only — peaks mid-dive, calm (0) at BOTH ends. Particles are never stuck at light-speed on the inner pages and **never warp on load** (fixes the "warp happens before page renders" report, incl. the dev stale-state case).
> - **Panel hand-off is STAGGERED** (outgoing fades/scales out over the first ~55% as the warp builds; incoming fades in over the last ~60% as it settles) so the two panels never overlap at full opacity — fixes the muddy double-headline the first build showed. The headline text still belongs to Landing only; it is NOT persisted across pages.
> - **Watch:** particle legibility behind the Contact form / Systems list on real displays — flag if a subtle scrim or dimmer particles are needed on inner pages.
>
> **▶ Current state (2026-06-10): BUILT and on `main`, then GENERALIZED by the structure update (see §0 Status).** The warp dive originally replaced ONLY the Landing↔About (0↔1) slide; it is now the transition on **every** leg (Welcome↔Projects and Projects↔Contact), in both directions, via a generalized `addDiveLeg`. The shared dive-signal convention changed from "0 = Landing rest, 1 = at About" to "**0 at rest, ramps 0→1 across a transition**" — a symmetric `sin(dive·π)` pulse, so the same 0→1 scrub serves both forward and reverse on any leg. The "About"/`#about` references in the task & gate text below are OBSOLETE (About was removed). Tasks ticked below; Gate 3R.2 remains a Gabe visual item.

**Tasks**
- [x] Shared transition signal: expose a 0→1 "dive progress" from `PanelDeck`'s 0↔1 timeline (0 = Landing at rest, 1 = fully arrived at About) that the tunnel reads each frame; scrubbed in reverse on About→Landing. *(Generalized: now driven from every leg's timeline as a 0→1 pulse; "About" → "Projects/Contact".)*
- [x] Tunnel warp PULSE + site-wide persistence: `uWarp = sin(dive·π)` in `TunnelCanvas` — particles light-speed and streak radially mid-dive, calm at both ends. `TunnelStage` keeps the canvas full-opacity and always running on EVERY page (no active-index crossfade). Flow is CPU-integrated (`uFlow`) so a changing speed never teleports particles.
- [x] Deck timeline rework (~~0↔1 ONLY~~ → EVERY leg): replace the vertical `yPercent` slide with a STAGGERED hand-off — outgoing panel scales up + fades out over the first ~55% as the warp builds; incoming fades in over the last ~60% as it settles, so the panels never overlap at full opacity. Preserve Observer one-gesture-one-panel, `goToPanel` single entry, input lock, keyboard, hash deep-links, focus mgmt. *(The directional slide engine for non-dive legs was removed — every leg is now the dive.)*
- [x] Fallbacks: reduced-motion OR mobile (<768px) OR no-WebGL OR pre-reveal → no warp, plain instant section change + native scroll (unchanged).

**Exit criteria:** particles are visible (calm) on EVERY page; clicking 02 or scrolling Landing↔About pulses the tunnel to light-speed (radial streaks) and back while the panels hand off WITHOUT overlapping; the tunnel is calm on load and on the inner pages (never stuck at light-speed, never warps before render); one gesture = one section, never skips/traps; nav/deep-link/keyboard land correctly; other legs unchanged; build/lint/tsc clean (three.js still async-isolated, First Load ~138 kB); no shader errors; reduced-motion/mobile/no-WebGL fall back to the static dark backdrop + plain change.
**Human Test Gate 3R.2:**
- [ ] Particles are visible (calm) on About, Systems and Contact too — not only Landing.
- [ ] Scroll/swipe down (or click 02) on Landing → the tunnel pulses to a light-speed streak and back as About replaces Landing, with the two panels NOT overlapping. No black flash, no jolt.
- [ ] Scroll/swipe back up → the opposite pulse; Landing returns cleanly.
- [ ] On first load and while sitting on any page, the tunnel is CALM — no warp/streaks appear except during a Landing↔About scroll.
- [ ] Still exactly one section per gesture; nav 02/01, the `/#about` deep-link, and keyboard arrows all land on the right section.
- [ ] About↔Systems and Systems↔Contact transitions are unchanged.
- [ ] Reduced-motion / mobile / no-WebGL: plain instant change, native scroll, nothing broken.

### Phase 4 — Backend: data + contact pipeline
**Owner:** `backend-engineer`

**Tasks**
- [x] Prisma `ContactSubmission` model + migration; pooled + direct URLs. *(migration `20260611040603_init` applied — table created)*
- [x] Shared Zod schema (`lib/schema.ts`); React Hook Form wired to it client-side.
- [x] Server Action: validate → (security gate placeholder) → persist → email owner → confirm to sender → typed result. *(persist + dual-email runtime-verified by Gabe 2026-06-10)*
- [x] In-place success/error states on the Contact panel. *(verified at the gate)*

**Exit criteria:** valid submissions persist and send both emails; invalid ones show field errors; no secrets client-side.
**Human Test Gate 4:**
- [ ] Submitting a valid form writes a row to the DB (verify in DB).
- [ ] Owner notification email **and** sender confirmation email both arrive.
- [ ] Bad input (missing fields, bad email, over-long message) shows inline errors, no submit.
- [ ] Success state renders in place (no navigation away).

### Phase 5 — Security hardening
**Owner:** `security-engineer`

**Tasks**
- [ ] Honeypot field + (optional) time-trap; Cloudflare Turnstile verified server-side.
- [ ] Rate limiting (Upstash Redis sliding window, ~3–5 / 10 min), fail-closed.
- [ ] Email-injection defenses: escape user values in HTML mail, strip CR/LF from header-bound fields, length caps.
- [ ] Security headers + CSP (locked allowlist), HSTS, nosniff, frame-ancestors none, Referrer-Policy, Permissions-Policy.
- [ ] Hash IPs at rest (salted); confirm no secrets in client bundle; privacy note near form.

**Exit criteria:** spam/bot/rate controls live; scanners pass; injection vectors closed.
**Human Test Gate 5:**
- [ ] Rapid repeat submissions get rate-limited with a polite message.
- [ ] Form with the honeypot filled / failed Turnstile is silently rejected.
- [ ] securityheaders.com / Mozilla Observatory pass; CSP has no `unsafe-inline` script.
- [ ] A name/message containing HTML or newlines does not break or inject into emails.

### Phase 6 — Performance, a11y & SEO polish
**Owner:** `frontend-engineer` (PM invokes `qa-reviewer` to audit)

**Tasks**
- [ ] CWV pass; code-split GSAP/hero; AVIF/WebP; defer non-critical JS.
- [ ] WCAG 2.1 AA: landmarks, single h1, focus management on snap, `aria-current` nav, contrast, labelled form.
- [ ] SEO: metadata, OG/Twitter (hero render as OG image), sitemap, robots.

**Exit criteria:** Lighthouse green across the board; axe clean; focus never stranded.
**Human Test Gate 6:**
- [ ] Lighthouse (mobile + desktop): Performance / A11y / Best Practices / SEO all green.
- [ ] Tab through the whole site by keyboard only — focus is visible and sensible on snap.
- [ ] Screen-reader pass on nav + form (labels, errors announced).
- [ ] OG image + meta preview correctly (e.g. in a link unfurl).

### Phase 7 — Deploy: Vercel + domain
**Owner:** `backend-engineer` (PM coordinates; `security-engineer` re-verifies headers in prod)

**Tasks**
- [ ] Connect repo to Vercel; env vars per environment; `prisma migrate deploy` in release.
- [ ] Add custom domain + DNS; TLS; choose apex-vs-www canonical with 301.
- [ ] Production smoke test.

**Exit criteria:** live on the domain over HTTPS; prod form works end-to-end; headers verified in prod.
**Human Test Gate 7 (final):**
- [ ] Site loads on the real domain over HTTPS (valid cert).
- [ ] Production contact form persists + sends both emails.
- [ ] Security headers still present in production.
- [ ] Final Lighthouse on the live URL is green; deep-links (`/#systems`) work in prod.

---

## 4. Definition of done
All seven Human Test Gates approved by Gabe and recorded in `PROGRESS.md`; every task checked off here; source in a clean repo with README + `.env.example`; live production deployment on the custom domain meeting the design, performance, accessibility, and security criteria above.

---

## 5. `PROGRESS.md` format (the completion log)

If `PROGRESS.md` doesn't exist, the PM creates it with this header, then agents append entries below it.

````md
# PROGRESS.md — GDG Quantum (Completion Log)

Append-only record of completed work. CLAUDE.md is the source of truth for the plan;
this file is the reference for what has been done. Newest entries at the bottom of each phase.

---
````

**Task entry** (appended by the owning agent when it ticks a task in CLAUDE.md):
````md
## Phase <N> — <phase name>
- [x] <task text> — `@<agent-name>` — <YYYY-MM-DD>
  - Files: <paths changed/created>
  - Summary: <1–2 lines on what was done>
  - Verify: <command or steps to confirm>
  - QA: pending
````
(When QA verifies, the owning agent updates that entry's `QA:` line to `PASS` — or reverts the CLAUDE.md checkbox and logs the fix on FAIL.)

**Gate record** (appended by the PM after Gabe approves a Human Test Gate):
````md
### ✅ GATE APPROVED — Phase <N> — approved by Gabe — <YYYY-MM-DD>
- QA result: PASS
- Notes: <anything Gabe flagged, follow-ups, deferred items>
````

Agents may obtain the date with the `date` Bash command. Only checkbox state in CLAUDE.md and appends to PROGRESS.md are edited by this mechanism — never the plan text.
