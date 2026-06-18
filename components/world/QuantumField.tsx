import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getDepth } from '@/lib/dive';

/**
 * Quantum field at the orb's core — a dense cloud of subatomic points that
 * vibrate (high-frequency jitter = quantum uncertainty) and flicker in/out
 * (probability cloud), in an electric white/violet/cyan palette. It's INVISIBLE
 * at rest and reveals only as the PROJECTS dive plunges deep into the core, so
 * "Projects" feels like falling past the nucleus down to the quantum scale.
 *
 * Rendered inside the orb group (so it inherits the orb's position + scale).
 */

const COUNT = 1400;

function build(): THREE.BufferGeometry {
  const position = new Float32Array(COUNT * 3);
  const aRand = new Float32Array(COUNT);
  const aColor = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = Math.pow(Math.random(), 0.5) * 1.4; // dense toward the core
    position[i * 3] = r * s * Math.cos(th);
    position[i * 3 + 1] = r * u;
    position[i * 3 + 2] = r * s * Math.sin(th);
    aRand[i] = Math.random();

    const t = Math.random();
    if (t < 0.4) {
      aColor[i * 3] = 0.82;
      aColor[i * 3 + 1] = 0.88;
      aColor[i * 3 + 2] = 1.0; // white-blue
    } else if (t < 0.75) {
      aColor[i * 3] = 0.62;
      aColor[i * 3 + 1] = 0.5;
      aColor[i * 3 + 2] = 1.0; // violet
    } else {
      aColor[i * 3] = 0.5;
      aColor[i * 3 + 1] = 0.95;
      aColor[i * 3 + 2] = 1.0; // cyan
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('aRand', new THREE.BufferAttribute(aRand, 1));
  g.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
  return g;
}

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uReveal;
  attribute float aRand;
  attribute vec3 aColor;
  varying vec3 vCol;
  varying float vFlick;
  void main() {
    vCol = aColor;
    vec3 p = position;
    float j = 0.07; // quantum jitter amplitude
    p.x += sin(uTime * (8.0 + aRand * 20.0) + aRand * 40.0) * j;
    p.y += cos(uTime * (9.0 + aRand * 22.0) + aRand * 33.0) * j;
    p.z += sin(uTime * (7.0 + aRand * 18.0) + aRand * 51.0) * j;
    float fl = sin(uTime * (3.0 + aRand * 7.0) + aRand * 100.0) * 0.5 + 0.5;
    vFlick = smoothstep(0.25, 0.75, fl);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize =
      (1.2 + aRand * 2.2) * uPixelRatio * (8.0 / max(-mv.z, 0.1)) *
      (0.3 + uReveal * 1.2);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uReveal;
  varying vec3 vCol;
  varying float vFlick;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float glow = pow(smoothstep(0.5, 0.0, d), 1.6);
    float a = glow * uReveal * (0.35 + vFlick * 0.65);
    if (a <= 0.001) discard;
    gl_FragColor = vec4(vCol, a);
  }
`;

export function QuantumField() {
  const geometry = useMemo(build, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uReveal: { value: 0 },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useFrame((state) => {
    const d = getDepth();
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = state.gl.getPixelRatio();
    // Reveal across the core→quantum leg (depth 1.3 → 2): a smoothstep.
    const x = Math.min(1, Math.max(0, (d - 1.3) / 0.7));
    const target = x * x * (3 - 2 * x);
    u.uReveal.value += (target - u.uReveal.value) * 0.1;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
