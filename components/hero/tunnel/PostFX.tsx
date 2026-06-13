'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  ChromaticAberration,
  Vignette,
  GodRays,
} from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import * as THREE from 'three';
import { getDive } from '@/lib/warp';

/**
 * Cinematic grade (Layer ①) — the post-processing pipeline that lifts the raw
 * additive particle tunnel into a "rendered/expensive" frame.
 *
 * Mounted as a child of the tunnel <Canvas> (one WebGL context). It takes over
 * the render so it runs INSIDE the existing three.js async chunk — the route's
 * First Load JS is unaffected and the DOM <h1> (LCP) is never touched by canvas
 * post-processing.
 *
 * Bold & cinematic tuning lives in the constants block so it's one-line tunable
 * after a real-display review. The warp-reactive modulation (focus pull +
 * chromatic spike on the dive) is driven per-frame from `getDive()` — the same
 * 0→1 pulse the tunnel shader reads — so the grade ignites WITH the warp and
 * settles calm on every page.
 */

// ── Bold tuning constants ────────────────────────────────────────────────────
const BLOOM_INTENSITY = 1.25;
const BLOOM_THRESHOLD = 0.15; // low → the bright sparks/Core energy bloom
const BLOOM_SMOOTHING = 0.9;

const DOF_FOCUS = 0.015; // normalized focus distance (camera→far)
const DOF_FOCAL_LENGTH = 0.04;
const DOF_BOKEH = 4.0; // bold bokeh on out-of-focus particles

const CA_BASE = 0.0009; // resting chromatic fringe
const CA_WARP_GAIN = 0.0042; // extra fringe at peak warp

const GODRAYS_WEIGHT = 0.5; // resting shaft strength
const GODRAYS_WARP_GAIN = 0.5; // extra strength at peak warp

type PostFXProps = {
  /** The Core's emissive inner mesh, used as the god-rays light source. Null
   *  until the Core has mounted; GodRays is skipped until then. */
  sun: THREE.Mesh | null;
};

export function PostFX({ sun }: PostFXProps) {
  const dofRef = useRef<any>(null);
  const godRaysRef = useRef<any>(null);

  // Stable Vector2 the ChromaticAberration effect reads; mutated in useFrame.
  const caVec = useMemo(() => new THREE.Vector2(CA_BASE, CA_BASE), []);

  useFrame(() => {
    // sin(dive·π) pulse: 0 at rest on any panel, 1 at mid-transition.
    const dive = Math.min(1, Math.max(0, getDive()));
    const warp = Math.sin(dive * Math.PI);

    // Chromatic aberration swells with the warp, then settles.
    const ca = CA_BASE + warp * CA_WARP_GAIN;
    caVec.set(ca, ca);

    // Pull focus tighter as we dive so the streaks crisp up through the tunnel.
    const dof = dofRef.current;
    if (dof?.cocMaterial?.uniforms?.focusDistance) {
      dof.cocMaterial.uniforms.focusDistance.value = DOF_FOCUS * (1 - warp * 0.6);
    }

    // God-rays flare with the warp so the Core projects light into the void.
    const gr = godRaysRef.current;
    if (gr?.godRaysMaterial?.uniforms?.weight) {
      gr.godRaysMaterial.uniforms.weight.value =
        GODRAYS_WEIGHT + warp * GODRAYS_WARP_GAIN;
    }
  });

  // EffectComposer's children type rejects `null`, so assemble the passes as a
  // filtered array — GodRays only joins once the Core (sun) exists.
  const effects = [
    <DepthOfField
      key="dof"
      ref={dofRef}
      focusDistance={DOF_FOCUS}
      focalLength={DOF_FOCAL_LENGTH}
      bokehScale={DOF_BOKEH}
    />,
    sun ? (
      <GodRays
        key="godrays"
        ref={godRaysRef}
        sun={sun}
        blendFunction={BlendFunction.SCREEN}
        samples={60}
        density={0.95}
        decay={0.92}
        weight={GODRAYS_WEIGHT}
        exposure={0.5}
        clampMax={1.0}
        kernelSize={KernelSize.SMALL}
        blur
      />
    ) : null,
    <Bloom
      key="bloom"
      mipmapBlur
      intensity={BLOOM_INTENSITY}
      luminanceThreshold={BLOOM_THRESHOLD}
      luminanceSmoothing={BLOOM_SMOOTHING}
      kernelSize={KernelSize.LARGE}
    />,
    <ChromaticAberration
      key="ca"
      blendFunction={BlendFunction.NORMAL}
      offset={caVec}
      radialModulation={false}
      modulationOffset={0}
    />,
    <Vignette key="vignette" eskil={false} offset={0.28} darkness={0.7} />,
  ].filter(Boolean) as JSX.Element[];

  return <EffectComposer multisampling={0}>{effects}</EffectComposer>;
}
