'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Environment, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { getWorld } from '@/lib/world';
import { getPointer } from '@/lib/pointer';

/**
 * Chrome bust (white world) — the plain uploaded head/shoulders model
 * (public/models/bust.glb) enhanced to "expensive render" quality:
 *
 *  • CHROME PBR — metalness 1 + low roughness + a studio environment built from
 *    <Lightformer> strips (no HDRI file), so the surface mirror-reflects bright
 *    light bars (the Apple-keynote chrome look). Smoothed normals lift the
 *    low-poly mesh.
 *  • SOFT SHADOW — ContactShadows grounds it on the white page.
 *  • INNER EMISSION — a cool emissive that pulses from within (the colour you
 *    liked emitting out), caught by bloom.
 *  • BLOB → FACE — a noise displacement (injected via onBeforeCompile) starts
 *    high so it reads as the abstract blob, then RESOLVES to zero as the world
 *    finishes turning white — the bust emerges from the ferrofluid (the swap is
 *    masked by the white flash). Driven by getWorld().
 *
 * Welcome-only, in the same canvas, behind the existing desktop/WebGL/
 * reduced-motion gates. Replaces the ferrofluid core in the white world.
 */

const POSITION: [number, number, number] = [0, 0, -3.2];
const TARGET_HEIGHT = 5.4; // world units the bust is scaled to (~2× larger)
// Orientation correction baked into the geometry so the bust stands upright and
// faces the camera. The model imported lying down (we saw its base), so tilt it
// up 90° about X. If it's still wrong: try STAND_UP_X = -Math.PI/2, and rotate
// FACE_YAW by Math.PI if it faces away / ±Math.PI/2 if it faces sideways.
const STAND_UP_X = Math.PI / 2;
const FACE_YAW = 0;
const DISP_AMP = 0.5; // blob displacement amplitude (local units)
// Head-only gaze: vertices above the neck rotate to follow the cursor; shoulders
// stay fixed. These are in the SCALED, centred local space (y ≈ -2.7..2.7).
// Tune to your model: NECK_LOW/HIGH = the blend band across the neck, PIVOT_Y =
// the point the head pivots around.
const NECK_LOW = 0.1;
const NECK_HIGH = 1.4;
const PIVOT_Y = 0.5;
const INNER = new THREE.Color(0.2, 0.5, 1.5); // HDR inner emission (blooms)
// Fixed view-space key-light direction → one side of the face is lit, the other
// falls into shadow (cinematic chiaroscuro on the chrome).
const LIGHT_DIR = new THREE.Vector3(-0.6, 0.45, 0.65).normalize();

// Compact Ashima simplex noise for the vertex displacement injection.
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
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
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
`;

export function ChromeBust() {
  const { scene } = useGLTF('/models/bust.glb');
  const groupRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<any>(null);
  const present = useRef(0);

  // Shared uniforms for the onBeforeCompile injection (updated each frame).
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDisplace: { value: 1 }, // 1 = full blob, 0 = clean face
      uAmp: { value: DISP_AMP },
      uYaw: { value: 0 }, // head gaze yaw (eased toward the cursor)
      uPitch: { value: 0 }, // head gaze pitch
    }),
    [],
  );

  // Pull the first mesh geometry, centre + scale it, smooth normals, and dress
  // it in a chrome material patched with the blob displacement + inner emission.
  const mesh = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    scene.traverse((o) => {
      if (!geo && (o as THREE.Mesh).isMesh) geo = (o as THREE.Mesh).geometry;
    });
    if (!geo) return null;

    const g = (geo as THREE.BufferGeometry).clone();
    // Stand it upright + face the camera BEFORE measuring, so height/centre are
    // correct for the upright pose.
    g.rotateX(STAND_UP_X);
    g.rotateY(FACE_YAW);
    g.computeVertexNormals(); // smooth the low-poly normals for clean chrome
    g.computeBoundingBox();
    const box = g.boundingBox!;
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    g.translate(-center.x, -center.y, -center.z); // centre at origin
    const s = TARGET_HEIGHT / (size.y || 1);
    g.scale(s, s, s);

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.55, 0.6, 0.7),
      metalness: 1.0,
      roughness: 0.18,
      envMapIntensity: 1.35,
      emissive: INNER,
      emissiveIntensity: 0,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uDisplace = uniforms.uDisplace;
      shader.uniforms.uAmp = uniforms.uAmp;
      shader.uniforms.uYaw = uniforms.uYaw;
      shader.uniforms.uPitch = uniforms.uPitch;
      shader.uniforms.uLightDir = { value: LIGHT_DIR };
      shader.uniforms.uNeckLow = { value: NECK_LOW };
      shader.uniforms.uNeckHigh = { value: NECK_HIGH };
      shader.uniforms.uPivotY = { value: PIVOT_Y };

      // VERTEX — blob displacement + HEAD-ONLY gaze (vertices above the neck
      // rotate toward the cursor; shoulders stay fixed).
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime; uniform float uDisplace; uniform float uAmp;
           uniform float uYaw; uniform float uPitch;
           uniform float uNeckLow; uniform float uNeckHigh; uniform float uPivotY;
           mat3 gzRotY(float a){ float c=cos(a),s=sin(a); return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c); }
           mat3 gzRotX(float a){ float c=cos(a),s=sin(a); return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c); }
           ${SIMPLEX}`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          `#include <beginnormal_vertex>
           {
             float wN = smoothstep(uNeckLow, uNeckHigh, position.y);
             objectNormal = gzRotX(uPitch * wN) * gzRotY(uYaw * wN) * objectNormal;
           }`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float nA = snoise(position * 1.6 + vec3(0.0, 0.0, uTime * 0.25));
           float nB = snoise(position * 3.3 - vec3(0.0, 0.0, uTime * 0.18));
           float d = nA * 0.65 + nB * 0.35;
           transformed += normal * d * uAmp * uDisplace;
           {
             float wG = smoothstep(uNeckLow, uNeckHigh, position.y);
             mat3 gz = gzRotX(uPitch * wG) * gzRotY(uYaw * wG);
             vec3 pv = transformed - vec3(0.0, uPivotY, 0.0);
             transformed = gz * pv + vec3(0.0, uPivotY, 0.0);
           }`,
        );

      // FRAGMENT — directional side-shading (chiaroscuro) on the chrome.
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform vec3 uLightDir;`,
        )
        .replace(
          '#include <opaque_fragment>',
          `#include <opaque_fragment>
           float sideShade = dot(normalize(normal), normalize(uLightDir)) * 0.5 + 0.5;
           gl_FragColor.rgb *= mix(0.4, 1.12, sideShade);`,
        );
    };

    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    return m;
  }, [scene, uniforms]);

  useEffect(() => {
    return () => {
      if (mesh) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
    };
  }, [mesh]);

  useFrame((_s, delta) => {
    const dt = Math.min(delta, 0.05);
    const w = getWorld();
    uniforms.uTime.value += dt;

    // Presence: emerge across the flip with plenty of overlap so the bust and
    // the ferrofluid core cross-dissolve smoothly (both are a blob near the
    // midpoint, masked by the flash); gone in the dark world.
    const target = THREE.MathUtils.smoothstep(w, 0.38, 0.9);
    present.current += (target - present.current) * Math.min(1, dt * 3);

    // Displacement stays blobby through the midpoint, then resolves to the clean
    // face near the end — so the hand-off reads as one continuous blob→face.
    uniforms.uDisplace.value = 1 - THREE.MathUtils.smoothstep(w, 0.5, 0.95);

    if (mesh) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity =
        present.current * (0.25 + 0.2 * Math.sin(uniforms.uTime.value * 1.3));
    }

    // HEAD-ONLY GAZE: ease the gaze uniforms toward the cursor; the shader
    // rotates only the head (above the neck), so the shoulders stay put. Tiny
    // idle drift keeps it alive when the cursor is still.
    const p = getPointer();
    const yawT = p.x * 0.5 + Math.sin(uniforms.uTime.value * 0.12) * 0.04;
    const pitchT = -p.y * 0.26 + Math.sin(uniforms.uTime.value * 0.17) * 0.025;
    const k = Math.min(1, dt * 2.4);
    uniforms.uYaw.value += (yawT - uniforms.uYaw.value) * k;
    uniforms.uPitch.value += (pitchT - uniforms.uPitch.value) * k;

    const g = groupRef.current;
    if (g) {
      g.visible = present.current > 0.004;
      g.scale.setScalar(0.85 + present.current * 0.15);
      // Shoulders fixed — no group rotation (the head turns via the shader).
    }
    if (shadowRef.current) shadowRef.current.opacity = present.current * 0.4;
  });

  if (!mesh) return null;

  return (
    <>
      {/* Studio environment for the chrome reflections — built from light strips,
          no HDRI file (CSP-safe, no network). */}
      <Environment resolution={256} frames={1}>
        {/* Key on the LEFT (matches LIGHT_DIR) → bright lit side; dim fill on the
            right so that side reads dark — chiaroscuro in the reflections. */}
        <Lightformer intensity={3.0} position={[-4, 3, 3]} scale={[7, 7, 1]} color="#ffffff" />
        <Lightformer intensity={0.6} position={[4, 0, 2]} scale={[5, 8, 1]} color="#9fc0ff" />
        <Lightformer intensity={1.3} position={[0, 4, -2]} scale={[8, 3, 1]} color="#dfeaff" />
      </Environment>

      <group ref={groupRef} position={POSITION} visible={false}>
        <primitive object={mesh} />
      </group>

      <ContactShadows
        ref={shadowRef}
        position={[POSITION[0], POSITION[1] - TARGET_HEIGHT * 0.6, POSITION[2]]}
        scale={11}
        blur={2.8}
        far={5}
        opacity={0}
        color="#1a2030"
      />
    </>
  );
}

useGLTF.preload('/models/bust.glb');
