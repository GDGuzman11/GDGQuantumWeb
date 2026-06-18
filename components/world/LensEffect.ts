import type { ComponentType } from 'react';
import { Effect } from 'postprocessing';
import { Uniform } from 'three';
import { wrapEffect } from '@react-three/postprocessing';
import { getDepth } from '@/lib/dive';

/**
 * Gravitational lensing — a screen-space UV distortion that pulls the rendered
 * frame radially toward centre, bending the starfield + accretion disk around
 * the black hole (the Interstellar "Gargantua" warp). Strength ramps in only on
 * the singularity leg (dive depth 2 → 3) and is read straight from the shared
 * dive signal inside `update()` each frame, so there's no React churn.
 */
const fragmentShader = /* glsl */ `
  uniform float uStrength;
  void mainUv(inout vec2 uv) {
    vec2 c = vec2(0.5);
    vec2 d = uv - c;
    float r = length(d);
    float pull = min(uStrength / (r * r + 0.03), 0.62);
    uv = uv - d * pull;
  }
`;

class GravitationalLensEffect extends Effect {
  constructor() {
    super('GravitationalLens', fragmentShader, {
      uniforms: new Map<string, Uniform>([['uStrength', new Uniform(0)]]),
    });
  }

  update() {
    const d = getDepth();
    const x = Math.min(1, Math.max(0, d - 2)); // 0 at quantum → 1 at singularity
    const eased = x * x * (3 - 2 * x);
    const u = this.uniforms.get('uStrength');
    if (u) u.value = eased * 0.06;
  }
}

// wrapEffect infers props as `never` for a no-arg effect; cast to a plain
// component so it can be used as <Lens /> in JSX.
export const Lens = wrapEffect(GravitationalLensEffect) as unknown as ComponentType;
