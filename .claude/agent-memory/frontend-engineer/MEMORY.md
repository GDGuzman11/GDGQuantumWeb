# Frontend Engineer — Memory Index

- [Windows .next build lock](env_windows_next_lock.md) — `npm run build` EPERM on `.next/trace`/`.next` means a dev server is holding it; stop node + clear `.next`.
- [Mobile snap = native scroll below 768px](project_mobile_snap_decision.md) — deck uses GSAP transform only ≥768px; mobile + reduced-motion fall back to native scroll.
- [Shared persistent object canvas](project_shared_object_canvas.md) — hero object is ONE pointer-events-none WebGL overlay (lg+ only) travelling halves; interactivity via window pointer-projection, not R3F events.
