# GDG Quantum

A cinematic, single‑page portfolio built around one idea: **the brand mark is a world you fly into.**

You land on a calm night sky with the **Helix "Ethereal Halo" orb** glowing at its centre. Choosing
a destination doesn't navigate a page — it flies the camera *into the orb*:

```
About     →  the CORE          (the story chamber)
Projects  →  the QUANTUM FIELD (deeper — a jittering subatomic cloud)
Contact   →  the SINGULARITY   (a black hole; transmit a message to the AI on the other side)
```

It's one continuous descent through scale, rendered in a single WebGL world with bloom + gravitational
lensing, ending at a cinematic singularity where the (real, working) contact form transmits through to
"HELIX."

> **Status: front‑end rebuild in progress.** This is a ground‑up reimagining of the front end (the prior
> nine‑phase snap‑deck site is retired). The **backend + security + infrastructure are reused intact** —
> the contact form genuinely persists a row and sends owner + sender emails, behind the same Turnstile /
> rate‑limit / nonce‑CSP hardening, deployed on Vercel. The **About** interior is now built (a randomized
> header, an intro, a real brand‑logo stack table, and a closing) and the landing has an orb‑tap easter
> egg; the **Projects** and **Contact** interior *content* is still placeholder, the 3D framing/pacing is
> being visually tuned, and a mobile pass is still to come. SEO is hardened for the single‑page WebGL app
> (crawlable server‑rendered section copy + `Person`/`ProfilePage` structured data + identity metadata).
> The previous site's full history is preserved in `CLAUDE.md` / `PROGRESS.md` and in git.

---

## Highlights

- **One WebGL world, one camera.** Stars, faint randomly‑shaped distant galaxies, and the Helix orb live
  in a single R3F/three.js scene. Navigation is a real camera flight *into* the orb — no page loads.
- **A continuous "dive" model.** A single shared depth scalar (`0` rest → `1` core → `2` quantum → `3`
  singularity) drives a multi‑segment camera flight, so every leg — landing→section *and* section→section
  (About→Projects "go deeper", Projects→Contact, and back) — animates smoothly.
- **The quantum field (Projects).** A cloud of subatomic points that vibrate (uncertainty) and flicker
  (probability), blooming in as you fall past the core, then collapsing into the singularity.
- **The singularity (Contact).** An occluding **event horizon**, a blazing **photon ring**, and a
  **Doppler‑beamed accretion disk** that ignites as it forms; the camera pulls back and slowly orbits it.
- **Hollywood post.** `EffectComposer` with **bloom** (everything bright blazes) + a custom
  **gravitational‑lensing** screen distortion that warps the frame around the black hole on the Contact leg.
- **Cinematic, working contact.** A rethemed dark‑glass "transmission" console — same React Hook Form +
  shared Zod schema → Server Action → Prisma persist → Resend emails pipeline, with the full security
  envelope (honeypot, time‑trap, Turnstile, rate limit, salted IP hash).
- **Living landing copy.** A big serif statement that materialises in and keeps a subtle "living hologram"
  glow, with a whisper of pointer‑parallax depth, and LinkedIn / GitHub / Upwork marks pinned bottom‑centre.
- **The core (About).** Flying in reveals a story chamber: a randomized header (re‑rolls each visit), a
  short intro, a **stack table** of real brand logos grouped Languages / Frameworks / Tools, and a
  closing line. The brand‑logo path data is baked in at author time (no runtime dependency) and
  lazy‑loaded with the interior, so it never touches First Load.
- **SEO for a WebGL single‑pager.** Because navigation is a camera dive (no URL change) and the
  interiors are client‑only, the section copy + full tech list are also server‑rendered as crawlable
  `sr-only` HTML, alongside `Person`/`ProfilePage` JSON‑LD (carrying the per‑request CSP nonce) and
  identity‑forward metadata — all sourced from one `lib/profile.ts`.
- **Living landing extras.** An orb‑tap easter egg: tapping the Helix orb glows it, fires a coloured
  ray, and typewriter‑rewrites the headline through an escalating, increasingly sarcastic run.
- **Correctness‑first fallbacks.** `prefers-reduced-motion` jumps between states (no flight); no‑WebGL
  shows a CSS starfield; the heavy three.js + postprocessing stack is async‑isolated so `/` First Load
  stays ≈ **94 kB**.

---

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | **Next.js 14** (App Router) · `force-dynamic` `/` for the per‑request nonce CSP |
| Language | **TypeScript** (`strict: true`) |
| Styling | **Tailwind CSS** with design tokens as CSS variables |
| 3D / world | **three.js** `0.169` + **@react-three/fiber** `8.18` + **@react-three/drei** `9.122` |
| Post‑processing | **@react-three/postprocessing** + **postprocessing** (bloom + custom lens effect) |
| Motion (DOM) | lightweight rAF tweens + CSS keyframes (the dive, hologram, parallax) |
| Fonts | **Instrument Serif** (display) + **Inter** (body/UI), self‑hosted via `next/font` |
| Backend | Prisma + PostgreSQL (Neon), Next.js Server Action, **Resend** email |
| Forms / validation | **React Hook Form** + **Zod** (schema shared client + server) |
| Security | Cloudflare **Turnstile**, **Upstash** Redis rate limit, nonce **CSP** + security headers, salted IP hashing |
| Hosting | **Vercel** + custom domain |

---

## Getting started

**Prerequisites:** Node.js 18.18+ (or 20+) and npm.

```bash
npm install
cp .env.example .env       # optional — the front-end runs without it; the contact form degrades gracefully
npm run dev                # http://localhost:3000
```

The orb world (and the contact form chunk) load only in the browser; with WebGL off or reduced‑motion on,
you get a static starfield and instant (non‑flying) navigation.

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`next lint`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` / `format:check` | Prettier write / check |

---

## Environment variables

The front‑end runs with none set (the contact pipeline degrades gracefully). For the live form, set these
in `.env` locally and in your Vercel project — secrets are **never** committed and nothing sensitive is
`NEXT_PUBLIC_` except the Turnstile **site** key. See `.env.example`.

- `DATABASE_URL` / `DIRECT_URL` — pooled + direct PostgreSQL (Prisma)
- `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_OWNER_EMAIL` — transactional email
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — rate limiting
- `IP_HASH_SALT` — salt for hashing IPs at rest
- `NEXT_PUBLIC_SITE_URL` — canonical/OG base URL

---

## Project structure (the rebuild)

```
app/
  layout.tsx              Root layout — fonts, SEO metadata/OG, force-dynamic (nonce CSP), skip link
  page.tsx                The world (OrbWorld) + the Hero overlay + bottom social marks
  globals.css             Tokens, dark scope, keyframes (hologram, glitch, grain, …)

components/
  world/
    OrbWorld.tsx           Full-screen host — dynamic ssr:false, WebGL/reduced gating, CSS fallback
    OrbWorldCanvas.tsx     ONE canvas: Sky + Helix orb + CameraRig + EffectComposer (bloom + lens)
    QuantumField.tsx       Projects — vibrating/flickering subatomic cloud (depth 1→2, collapses 2→3)
    Singularity.tsx        Contact — event horizon + photon ring + beamed accretion disk (depth 2→3)
    LensEffect.ts          Custom gravitational-lens postprocessing effect (gated by dive depth)
  home/
    Hero.tsx               DOM overlay: intro + About/Projects/Contact + per-section interior + dive tween
    Intro.tsx              The <h1> statement + sub (materialise-in, living-hologram glow)
    OrbHotspot.tsx         Orb-tap easter-egg target (glow + ray; Hero owns the state machine)
    AboutInterior.tsx      The core's About: randomized header + intro + brand-logo stack table + closing (lazy)
    PrimaryLink.tsx        Shared underline-on-hover link (used by Hero + AboutInterior)
    SeoContent.tsx         Server-rendered, crawlable sr-only copy of every section (SEO for the WebGL pager)
    HeroStage.tsx          Whisper pointer-parallax wrapper (rAF, reduced-motion safe)
    SocialLinks.tsx        LinkedIn / GitHub / Upwork marks, bottom-centre (hrefs from lib/profile)
    TransmitForm.tsx       Cinematic contact form → the real submitContact pipeline (lazy-loaded)
  helix/
    HelixLogo.tsx          The "Ethereal Halo" orb (verbatim asset; exports OrbScene for the world)
  sky/
    NightSkyCanvas.tsx     Starfield + galaxies (exports <Sky/> for the world)

lib/
  dive.ts                 Shared dive-depth scalar (0 rest · 1 core · 2 quantum · 3 singularity)
  profile.ts              Single source of truth for "who Gabe is": About copy, profile + social URLs
  tech-stack.ts           The stack table grouped Languages / Frameworks / Tools (+ flat names for SEO)
  tech-icons.ts           Brand-logo SVG paths baked in from simple-icons at author time (no runtime dep)
  orb-lines.ts            Orb-tap easter-egg copy + escalation/finale resolver
  webgl.ts · use-reduced-motion.ts · fonts.ts · site-url.ts · schema.ts

app/actions/contact.ts    Server Action (security gate → validate → persist → email)  [reused]
lib/{security,email,db}.ts  Turnstile/rate-limit/IP-hash · Resend · Prisma client      [reused]
middleware.ts             Per-request nonce CSP                                         [reused]
prisma/                   ContactSubmission model + migration                           [reused]

components/{deck,chrome,hero/tunnel,sections}/   ← RETIRED prior front-end (on disk, unused)
CLAUDE.md / PROGRESS.md   Plan + append-only log (full prior-site history retained)
```

---

## How the experience works

**The world.** `OrbWorldCanvas` renders the night sky and the Helix orb in one R3F scene with one camera.
At rest the camera sits back so the orb reads as a glowing mark high in frame, with the landing copy below.

**The dive.** `lib/dive.ts` holds one mutable `depth` scalar read every frame by the scene (no React churn).
`Hero.tsx` tweens it with a small rAF loop; the canvas's `CameraRig` maps it to a continuous flight:

- `0 → 1` rest → **core** (About): the camera rises to meet the orb and flies in.
- `1 → 2` core → **quantum field** (Projects): it keeps plunging; `QuantumField` blooms in.
- `2 → 3` quantum → **singularity** (Contact): the field collapses, `Singularity` ignites, and the camera
  pulls back and slowly orbits the black hole. The custom **lens effect** warps the frame here.

Because it's one scalar, *any* transition is smooth — including section‑to‑section (About's "go deeper →
Projects", "Continue to Contact", and the "Back to …" links). Reduced‑motion jumps instead of flying.

**Contact = the real thing.** The cinematic console in the singularity is wired to the same
`submitContact` Server Action as before: shared Zod validation, Prisma persist, Resend owner + sender
emails, and the full security gate (honeypot, time‑trap, Turnstile, Upstash rate limit, salted IP hash).

---

## Deployment (Vercel)

It's a standard Next.js 14 app, so **Vercel builds and renders it with no special "mapping"** — the
three.js / postprocessing work is shipped as ordinary client chunks (loaded in the browser, `ssr:false`),
the `/` route is server‑rendered per request (for the nonce CSP), and `middleware.ts` runs on the edge.
There are **no new routes** in the rebuild — it's still the single `/` page — so nothing to remap.

What Vercel needs (already in place from the prior deployment):

- **Env vars** set in the Vercel project (the list above).
- **Prisma** — `postinstall` runs `prisma generate`; run `prisma migrate deploy` in the release step. The
  rebuild did **not** change the schema, so there's no new migration.
- **Custom domain / DNS** — already mapped; pushing to `main` triggers the deploy.

The new dependencies (`@react-three/postprocessing`, `postprocessing`) are committed to `package.json`, so
`npm install` on Vercel picks them up automatically.

---

## Conventions

- **TypeScript strict**, ESLint + Prettier enforced; small, reviewable, conventional commits.
- Anything touching `window` / WebGL starts with `"use client"`; the world + form are `dynamic(..., { ssr: false })`.
- Design tokens are CSS variables (never hard‑coded); 3D shader colours are artwork, not the semantic tokens.

---

## Project governance

**`CLAUDE.md` is the source of truth** for scope and history; **`PROGRESS.md`** is the append‑only
completion log. Both retain the full record of the prior nine‑phase site, whose backend, security, and
deployment continue to power this rebuild.

---

*Built for GDG Quantum.*
