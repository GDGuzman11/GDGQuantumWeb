import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getDepth } from '@/lib/dive';

/**
 * The singularity at the very bottom of the descent (Contact). As the dive goes
 * from the quantum field (depth 2) toward depth 3, an accretion disk spins up
 * around a dark event horizon: particles orbit with differential (Keplerian-ish)
 * speed — fast + hot-white near the core, slow + blue at the rim — reading as a
 * cinematic black hole. Invisible until the Contact leg; rendered inside the orb
 * group so it shares the orb's position + scale.
 */

const COUNT = 2200;
const RI = 0.25; // inner edge (event-horizon glow)
const RO = 2.3; // outer rim

function build(): THREE.BufferGeometry {
  const aR = new Float32Array(COUNT);
  const aAng = new Float32Array(COUNT);
  const aSpeed = new Float32Array(COUNT);
  const aRand = new Float32Array(COUNT);
  // position attribute is required but unused (positions computed in the shader)
  const position = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    const r = RI + Math.pow(Math.random(), 0.6) * (RO - RI); // denser inward
    aR[i] = r;
    aAng[i] = Math.random() * Math.PI * 2;
    aSpeed[i] = 0.7 / Math.pow(r, 1.3); // inner whips around (differential rotation)
    aRand[i] = Math.random();
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('aR', new THREE.BufferAttribute(aR, 1));
  g.setAttribute('aAng', new THREE.BufferAttribute(aAng, 1));
  g.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
  g.setAttribute('aRand', new THREE.BufferAttribute(aRand, 1));
  return g;
}

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aR;
  attribute float aAng;
  attribute float aSpeed;
  attribute float aRand;
  varying float vR;
  varying float vRand;
  void main() {
    float ang = aAng + uTime * aSpeed;
    float h = (aRand - 0.5) * 0.05 * aR; // thin disk
    vec3 p = vec3(cos(ang) * aR, h, sin(ang) * aR);
    vR = aR;
    vRand = aRand;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.4 + aRand * 2.6) * uPixelRatio * (6.0 / max(-mv.z, 0.1));
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uReveal;
  uniform float uTime;
  varying float vR;
  varying float vRand;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float glow = pow(smoothstep(0.5, 0.0, d), 1.6);
    float t = clamp((vR - ${RI.toFixed(2)}) / ${(RO - RI).toFixed(2)}, 0.0, 1.0);
    vec3 inner = vec3(1.0, 0.86, 0.62);  // hot white-gold core
    vec3 outer = vec3(0.42, 0.6, 1.0);   // cool blue rim
    vec3 col = mix(inner, outer, t);
    float bright = mix(1.6, 0.45, t);
    // subtle flicker so the disk shimmers
    float fl = 0.8 + 0.2 * sin(uTime * (4.0 + vRand * 8.0) + vRand * 30.0);
    float a = glow * uReveal * bright * fl;
    if (a <= 0.001) discard;
    gl_FragColor = vec4(col, a);
  }
`;

export function Singularity() {
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
    // Reveal across the quantum→singularity leg (depth 2 → 3).
    const x = Math.min(1, Math.max(0, d - 2));
    u.uReveal.value += (x * x * (3 - 2 * x) - u.uReveal.value) * 0.1;
  });

  // Tilt the disk so it reads as an oblique accretion disk, not face-on.
  return (
    <group rotation={[1.15, 0, 0.35]}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}
