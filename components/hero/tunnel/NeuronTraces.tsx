'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getWorld } from '@/lib/world';

/**
 * Neuron traces (white world) — the bust "thinking" as data, then leaking out.
 *
 * Bright glowing traces spawn INSIDE the bust region and move in axis-aligned
 * Snake-style steps — only up / down / left / right, turning at random. They
 * keep their heading as they cross the bust's edge, so a trace moving right
 * leaves to the right and continues onto the landing page, randomising its
 * up/down/left/right turns out there before recycling. Not a regular grid —
 * independent traces at random positions/directions.
 *
 * One preallocated LineSegments buffer, rebuilt each frame; HDR per-trace colour
 * (head bright → tail fades) so they bloom and read on the white page. White-
 * world only (driven by getWorld); idle/cleared in the dark world. Lives in the
 * gated desktop canvas, so it inherits the fallbacks.
 */

const MAX = 30;
const BODY = 16; // trail length (nodes)
const STEP = 0.5; // grid cell (turn spacing)
const SPEED = 2.5; // head speed
const TURN_PROB = 0.5; // chance of a 90° turn at each node
const SPAWN_EVERY = 0.11; // seconds between new traces
const LIFE_NODES = 64; // recycle after this many nodes
const BOUND_X = 9.2;
const BOUND_Y = 5.6;
// Spawn box (inside the bust's screen region) — see ChromeBust POSITION/size.
const ORIGIN = new THREE.Vector3(0, 0.2, -2.0);
const SPAWN_HALF = new THREE.Vector2(1.5, 2.3);

const DIRS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

type Trace = {
  active: boolean;
  path: THREE.Vector3[];
  dir: [number, number];
  color: THREE.Color;
  committed: number;
};

const VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute float aFade;
  varying vec3 vColor;
  varying float vFade;
  void main(){
    vColor = aColor;
    vFade = aFade;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vFade;
  void main(){
    // Dark trace, head fully opaque → fades along the tail. Keep the colour dark
    // (don't brighten toward the head) so it CONTRASTS the white page.
    float a = (0.22 + vFade * 0.78) * uOpacity;
    gl_FragColor = vec4(vColor, a);
  }
`;

function traceColor(): THREE.Color {
  // Dark, saturated ink colours (low lightness) so they read on the white page.
  return new THREE.Color().setHSL(Math.random(), 0.8, 0.22);
}

export function NeuronTraces() {
  const lineRef = useRef<THREE.LineSegments>(null);
  const traces = useRef<Trace[]>(
    Array.from({ length: MAX }, () => ({
      active: false,
      path: [],
      dir: [1, 0] as [number, number],
      color: new THREE.Color(),
      committed: 0,
    })),
  );
  const spawnTimer = useRef(0);
  const wasWhite = useRef(false);

  const MAX_SEGS = MAX * (BODY + 1);
  const positions = useMemo(() => new Float32Array(MAX_SEGS * 2 * 3), [MAX_SEGS]);
  const colors = useMemo(() => new Float32Array(MAX_SEGS * 2 * 3), [MAX_SEGS]);
  const fades = useMemo(() => new Float32Array(MAX_SEGS * 2), [MAX_SEGS]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('aFade', new THREE.BufferAttribute(fades, 1));
    g.setDrawRange(0, 0);
    return g;
  }, [positions, colors, fades]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 0 } },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false, // always visible, including over the chrome bust
      }),
    [],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  const spawn = () => {
    const t = traces.current.find((x) => !x.active);
    if (!t) return;
    t.active = true;
    t.dir = DIRS[(Math.random() * 4) | 0];
    t.committed = 0;
    t.color = traceColor();
    const start = new THREE.Vector3(
      ORIGIN.x + (Math.random() * 2 - 1) * SPAWN_HALF.x,
      ORIGIN.y + (Math.random() * 2 - 1) * SPAWN_HALF.y,
      ORIGIN.z,
    );
    // Seed BOTH the moving head [0] and a fixed first node [1] at the spawn point,
    // so the head measures its travel against a stationary anchor and commits.
    t.path = [start.clone(), start.clone()];
  };

  const turn = (t: Trace) => {
    const [dx] = t.dir;
    if (dx !== 0) t.dir = Math.random() < 0.5 ? [0, 1] : [0, -1];
    else t.dir = Math.random() < 0.5 ? [1, 0] : [-1, 0];
  };

  useFrame((_s, delta) => {
    const dt = Math.min(delta, 0.05);
    const w = getWorld();
    material.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(w, 0.6, 1.0);

    if (w < 0.05) {
      if (wasWhite.current) {
        for (const t of traces.current) {
          t.active = false;
          t.path = [];
        }
        geometry.setDrawRange(0, 0);
        wasWhite.current = false;
      }
      if (lineRef.current) lineRef.current.visible = false;
      return;
    }
    wasWhite.current = true;
    if (lineRef.current) lineRef.current.visible = true;

    spawnTimer.current += dt;
    while (spawnTimer.current >= SPAWN_EVERY) {
      spawnTimer.current -= SPAWN_EVERY;
      spawn();
    }

    for (const t of traces.current) {
      if (!t.active) continue;
      const head = t.path[0];
      head.x += t.dir[0] * SPEED * dt;
      head.y += t.dir[1] * SPEED * dt;

      const anchor = t.path[1];
      if (Math.hypot(head.x - anchor.x, head.y - anchor.y) >= STEP) {
        const node = new THREE.Vector3(
          anchor.x + t.dir[0] * STEP,
          anchor.y + t.dir[1] * STEP,
          ORIGIN.z,
        );
        t.path.splice(1, 0, node);
        head.copy(node);
        if (t.path.length > BODY + 1) t.path.pop();
        t.committed++;
        if (Math.random() < TURN_PROB) turn(t);
      }

      if (
        t.committed > LIFE_NODES ||
        Math.abs(head.x) > BOUND_X ||
        Math.abs(head.y) > BOUND_Y
      ) {
        t.active = false;
        t.path = [];
      }
    }

    // Rebuild the buffer.
    let seg = 0;
    for (const t of traces.current) {
      if (!t.active || t.path.length < 2) continue;
      for (let i = 0; i < t.path.length - 1; i++) {
        if (seg >= MAX_SEGS) break;
        const a = t.path[i];
        const b = t.path[i + 1];
        const o = seg * 6;
        positions[o] = a.x; positions[o + 1] = a.y; positions[o + 2] = a.z;
        positions[o + 3] = b.x; positions[o + 4] = b.y; positions[o + 5] = b.z;
        colors[o] = t.color.r; colors[o + 1] = t.color.g; colors[o + 2] = t.color.b;
        colors[o + 3] = t.color.r; colors[o + 4] = t.color.g; colors[o + 5] = t.color.b;
        fades[seg * 2] = Math.max(0, 1 - i / BODY);
        fades[seg * 2 + 1] = Math.max(0, 1 - (i + 1) / BODY);
        seg++;
      }
      if (seg >= MAX_SEGS) break;
    }
    geometry.setDrawRange(0, seg * 2);
    (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.aFade as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry} material={material} frustumCulled={false} visible={false} />
  );
}
