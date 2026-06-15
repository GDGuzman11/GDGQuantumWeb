'use client';

/**
 * Shared device-tilt signal (Phase 9, MOBILE tier) — the gyroscope analogue of
 * `lib/pointer.ts`. On phones there is no cursor, so the chrome bust's head-gaze
 * (`ChromeBust.tsx`: getPointer() → uYaw/uPitch) would sit dead-still. This
 * provider reads `DeviceOrientationEvent` (gamma = left/right → yaw, beta =
 * forward/back → pitch), normalises + clamps + low-pass smooths it, and publishes
 * the SAME `{ x, y }` shape (−1..1, y up) that `getPointer()` returns — so the
 * bust can swap its gaze SOURCE on mobile while the gaze MATH stays identical
 * (`p.x*0.3` / `-p.y*0.17`). `lib/pointer.ts` is deliberately left untouched, so
 * desktop cursor behaviour is byte-for-byte unchanged.
 *
 * Mutable singleton (NOT React state) so the R3F `useFrame` reads the live value
 * each frame without re-rendering — mirrors `lib/pointer` + `lib/warp`. The
 * `deviceorientation` handler only writes a couple of numbers; all the work the
 * bust does happens in its existing frame loop.
 */

// Tunables — degrees / unitless, safe to live-tweak.
const RANGE_DEG = 30; // tilt this many degrees from the rest pose → full ±1
const SMOOTH = 0.15; // EMA low-pass per event (0..1; lower = smoother / laggier)
const FLICK_RATE_DEG_S = 300; // angular speed (deg/s) that counts as a deliberate flick
const FLICK_COOLDOWN_MS = 1500; // min gap between flick fires (debounce)
const INVERT_PITCH = true; // flip if tilting the phone toward you should look DOWN

// Smoothed, normalised gaze (−1..1, y up) — same shape/units as getPointer().
const tilt = { x: 0, y: 0 };

let attached = false;
// Rest pose is captured from however the phone is first held, so tilt is
// relative (self-centring) regardless of grip / starting angle.
let baseGamma: number | null = null;
let baseBeta: number | null = null;
let lastGamma = 0;
let lastBeta = 0;
let lastT = 0;
let lastFlick = 0;

type FlickCb = () => void;
const flickSubs = new Set<FlickCb>();

/** Subscribe to deliberate tilt-flick gestures (the mobile equivalent of the
 *  desktop face-screen button click). Returns an unsubscribe fn. */
export function onTiltFlick(cb: FlickCb): () => void {
  flickSubs.add(cb);
  return () => {
    flickSubs.delete(cb);
  };
}

/** Live smoothed gaze. Returns the SAME object every call (no per-frame alloc). */
export function getTilt(): { x: number; y: number } {
  return tilt;
}

function clamp1(v: number): number {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}

function onOrientation(e: DeviceOrientationEvent): void {
  const g = e.gamma; // −90..90  (left/right)
  const b = e.beta; // −180..180 (front/back)
  if (g == null && b == null) return; // device reported no usable data

  if (baseGamma === null) baseGamma = g ?? 0;
  if (baseBeta === null) baseBeta = b ?? 0;

  const gv = (g ?? baseGamma) - baseGamma;
  const bv = (b ?? baseBeta) - baseBeta;

  const xTarget = clamp1(gv / RANGE_DEG);
  let yTarget = clamp1(bv / RANGE_DEG);
  if (INVERT_PITCH) yTarget = -yTarget;

  // Low-pass (EMA) — cheap, kills sensor jitter; ChromeBust eases further on top.
  tilt.x += (xTarget - tilt.x) * SMOOTH;
  tilt.y += (yTarget - tilt.y) * SMOOTH;

  // Deliberate-flick detection: high RAW angular speed on either axis, debounced
  // so gentle movement never fires and one flick fires exactly once.
  const now = e.timeStamp || (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (lastT) {
    const dt = (now - lastT) / 1000;
    if (dt > 0) {
      const rate =
        Math.max(
          Math.abs((g ?? lastGamma) - lastGamma),
          Math.abs((b ?? lastBeta) - lastBeta),
        ) / dt;
      if (rate > FLICK_RATE_DEG_S && now - lastFlick > FLICK_COOLDOWN_MS) {
        lastFlick = now;
        flickSubs.forEach((cb) => cb());
      }
    }
  }
  lastGamma = g ?? lastGamma;
  lastBeta = b ?? lastBeta;
  lastT = now;
}

/** Attach the orientation listener (idempotent). Android / non-gated browsers
 *  call this directly; iOS reaches it only after a granted permission. */
export function startTilt(): void {
  if (attached || typeof window === 'undefined') return;
  // Defensive: never drive motion under reduced-motion. The orb tap that reaches
  // here is already gated off in that case, this just double-locks the rule.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  window.addEventListener('deviceorientation', onOrientation, { passive: true });
  attached = true;
}

/** Remove the listener (unmount cleanup). No-op if never attached. */
export function stopTilt(): void {
  if (!attached || typeof window === 'undefined') return;
  window.removeEventListener('deviceorientation', onOrientation);
  attached = false;
}

/**
 * Request motion access + start listening. MUST be called from a user gesture —
 * iOS 13+ gates `DeviceOrientationEvent.requestPermission()` behind one (we wire
 * it to the orb tap). On Android / other browsers there is no requestPermission,
 * so we just attach. Denial / unsupported / error degrade SILENTLY → getTilt()
 * stays {0,0} and the bust falls back to its existing idle drift. No exceptions,
 * no console noise.
 */
export async function requestTiltPermission(): Promise<void> {
  if (typeof window === 'undefined') return;
  const DOE = window.DeviceOrientationEvent as
    | (typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      })
    | undefined;
  if (!DOE) return; // no sensor API at all → idle drift
  try {
    if (typeof DOE.requestPermission === 'function') {
      const res = await DOE.requestPermission();
      if (res === 'granted') startTilt();
    } else {
      startTilt(); // Android / non-gated browsers
    }
  } catch {
    // denied / unsupported — stay calm, idle drift takes over
  }
}
