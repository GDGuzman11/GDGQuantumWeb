'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { getDive } from '@/lib/warp';

/**
 * Particle tunnel + Projects scene forming — the heavy three.js/R3F chunk.
 *
 * Default-exported and ONLY ever reached via `dynamic(() => import(...), {
 * ssr:false })` from TunnelStage, so three.js stays in its own async chunk OUT
 * of the route's First Load JS and the <h1> remains the LCP element.
 *
 * Base effect: a GPU starfield-tunnel — points on the walls of a cylinder around
 * −Z, flowing toward the camera and recycling (mod over depth) for an endless
 * rush. ALL motion lives in the shaders (no per-frame CPU sim).
 *
 * Projects forming (NEW): the SAME particles do the forming. When Projects is the
 * active panel, `uForm` tweens 0→1 and every particle leaves the tunnel flow,
 * scatters across the viewport (flashing, mid-morph), then assembles into a raw,
 * obliquely-tilted spiral galaxy offset to the RIGHT (so it never sits under the
 * left-aligned Projects copy). Leaving Projects tweens it back to 0 and the
 * particles rejoin the tunnel. Clicking the galaxy re-scatters → reforms. This
 * is one continuous particle system, not a separate overlay.
 *
 * Colours here are 3D shader parameters (artwork), NOT the UI design tokens.
 */

// LIVE-TUNABLE. COUNT was raised from 1900 so the galaxy reads as a dense disk;
// the per-particle size + resting alpha below were lowered to keep the plain
// tunnel (Welcome/Contact) close to the previously-approved density.
const COUNT = 7000;
const DEPTH = 16; // tunnel length along z
const RADIUS = 5.4; // tunnel wall radius
const GAL_RADIUS = 3.4; // galaxy disk radius (in its own plane)

// Galaxy placement (LIVE-TUNABLE): oblique inclination + roll (matches the raw
// low-angle reference, not face-on) and a rightward offset clear of the copy.
const GAL_INCL = 1.16; // ~66° disk tip
const GAL_ROLL = 0.28;
const GAL_OFFSET = new THREE.Vector3(2.7, 0.35, 0);

/** Cheap gaussian-ish noise in roughly [-1, 1]. */
function randn(): number {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

function buildGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array(COUNT * 3); // tunnel cylinder positions
  const aRand = new Float32Array(COUNT); // per-particle random
  const aGroup = new Float32Array(COUNT); // spatial cluster id → sparks
  const aGalaxy = new Float32Array(COUNT * 3); // galaxy target (own XY plane)
  const aGalT = new Float32Array(COUNT); // 0 core → 1 rim (galaxy colouring)

  for (let i = 0; i < COUNT; i++) {
    // --- Tunnel cylinder position ---
    const angle = Math.random() * Math.PI * 2;
    const r = RADIUS * Math.sqrt(Math.random() * 0.82 + 0.18);
    const z = -Math.random() * DEPTH;
    positions[i * 3 + 0] = Math.cos(angle) * r;
    positions[i * 3 + 1] = Math.sin(angle) * r;
    positions[i * 3 + 2] = z;
    aRand[i] = Math.random();
    const sector = Math.floor((angle / (Math.PI * 2)) * 24);
    const slice = Math.min(9, Math.floor((-z / DEPTH) * 10));
    aGroup[i] = sector + slice * 24;

    // --- Galaxy target (raw flocculent 2-arm spiral + bright bulge) ---
    let gx: number, gy: number, gz: number, gt: number;
    if (Math.random() < 0.22) {
      // Central bulge (bright core under additive blending).
      const br = 0.62 * Math.sqrt(Math.random());
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      gx = br * Math.sin(ph) * Math.cos(th);
      gy = br * Math.sin(ph) * Math.sin(th) * 0.9;
      gz = br * Math.cos(ph) * 0.5;
      gt = 0.06 + (br / 0.62) * 0.12;
    } else {
      const tt = Math.random();
      const rr = GAL_RADIUS * Math.pow(tt, 0.6);
      // ~40% sit BETWEEN arms (flocculent / raw), the rest hug 2 arms.
      const floc = Math.random() < 0.4;
      const armAngle = (i % 2) * Math.PI;
      const spread = floc ? 1.7 : 0.22 * (1 - rr / GAL_RADIUS) + 0.07;
      const ang =
        (floc ? Math.random() * Math.PI * 2 : armAngle + rr * 3.0) +
        randn() * spread;
      gx = Math.cos(ang) * rr;
      gy = Math.sin(ang) * rr;
      gz = randn() * (0.16 * Math.exp(-rr * 0.8) + 0.03); // thin disk
      gt = Math.min(1, rr / GAL_RADIUS);
    }
    aGalaxy[i * 3 + 0] = gx;
    aGalaxy[i * 3 + 1] = gy;
    aGalaxy[i * 3 + 2] = gz;
    aGalT[i] = gt;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(aRand, 1));
  geo.setAttribute('aGroup', new THREE.BufferAttribute(aGroup, 1));
  geo.setAttribute('aGalaxy', new THREE.BufferAttribute(aGalaxy, 3));
  geo.setAttribute('aGalT', new THREE.BufferAttribute(aGalT, 1));
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
  uniform float uForm;        // 0 tunnel → 1 galaxy
  uniform float uSpin;        // galaxy plane rotation
  uniform mat3 uGalaxyRot;    // oblique orientation (+ proximity tilt)
  uniform vec3 uGalaxyOffset; // rightward placement
  attribute float aRand;
  attribute float aGroup;
  attribute vec3 aGalaxy;
  attribute float aGalT;
  varying float vRand;
  varying float vGroup;
  varying float vFade;
  varying float vWarp;
  varying float vForm;
  varying float vGalT;
  varying vec2 vDir;

  void main() {
    vRand = aRand;
    vGroup = aGroup;
    vWarp = uWarp;
    vForm = uForm;
    vGalT = aGalT;

    // --- Tunnel position (unchanged flow; see notes below) ---
    vec3 pos = position;
    float baseRate = 0.5 + aRand * 0.55;
    float zc = mod(pos.z + baseRate * uTime + uFlow, uDepth);
    vec3 pt = vec3(pos.x, pos.y, zc - uDepth * 0.92);
    float t = clamp((-pt.z) / uDepth, 0.0, 1.0);
    pt.x += uMouse.x * 0.55 * (0.3 + t) * (1.0 - uWarp);
    pt.y += uMouse.y * 0.55 * (0.3 + t) * (1.0 - uWarp);

    // --- Galaxy target: spin in plane → orient oblique → offset right ---
    float cs = cos(uSpin), sn = sin(uSpin);
    vec3 gp = vec3(aGalaxy.x * cs - aGalaxy.y * sn,
                   aGalaxy.x * sn + aGalaxy.y * cs,
                   aGalaxy.z);
    gp = uGalaxyRot * gp + uGalaxyOffset;

    // --- Scatter (mid-morph): pseudo-random fill around the galaxy centre ---
    vec3 sdir = normalize(vec3(fract(aRand * 97.0) - 0.5,
                               fract(aRand * 57.0) - 0.5,
                               fract(aRand * 231.0) - 0.5) + 0.0001);
    vec3 scat = uGalaxyOffset + sdir * (2.5 + aRand * 3.5);

    // tunnel → scatter (first 45%) → galaxy (last 55%)
    float a = smoothstep(0.0, 0.45, uForm);
    float b = smoothstep(0.45, 1.0, uForm);
    vec3 P = mix(mix(pt, scat, a), gp, b);

    vec4 mv = modelViewMatrix * vec4(P, 1.0);
    gl_Position = projectionMatrix * mv;
    vDir = gl_Position.xy / max(abs(gl_Position.w), 0.0001);

    float dist = max(-mv.z, 0.1);
    float tunnelSize = (22.0 + aRand * 40.0) * uPixelRatio / dist;
    tunnelSize *= 1.0 + uWarp * 1.6;
    float galSize = (9.0 + aRand * 22.0) * uPixelRatio / dist;
    gl_PointSize = clamp(mix(tunnelSize, galSize, b), 0.0, 120.0);

    // Tunnel fade in/out; once scattered/formed the particle is fully visible.
    float tunnelFade =
      (1.0 - smoothstep(0.80, 0.92, t)) * smoothstep(0.06, 0.16, t);
    vFade = mix(tunnelFade, 1.0, a);
  }
`;

const FRAG = /* glsl */ `
  // highp must match the vertex stage for shared uniforms (uTime/uProximity) or
  // program validation fails and nothing draws.
  precision highp float;
  uniform float uTime;
  uniform float uProximity;
  varying float vRand;
  varying float vGroup;
  varying float vFade;
  varying float vWarp;
  varying float vForm;
  varying float vGalT;
  varying vec2 vDir;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    // Light-speed streaks (tunnel warp): round dot at rest → radial streak.
    vec2 cc = gl_PointCoord - 0.5;
    vec2 dir = normalize(vec2(vDir.x, -vDir.y) + vec2(0.00001));
    float along = dot(cc, dir);
    float perp = dot(cc, vec2(-dir.y, dir.x));
    float stretch = 1.0 + vWarp * 5.0;
    float d = length(vec2(along / stretch, perp));
    if (d > 0.5) discard;

    float glow = pow(smoothstep(0.5, 0.0, d), 1.6);
    float tw = 0.6 + 0.4 * sin(uTime * (1.4 + vRand * 3.0) + vRand * 6.2831);

    // Cinematic colour drift (tunnel): cool palette, scattered per particle.
    float hueT = uTime * (0.04 + vRand * 0.10) + vRand;
    vec3 palette = 0.55 + 0.45 * cos(6.2831 * (hueT + vec3(0.00, 0.18, 0.42)));
    vec3 baseCol = mix(vec3(0.45, 0.62, 1.00), palette, 0.5);

    // Occasional coordinated spark between neighbours (tunnel).
    float phase = fract(vGroup * 0.137);
    float st = uTime * 0.6 + phase;
    float roll = hash(vGroup * 12.9898 + floor(st) * 78.233);
    float spark = step(0.90, roll) * exp(-fract(st) * 7.0);
    vec3 sparkCol = vec3(0.92, 0.96, 1.00);
    vec3 tunnelCol = mix(baseCol, sparkCol, clamp(spark + vWarp * 0.6, 0.0, 1.0));

    // Galaxy colouring: white core → blue → purple rim (matches the reference).
    vec3 gCore = vec3(1.00, 0.97, 0.95);
    vec3 gMid = vec3(0.50, 0.62, 1.00);
    vec3 gRim = vec3(0.78, 0.45, 0.96);
    vec3 galCol = mix(gCore, mix(gMid, gRim, vGalT), smoothstep(0.05, 1.0, vGalT));

    vec3 col = mix(tunnelCol, galCol, vForm);

    // Flash/blink burst at the scatter midpoint (both entering and leaving).
    float flash = exp(-pow((vForm - 0.45) * 4.5, 2.0));
    float flick = 0.4 + 0.6 * sin(uTime * (16.0 + vRand * 28.0) + vRand * 40.0);
    col = mix(col, vec3(1.0), flash * 0.5);

    float alpha =
      glow * vFade *
      mix(tw, tw * flick, flash * 0.8) *
      (0.42 + uProximity * 0.4 + spark * 0.9 + vWarp * 0.8 + flash * 1.2);
    if (alpha <= 0.001) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

function isInteractiveTarget(t: EventTarget | null): boolean {
  return Boolean(
    t instanceof Element &&
      t.closest(
        'a,button,input,textarea,select,label,[role="button"],[contenteditable]',
      ),
  );
}

type TunnelProps = { formActive: boolean };

function Tunnel({ formActive }: TunnelProps) {
  const { gl } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const targetProx = useRef(0);
  const lock = useRef(false);
  const reformTl = useRef<gsap.core.Timeline | null>(null);
  const spin = useRef(0);
  const galRot = useMemo(() => new THREE.Matrix3(), []);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const m4b = useMemo(() => new THREE.Matrix4(), []);
  const formActiveRef = useRef(formActive);
  formActiveRef.current = formActive;

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
          uForm: { value: 0 },
          uSpin: { value: 0 },
          uGalaxyRot: { value: new THREE.Matrix3() },
          uGalaxyOffset: { value: GAL_OFFSET.clone() },
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

  // Canvas is pointer-events-none → read the cursor from the window.
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const onMove = (e: PointerEvent) => {
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = -((e.clientY / window.innerHeight) * 2 - 1);
      mouse.current.x = mx;
      mouse.current.y = my;
      const dist = Math.min(1, Math.hypot(mx, my));
      targetProx.current = 1 - dist;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // Click the galaxy (ignoring real UI) → re-scatter then reform.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!formActiveRef.current || lock.current) return;
      if (material.uniforms.uForm.value < 0.9) return;
      if (isInteractiveTarget(e.target)) return;
      lock.current = true;
      reformTl.current?.kill();
      const tl = gsap.timeline({
        onComplete: () => {
          lock.current = false;
        },
      });
      tl.to(material.uniforms.uForm, {
        value: 0.45,
        duration: 0.7,
        ease: 'power2.in',
      });
      tl.to(material.uniforms.uForm, {
        value: 1,
        duration: 1.5,
        ease: 'power2.out',
      });
      reformTl.current = tl;
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [material]);

  // Tween between tunnel (0) and galaxy (1) as Projects becomes active/inactive.
  useEffect(() => {
    reformTl.current?.kill();
    lock.current = false;
    gsap.to(material.uniforms.uForm, {
      value: formActive ? 1 : 0,
      duration: 1.9,
      ease: 'power2.inOut',
      overwrite: true,
    });
  }, [formActive, material]);

  useEffect(() => {
    return () => {
      reformTl.current?.kill();
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_state, delta) => {
    const u = material.uniforms;
    const dt = Math.min(delta, 0.05);
    u.uTime.value += dt;
    u.uPixelRatio.value = gl.getPixelRatio();

    const mLerp = Math.min(1, dt * 4);
    u.uMouse.value.x += (mouse.current.x - u.uMouse.value.x) * mLerp;
    u.uMouse.value.y += (mouse.current.y - u.uMouse.value.y) * mLerp;
    u.uProximity.value +=
      (targetProx.current - u.uProximity.value) * Math.min(1, dt * 2.5);

    // Tunnel warp pulse (calm at rest, light-speed mid-transition).
    const dive = Math.min(1, Math.max(0, getDive()));
    const warp = Math.sin(dive * Math.PI);
    u.uWarp.value = warp;
    const flowRate = u.uProximity.value * 0.3 + warp * 16.0;
    let flow = u.uFlow.value + flowRate * dt;
    flow %= DEPTH;
    u.uFlow.value = flow;

    // Galaxy spin (only once mostly formed) + oblique orientation w/ cursor tilt.
    const form = u.uForm.value as number;
    spin.current += dt * 0.07 * Math.max(0, (form - 0.3) / 0.7);
    u.uSpin.value = spin.current;
    m4.makeRotationX(GAL_INCL + mouse.current.y * 0.22);
    m4b.makeRotationZ(GAL_ROLL + mouse.current.x * 0.22);
    m4.multiply(m4b);
    galRot.setFromMatrix4(m4);
    (u.uGalaxyRot.value as THREE.Matrix3).copy(galRot);
  });

  return (
    <points geometry={geometry} material={material} frustumCulled={false} />
  );
}

type TunnelCanvasProps = {
  /** Keep the render loop running (the tunnel is site-wide and always on). */
  active: boolean;
  /** Projects is the active panel → particles form the galaxy. */
  formActive?: boolean;
};

export default function TunnelCanvas({
  active,
  formActive = false,
}: TunnelCanvasProps) {
  return (
    <Canvas
      className="!absolute !inset-0"
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 70, near: 0.1, far: 40 }}
      frameloop={active ? 'always' : 'never'}
    >
      <Tunnel formActive={formActive} />
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
