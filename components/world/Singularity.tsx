import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getDepth } from '@/lib/dive';

/**
 * The singularity (Contact) — a cinematic black hole.
 *
 *  · EVENT HORIZON: a camera-facing black disc that writes depth, so it truly
 *    OCCLUDES the far side of the disk + the stars behind (a real void).
 *  · PHOTON RING: a blazing additive ring hugging the horizon (the Einstein /
 *    photon ring).
 *  · ACCRETION DISK: additive points orbiting with differential (Keplerian-ish)
 *    speed + DOPPLER BEAMING — one side blazes white, the far side dims — hot
 *    white-gold core cooling to blue at the rim.
 *
 * The whole thing IGNITES (scales + brightens up from nothing) across the dive's
 * final leg (depth 2 → 3), as the quantum field collapses into it. Rendered in
 * its own group (NOT the scaled orb group) so it's framed for the pulled-back
 * cinematic Contact camera.
 */

const COUNT = 2600;
const RI = 0.5; // event-horizon / inner disk radius
const RO = 2.0; // outer rim

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function buildDisk(): THREE.BufferGeometry {
  const position = new Float32Array(COUNT * 3); // required; real pos in shader
  const aR = new Float32Array(COUNT);
  const aAng = new Float32Array(COUNT);
  const aSpeed = new Float32Array(COUNT);
  const aRand = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const r = RI + Math.pow(Math.random(), 0.7) * (RO - RI);
    aR[i] = r;
    aAng[i] = Math.random() * Math.PI * 2;
    aSpeed[i] = 0.9 / Math.pow(r, 1.3);
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

const DISK_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aR;
  attribute float aAng;
  attribute float aSpeed;
  attribute float aRand;
  varying float vR;
  varying float vRand;
  varying float vBeam;
  void main() {
    float ang = aAng + uTime * aSpeed;
    float h = (aRand - 0.5) * 0.04 * aR; // thin disk
    vec3 p = vec3(cos(ang) * aR, h, sin(ang) * aR);
    vR = aR;
    vRand = aRand;
    // Doppler beaming: the +x-moving side blazes, the other dims.
    vBeam = 0.35 + 0.95 * pow(max(0.0, cos(ang)), 1.5);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.5 + aRand * 2.8) * uPixelRatio * (7.0 / max(-mv.z, 0.1));
  }
`;

const DISK_FRAG = /* glsl */ `
  precision highp float;
  uniform float uReveal;
  uniform float uTime;
  varying float vR;
  varying float vRand;
  varying float vBeam;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float dd = length(c);
    if (dd > 0.5) discard;
    float glow = pow(smoothstep(0.5, 0.0, dd), 1.6);
    float t = clamp((vR - ${RI.toFixed(2)}) / ${(RO - RI).toFixed(2)}, 0.0, 1.0);
    vec3 inner = vec3(1.0, 0.88, 0.66);
    vec3 outer = vec3(0.40, 0.6, 1.0);
    vec3 col = mix(inner, outer, t);
    float fl = 0.85 + 0.15 * sin(uTime * (5.0 + vRand * 9.0) + vRand * 30.0);
    float bright = mix(1.7, 0.5, t) * vBeam * fl;
    float a = glow * uReveal * bright;
    if (a <= 0.001) discard;
    gl_FragColor = vec4(col * bright, a);
  }
`;

export function Singularity() {
  const root = useRef<THREE.Group>(null); // ignition scale-in
  const billboard = useRef<THREE.Group>(null); // void + photon ring face camera
  const revealRef = useRef(0);

  const diskGeo = useMemo(buildDisk, []);
  const diskMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uReveal: { value: 0 },
        },
        vertexShader: DISK_VERT,
        fragmentShader: DISK_FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: true, // so the event-horizon disc can occlude the far side
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useFrame((state) => {
    const d = getDepth();
    const target = smoothstep(2, 3, d);
    revealRef.current += (target - revealRef.current) * 0.08;
    const r = revealRef.current;

    diskMat.uniforms.uTime.value = state.clock.elapsedTime;
    diskMat.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    diskMat.uniforms.uReveal.value = r;

    if (root.current) {
      const s = Math.max(0.0001, r);
      root.current.scale.setScalar(s); // ignite: grows up from a point
      root.current.visible = r > 0.002;
    }
    // Keep the void + ring facing the camera (the silhouette is always round).
    if (billboard.current) billboard.current.quaternion.copy(state.camera.quaternion);
  });

  return (
    <group ref={root} scale={0.0001} visible={false}>
      {/* Accretion disk, tilted obliquely. */}
      <group rotation={[1.15, 0, 0.35]}>
        <points geometry={diskGeo} material={diskMat} frustumCulled={false} />
      </group>

      {/* Camera-facing void + photon ring. */}
      <group ref={billboard}>
        {/* Event horizon — opaque, writes depth → occludes disk + stars. */}
        <mesh renderOrder={1}>
          <circleGeometry args={[RI * 0.92, 64]} />
          <meshBasicMaterial color="#000007" />
        </mesh>
        {/* Photon ring — blazing additive halo at the horizon. */}
        <mesh renderOrder={3}>
          <ringGeometry args={[RI * 0.9, RI * 1.08, 96]} />
          <meshBasicMaterial
            color="#fff4e0"
            transparent
            opacity={0.95}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}
