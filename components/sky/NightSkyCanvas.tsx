'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Night-sky scene — the heavy three.js/R3F chunk for the new GDG site.
 *
 * Default-exported and ONLY reached via `dynamic(() => import(...), {ssr:false})`
 * from NightSky, so three.js stays in its own async chunk out of the route's
 * First Load JS.
 *
 * Draws two point systems on a black void:
 *   1. STARFIELD — a calm scatter of stars on a large sphere around the camera,
 *      each twinkling on its own slow clock (phase + speed per star), a few
 *      brighter "sparkle" stars, subtle cool/warm colour variation. Deliberately
 *      restrained in count so it reads as a quiet night sky, not a blizzard.
 *   2. GALAXIES — a handful of FAINT, distant galaxies, each a small cluster of
 *      points arranged into a RANDOMISED shape (spiral / elliptical / irregular)
 *      with a random orientation and size, so you can just make out the form.
 *
 * All glow is additive sprites in-shader (no post-processing) so the canvas can
 * stay transparent over the black page. `animate=false` (reduced-motion) renders
 * a single static frame.
 */

const STAR_COUNT = 1100; // calm, not a blizzard
const STAR_RADIUS = 60; // sphere the stars sit on
const GALAXY_COUNT = 6;
const GALAXY_POINTS = 260; // points per galaxy
const GALAXY_RADIUS = 95; // galaxies sit further out than the stars
const TWO_PI = Math.PI * 2;

/** Gaussian-ish noise in roughly [-1, 1]. */
function randn(): number {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

/** A point on a sphere of the given radius (uniform). */
function pointOnSphere(radius: number): [number, number, number] {
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * TWO_PI;
  const s = Math.sqrt(1 - u * u);
  return [radius * s * Math.cos(theta), radius * u, radius * s * Math.sin(theta)];
}

// ---- Starfield --------------------------------------------------------------

function buildStars(): THREE.BufferGeometry {
  const position = new Float32Array(STAR_COUNT * 3);
  const aColor = new Float32Array(STAR_COUNT * 3);
  const aSize = new Float32Array(STAR_COUNT);
  const aBright = new Float32Array(STAR_COUNT);
  const aPhase = new Float32Array(STAR_COUNT);
  const aTwinkle = new Float32Array(STAR_COUNT);

  for (let i = 0; i < STAR_COUNT; i++) {
    const [x, y, z] = pointOnSphere(STAR_RADIUS * (0.85 + Math.random() * 0.3));
    position[i * 3] = x;
    position[i * 3 + 1] = y;
    position[i * 3 + 2] = z;

    // Mostly white; a minority lean cool blue or warm gold.
    const t = Math.random();
    let r = 1,
      g = 1,
      b = 1;
    if (t < 0.18) {
      r = 0.72;
      g = 0.82;
      b = 1.0;
    } else if (t > 0.9) {
      r = 1.0;
      g = 0.9;
      b = 0.74;
    }
    aColor[i * 3] = r;
    aColor[i * 3 + 1] = g;
    aColor[i * 3 + 2] = b;

    // A few bright "sparkle" stars; most are modest.
    const sparkle = Math.random() > 0.93;
    aSize[i] = sparkle ? 2.6 + Math.random() * 2.2 : 1.0 + Math.random() * 1.6;
    aBright[i] = sparkle ? 0.85 + Math.random() * 0.15 : 0.35 + Math.random() * 0.4;
    aPhase[i] = Math.random() * TWO_PI;
    // Twinkle speed: slow, with sparkle stars a touch livelier.
    aTwinkle[i] = (sparkle ? 1.4 : 0.5) + Math.random() * 1.1;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  geo.setAttribute('aBright', new THREE.BufferAttribute(aBright, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
  geo.setAttribute('aTwinkle', new THREE.BufferAttribute(aTwinkle, 1));
  return geo;
}

// ---- Galaxies ---------------------------------------------------------------

type GalaxyKind = 'spiral' | 'elliptical' | 'irregular';

/** Fill a galaxy's local-space points (centred at origin, disk in local XY). */
function fillGalaxy(
  kind: GalaxyKind,
  scale: number,
  out: { lx: number; ly: number; lz: number; core: number }[],
): void {
  for (let i = 0; i < GALAXY_POINTS; i++) {
    let lx = 0,
      ly = 0,
      lz = 0,
      core = 0;

    if (kind === 'spiral') {
      const arms = 2;
      const t = Math.pow(Math.random(), 0.5); // 0 core → 1 rim
      const r = t * scale;
      const arm = Math.floor(Math.random() * arms);
      const spread = 0.35 * (1 - t) + 0.08;
      const angle = t * 3.4 + arm * (TWO_PI / arms) + randn() * spread;
      lx = Math.cos(angle) * r;
      ly = Math.sin(angle) * r;
      lz = randn() * scale * 0.04;
      core = 1 - t;
      // A brighter central bulge.
      if (Math.random() < 0.18) {
        const br = Math.random() * scale * 0.22;
        const a = Math.random() * TWO_PI;
        lx = Math.cos(a) * br;
        ly = Math.sin(a) * br;
        lz = randn() * scale * 0.06;
        core = 1;
      }
    } else if (kind === 'elliptical') {
      lx = randn() * scale * 0.6;
      ly = randn() * scale * 0.42;
      lz = randn() * scale * 0.5;
      const d = Math.sqrt(lx * lx + ly * ly + lz * lz) / scale;
      core = Math.max(0, 1 - d);
    } else {
      // irregular — a few soft clumps.
      const clumps = 3;
      const c = Math.floor(Math.random() * clumps);
      const cx = Math.cos((c / clumps) * TWO_PI) * scale * 0.45;
      const cy = Math.sin((c / clumps) * TWO_PI) * scale * 0.45;
      lx = cx + randn() * scale * 0.35;
      ly = cy + randn() * scale * 0.35;
      lz = randn() * scale * 0.18;
      core = Math.random() * 0.5;
    }

    out.push({ lx, ly, lz, core });
  }
}

function buildGalaxies(): THREE.BufferGeometry {
  const total = GALAXY_COUNT * GALAXY_POINTS;
  const position = new Float32Array(total * 3);
  const aColor = new Float32Array(total * 3);
  const aSize = new Float32Array(total);
  const aBright = new Float32Array(total);
  const aPhase = new Float32Array(total);
  const aTwinkle = new Float32Array(total);

  const kinds: GalaxyKind[] = ['spiral', 'elliptical', 'irregular'];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const v = new THREE.Vector3();

  let w = 0; // write index
  for (let gi = 0; gi < GALAXY_COUNT; gi++) {
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const scale = 5 + Math.random() * 6;
    const [cx, cy, cz] = pointOnSphere(GALAXY_RADIUS * (0.85 + Math.random() * 0.4));

    // Random orientation so the disk tips at a believable angle.
    euler.set(
      Math.random() * TWO_PI,
      Math.random() * TWO_PI,
      Math.random() * TWO_PI,
    );
    q.setFromEuler(euler);
    m.makeRotationFromQuaternion(q);
    m.setPosition(cx, cy, cz);

    // Faint cool-white base, warmer core; whole galaxy dim.
    const baseR = 0.7 + Math.random() * 0.2;
    const baseG = 0.78 + Math.random() * 0.18;
    const baseB = 0.95 + Math.random() * 0.05;

    const pts: { lx: number; ly: number; lz: number; core: number }[] = [];
    fillGalaxy(kind, scale, pts);

    for (let i = 0; i < pts.length; i++, w++) {
      const p = pts[i];
      v.set(p.lx, p.ly, p.lz).applyMatrix4(m);
      position[w * 3] = v.x;
      position[w * 3 + 1] = v.y;
      position[w * 3 + 2] = v.z;

      // Core points warm slightly and brighten.
      const warm = p.core;
      aColor[w * 3] = baseR + (1.0 - baseR) * warm * 0.6 + warm * 0.15;
      aColor[w * 3 + 1] = baseG + (0.85 - baseG) * warm * 0.4;
      aColor[w * 3 + 2] = baseB - warm * 0.25;

      aSize[w] = 1.3 + Math.random() * 1.4 + p.core * 1.2;
      // Faint overall so it reads as a distant smudge with a discernible shape.
      aBright[w] = 0.12 + p.core * 0.33 + Math.random() * 0.08;
      aPhase[w] = Math.random() * TWO_PI;
      aTwinkle[w] = 0.15 + Math.random() * 0.3; // barely shimmer
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  geo.setAttribute('aBright', new THREE.BufferAttribute(aBright, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
  geo.setAttribute('aTwinkle', new THREE.BufferAttribute(aTwinkle, 1));
  return geo;
}

// ---- Shared point shader ----------------------------------------------------

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aBright;
  attribute float aPhase;
  attribute float aTwinkle;
  varying vec3 vColor;
  varying float vBright;
  void main() {
    vColor = aColor;
    float tw = 0.6 + 0.4 * sin(uTime * aTwinkle + aPhase);
    vBright = aBright * tw;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (0.7 + vBright * 0.9);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vBright;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float glow = pow(smoothstep(0.5, 0.0, d), 1.7);
    gl_FragColor = vec4(vColor, glow * vBright);
  }
`;

function makeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
}

type SkyProps = { animate: boolean };

export function Sky({ animate }: SkyProps) {
  const { gl } = useThree();
  const group = useRef<THREE.Group>(null);

  const starGeo = useMemo(buildStars, []);
  const galaxyGeo = useMemo(buildGalaxies, []);
  const starMat = useMemo(makeMaterial, []);
  const galaxyMat = useMemo(makeMaterial, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const pr = gl.getPixelRatio();
    starMat.uniforms.uTime.value = t;
    starMat.uniforms.uPixelRatio.value = pr;
    galaxyMat.uniforms.uTime.value = t;
    galaxyMat.uniforms.uPixelRatio.value = pr;
    if (group.current && animate) {
      // Very slow drift so the sky feels alive but calm.
      group.current.rotation.y += delta * 0.006;
      group.current.rotation.x = Math.sin(t * 0.02) * 0.02;
    }
  });

  return (
    <group ref={group}>
      <points geometry={starGeo} material={starMat} frustumCulled={false} />
      <points geometry={galaxyGeo} material={galaxyMat} frustumCulled={false} />
    </group>
  );
}

export default function NightSkyCanvas({ animate = true }: { animate?: boolean }) {
  return (
    <Canvas
      className="!absolute !inset-0"
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 0.01], fov: 75, near: 0.1, far: 200 }}
      frameloop={animate ? 'always' : 'demand'}
    >
      <Sky animate={animate} />
    </Canvas>
  );
}
