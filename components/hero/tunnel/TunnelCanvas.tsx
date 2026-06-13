'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { getDive } from '@/lib/warp';
import { setPointer, getPointer } from '@/lib/pointer';
import { firePulse } from '@/lib/pulse';
import { getWorld } from '@/lib/world';
import { PostFX } from './PostFX';
import { QuantumCore } from './QuantumCore';
import { SnakeNeurons } from './SnakeNeurons';

/**
 * Particle tunnel — the heavy three.js/R3F chunk (Phase 3R).
 *
 * Default-exported and ONLY ever reached via `dynamic(() => import(...), {
 * ssr:false })` from TunnelStage, so three.js stays in its own async chunk OUT
 * of the route's First Load JS and the <h1> remains the LCP element.
 *
 * The effect is a GPU starfield-tunnel: ~1400 points distributed on the walls of
 * a cylinder around −Z, flowing toward the camera and recycling (mod over the
 * tunnel depth) for an endless rush. ALL motion lives in the vertex/fragment
 * shaders (no per-frame CPU sim): size attenuates with distance, points fade in
 * far / out as they pass the camera, twinkle, and glow via additive blending.
 * The canvas is pointer-events-none, so cursor drift + "proximity energy" come
 * from a window pointer listener (closeness to the tunnel mouth → faster flow,
 * brighter, warmer), damped — calm by default, never violent. Disabled on
 * coarse/touch pointers.
 *
 * Colours here are 3D shader parameters (artwork), NOT the UI design tokens.
 */

// LIVE-TUNABLE (Phase 3R): density / flow speed / brightness were nudged up so
// the tunnel clearly reads as motion at rest without overdoing it. Adjust COUNT
// here and the `speed` (VERT) + resting-alpha (FRAG) constants below to taste.
const COUNT = 1900;
const DEPTH = 16; // tunnel length along z
const RADIUS = 5.4; // tunnel wall radius

function buildGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array(COUNT * 3);
  const aRand = new Float32Array(COUNT); // per-particle random: size/twinkle/colour phase
  const aGroup = new Float32Array(COUNT); // spatial cluster id → coordinated sparks
  for (let i = 0; i < COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    // sqrt keeps the ring hollow-ish (more points toward the wall than centre).
    const r = RADIUS * Math.sqrt(Math.random() * 0.82 + 0.18);
    const z = -Math.random() * DEPTH;
    positions[i * 3 + 0] = Math.cos(angle) * r;
    positions[i * 3 + 1] = Math.sin(angle) * r;
    positions[i * 3 + 2] = z; // spread along the depth
    aRand[i] = Math.random();
    // Bin particles by angular sector × depth slice so the ones that spark
    // together are physical NEIGHBOURS (a localised spark, not scattered
    // flashes). ~24×10 = 240 small clusters across COUNT points.
    const sector = Math.floor((angle / (Math.PI * 2)) * 24);
    const slice = Math.min(9, Math.floor((-z / DEPTH) * 10));
    aGroup[i] = sector + slice * 24;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(aRand, 1));
  geo.setAttribute('aGroup', new THREE.BufferAttribute(aGroup, 1));
  return geo;
}

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uFlow;       // CPU-integrated time-VARYING flow (proximity + warp)
  uniform float uWarp;       // 0..1 dive amount → light-speed (size/streak/glare)
  uniform float uProximity;  // brightness only (speed lives in uFlow)
  uniform vec2 uMouse;
  uniform float uDepth;
  uniform float uPixelRatio;
  attribute float aRand;
  attribute float aGroup;
  varying float vRand;
  varying float vGroup;
  varying float vFade;
  varying float vWarp;
  varying vec2 vDir;

  void main() {
    vRand = aRand;
    vGroup = aGroup;
    vWarp = uWarp;
    vec3 p = position;

    // Flow toward the camera and recycle. The per-particle base rate is CONSTANT
    // (it never changes, so it can't creep up over time) and is advanced by
    // uTime. Everything time-VARYING — the subtle cursor-proximity lift and the
    // dive warp — is pre-integrated on the CPU into uFlow and simply ADDED here,
    // so changing the speed never teleports a particle (multiplying a changing
    // speed by absolute time would). uFlow is pre-wrapped to uDepth, so the mod
    // stays seamless. Slow at rest; light-speed during the dive.
    float baseRate = 0.5 + aRand * 0.55;
    float z = mod(p.z + baseRate * uTime + uFlow, uDepth);   // 0..uDepth
    p.z = z - uDepth * 0.92;                       // far (−) → just past camera (+)

    // t: 1 = far end, 0 = at the camera plane.
    float t = clamp((-p.z) / uDepth, 0.0, 1.0);

    // Parallax drift, stronger on the far field. Eased OUT as we warp so the
    // dive reads as a straight plunge down the tunnel, not a sideways drift.
    p.x += uMouse.x * 0.55 * (0.3 + t) * (1.0 - uWarp);
    p.y += uMouse.y * 0.55 * (0.3 + t) * (1.0 - uWarp);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // Screen-space radial direction (from centre) → the axis the light-speed
    // streaks elongate along in the fragment shader.
    vDir = gl_Position.xy / max(abs(gl_Position.w), 0.0001);

    float dist = max(-mv.z, 0.1);
    float size = (38.0 + aRand * 64.0) * uPixelRatio / dist;
    size *= 1.0 + uWarp * 1.6;                      // points swell as we warp
    gl_PointSize = clamp(size, 0.0, 120.0);

    // Fade in just after spawn (t≈0.92) and out as it passes the camera (t≈0.1).
    vFade = (1.0 - smoothstep(0.80, 0.92, t)) * smoothstep(0.06, 0.16, t);
  }
`;

const FRAG = /* glsl */ `
  // Must match the vertex stage's precision for the shared uniform uTime — a
  // mismatch fails program validation ("Precisions of uniform 'uTime' differ
  // between VERTEX and FRAGMENT shaders") and the tunnel draws nothing. The
  // vertex shader uses the default highp, so we declare highp here too.
  precision highp float;
  uniform float uTime;
  uniform float uProximity;
  uniform float uWorld;       // 1 = white world → the flow particles fade out
  varying float vRand;
  varying float vGroup;
  varying float vFade;
  varying float vWarp;
  varying vec2 vDir;

  // Cheap hash for the spark lottery (per cluster, per time-epoch).
  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    // ---- Light-speed streaks ----------------------------------------------
    // At rest the sprite is a round dot. As we dive (vWarp→1) it stretches into
    // a streak ALONG the screen-radial direction (vDir) — the classic warp /
    // light-speed look, radiating from the tunnel centre. PointCoord y runs
    // down, so flip vDir.y to match its basis.
    vec2 cc = gl_PointCoord - 0.5;
    vec2 dir = normalize(vec2(vDir.x, -vDir.y) + vec2(0.00001));
    float along = dot(cc, dir);
    float perp = dot(cc, vec2(-dir.y, dir.x));
    float stretch = 1.0 + vWarp * 5.0;               // longer streak as we warp
    float d = length(vec2(along / stretch, perp));
    if (d > 0.5) discard;

    // Sharper sprite: a tighter halo (higher exponent) PLUS a crisp bright
    // centre, so each particle reads as a defined point with only a little glow
    // — not a soft blur.
    float halo = pow(smoothstep(0.5, 0.0, d), 2.6);
    float core = smoothstep(0.16, 0.0, d);
    float glow = halo + core * 0.6;
    float tw = 0.6 + 0.4 * sin(uTime * (1.4 + vRand * 3.0) + vRand * 6.2831);

    // ---- Cinematic colour flashing ----------------------------------------
    // Each particle drifts slowly through a cool cinematic palette (blue →
    // teal → indigo → white), phase-offset by its own random so the colours
    // shimmer scattered across the field rather than all shifting together.
    float hueT = uTime * (0.04 + vRand * 0.10) + vRand;
    vec3 palette = 0.55 + 0.45 * cos(6.2831 * (hueT + vec3(0.00, 0.18, 0.42)));
    vec3 baseCol = mix(vec3(0.45, 0.62, 1.00), palette, 0.5);

    // ---- Occasional coordinated spark -------------------------------------
    // Particles sharing a spatial cluster (vGroup) occasionally light up
    // TOGETHER for a brief instant — a spark between neighbours. Each cluster
    // rolls on its own desynced clock; ~1 in 10 fire per cycle, quick exp decay.
    float phase = fract(vGroup * 0.137);
    float t = uTime * 0.6 + phase;
    float roll = hash(vGroup * 12.9898 + floor(t) * 78.233);
    float spark = step(0.90, roll) * exp(-fract(t) * 7.0);

    vec3 sparkCol = vec3(0.92, 0.96, 1.00);          // hot white-blue flash
    // Warp glares the streaks toward hot white on top of the spark colour.
    vec3 col = mix(baseCol, sparkCol, clamp(spark + vWarp * 0.6, 0.0, 1.0));

    // Resting brightness reads on the dark void; cursor proximity adds a gentle
    // glow, sparks punch above it, and the warp drives the streaks bright as we
    // dive. Proximity affects LIGHT only — speed lives in uFlow.
    float alpha =
      glow * vFade * tw * (0.6 + uProximity * 0.4 + spark * 0.9 + vWarp * 0.8);
    alpha *= (1.0 - uWorld);                          // gone in the white world
    if (alpha <= 0.001) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

function Tunnel() {
  const { gl } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const targetProx = useRef(0);

  const geometry = useMemo(buildGeometry, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uFlow: { value: 0 },
          uWarp: { value: 0 },
          uProximity: { value: 0 },
          uMouse: { value: new THREE.Vector2(0, 0) },
          uDepth: { value: DEPTH },
          uPixelRatio: { value: 1 },
          uWorld: { value: 0 },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );

  // Canvas is pointer-events-none → read the cursor from the window. Closeness
  // to the tunnel mouth (screen centre) raises the proximity energy.
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const onMove = (e: PointerEvent) => {
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = -((e.clientY / window.innerHeight) * 2 - 1);
      mouse.current.x = mx;
      mouse.current.y = my;
      const dist = Math.min(1, Math.hypot(mx, my));
      targetProx.current = 1 - dist;
      // Publish to the shared singleton for the camera rig + Core (Layer ③).
      setPointer(mx, my, 1 - dist);
    };
    // A click anywhere fires a pulse the Core reacts to (canvas is
    // pointer-events-none, so the click also passes through to the page).
    const onDown = () => firePulse();
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
    };
  }, []);

  // Dispose GPU resources on unmount (created outside JSX, so not auto-managed).
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_state, delta) => {
    const u = material.uniforms;
    const dt = Math.min(delta, 0.05); // clamp tab-restore spikes
    u.uTime.value += dt;
    u.uPixelRatio.value = gl.getPixelRatio();
    // Damp mouse + proximity for a smooth, never-jumpy response.
    const mLerp = Math.min(1, dt * 4);
    u.uMouse.value.x += (mouse.current.x - u.uMouse.value.x) * mLerp;
    u.uMouse.value.y += (mouse.current.y - u.uMouse.value.y) * mLerp;
    u.uProximity.value +=
      (targetProx.current - u.uProximity.value) * Math.min(1, dt * 2.5);

    // Dive warp (Phase 3R.2): getDive() is 0 at rest on any panel and ramps 0→1
    // across a transition. The warp is a PULSE — sin() peaks mid-dive and is 0 at
    // BOTH ends — so particles light-speed only THROUGH a transition (every leg)
    // and settle to calm on every page. Consequences: the tunnel is never stuck
    // at light-speed on the inner pages, and never warps on load (dive 0 → warp
    // 0; even a stale dive of 1 → sin(π) ≈ 0).
    const dive = Math.min(1, Math.max(0, getDive()));
    const warp = Math.sin(dive * Math.PI);
    u.uWarp.value = warp;
    u.uWorld.value = getWorld(); // fade the flow particles out in the white world

    // Integrate the time-VARYING flow (proximity lift + warp rush) so a changing
    // speed never teleports particles (see VERT). Kept wrapped to DEPTH so the
    // value stays small/precise and the shader's mod stays seamless on wrap.
    const flowRate = u.uProximity.value * 0.3 + warp * 16.0;
    let flow = u.uFlow.value + flowRate * dt;
    flow %= DEPTH;
    u.uFlow.value = flow;
  });

  return (
    <points geometry={geometry} material={material} frustumCulled={false} />
  );
}

/**
 * Cursor-driven camera parallax (Layer ③) — the whole scene leans toward the
 * pointer so it "follows you," giving the Core depth against the tunnel. Damped
 * and bold but bounded; the lean eases OUT during the warp (mirrors the vertex
 * shader's `(1.0 - uWarp)` parallax fade) so the dive reads as a straight plunge.
 */
function CameraRig() {
  const { camera } = useThree();
  useFrame((_s, delta) => {
    const dt = Math.min(delta, 0.05);
    const p = getPointer();
    const dive = Math.min(1, Math.max(0, getDive()));
    const ease = 1 - Math.sin(dive * Math.PI);
    const tx = p.x * 0.5 * ease;
    const ty = p.y * 0.35 * ease;
    const k = Math.min(1, dt * 2);
    camera.position.x += (tx - camera.position.x) * k;
    camera.position.y += (ty - camera.position.y) * k;
    camera.lookAt(0, 0, -4);
  });
  return null;
}

type TunnelCanvasProps = {
  /** Render only while the Landing backdrop is visible; freezes (frameloop
   *  "never") otherwise so an off-screen tunnel costs no GPU. */
  active: boolean;
  /** True only while the Welcome panel (index 0) is active — gates the Core. */
  welcomeActive: boolean;
};

export default function TunnelCanvas({ active, welcomeActive }: TunnelCanvasProps) {
  // The Core's emissive inner mesh, lifted to state so the EffectComposer
  // rebuilds with a real god-rays source once the Core has mounted.
  const [sun, setSun] = useState<THREE.Mesh | null>(null);

  return (
    <Canvas
      className="!absolute !inset-0"
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 70, near: 0.1, far: 40 }}
      frameloop={active ? 'always' : 'never'}
    >
      <Tunnel />
      <CameraRig />
      <SnakeNeurons />
      <QuantumCore welcomeActive={welcomeActive} onSunReady={setSun} />
      <PostFX sun={sun} />
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
