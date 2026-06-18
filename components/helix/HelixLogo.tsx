'use client';

/**
 * HelixLogo — a self-contained "Ethereal Halo" 3D logo.
 *
 * Extracted from Helix's identity orb and stripped of all voice/audio
 * reactivity, app state, and external imports so it can be dropped into any
 * React site as a logo or hero animation. It animates autonomously (a calm,
 * always-on idle), and the only dependencies are `three` + `@react-three/fiber`.
 *
 * What it draws:
 *   1. TWO CROSSED WHITE HALOS — two fractured halos (6 chunky arc segments
 *      with gaps), each a white glowing OUTLINE. Halo A tumbles on its X axis,
 *      Halo B spins on its Y axis, crossing like a slow gyroscope.
 *   2. GOLD ATOM CORE — a gold-glowing nucleus + additive gold glow sprite,
 *      wrapped by 3 thin tilted gold orbital-ring outlines.
 *   3. ETHEREAL DOTS + TETHERS — soft additive glow points drifting around it,
 *      each with a faint connector line to the core. Both the dot and its
 *      tether glow brighter/bigger near the core and warm toward gold; they
 *      fade to faint white as they drift outward.
 *
 * Glow is built from additive sprites/points + emissive materials (NO
 * post-processing / bloom) so the canvas stays truly transparent and can float
 * over any background.
 *
 * Usage:
 *   import HelixLogo from "./HelixLogo";
 *   <HelixLogo className="h-40 w-40" />              // sized by its container
 *   <HelixLogo style={{ width: 240, height: 240 }} />
 *
 * Install (if not already present):
 *   npm i three @react-three/fiber
 */

import { useMemo, useRef, type CSSProperties } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  EdgesGeometry,
  Euler,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Points,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const WHITE = "#ffffff";
const TWO_PI = Math.PI * 2;

// --- Halo constants ---------------------------------------------------------
const SEGMENTS = 6; // fractured arc count
const HALO_R = 1.12; // ring radius
const HALO_TUBE = 0.1; // arc thickness
const GAP = 0.2; // radian gap between segments
const WALL_SCALE = 1.7; // stretch tube along ring normal → chunky "wall" look

// --- Core / dots ------------------------------------------------------------
const ORBIT_R = 0.34;
const DOT_COUNT = 40;
const MIN_D = 0.45; // distance mapped to full brightness (close to core)
const MAX_D = 1.95; // distance mapped to faint (far from core)

// Colours as RGB triples for cheap per-frame lerping.
const FAR_COL = [0.95, 0.965, 1.0]; // soft white (far)
const GOLD_COL = [1.0, 0.7608, 0.2784]; // #ffc247 (near the gold core)

/** Three differently-tilted orbital-ring orientations for the atom core. */
const ORBIT_TILTS: Euler[] = [
  new Euler(0, 0, 0),
  new Euler(1.15, 0.5, 0),
  new Euler(-0.6, -0.9, 0.7),
];

/** Static per-dot drift descriptor — clearly moving, but smooth/dreamy. */
interface DotData {
  bx: number; by: number; bz: number; // base position
  ax: number; ay: number; az: number; // drift amplitudes
  fx: number; fy: number; fz: number; // drift frequencies
  px: number; py: number; pz: number; // phases
}

// --- Distance-glow point shaders (per-point brightness + size + colour) -----
const DOT_VERT = /* glsl */ `
attribute float aBright;
attribute vec3 aColor;
varying float vBright;
varying vec3 vColor;
uniform float uSize;
uniform float uPixelRatio;
void main() {
  vBright = aBright;
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.5 + aBright * 1.3) * uPixelRatio / max(-mv.z, 0.1);
}
`;

const DOT_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
varying float vBright;
varying vec3 vColor;
void main() {
  vec4 tex = texture2D(uTex, gl_PointCoord);
  gl_FragColor = vec4(vColor * (0.4 + vBright * 1.6), tex.a * (0.28 + vBright * 0.72));
}
`;

/** Soft radial-gradient sprite texture (white → transparent) for the glows. */
function makeGlowTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.28, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** The R3F scene contents — the orb itself. Animates autonomously. */
function OrbScene() {
  const glowTex = useMemo(makeGlowTexture, []);

  // --- White outline geometry for one fractured halo ------------------------
  const haloEdges = useMemo(() => {
    const arc = TWO_PI / SEGMENTS - GAP;
    const parts: TorusGeometry[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const g = new TorusGeometry(HALO_R, HALO_TUBE, 4, 26, arc);
      g.rotateZ(i * (TWO_PI / SEGMENTS) + GAP / 2);
      parts.push(g);
    }
    const merged = mergeGeometries(parts) as BufferGeometry;
    merged.scale(1, 1, WALL_SCALE);
    const edges = new EdgesGeometry(merged, 18);
    merged.dispose();
    parts.forEach((part) => part.dispose());
    return edges;
  }, []);

  // --- Ethereal dot field data ----------------------------------------------
  const dots = useMemo<DotData[]>(() => {
    return Array.from({ length: DOT_COUNT }, () => {
      const u = Math.random() * 2 - 1;
      const theta = Math.random() * TWO_PI;
      const r = 1.0 + Math.random() * 0.9;
      const s = Math.sqrt(1 - u * u);
      return {
        bx: r * s * Math.cos(theta),
        by: r * u,
        bz: r * s * Math.sin(theta),
        ax: 0.18 + Math.random() * 0.2,
        ay: 0.18 + Math.random() * 0.2,
        az: 0.18 + Math.random() * 0.2,
        fx: 0.35 + Math.random() * 0.5,
        fy: 0.35 + Math.random() * 0.5,
        fz: 0.35 + Math.random() * 0.5,
        px: Math.random() * TWO_PI,
        py: Math.random() * TWO_PI,
        pz: Math.random() * TWO_PI,
      };
    });
  }, []);

  // Single shader-driven Points object (per-point brightness/size/colour).
  const dotPoints = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(new Float32Array(DOT_COUNT * 3), 3));
    geo.setAttribute("aBright", new Float32BufferAttribute(new Float32Array(DOT_COUNT), 1));
    geo.setAttribute("aColor", new Float32BufferAttribute(new Float32Array(DOT_COUNT * 3), 3));
    const pixelRatio = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2);
    const mat = new ShaderMaterial({
      uniforms: {
        uTex: { value: glowTex },
        uSize: { value: 40 },
        uPixelRatio: { value: pixelRatio },
      },
      vertexShader: DOT_VERT,
      fragmentShader: DOT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    return new Points(geo, mat);
  }, [glowTex]);

  // Single connector-line object: dot → core (2 verts/dot), per-vertex colour.
  const connectors = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(new Float32Array(DOT_COUNT * 6), 3));
    geo.setAttribute("color", new Float32BufferAttribute(new Float32Array(DOT_COUNT * 6), 3));
    const mat = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    return new LineSegments(geo, mat);
  }, []);

  // --- Additive gold glow sprite behind the nucleus -------------------------
  const coreGlow = useMemo(() => {
    const mat = new SpriteMaterial({
      map: glowTex,
      color: new Color(GOLD_COL[0], GOLD_COL[1], GOLD_COL[2]),
      transparent: true,
      opacity: 0.9,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const sprite = new Sprite(mat);
    sprite.scale.setScalar(0.95);
    return sprite;
  }, [glowTex]);

  // --- Refs -----------------------------------------------------------------
  const haloA = useRef<LineSegments>(null);
  const haloB = useRef<LineSegments>(null);
  const coreGroup = useRef<Group>(null);
  const nucleus = useRef<Mesh>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // --- Two crossed halos: gentle autonomous spin + breathing --------------
    const haloScale = 1 + 0.008 * Math.sin(t * 2.2);
    if (haloA.current) {
      haloA.current.rotation.x += delta * 0.16;
      haloA.current.scale.setScalar(haloScale);
    }
    if (haloB.current) {
      haloB.current.rotation.y += delta * 0.13;
      haloB.current.scale.setScalar(haloScale);
    }

    // Gentle core drift + breathing gold nucleus/glow.
    if (coreGroup.current) coreGroup.current.rotation.y += delta * 0.08;
    if (nucleus.current) {
      const mat = nucleus.current.material as MeshStandardMaterial;
      mat.emissiveIntensity = 2.0 + 0.2 * Math.sin(t * 1.4);
      nucleus.current.scale.setScalar(1 + 0.05 * Math.sin(t * 1.4));
    }
    coreGlow.scale.setScalar(0.95 + 0.05 * Math.sin(t * 1.4));

    // --- Dots + tethers: drift, distance-based glow, gold-near tint ----------
    const dPos = dotPoints.geometry.attributes.position.array as Float32Array;
    const dBright = dotPoints.geometry.attributes.aBright.array as Float32Array;
    const dCol = dotPoints.geometry.attributes.aColor.array as Float32Array;
    const lPos = connectors.geometry.attributes.position.array as Float32Array;
    const lCol = connectors.geometry.attributes.color.array as Float32Array;
    const span = MAX_D - MIN_D;

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const x = d.bx + Math.sin(t * d.fx + d.px) * d.ax;
      const y = d.by + Math.sin(t * d.fy + d.py) * d.ay;
      const z = d.bz + Math.sin(t * d.fz + d.pz) * d.az;

      // Closeness: 1 near the core, 0 far away.
      const dist = Math.sqrt(x * x + y * y + z * z);
      const closeness = Math.max(0, Math.min(1, (MAX_D - dist) / span));
      const mix = closeness * 0.85; // warm toward gold near the core
      const r = FAR_COL[0] + (GOLD_COL[0] - FAR_COL[0]) * mix;
      const gg = FAR_COL[1] + (GOLD_COL[1] - FAR_COL[1]) * mix;
      const b = FAR_COL[2] + (GOLD_COL[2] - FAR_COL[2]) * mix;

      // Dot point.
      dPos[i * 3] = x;
      dPos[i * 3 + 1] = y;
      dPos[i * 3 + 2] = z;
      dBright[i] = closeness;
      dCol[i * 3] = r;
      dCol[i * 3 + 1] = gg;
      dCol[i * 3 + 2] = b;

      // Tether: dot end (faint) → core end (brighter, gold). Fades with distance.
      const lb = 0.12 + closeness * 0.9;
      const j = i * 6;
      lPos[j] = x; lPos[j + 1] = y; lPos[j + 2] = z;
      lPos[j + 3] = 0; lPos[j + 4] = 0; lPos[j + 5] = 0;
      lCol[j] = r * lb * 0.5; lCol[j + 1] = gg * lb * 0.5; lCol[j + 2] = b * lb * 0.5;
      lCol[j + 3] = GOLD_COL[0] * lb; lCol[j + 4] = GOLD_COL[1] * lb; lCol[j + 5] = GOLD_COL[2] * lb;
    }

    dotPoints.geometry.attributes.position.needsUpdate = true;
    dotPoints.geometry.attributes.aBright.needsUpdate = true;
    dotPoints.geometry.attributes.aColor.needsUpdate = true;
    connectors.geometry.attributes.position.needsUpdate = true;
    connectors.geometry.attributes.color.needsUpdate = true;
  });

  return (
    <>
      {/* Soft fill light (most elements are emissive; this is gentle shading). */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 3, 4]} intensity={0.6} color={WHITE} />

      {/* Two crossed white-outline halos. */}
      <lineSegments ref={haloA} geometry={haloEdges}>
        <lineBasicMaterial color={WHITE} transparent opacity={0.9} toneMapped={false} />
      </lineSegments>
      <lineSegments ref={haloB} geometry={haloEdges} rotation={[0, 0, Math.PI / 2]}>
        <lineBasicMaterial color={WHITE} transparent opacity={0.9} toneMapped={false} />
      </lineSegments>

      {/* Neuron → core tethers + ethereal drifting glow points. */}
      <primitive object={connectors} />
      <primitive object={dotPoints} />

      {/* Gold ethereal core — glow sprite + nucleus + thin gold orbital rings. */}
      <group ref={coreGroup}>
        <primitive object={coreGlow} />
        <mesh ref={nucleus}>
          <sphereGeometry args={[0.07, 24, 24]} />
          <meshStandardMaterial color="#ffe9a8" emissive="#ffc247" emissiveIntensity={2.0} toneMapped={false} />
        </mesh>

        {ORBIT_TILTS.map((e, i) => (
          <mesh key={i} rotation={e}>
            <torusGeometry args={[ORBIT_R, 0.005, 8, 64]} />
            <meshStandardMaterial color="#ffc247" emissive="#ffc247" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </>
  );
}

export interface HelixLogoProps {
  /** Optional className for sizing the wrapper (e.g. Tailwind "h-40 w-40"). */
  className?: string;
  /** Optional inline styles for sizing (e.g. { width: 240, height: 240 }). */
  style?: CSSProperties;
}

/**
 * Drop-in logo. Renders its own transparent canvas, so it floats on any
 * background. Size it via `className` or `style` on the wrapper.
 */
export function HelixLogo({ className, style }: HelixLogoProps) {
  return (
    <div
      className={className}
      style={{ width: "100%", height: "100%", background: "transparent", ...style }}
    >
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        dpr={[1, 2]}
        gl={{ alpha: true, premultipliedAlpha: false, antialias: true }}
        onCreated={({ gl, scene }) => {
          // Keep the canvas truly transparent — no opaque backing square.
          gl.setClearColor(0x000000, 0);
          gl.setClearAlpha(0);
          scene.background = null;
        }}
      >
        <OrbScene />
      </Canvas>
    </div>
  );
}

export default HelixLogo;
