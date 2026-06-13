'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getDive } from '@/lib/warp';
import { getPointer } from '@/lib/pointer';
import { getPulse } from '@/lib/pulse';
import { getWorld } from '@/lib/world';
import { isRevealStarted, onReveal } from '@/lib/reveal';

/**
 * The Core (Layer ②) — an AI-themed focal object that lives in the dark CENTRE
 * of the tunnel void and NEVER reads as a static blob.
 *
 * It is a high-subdivision icosahedron displaced in a custom vertex shader by
 * domain-warped fractal noise. Two animated controls do the work:
 *   • uFlow  — a constant slow churn so the surface is always fluid/in-motion;
 *   • uChaos — blends the displacement from smooth (rounded) toward RIDGED
 *              high-frequency noise, which crystallises the form into hard
 *              angular facets/spikes, then melts back. Sweeping uChaos over
 *              time (+ cursor + warp later) = "warping into random sharp shapes,
 *              fluid in motion," never settling on one silhouette.
 *
 * Look: a custom ShaderMaterial (the sanctioned fallback to drei
 * MeshTransmissionMaterial, whose transmission FBO fights a custom-displaced
 * vertex shader). The body is translucent so the tunnel particles stream THROUGH
 * it; an iridescent Fresnel rim + faux studio glints give the holographic-glass,
 * "expensive" read. A small emissive inner mesh pulses as the "mind" — it is the
 * bloom hotspot and (Step 4) the god-rays light source; its ref is exposed via
 * `sunRef`.
 *
 * Welcome-only: `welcomeActive` eases the whole group's scale/opacity to 0 on
 * the inner pages; the tunnel stays site-wide. All motion is GPU/vertex — no
 * per-frame CPU geometry work. Mounted only inside the gated TunnelCanvas, so it
 * inherits the lg+/WebGL/reduced-motion/post-reveal fallbacks for free.
 */

// ── Bold tuning constants ────────────────────────────────────────────────────
// Set BACK into the tunnel's empty central tube (the particle distribution is
// hollow — nothing inside ~2.3 world-radius of the axis), so the Core sits
// INSIDE the void with particles streaming past it, rather than transposed in
// front of it. Kept on-axis and sized to stay within that empty tube.
const POSITION: [number, number, number] = [0.0, 0.0, -4.2];
const RADIUS = 1.2;
const BASE_SCALE = 0.42; // overall size — small + set deep = reads as far away
const DETAIL = 5; // icosahedron subdivisions → 10,242 verts (smooth morph)
const DISP_AMP = 0.42; // displacement amplitude
const NOISE_FREQ = 1.15; // base spatial frequency of the morph
const FLOW_SPEED = 0.18; // churn speed
const CHAOS_SPEED = 0.13; // how fast it breathes between smooth ↔ sharp
const ROT_SPEED = 0.08; // idle rotation

const COLOR_A = new THREE.Color('#1f3a7a'); // deep indigo body
const COLOR_B = new THREE.Color('#7fd4ff'); // cool cyan rim

// Ashima 3D simplex noise (GLSL) — public domain. Used for the morph + ridges.
const SIMPLEX = /* glsl */ `
  vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  // Fractal Brownian motion (smooth) and a ridged variant (sharp crystalline).
  float fbm(vec3 p){
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 4; i++){ s += a * snoise(p); p *= 2.02; a *= 0.5; }
    return s;
  }
  float ridged(vec3 p){
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 4; i++){ s += a * (1.0 - abs(snoise(p))); p *= 2.13; a *= 0.5; }
    return s - 0.6;
  }
`;

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uChaos;
  uniform float uAmp;
  uniform float uFreq;
  uniform float uWorld;   // 0 crystal … 1 black ferrofluid
  uniform vec3 uMagnet;   // object-space "magnet" direction (from the cursor)
  varying float vFres;
  varying float vDisp;
  varying float vSpike;
  varying vec3 vView;
  ${SIMPLEX}
  void main(){
    vec3 pos = position;
    // Domain-warped sample point, drifting through time → the form is alive.
    vec3 q = pos * uFreq + vec3(0.0, 0.0, uTime);
    q += 0.4 * vec3(snoise(q + 11.0), snoise(q + 23.0), snoise(q + 37.0));
    float smoothD = fbm(q);
    float sharpD  = ridged(q * 1.6);
    float disp = mix(smoothD, sharpD, uChaos);

    // Ferrofluid spikes (white world): faces pointing toward the magnet (cursor)
    // pull out into sharp peaks, like iron sand following a magnet. The spike
    // term sharpens with a high power and grows with uWorld.
    float align = max(dot(normalize(normal), uMagnet), 0.0);
    float spike = pow(align, 5.0);
    vSpike = spike;
    disp += spike * uWorld * 1.1;

    pos += normal * disp * uAmp;
    vDisp = disp;

    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vec3 nW = normalize(mat3(modelMatrix) * normal);
    vec3 viewDir = normalize(cameraPosition - wp.xyz);
    vView = viewDir;
    vFres = pow(1.0 - max(dot(viewDir, nW), 0.0), 2.4);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uIgnite;
  uniform float uWorld;    // 0 crystal … 1 black ferrofluid
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vFres;
  varying float vDisp;
  varying float vSpike;
  varying vec3 vView;
  void main(){
    // Iridescent shimmer keyed off the morph displacement + fresnel + time, so
    // the sharp facets catch shifting cool colour as the form churns.
    float t = vFres + vDisp * 0.6 + uTime * 0.06;
    vec3 irid = 0.5 + 0.5 * cos(6.2831 * (t + vec3(0.0, 0.33, 0.66)));
    vec3 col = mix(uColorA, uColorB, vFres);
    col = mix(col, irid, 0.45);

    // Faux studio glints (two fixed key directions) for the "glass" read without
    // real lights (the custom shader is unlit).
    float g1 = pow(max(dot(normalize(vView), normalize(vec3( 0.6, 0.7, 0.4))), 0.0), 6.0);
    float g2 = pow(max(dot(normalize(vView), normalize(vec3(-0.5, 0.3, 0.6))), 0.0), 10.0);
    col += (g1 * 0.6 + g2 * 0.4);

    // Interior haze so the body GLOWS against the near-black void instead of
    // disappearing — the form must read as a luminous object, not a dark blob.
    float interior = 1.0 - vFres;            // bright at centre, fades to rim
    col += interior * 0.22 * uColorB;

    col += vFres * 1.6;                       // bright rim (cyan→white)
    col += uIgnite * vec3(0.55, 0.8, 1.1);    // warp flare

    // ---- White world: matte BLACK ferrofluid -------------------------------
    // A near-black body that reads on the white page via a soft dark rim, a
    // crisp white spec glint on the facets, and brightening spike tips (the
    // iron-sand peaks catch the light). High contrast against white.
    vec3 ferro = vec3(0.015, 0.02, 0.035);
    ferro += pow(vFres, 2.5) * vec3(0.06, 0.07, 0.10);     // faint dark rim
    ferro += g2 * 0.7;                                      // crisp white glint
    ferro += pow(vSpike, 1.5) * 0.25;                       // bright spike tips
    col = mix(col, ferro, uWorld);

    // Translucent luminous glass (dark world) → opaque solid (white world).
    float glassA = clamp(
      uOpacity * (0.34 + vFres * 0.85 + interior * 0.12 + uIgnite * 0.45),
      0.0, 1.0);
    float alpha = mix(glassA, uOpacity, uWorld);
    if (alpha <= 0.002) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

type QuantumCoreProps = {
  /** True only while the Welcome panel is active; eases the Core out otherwise. */
  welcomeActive: boolean;
  /**
   * Reports the emissive inner mesh (the god-rays sun) up to the canvas once it
   * exists, so PostFX can build the GodRays effect with a real source. Lifted to
   * state (not a ref) so the EffectComposer rebuilds when the sun appears.
   */
  onSunReady?: (mesh: THREE.Mesh | null) => void;
};

export function QuantumCore({ welcomeActive, onSunReady }: QuantumCoreProps) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const present = useRef(0); // eased 0→1 Welcome presence
  const revealed = useRef(isRevealStarted());

  const geometry = useMemo(
    () => new THREE.IcosahedronGeometry(RADIUS, DETAIL),
    [],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uChaos: { value: 0.3 },
          uAmp: { value: DISP_AMP },
          uFreq: { value: NOISE_FREQ },
          uOpacity: { value: 0 },
          uIgnite: { value: 0 },
          uWorld: { value: 0 },
          uMagnet: { value: new THREE.Vector3(0, 0, 1) },
          uColorA: { value: COLOR_A },
          uColorB: { value: COLOR_B },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [],
  );

  // Bright emissive material for the inner "mind" — values >1 so it blooms hard
  // and reads as a god-rays source. Built as a real THREE.Color (R3F's array
  // color shorthand can't carry >1 reliably).
  const innerMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.7, 0.92, 1.25),
        toneMapped: false,
      }),
    [],
  );

  // Latched reveal so the Core "boots up" only after the preloader clears.
  useEffect(() => {
    if (revealed.current) return;
    return onReveal(() => {
      revealed.current = true;
    });
  }, []);

  // Hand the inner emissive mesh up to PostFX for god-rays once it's mounted.
  useEffect(() => {
    onSunReady?.(innerRef.current);
    return () => onSunReady?.(null);
  }, [onSunReady]);

  // Dispose GPU resources (created outside JSX) on unmount.
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      innerMaterial.dispose();
    };
  }, [geometry, material, innerMaterial]);

  useFrame((_s, delta) => {
    const dt = Math.min(delta, 0.05);
    const u = material.uniforms;
    u.uTime.value += dt * FLOW_SPEED * 10.0;

    // Warp ignite — calm at rest on every page; flares mid-transition. A CLICK
    // anywhere adds its own decaying flare so the Core visibly reacts on click.
    const dive = Math.min(1, Math.max(0, getDive()));
    const warp = Math.sin(dive * Math.PI);
    const click = getPulse();
    const flare = Math.max(warp, click);
    u.uIgnite.value = flare;

    // World morph: 0 = crystal (dark), 1 = black ferrofluid (white world).
    const w = getWorld();
    u.uWorld.value = w;

    // Idle morph breathes between smooth and sharp so it never rests on a blob;
    // the cursor (proximity to centre) and clicks make it churn/spike harder.
    const p = getPointer();
    const breathe = 0.5 + 0.5 * Math.sin(u.uTime.value * CHAOS_SPEED);
    const baseChaos = Math.min(
      1,
      0.18 + breathe * 0.58 + p.prox * 0.22 + click * 0.4,
    );
    // Ferrofluid is sharper/spikier — bias chaos toward ridged in the white world.
    u.uChaos.value = baseChaos * (1 - w) + 0.95 * w;
    // Spikes swell during the dive / on click / in the white world.
    u.uAmp.value = DISP_AMP * (1 + warp * 0.9 + click * 0.7 + w * 0.3);
    // The "magnet" the ferrofluid spikes toward = the cursor direction.
    (u.uMagnet.value as THREE.Vector3).set(p.x, p.y, 0.6).normalize();

    // Welcome-only presence eases in after reveal, out on inner pages.
    const target = welcomeActive && revealed.current ? 1 : 0;
    present.current += (target - present.current) * Math.min(1, dt * 2.2);
    u.uOpacity.value = present.current;

    const g = groupRef.current;
    if (g) {
      g.rotation.y += dt * ROT_SPEED * (1 + click * 8); // spin kicks on click
      // Lean toward the cursor (x/z) over a slow idle bob — feels handled.
      const leanX = Math.sin(u.uTime.value * 0.05) * 0.1 - p.y * 0.3;
      const leanZ = p.x * 0.2;
      const lk = Math.min(1, dt * 2);
      g.rotation.x += (leanX - g.rotation.x) * lk;
      g.rotation.z += (leanZ - g.rotation.z) * lk;
      // BASE_SCALE shrinks the whole orb (proportions intact); eases in on
      // reveal and pops on click.
      const s = BASE_SCALE * (0.6 + present.current * 0.4) * (1 + click * 0.14);
      g.scale.setScalar(s);
      g.visible = present.current > 0.003;
    }

    // Inner "mind" pulse → bloom hotspot + god-rays source. Shrinks away in the
    // white world (the ferrofluid is black — no inner light / god-rays there).
    const inner = innerRef.current;
    if (inner) {
      const bob = 0.85 + 0.15 * Math.sin(u.uTime.value * 0.9);
      inner.scale.setScalar((0.9 + flare * 0.8) * bob * (1 - w));
      inner.visible = w < 0.98;
    }
  });

  return (
    <group ref={groupRef} position={POSITION}>
      <mesh geometry={geometry} material={material} renderOrder={2} />
      {/* Emissive inner "mind" — bloom hotspot + (Step 4) god-rays sun. */}
      <mesh ref={innerRef} material={innerMaterial} renderOrder={3}>
        <icosahedronGeometry args={[0.34, 2]} />
      </mesh>
    </group>
  );
}
