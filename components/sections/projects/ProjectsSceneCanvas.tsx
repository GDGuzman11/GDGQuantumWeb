'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import {
  PARTICLE_COUNT,
  buildDisperse,
  buildGalaxy,
  buildSeeds,
} from './scene-data';

/**
 * Projects cinematic particle scenes — the heavy three.js/R3F chunk.
 *
 * Default-exported and ONLY ever reached via `dynamic(() => import(...), {
 * ssr:false })` from ProjectsSceneStage, so three.js stays in its own async
 * chunk OUT of the route's First Load JS.
 *
 * Engine: a fixed pool of PARTICLE_COUNT points. Two position buffers — `position`
 * (from) and `aTarget` (to) — are lerped in the vertex shader by `uMorph` (0→1),
 * GSAP-tweened on the CPU once per transition (no per-frame sim). A "scene" is
 * just another target buffer of the same count. This slice ships the procedural
 * galaxy plus the disperse/flash cloud used for the intro and the click re-form;
 * the image-sampled scenes (T-Rex / Vitruvian / android) reuse this contract.
 *
 * Warm gold/amber additive look (deliberate contrast with the cool tunnel you
 * arrive through). Cursor proximity tilts the disk (~±25°) — read from a window
 * listener since the canvas is pointer-events-none. Clicks (ignoring real UI)
 * re-disperse → reform. Colours here are artwork, NOT the UI design tokens.
 */

// LIVE-TUNABLE: point size and the slow disk spin.
const SIZE_BASE = 13.0;
const SIZE_VAR = 22.0;
const SPIN = 0.05; // galaxy plane rotation, rad/s
const BASE_TILT_X = 0.42; // resting 3/4 view
const TILT_RANGE = 0.4; // ±rad added by cursor proximity (~±23°)

const VERT = /* glsl */ `
  uniform float uMorph;
  uniform float uPixelRatio;
  attribute vec3 aTarget;
  attribute float aRand;
  attribute float aColorT;
  varying float vRand;
  varying float vColorT;

  void main() {
    vRand = aRand;
    vColorT = aColorT;
    vec3 p = mix(position, aTarget, uMorph);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = max(-mv.z, 0.1);
    float size = (${SIZE_BASE.toFixed(1)} + aRand * ${SIZE_VAR.toFixed(1)}) * uPixelRatio / dist;
    gl_PointSize = clamp(size, 0.0, 64.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uIntro;   // 0..1 extra flash/blink energy during disperse
  varying float vRand;
  varying float vColorT;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float glow = pow(smoothstep(0.5, 0.0, d), 1.6);

    // Calm twinkle, with a fast nervous flicker mixed in while dispersed.
    float tw = 0.65 + 0.35 * sin(uTime * (1.5 + vRand * 4.0) + vRand * 6.2831);
    float flick = 0.35 + 0.65 * sin(uTime * (14.0 + vRand * 26.0) + vRand * 40.0);
    tw = mix(tw, flick, uIntro * 0.9);

    // Warm gold: bright white-gold core (vColorT→0) → deep amber rim (→1).
    vec3 core = vec3(1.00, 0.93, 0.78);
    vec3 arm = vec3(1.00, 0.60, 0.18);
    vec3 col = mix(core, arm, vColorT);

    float alpha = glow * tw * 0.85;
    if (alpha <= 0.001) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

type SceneProps = { active: boolean };

function isInteractiveTarget(t: EventTarget | null): boolean {
  return Boolean(
    t instanceof Element &&
      t.closest(
        'a,button,input,textarea,select,label,[role="button"],[contenteditable]',
      ),
  );
}

function Scene({ active }: SceneProps) {
  const { gl } = useThree();
  const outer = useRef<THREE.Group>(null); // proximity tilt
  const inner = useRef<THREE.Points>(null); // galaxy plane spin

  const tilt = useRef({ x: 0, y: 0 });
  const lock = useRef(false); // ignore clicks mid-transition
  const tl = useRef<gsap.core.Timeline | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  // Precompute scene buffers once.
  const { galaxyPos, dispersePos, aRand, colorT, geometry, material } =
    useMemo(() => {
      const seeds = buildSeeds(PARTICLE_COUNT);
      const g = buildGalaxy(PARTICLE_COUNT);
      const d = buildDisperse(PARTICLE_COUNT);

      const geo = new THREE.BufferGeometry();
      // `position` is the morph FROM buffer; start dispersed so the very first
      // rendered frame is the scatter, never a flash of the formed galaxy.
      geo.setAttribute('position', new THREE.BufferAttribute(d.slice(), 3));
      geo.setAttribute('aTarget', new THREE.BufferAttribute(g.positions.slice(), 3));
      geo.setAttribute('aRand', new THREE.BufferAttribute(seeds, 1));
      geo.setAttribute('aColorT', new THREE.BufferAttribute(g.colorT, 1));

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uMorph: { value: 0 },
          uIntro: { value: 1 },
          uPixelRatio: { value: 1 },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      });

      return {
        galaxyPos: g.positions,
        dispersePos: d,
        aRand: seeds,
        colorT: g.colorT,
        geometry: geo,
        material: mat,
      };
    }, []);

  // Swap the morph endpoints and reset progress to 0 (re-upload is occasional).
  const setBuffers = (from: Float32Array, to: Float32Array) => {
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const tgtAttr = geometry.getAttribute('aTarget') as THREE.BufferAttribute;
    (posAttr.array as Float32Array).set(from);
    (tgtAttr.array as Float32Array).set(to);
    posAttr.needsUpdate = true;
    tgtAttr.needsUpdate = true;
    material.uniforms.uMorph.value = 0;
  };

  // Play the entrance: dispersed + flashing, then converge into the galaxy.
  const playIntro = () => {
    tl.current?.kill();
    lock.current = true;
    setBuffers(dispersePos, galaxyPos);
    material.uniforms.uIntro.value = 1;
    const t = gsap.timeline({
      onComplete: () => {
        lock.current = false;
      },
    });
    t.to(material.uniforms.uMorph, {
      value: 1,
      duration: 1.6,
      ease: 'power2.out',
      delay: 1.1, // hold the flashing scatter ~1.1s first
    });
    t.to(material.uniforms.uIntro, { value: 0, duration: 1.3 }, '<0.2');
    tl.current = t;
  };

  // Click re-form: galaxy → disperse (flash) → galaxy.
  const playReform = () => {
    if (lock.current) return;
    tl.current?.kill();
    lock.current = true;
    const t = gsap.timeline({
      onComplete: () => {
        lock.current = false;
      },
    });
    t.add(() => setBuffers(galaxyPos, dispersePos));
    t.to(material.uniforms.uIntro, { value: 1, duration: 0.4 }, 0);
    t.to(material.uniforms.uMorph, { value: 1, duration: 0.9, ease: 'power2.in' }, 0);
    t.add(() => setBuffers(dispersePos, galaxyPos));
    t.to(material.uniforms.uMorph, { value: 1, duration: 1.5, ease: 'power2.out' });
    t.to(material.uniforms.uIntro, { value: 0, duration: 1.1 }, '<');
    tl.current = t;
  };

  // (Re)play the intro on each false→true activation; freeze on deactivate.
  const wasActive = useRef(false);
  useEffect(() => {
    if (active && !wasActive.current) playIntro();
    if (!active) {
      tl.current?.kill();
      lock.current = false;
    }
    wasActive.current = active;
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Window pointer → damped tilt target (canvas is pointer-events-none).
  // Window click (ignoring real UI) → re-form. Both no-op while inactive.
  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const onMove = (e: PointerEvent) => {
      if (!activeRef.current || coarse) return;
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = -((e.clientY / window.innerHeight) * 2 - 1);
      tilt.current.x = my * TILT_RANGE;
      tilt.current.y = mx * TILT_RANGE;
    };
    const onClick = (e: MouseEvent) => {
      if (!activeRef.current) return;
      if (isInteractiveTarget(e.target)) return;
      playReform();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('click', onClick);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Dispose GPU resources on unmount (created outside JSX).
  useEffect(() => {
    return () => {
      tl.current?.kill();
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.05);
    material.uniforms.uTime.value += dt;
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();

    if (inner.current) inner.current.rotation.z += dt * SPIN;
    if (outer.current) {
      const lerp = Math.min(1, dt * 3);
      outer.current.rotation.x +=
        (BASE_TILT_X + tilt.current.x - outer.current.rotation.x) * lerp;
      outer.current.rotation.y += (tilt.current.y - outer.current.rotation.y) * lerp;
    }
  });

  return (
    <group ref={outer}>
      <points ref={inner} geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

type ProjectsSceneCanvasProps = {
  /** Render + animate only while Projects is the active panel; freeze otherwise. */
  active: boolean;
};

export default function ProjectsSceneCanvas({ active }: ProjectsSceneCanvasProps) {
  return (
    <Canvas
      className="!absolute !inset-0"
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 60, near: 0.1, far: 40 }}
      frameloop={active ? 'always' : 'never'}
    >
      <Scene active={active} />
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
