---
name: project-mobile-snap-decision
description: GSAP snap deck runs only >=768px; mobile and reduced-motion fall back to native scroll (Phase 2 decision)
metadata:
  type: project
---

The GSAP Observer panel deck (`components/deck/PanelDeck.tsx`) runs its controlled transform-based snapping ONLY on viewports >= 768px (`MOBILE_BP`) AND when reduce-motion is off. Below 768px, and whenever `prefers-reduced-motion: reduce`, the deck is disabled and the page uses NATIVE vertical scroll; `goToPanel()` falls back to instant `scrollIntoView`. Mode is recomputed on resize/orientation.

**Why:** A transform deck fights iOS Safari's dynamic toolbar and touch momentum — that's where touch traps / double-skips appear. Native scroll on small screens is robust. This was a deliberate, documented Phase 2 call (Gabe gate item: confirm on real iOS Safari + Android Chrome).

**How to apply:** In Phase 3 (hero float/reveals) and Phase 6 (a11y/perf), remember there are TWO runtime layouts to test: deck mode (>=768px, motion on) and native mode (mobile OR reduce-motion). Entrance reveals and focus management must work in both. Don't assume the transform deck is always active. Related: [[env-windows-next-lock]].
