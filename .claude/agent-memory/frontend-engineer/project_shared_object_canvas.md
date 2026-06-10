---
name: project-shared-object-canvas
description: Hero object is ONE persistent pointer-events-none WebGL overlay travelling alternating halves; lg+ only; interactivity via window pointer-projection
metadata:
  type: project
---

Revision #3 (2026-06-10) of the Phase 3 hero made the object ONE persistent shared WebGL canvas (`components/hero/SceneStage.tsx` → dynamic `space/SceneCanvas.tsx`), mounted once in the deck chrome, that travels to alternating halves as `activeIndex` changes (Landing right / About left / Systems right / Contact left). The old scroll-driven "evolution stages" are RETIRED — scroll now only drives the object's screen POSITION.

Key non-obvious decisions (don't re-derive or undo them in later phases):
- **Live canvas only at `lg+` (1024px) AND motion-on AND WebGL AND after preloader reveal.** Below lg the panels are single-column with NO object; reduced-motion / no-WebGL / SSR show the per-panel static space-window SVG (`PanelObjectSlot`, hidden when live via `lib/scene-presence.ts`). So there are again TWO+ runtime layouts to test (see [[project-mobile-snap-decision]]).
- **Interactivity is solved WITHOUT R3F pointer events.** The canvas overlay is `pointer-events-none` (so the Contact form, TopBar/SectionNav, CTA, keyboard nav stay usable). The canvas writes the object's projected screen rect to a shared ref each frame; a window-level pointer/click controller in SceneStage reads it for proximity/hover/click and IGNORES events whose target is interactive (`a,button,input,textarea,select,label,[role=button],[contenteditable]`). When touching a11y/perf, do NOT add `pointer-events:auto` to the canvas — it would break form/nav.
- **Object position uses R3F `damp` in useFrame, not a GSAP tween**, deliberately, so it tracks live viewport resizes; GSAP still owns the discrete scene morphs + the entrance reveal. Motion stack remains GSAP + R3F only (no Framer Motion).
- The object is decorative/aria-hidden; click "scenes" are enhancement only — no keyboard path is expected for them.

Gate 3 still NOT approved as of this revision (Gabe iterating pre-gate). Related: [[env-windows-next-lock]].
