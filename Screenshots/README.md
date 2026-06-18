# Helix Logo — "Ethereal Halo" 3D animated logo

A self-contained, voice-free version of Helix's identity orb, packaged as a
drop-in React logo for your website. Two crossed white fractured halos, a gold
glowing atom core, and ethereal drifting dots with tethers to the core. It
animates on its own (a calm, always-on idle) and renders on a transparent
canvas so it floats over any background.

This is the **logo build** — all voice/audio reactivity and app-state hooks
from the original Helix orb have been removed.

---

## Install dependencies

```bash
npm i three @react-three/fiber
# or: pnpm add three @react-three/fiber
# or: yarn add three @react-three/fiber
```

That's it — no `drei`, no post-processing/bloom. (TypeScript: `three` ships its
own types.)

## Use it

Copy `HelixLogo.tsx` into your project, then:

```tsx
import HelixLogo from "./HelixLogo";

// Sized by a Tailwind className…
<HelixLogo className="h-40 w-40" />

// …or by inline style.
<HelixLogo style={{ width: 240, height: 240 }} />

// As a hero piece, let it fill a sized parent:
<div style={{ width: 480, height: 480 }}>
  <HelixLogo />
</div>
```

The component renders its **own** transparent `<Canvas>`, so you don't need to
set up React Three Fiber yourself — just drop it in and give it a size.

> **Sizing note:** the wrapper defaults to `width: 100% / height: 100%`, so its
> parent must have a real size (give the parent a height, or pass
> `className`/`style` with explicit dimensions). A 1:1 (square) box looks best.

## Plain JavaScript (no TypeScript)?

Rename the file to `HelixLogo.jsx` and delete the two type annotations:
- the `HelixLogoProps` interface, and
- `: CSSProperties` / `: DotData[]` / `: TorusGeometry[]` etc. — or just remove
  the `interface`/`type` lines and the `as` casts. The runtime logic is plain JS.

## Background / theme

It's designed for a **dark** background (near-black `#08080a` is what Helix
uses) — the white halos and gold core pop against dark. On a light background
the additive glow will wash out; if you need it on light, lower the glow
opacities (see tuning below) or keep it in a dark hero section.

---

## Tuning knobs (constants at the top of `HelixLogo.tsx`)

| Constant | Controls |
|---|---|
| `SEGMENTS` / `GAP` | How fractured the halos look (arc count + gap size) |
| `HALO_R` / `HALO_TUBE` / `WALL_SCALE` | Halo radius, line thickness, "chunkiness" |
| `DOT_COUNT` | Number of drifting dots (40 default; scales fine to 200+, one buffer) |
| `MIN_D` / `MAX_D` | Distance band: where dots are bright (near core) vs faint (far) |
| `GOLD_COL` / `FAR_COL` | The two ends of the dot/tether colour gradient |
| `ORBIT_R` | Radius of the 3 gold orbital rings around the core |

Animation speeds live in `useFrame` (inside `OrbScene`):
- `delta * 0.16` and `delta * 0.13` — spin speed of Halo A (X axis) / Halo B (Y axis)
- `delta * 0.08` — core group drift
- the `Math.sin(t * 1.4)` terms — the gentle "breathing" of the nucleus/glow

## Performance

One `Points` object for all dots and one `LineSegments` for all tethers (typed
arrays updated per frame — no per-dot React objects), so it's cheap. For a tiny
header logo you can drop `DOT_COUNT` and lower `dpr`. For a big hero, bump
`DOT_COUNT`.

## Files

- `HelixLogo.tsx` — the component (copy this into your site)
- `README.md` — this file
