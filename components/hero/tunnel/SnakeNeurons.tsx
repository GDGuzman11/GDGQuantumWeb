'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getWorld } from '@/lib/world';
import { fireSynapse } from '@/lib/synapse';

/**
 * Circuit-snake neurons for the WHITE world (W3, redesigned).
 *
 * On the flip to white, neurons FIRE OUT from the core at the centre, one after
 * another, continuously. Each shoots straight out to a set length, then ROAMS in
 * Snake-style motion — only up / down / left / right, turning at right angles on
 * a grid. When two snakes collide they flash and spit a short line of code
 * (handled in the DOM `CodeFlashes` overlay via `fireSynapse`).
 *
 * Each snake lives in its own constant-z plane (varied per snake) so the field
 * has depth. All paths are rebuilt into one preallocated LineSegments buffer
 * each frame — head bright (accent, blooms), tail fading to ink so it reads on
 * the white page. Only runs while the world is white; idle/cleared in the dark
 * world. Lives in the gated desktop canvas, so it inherits the fallbacks.
 */

const MAX_SNAKES = 22;
const BODY = 14; // committed nodes kept (the snake's body length)
const STEP = 0.55; // grid cell size (turn spacing)
const SPEED = 2.6; // head speed (units/sec)
const FIRE_NODES = 5; // straight-out length before roaming begins
const TURN_PROB = 0.55; // chance to turn 90° at each grid node while roaming
const SPAWN_EVERY = 0.16; // seconds between firing a new snake (continuous)
const LIFE_NODES = 46; // recycle after this many committed nodes
const BOUND_X = 9.0;
const BOUND_Y = 5.6;
const COLLIDE_DIST = 0.42;
const COLLIDE_COOLDOWN = 0.18; // global throttle on synapse events
const Z_MIN = -1.6;
const Z_MAX = 0.8;

const DIRS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

type Snake = {
  active: boolean;
  path: THREE.Vector3[]; // [0] = live head, [1..] = committed grid nodes
  dir: [number, number];
  z: number;
  committed: number; // total nodes committed since spawn
};

const TAIL_COLOR = new THREE.Color(0.05, 0.07, 0.11); // ink on white
const HEAD_COLOR = new THREE.Color(0.2, 0.5, 1.6); // HDR accent → blooms

const VERT = /* glsl */ `
  attribute float aFade;
  varying float vFade;
  void main(){
    vFade = aFade;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uOpacity;
  uniform vec3 uTail;
  uniform vec3 uHead;
  varying float vFade;
  void main(){
    vec3 col = mix(uTail, uHead, pow(vFade, 1.6));   // bright at the head
    float a = (0.28 + vFade * 0.72) * uOpacity;
    gl_FragColor = vec4(col, a);
  }
`;

export function SnakeNeurons() {
  const { camera, size } = useThree();
  const lineRef = useRef<THREE.LineSegments>(null);

  // Pool of snakes (plain refs — never React state).
  const snakes = useRef<Snake[]>(
    Array.from({ length: MAX_SNAKES }, () => ({
      active: false,
      path: [],
      dir: [1, 0] as [number, number],
      z: 0,
      committed: 0,
    })),
  );
  const spawnTimer = useRef(0);
  const collideCooldown = useRef(0);
  const wasWhite = useRef(false);

  const MAX_SEGS = MAX_SNAKES * (BODY + 1);
  const positions = useMemo(() => new Float32Array(MAX_SEGS * 2 * 3), [MAX_SEGS]);
  const fades = useMemo(() => new Float32Array(MAX_SEGS * 2), [MAX_SEGS]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aFade', new THREE.BufferAttribute(fades, 1));
    g.setDrawRange(0, 0);
    return g;
  }, [positions, fades]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uOpacity: { value: 0 },
          uTail: { value: TAIL_COLOR },
          uHead: { value: HEAD_COLOR },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false,
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
    const s = snakes.current.find((sn) => !sn.active);
    if (!s) return;
    const z = Z_MIN + Math.random() * (Z_MAX - Z_MIN);
    s.active = true;
    s.z = z;
    s.dir = DIRS[(Math.random() * 4) | 0];
    s.committed = 0;
    s.path = [new THREE.Vector3(0, 0, z)]; // head at the core centre
  };

  const turn = (s: Snake) => {
    // Pick a perpendicular direction (never reverse) → a right-angle turn.
    const [dx] = s.dir;
    if (dx !== 0) s.dir = Math.random() < 0.5 ? [0, 1] : [0, -1];
    else s.dir = Math.random() < 0.5 ? [1, 0] : [-1, 0];
  };

  useFrame((_st, delta) => {
    const dt = Math.min(delta, 0.05);
    const w = getWorld();
    const opacity = THREE.MathUtils.smoothstep(w, 0.45, 1.0);
    material.uniforms.uOpacity.value = opacity;
    collideCooldown.current = Math.max(0, collideCooldown.current - dt);

    // Reset the field when returning to the dark world so a re-toggle is fresh.
    if (w < 0.05) {
      if (wasWhite.current) {
        for (const s of snakes.current) {
          s.active = false;
          s.path = [];
        }
        geometry.setDrawRange(0, 0);
        wasWhite.current = false;
      }
      if (lineRef.current) lineRef.current.visible = false;
      return;
    }
    wasWhite.current = true;
    if (lineRef.current) lineRef.current.visible = true;

    // Continuously fire new snakes from the core.
    spawnTimer.current += dt;
    while (spawnTimer.current >= SPAWN_EVERY) {
      spawnTimer.current -= SPAWN_EVERY;
      spawn();
    }

    // Advance every active snake.
    for (const s of snakes.current) {
      if (!s.active) continue;
      const head = s.path[0];
      head.x += s.dir[0] * SPEED * dt;
      head.y += s.dir[1] * SPEED * dt;

      const anchor = s.path[1] ?? new THREE.Vector3(0, 0, s.z);
      const dist = Math.hypot(head.x - anchor.x, head.y - anchor.y);
      if (dist >= STEP) {
        // Commit a node exactly STEP from the anchor along the current dir.
        const node = new THREE.Vector3(
          anchor.x + s.dir[0] * STEP,
          anchor.y + s.dir[1] * STEP,
          s.z,
        );
        s.path.splice(1, 0, node);
        head.copy(node); // head continues from the fresh node
        if (s.path.length > BODY + 1) s.path.pop();
        s.committed++;

        // Roaming: maybe turn at the grid node. Firing phase keeps going straight.
        if (s.committed > FIRE_NODES && Math.random() < TURN_PROB) turn(s);

        // Collision test against other active snakes' nodes (screen-plane XY).
        if (collideCooldown.current === 0) {
          for (const o of snakes.current) {
            if (o === s || !o.active) continue;
            let hit = false;
            for (let i = 1; i < o.path.length; i++) {
              const p = o.path[i];
              if (Math.hypot(node.x - p.x, node.y - p.y) < COLLIDE_DIST) {
                hit = true;
                break;
              }
            }
            if (hit) {
              const v = node.clone().project(camera);
              fireSynapse(
                (v.x * 0.5 + 0.5) * size.width,
                (-v.y * 0.5 + 0.5) * size.height,
              );
              collideCooldown.current = COLLIDE_COOLDOWN;
              break;
            }
          }
        }
      }

      // Recycle when too long or out of bounds.
      if (
        s.committed > LIFE_NODES ||
        Math.abs(head.x) > BOUND_X ||
        Math.abs(head.y) > BOUND_Y
      ) {
        s.active = false;
        s.path = [];
      }
    }

    // Rebuild the line buffer from all active snakes' paths.
    let seg = 0;
    for (const s of snakes.current) {
      if (!s.active || s.path.length < 2) continue;
      for (let i = 0; i < s.path.length - 1; i++) {
        const a = s.path[i];
        const b = s.path[i + 1];
        const o = seg * 6;
        positions[o] = a.x;
        positions[o + 1] = a.y;
        positions[o + 2] = a.z;
        positions[o + 3] = b.x;
        positions[o + 4] = b.y;
        positions[o + 5] = b.z;
        const fA = 1 - i / BODY;
        const fB = 1 - (i + 1) / BODY;
        fades[seg * 2] = Math.max(0, fA);
        fades[seg * 2 + 1] = Math.max(0, fB);
        seg++;
        if (seg >= MAX_SEGS) break;
      }
      if (seg >= MAX_SEGS) break;
    }
    geometry.setDrawRange(0, seg * 2);
    (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.aFade as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry} material={material} frustumCulled={false} visible={false} />
  );
}
