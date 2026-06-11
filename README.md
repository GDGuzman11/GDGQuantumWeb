# GDG Quantum

A premium, single‑page, scroll‑snapped marketing site for **GDG Quantum** — a studio that builds considered digital systems. The visitor lands on a cinematic hero and then snaps panel‑to‑panel through three full‑viewport sections:

```
01 Welcome  →  02 Projects  →  03 Contact
   #home         #systems        #contact
```

The experience is built around a custom **GSAP Observer “panel deck”** (one gesture = one panel, fully input‑locked during transitions — not CSS `scroll-snap`), a **GPU particle tunnel** that runs site‑wide, and a signature **“dive into the void” warp** that carries you between every section at light‑speed.

> **Status:** Front‑end experience is built through **Phase 3R.2**. The backend (database + contact pipeline), security hardening, final performance/SEO/a11y polish, and production deployment are **not yet built** — see [Roadmap](#roadmap). The contact form is currently **visual‑only**.

---

## Table of contents

- [Highlights](#highlights)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Design system](#design-system)
- [Architecture & key concepts](#architecture--key-concepts)
  - [The panel deck (snap engine)](#the-panel-deck-snap-engine)
  - [The particle tunnel](#the-particle-tunnel)
  - [The “dive into the void” warp](#the-dive-into-the-void-warp)
  - [Preloader & reveal choreography](#preloader--reveal-choreography)
  - [Full‑dark theming](#full-dark-theming)
  - [Fallbacks & accessibility](#fallbacks--accessibility)
- [What’s been done (changelog)](#whats-been-done-changelog)
- [Roadmap](#roadmap)
- [Conventions](#conventions)
- [Project governance](#project-governance)

---

## Highlights

- **Custom snap engine** — GSAP `Observer` deck where one wheel/trackpad/touch gesture, arrow key, nav click, or hash deep‑link moves exactly one panel, with the input locked during the transition so it can never skip or trap.
- **Warp‑dive transitions** — every adjacent move (Welcome↔Projects and Projects↔Contact) is the cinematic light‑speed dive, in either direction, with a staggered panel hand‑off so the two panels never overlap.
- **Site‑wide GPU particle tunnel** — a ~1,900‑point R3F/three.js starfield flowing toward the camera on a recycling cylinder, with in‑shader twinkle, cinematic colour drift, and occasional coordinated “sparks” between neighbouring particles.
- **“Dive into the void” warp** — scrolling between sections pulses the tunnel to a radial **light‑speed streak** and back; the particles persist calmly while at rest on every section.
- **Hero social marks** — themed monochrome GitHub + LinkedIn links sit under the hero sub‑line and brighten to the accent on hover.
- **Real‑progress preloader** — a percentage counter driven by genuine load signals (`document.fonts.ready` + window `load`), choreographed into the hero’s entrance reveal.
- **Performance‑minded** — the heavy three.js/R3F stack is isolated in an async chunk so it stays **out of the route’s First Load JS** (≈138 kB) and the `<h1>` remains the LCP element.
- **Correctness‑first fallbacks** — `prefers-reduced-motion`, mobile (`<768px`), and no‑WebGL paths all degrade to native scroll + a static dark backdrop, with no animation.

---

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | **Next.js 14** (App Router) |
| Language | **TypeScript** (`strict: true`) |
| Styling | **Tailwind CSS** with design tokens as CSS variables |
| Motion / snap engine | **GSAP** (`Observer`, `SplitText`) — free since the Webflow acquisition |
| 3D / particles | **three.js** `0.169.0` + **@react-three/fiber** `8.18.0` + **@react-three/drei** `9.122.0` (pinned React‑18 line) |
| Fonts | **Instrument Serif** (display) + **Inter** (body/UI), self‑hosted via `next/font` |
| Backend *(planned)* | Prisma + PostgreSQL, Next.js Server Action, Resend email |
| Hosting *(planned)* | Vercel + custom domain |

---

## Getting started

**Prerequisites:** Node.js 18.18+ (or 20+) and npm.

```bash
# 1. Install dependencies
npm install

# 2. (optional, for later backend work) create your local env file
cp .env.example .env.local

# 3. Run the dev server
npm run dev
```

Open <http://localhost:3000>. Scroll, swipe, use the arrow keys, click the numbered nav, or deep‑link to `/#systems` — the deck handles them all through a single entry point.

> **Tip:** the particle tunnel only mounts on `lg+` (≥1024px) screens with WebGL available and reduced‑motion off, and only after the preloader reveal completes. On smaller/reduced/no‑WebGL setups you’ll correctly see the static dark backdrop instead.

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`next lint`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |

---

## Environment variables

Nothing is required to run the front‑end today. The variables below are the **skeleton for the planned backend** (see `.env.example`). Secrets must live only in your local `.env.local` / hosting provider — **never committed**, and nothing sensitive may be prefixed `NEXT_PUBLIC_`.

- `DATABASE_URL` / `DIRECT_URL` — pooled + direct PostgreSQL connection strings (Prisma)
- `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_OWNER_EMAIL` — transactional email (Resend); SMTP fallback vars also present
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile bot protection
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — rate limiting
- `IP_HASH_SALT` — salt for hashing IPs at rest

---

## Project structure

```
app/
  layout.tsx            Root layout — fonts, metadata, full-dark <body> scope, skip link
  page.tsx              Composes Preloader + PanelDeck (chrome, backdrop, 3 panels)
  globals.css           Tokens, dark theme scope, grain keyframes, base styles

components/
  chrome/
    Preloader.tsx        Real-progress % preloader, scroll lock, fires the reveal
    TopBar.tsx           Hex mark + wordmark + primary nav (routes through the deck)
    SectionNav.tsx       Numbered 01–03 rail + progress indicator
  deck/
    DeckContext.tsx      Shared deck state (activeIndex, goToPanel, deckMode)
    PanelDeck.tsx        The GSAP Observer snap engine + warp-dive transitions
  hero/
    HeroContent.tsx      The single <h1> (LCP) + sub + social marks + CTA + SplitText reveal
    HeroBackdropFallback.tsx  Static dark gradient + grain (the always-on backdrop)
    tunnel/
      TunnelStage.tsx    DOM host: gates + mounts the canvas site-wide (no three import)
      TunnelCanvas.tsx   The R3F/three.js particle tunnel + warp shader (async chunk)
      Grain.tsx          Soft film-grain overlay (inline SVG noise)
  sections/
    Panel.tsx            Full-viewport (100svh) panel shell, focus target
    PanelReveal.tsx      Per-panel entrance reveal (deck-active OR IntersectionObserver)
    Landing.tsx (Welcome) · Systems.tsx (Projects, placeholder) · Contact.tsx
  ui/
    CtaLink.tsx · Field.tsx   Hand-built primitives

lib/
  site-config.ts        Brand + panel metadata (the swappable "Projects" label lives here)
  fonts.ts              next/font setup (Instrument Serif + Inter, size-adjusted fallback)
  reveal.ts             Latched pub/sub linking the preloader → hero entrance
  warp.ts               Shared "dive progress" scalar linking the deck → tunnel warp
  webgl.ts              WebGL capability probe (no three import)
  use-reduced-motion.ts Live prefers-reduced-motion hook

prisma/                 (placeholder — schema lands in Phase 4)
CLAUDE.md               The build plan & orchestration protocol (source of truth)
PROGRESS.md             Append-only completion log
```

---

## Design system

Tokens are wired into Tailwind `theme.extend` **and** CSS variables — never hard‑coded.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#FAF9F6` | Canvas (warm off‑white) — base palette |
| `--ink` | `#0E1116` | Primary text |
| `--accent` | `#2563EB` | Links, CTAs, focus rings |
| `--muted` | `#6B7280` | Secondary text |
| `--hairline` | `rgba(14,17,22,0.10)` | 1px rules / underlines |

A `[data-theme="dark"]` scope re‑values these tokens for the full‑dark site (applied on `<body>`). Type: **Instrument Serif** for large, tight‑leading headings; **Inter** for body/UI. Motion language is deliberately restrained — ease‑out, 0.6–1.2s, no bounce/spin (“do less”).

> Note: the 3D shader colours (cool blues → teal → indigo → white) are **artwork parameters**, not part of the five semantic design tokens.

---

## Architecture & key concepts

### The panel deck (snap engine)

`components/deck/PanelDeck.tsx` owns the snap experience. A GSAP `Observer` translates wheel/trackpad/touch into a single `goToPanel(index)` call — the **one entry point** also used by keyboard (`Arrow`/`Page`/`Home`/`End`/`Space`), nav clicks, and hash deep‑links. During a transition the input is locked (no double‑skip), with a belt‑and‑braces timeout in case `onComplete` is ever pre‑empted.

Panels are absolutely stacked and **every** adjacent pair animates with the cinematic “dive into the void” warp (see below):

- `0↔1` (Welcome↔Projects) — **warp dive**
- `1↔2` (Projects↔Contact) — **warp dive**

Non‑adjacent jumps (e.g. nav from Welcome straight to Contact) animate as fast **chained warp legs**, with the total duration capped.

The deck‑vs‑native decision is recomputed on resize/orientation and on live reduced‑motion toggles, rebuilding cleanly across the `768px` breakpoint.

### The particle tunnel

`components/hero/tunnel/TunnelCanvas.tsx` is the heavy three.js/R3F chunk, only ever reached via `dynamic(() => import(...), { ssr: false })` so it stays out of First Load JS. It’s a GPU starfield‑tunnel: ~1,900 points on the wall of a cylinder around −Z, flowing toward the camera and recycling (modulo over the tunnel depth) for an endless rush. All motion lives in the vertex/fragment shaders — there’s no per‑frame CPU simulation. Features:

- **Constant base flow** per particle (slow), plus a small, hard‑bounded **cursor‑proximity lift** toward the tunnel mouth (it can never run away fast, and never depends on elapsed time).
- **Cinematic colour flashing** — each particle drifts through a cool palette, phase‑offset by a per‑particle random so the field shimmers rather than pulsing in unison.
- **Coordinated sparks** — particles are binned into small spatial clusters (`aGroup`); each cluster occasionally flashes its 2+ neighbours bright together for a brief instant.
- **Light‑speed warp** — radial streaks driven by the dive (see next section).

The time‑varying flow (proximity + warp) is **integrated on the CPU** into a single `uFlow` uniform and added in the shader, so a changing speed never teleports particles (multiplying a changing speed by absolute time would).

### The “dive into the void” warp

Scrolling between any two sections triggers a coordinated warp:

- `lib/warp.ts` holds a shared **dive progress** scalar (`0` = at rest on any panel, ramping `0→1` across a transition). `PanelDeck` scrubs it from each leg’s GSAP timeline; the tunnel reads it every frame.
- The shader turns it into a **pulse** — `uWarp = sin(dive·π)` — which peaks mid‑transition and is `0` at both ends. Because it’s a symmetric pulse, the same `0→1` scrub serves both forward and reverse on every leg, so the particles light‑speed (and stretch into radial streaks) **only during the scroll**, then settle to calm. They are never stuck at light‑speed on the inner pages, and never warp on load.
- The panel content **hand‑off is staggered** (outgoing scales up + fades out over the first ~55% as the warp builds; incoming fades in over the last ~60% as it settles) so the two panels never overlap at full opacity. The bright mid‑dive particles cover the gap.
- The particle tunnel itself is **site‑wide** — calm particles are visible behind every section.

### Preloader & reveal choreography

`components/chrome/Preloader.tsx` shows a percentage counter driven by **real** load signals: `document.fonts.ready` (so the serif headline paints in its final face — the CLS‑sensitive bit) and the window `load` event. The displayed number eases toward its target on rAF so it always counts smoothly to 100, with a tasteful minimum duration and a hard max‑duration fail‑safe so it can never trap the user. On completion it locks/releases body scroll and fires `markRevealStarted()`.

`lib/reveal.ts` is a tiny **latched pub/sub** that decouples “when the site is ready to be seen” (the preloader) from “what happens on reveal” (the hero entrance — eyebrow → headline line‑by‑line via `SplitText` → sub → CTA underline draw → scroll cue). Because it’s latched, a late‑subscribing consumer still fires correctly.

### Full‑dark theming

The site is dark on every section. `[data-theme="dark"]` is applied on `<body>`, all panels are transparent over a site‑wide dark gradient + grain backdrop, and chrome (top bar, section nav) carries the dark scope explicitly so legibility never depends on an ancestor attribute.

### Fallbacks & accessibility

`prefers-reduced-motion`, mobile (`<768px`), no‑WebGL, and pre‑reveal states all fall back to **native vertical scroll + a static dark backdrop**, with snapping, the tunnel canvas, and entrance animations disabled (instant final states). Accessibility groundwork includes a single `<h1>`, a skip link, programmatic focus management on panel change (focus is never stranded, and form fields are never stolen from), `aria-current` on the active nav item, and labelled landmark regions. *(A full WCAG 2.1 AA audit is scheduled for Phase 6.)*

---

## What’s been done (changelog)

> Detailed, append‑only records live in `PROGRESS.md`; the live task checklist lives in `CLAUDE.md`.

- **Phase 0 — Foundation & design system.** Next.js 14 + TS strict + Tailwind + ESLint/Prettier; design tokens wired to Tailwind + CSS vars; self‑hosted fonts; folder structure; `siteConfig` with the swappable “Systems” label.
- **Phase 1 — Static panel shell + nav + preloader.** Four full‑viewport panels with real copy; top bar + numbered section nav; real‑progress percentage preloader.
- **Phase 2 — GSAP snap engine.** `Observer` panel deck with `goToPanel` as the single entry point; input lock; `100svh` handling; reduced‑motion + mobile native‑scroll fallbacks.
- **Phase 3 → 3R — Cinematic Landing redesign.** Replaced the original hero object with the **particle tunnel**; reworked the deck into **directional transitions**; introduced the **full‑dark** palette site‑wide.
- **Phase 3R.1 — Landing tunnel feel (cinematic lighting).** Constant slow flow with a subtle bounded proximity lift; per‑particle cinematic colour flashing; occasional coordinated sparks between neighbouring particles. Also fixed a shader **precision‑mismatch bug** that had stopped the tunnel from rendering at all.
- **Phase 3R.2 — “Dive into the void” warp.** Site‑wide particle persistence; a transient light‑speed **warp pulse** on the dive leg; CPU‑integrated flow (no teleport on speed change); staggered panel hand‑off (no overlap).
- **Structure update — three‑panel flow.** Removed the About panel; the flow is now **Welcome → Projects → Contact**. The warp dive is now the transition on **every** leg (in both directions). “Landing” is relabelled **Welcome**; “Systems” is relabelled **Projects** (a placeholder until the work showcase is designed; internal hash stays `#systems`). Added themed **GitHub + LinkedIn** social marks to the hero.

All of the above pass `tsc`, `next lint`, and `next build` with three.js isolated in an async chunk. Visual/interaction acceptance is reviewed per‑phase.

---

## Roadmap

Not yet built (planned in `CLAUDE.md`):

- **Phase 4 — Backend.** Prisma `ContactSubmission` model + migration; shared Zod schema (client + server); contact **Server Action** (validate → persist → owner + sender emails); in‑place success/error states. *(The form is visual‑only today.)*
- **Phase 5 — Security hardening.** Honeypot/time‑trap + Cloudflare Turnstile; rate limiting (Upstash); email‑injection defenses; security headers + CSP; salted IP hashing.
- **Phase 6 — Performance, a11y & SEO polish.** Core Web Vitals pass; full WCAG 2.1 AA; metadata/OG/sitemap/robots.
- **Phase 7 — Deploy.** Vercel + custom domain, env per environment, production migrations, smoke test.

---

## Conventions

- **TypeScript strict**, ESLint + Prettier enforced.
- Components touching `window`, WebGL, or GSAP start with `"use client"`; the hero 3D is `dynamic(..., { ssr: false })`.
- **Do not** use CSS `scroll-snap-type` (the deck is the snap engine), and **do not** `npx shadcn add <arbitrary-registry-url>` (vendor primitives in manually after review).
- Small, reviewable, conventional commits.

---

## Project governance

This project is built with a documented, phase‑gated plan. **`CLAUDE.md` is the source of truth** for scope and the live task checklist; **`PROGRESS.md`** is the append‑only completion log. The `.claude/agents/` directory defines the specialist roles (frontend, backend, security, QA, PM) used to drive the build.

---

*Built for GDG Quantum.*
