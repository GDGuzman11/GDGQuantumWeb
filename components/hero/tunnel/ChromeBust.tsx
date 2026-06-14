'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Environment, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { getWorld } from '@/lib/world';

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

const POSITION: [number, number, number] = [0, -0.1, -3.0];
const TARGET_HEIGHT = 2.7; // world units the bust is scaled to
// Orientation correction baked into the geometry so the bust stands upright and
// faces the camera. The model imported lying down (we saw its base), so tilt it
// up 90° about X. If it's still wrong: try STAND_UP_X = -Math.PI/2, and rotate
// FACE_YAW by Math.PI if it faces away / ±Math.PI/2 if it faces sideways.
const STAND_UP_X = Math.PI / 2;
const FACE_YAW = 0;
const DISP_AMP = 0.5; // blob displacement amplitude (local units)
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
      uThink: { value: 0 }, // 0..1 brightness of the "thinking" circuit lines
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
      shader.uniforms.uThink = uniforms.uThink;
      shader.uniforms.uLightDir = { value: LIGHT_DIR };

      // VERTEX — blob displacement + pass object-space position to the fragment
      // so the "thinking" grid sits on the surface.
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime; uniform float uDisplace; uniform float uAmp;
           varying vec3 vObjPos;
           ${SIMPLEX}`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vObjPos = position;
           float nA = snoise(position * 1.6 + vec3(0.0, 0.0, uTime * 0.25));
           float nB = snoise(position * 3.3 - vec3(0.0, 0.0, uTime * 0.18));
           float d = nA * 0.65 + nB * 0.35;
           transformed += normal * d * uAmp * uDisplace;`,
        );

      // FRAGMENT — bright neuron circuit lines travelling horizontally and
      // vertically across the surface (the bust "thinking"), added as emissive.
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime; uniform float uThink; uniform vec3 uLightDir;
           varying vec3 vObjPos;`,
        )
        .replace(
          '#include <opaque_fragment>',
          `#include <opaque_fragment>
           // Directional side-shading: the side facing the key light stays bright,
           // the far side falls into shadow — cinematic chiaroscuro on the chrome.
           float sideShade = dot(normalize(normal), normalize(uLightDir)) * 0.5 + 0.5;
           gl_FragColor.rgb *= mix(0.4, 1.12, sideShade);`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           {
             float FREQ = 6.0;
             // Thin H + V lines (object space) → a circuit grid on the surface.
             float fy = fract(vObjPos.y * FREQ);
             float fx = fract(vObjPos.x * FREQ);
             float lineH = smoothstep(0.045, 0.0, min(fy, 1.0 - fy));
             float lineV = smoothstep(0.045, 0.0, min(fx, 1.0 - fx));
             // Bright pulses racing along: along x on the H lines, along y on V.
             float pulseH = exp(-pow(fract(vObjPos.x * 1.4 - uTime * 0.55) - 0.5, 2.0) * 46.0);
             float pulseV = exp(-pow(fract(vObjPos.y * 1.4 - uTime * 0.42) - 0.5, 2.0) * 46.0);
             float think = lineH * (0.35 + pulseH * 1.4) + lineV * (0.35 + pulseV * 1.4);
             // Bright, shifting colours (HDR → blooms).
             vec3 tc = 0.6 + 0.4 * cos(6.2831 * (vObjPos.y * 0.5 + vObjPos.x * 0.4 + uTime * 0.18 + vec3(0.0, 0.33, 0.66)));
             totalEmissiveRadiance += tc * 2.2 * think * uThink;
           }`,
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

    // Presence: emerge in the latter half of the flip; gone in the dark world.
    const target = THREE.MathUtils.smoothstep(w, 0.42, 1.0);
    present.current += (target - present.current) * Math.min(1, dt * 3);

    // Displacement resolves from blob → clean face as the world finishes white.
    uniforms.uDisplace.value = 1 - THREE.MathUtils.smoothstep(w, 0.55, 1.0);
    // Thinking lines glow once the face has resolved (strongest when clean).
    uniforms.uThink.value = present.current * THREE.MathUtils.smoothstep(w, 0.6, 1.0);

    if (mesh) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity =
        present.current * (0.25 + 0.2 * Math.sin(uniforms.uTime.value * 1.3));
    }

    const g = groupRef.current;
    if (g) {
      g.visible = present.current > 0.004;
      g.scale.setScalar(0.85 + present.current * 0.15);
      // Gentle sway around facing the camera (orientation is baked into the mesh).
      g.rotation.y = Math.sin(uniforms.uTime.value * 0.15) * 0.28;
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
        position={[POSITION[0], POSITION[1] - TARGET_HEIGHT * 0.62, POSITION[2]]}
        scale={6}
        blur={2.6}
        far={4}
        opacity={0}
        color="#1a2030"
      />
    </>
  );
}

useGLTF.preload('/models/bust.glb');
