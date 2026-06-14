'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Environment, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { mergeVertices } from 'three-stdlib';
import { getWorld, isWhiteWorld } from '@/lib/world';
import { getPointer } from '@/lib/pointer';

/**
 * Laplacian (umbrella) smoothing — averages each vertex toward its neighbours a
 * few times to round off sharp features (e.g. the pointed crown of the low-poly
 * model). Jacobi update so reads aren't contaminated mid-pass. Needs an indexed,
 * welded geometry (run mergeVertices first).
 */
function smoothGeometry(
  geo: THREE.BufferGeometry,
  iterations: number,
  lambda: number,
): void {
  const index = geo.getIndex();
  if (!index) return;
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const count = pos.count;
  const neighbors: Set<number>[] = Array.from({ length: count }, () => new Set());
  const idx = index.array;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2];
    neighbors[a].add(b); neighbors[a].add(c);
    neighbors[b].add(a); neighbors[b].add(c);
    neighbors[c].add(a); neighbors[c].add(b);
  }
  for (let it = 0; it < iterations; it++) {
    const nx = new Float32Array(count);
    const ny = new Float32Array(count);
    const nz = new Float32Array(count);
    for (let v = 0; v < count; v++) {
      const vx = pos.getX(v), vy = pos.getY(v), vz = pos.getZ(v);
      const nb = neighbors[v];
      if (nb.size === 0) { nx[v] = vx; ny[v] = vy; nz[v] = vz; continue; }
      let sx = 0, sy = 0, sz = 0;
      nb.forEach((n) => { sx += pos.getX(n); sy += pos.getY(n); sz += pos.getZ(n); });
      const inv = 1 / nb.size;
      nx[v] = vx + (sx * inv - vx) * lambda;
      ny[v] = vy + (sy * inv - vy) * lambda;
      nz[v] = vz + (sz * inv - vz) * lambda;
    }
    for (let v = 0; v < count; v++) pos.setXYZ(v, nx[v], ny[v], nz[v]);
  }
  pos.needsUpdate = true;
}

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

// 3D screen embedded ON the chrome face. Position/size are in the scaled, centred
// local space (y ≈ -2.7..2.7); tune onto your model's face. The screen is a child
// of a head-group that rotates with the gaze, so it tracks the head turn.
const SCREEN_POS: [number, number, number] = [0, 1.0, 1.45];
const SCREEN_W = 1.3;
const SCREEN_H = 0.82;

const SNIPPETS = [
  '> initializing neural core',
  '> bootstrapping consciousness',
  'synapse.link(0x7F3A)',
  '> loading weights ...',
  'tensor.alloc(4096)',
  '> calibrating cortex',
  'train(epoch=42) loss=0.0031',
  'graph.compile() :: ok',
  '0xA1F0: handshake accepted',
  '> mounting memory banks',
  'await think(input)',
  '> SYSTEM ONLINE',
];

function pickSequence(): string {
  const n = 7 + Math.floor(Math.random() * 4);
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(SNIPPETS[(Math.random() * SNIPPETS.length) | 0]);
  return out.join('\n');
}

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
  const headGroupRef = useRef<THREE.Group>(null);
  const screenRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<any>(null);
  const present = useRef(0);
  const screenPresent = useRef(0);
  const screenActive = useRef(false);

  // Offscreen canvas → texture for the embedded terminal screen.
  const screen = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    return { canvas, ctx, texture };
  }, []);

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

    let g = (geo as THREE.BufferGeometry).clone();
    // Stand it upright + face the camera BEFORE measuring, so height/centre are
    // correct for the upright pose.
    g.rotateX(STAND_UP_X);
    g.rotateY(FACE_YAW);
    // Weld duplicate verts, then lightly smooth — enough to round the sharp crown
    // without washing away the (already subtle) facial features.
    g = mergeVertices(g);
    smoothGeometry(g, 2, 0.5);
    g.computeVertexNormals(); // smooth normals for clean chrome
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
      roughness: 0.14,
      envMapIntensity: 1.3, // a touch dimmer so reflections don't wash the form
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
           varying vec3 vRest;
           mat3 gzRotY(float a){ float c=cos(a),s=sin(a); return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c); }
           mat3 gzRotX(float a){ float c=cos(a),s=sin(a); return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c); }
           ${SIMPLEX}`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          `#include <beginnormal_vertex>
           // Rest-pose (face-fixed) normal for the side-shading, captured BEFORE
           // the gaze rotation so the shadow doesn't swim when the head turns.
           vRest = normalize(objectNormal);
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
           uniform vec3 uLightDir;
           varying vec3 vRest;`,
        )
        .replace(
          '#include <opaque_fragment>',
          `#include <opaque_fragment>
           // Directional side-shading (chiaroscuro), anchored to the FACE via the
           // rest-pose normal so it stays put as the head turns (no swimming).
           float sideShade = dot(normalize(vRest), normalize(uLightDir)) * 0.5 + 0.5;
           gl_FragColor.rgb *= mix(0.34, 1.14, sideShade);
           // Crease/cavity shading: darken where the normal changes fast (nose,
           // eye sockets, lips, jaw) so the facial features read on the low-poly
           // mesh. Screen-space derivative of the normal ≈ surface curvature.
           float curv = length(fwidth(normalize(normal)));
           gl_FragColor.rgb *= 1.0 - clamp(curv * 7.0, 0.0, 0.72);
           // Fresnel edge-rim: a bright cool rim at grazing angles defines the
           // silhouette and feature edges.
           float edgeFres = pow(1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0), 2.3);
           gl_FragColor.rgb += edgeFres * vec3(0.5, 0.6, 0.85) * 1.0;`,
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
      screen.texture.dispose();
    };
  }, [mesh, screen]);

  // Boot sequence — a click on any BUTTON/link (in the white world, not the core)
  // types random code onto the embedded face screen, then it fades.
  useEffect(() => {
    const { canvas, ctx, texture } = screen;
    const W = canvas.width;
    const H = canvas.height;
    const draw = (text: string) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(2,8,12,0.92)';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(34,211,238,0.55)';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, W - 8, H - 8);
      ctx.font = '15px monospace';
      ctx.fillStyle = 'rgba(150,235,255,0.96)';
      ctx.textBaseline = 'top';
      const lines = text.split('\n').slice(-9);
      const lh = 19;
      lines.forEach((ln, i) => ctx.fillText(ln, 14, 14 + i * lh));
      const last = lines[lines.length - 1] ?? '';
      ctx.fillRect(14 + ctx.measureText(last).width + 2, 14 + (lines.length - 1) * lh, 8, 14);
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
      texture.needsUpdate = true;
    };

    let typer = 0;
    let hideId = 0;
    const startBoot = () => {
      window.clearInterval(typer);
      window.clearTimeout(hideId);
      const full = pickSequence();
      screenActive.current = true;
      let i = 0;
      draw('');
      typer = window.setInterval(() => {
        i += 1;
        draw(full.slice(0, i));
        if (i >= full.length) {
          window.clearInterval(typer);
          typer = 0;
          hideId = window.setTimeout(() => {
            screenActive.current = false;
          }, 2600);
        }
      }, 26);
    };

    const onClick = (e: MouseEvent) => {
      if (!isWhiteWorld()) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest('#core-hotspot')) return; // core toggles the world
      if (!t.closest('button, a, [role="button"], input[type="submit"]')) return;
      startBoot();
    };

    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('click', onClick);
      window.clearInterval(typer);
      window.clearTimeout(hideId);
    };
  }, [screen]);

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
    // Face/screen turn TOWARD the cursor. Amplitude kept SMALL so the chrome
    // reflections don't swim much as the head turns (dampened). Flip a sign here
    // if an axis reverses.
    const yawT = p.x * 0.3 + Math.sin(uniforms.uTime.value * 0.12) * 0.03;
    const pitchT = -p.y * 0.17 + Math.sin(uniforms.uTime.value * 0.17) * 0.02;
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

    // Face screen: the head-group tracks the gaze (so the screen turns with the
    // head); the screen fades in when active, and only while the bust is present.
    if (w < 0.5) screenActive.current = false;
    if (headGroupRef.current) {
      headGroupRef.current.rotation.y = uniforms.uYaw.value;
      headGroupRef.current.rotation.x = uniforms.uPitch.value;
    }
    const sTarget = screenActive.current ? 1 : 0;
    screenPresent.current += (sTarget - screenPresent.current) * Math.min(1, dt * 6);
    if (screenRef.current) {
      const sm = screenRef.current.material as THREE.MeshBasicMaterial;
      sm.opacity = screenPresent.current * present.current;
      screenRef.current.visible = sm.opacity > 0.01;
    }
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
        {/* Embedded terminal screen on the face — child of a head-group that
            rotates with the gaze so it tracks the head turn. */}
        <group ref={headGroupRef} position={[0, PIVOT_Y, 0]}>
          <mesh
            ref={screenRef}
            position={[SCREEN_POS[0], SCREEN_POS[1] - PIVOT_Y, SCREEN_POS[2]]}
            renderOrder={6}
            visible={false}
          >
            <planeGeometry args={[SCREEN_W, SCREEN_H]} />
            <meshBasicMaterial
              map={screen.texture}
              transparent
              toneMapped={false}
              depthWrite={false}
              depthTest={false}
              opacity={0}
            />
          </mesh>
        </group>
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
