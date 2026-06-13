'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getWorld } from '@/lib/world';

/**
 * Neuron network for the WHITE world (W3).
 *
 * When the orb flips the world white, the additive flow particles fade out and
 * THIS fades in: a constellation of nodes wired to their nearest neighbours,
 * with bright "signals" travelling along the connections — the flowing tunnel
 * "transforms" into an interconnected neural net (masked by the white flash at
 * the midpoint). Dark ink lines/nodes + an accent-blue signal read crisply on
 * the white page (normal blending — additive would be invisible on white).
 *
 * Lives in the same canvas, site-wide. Opacity is driven by `getWorld()` so it
 * only appears in the white world; the whole group hides at world≈0 so it costs
 * nothing in the dark world. All animation is in-shader (no per-frame CPU work).
 */

const NODES = 130;
const NEIGHBORS = 3; // edges per node (deduped)
const SPREAD = new THREE.Vector3(6.2, 3.7, 2.4); // ellipsoid half-extents
const NODE_COLOR = new THREE.Color(0.05, 0.07, 0.11); // ink on white
const SIGNAL_COLOR = new THREE.Color(0.16, 0.42, 1.0); // accent blue pulse

const NODE_VERT = /* glsl */ `
  uniform float uPixelRatio;
  attribute float aRand;
  varying float vRand;
  void main(){
    vRand = aRand;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (3.5 + aRand * 4.0) * uPixelRatio;
  }
`;

const NODE_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uSignal;
  varying float vRand;
  void main(){
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.18, d);
    float pulse = 0.5 + 0.5 * sin(uTime * 2.0 + vRand * 6.2831);
    vec3 col = mix(uColor, uSignal, pulse * 0.45);
    gl_FragColor = vec4(col, a * uOpacity);
  }
`;

const LINE_VERT = /* glsl */ `
  attribute float aT;
  attribute float aEdge;
  varying float vT;
  varying float vEdge;
  void main(){
    vT = aT;
    vEdge = aEdge;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const LINE_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uSignal;
  varying float vT;
  varying float vEdge;
  void main(){
    float base = 0.22;                                  // faint dark wire
    float head = fract(uTime * 0.22 + vEdge);           // signal position 0..1
    float s = exp(-pow((vT - head) * 8.0, 2.0));        // bright travelling dot
    vec3 col = mix(uColor, uSignal, s);
    float a = (base + s * 0.9) * uOpacity;
    gl_FragColor = vec4(col, a);
  }
`;

function build() {
  // Nodes in an ellipsoid (Gaussian-ish so the centre is denser, like a brain).
  const pos: THREE.Vector3[] = [];
  for (let i = 0; i < NODES; i++) {
    const u = Math.random();
    const r = Math.cbrt(u); // fill volume evenly-ish, slight centre bias
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * Math.PI * 2;
    pos.push(
      new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi) * SPREAD.x * r,
        Math.sin(theta) * Math.sin(phi) * SPREAD.y * r,
        Math.cos(theta) * SPREAD.z * r - 0.6,
      ),
    );
  }

  // Edges: connect each node to its nearest NEIGHBORS, deduped.
  const edgeKeys = new Set<string>();
  const edges: Array<[number, number]> = [];
  for (let i = 0; i < NODES; i++) {
    const dists = pos
      .map((p, j) => ({ j, d: p.distanceToSquared(pos[i]) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, NEIGHBORS);
    for (const { j } of dists) {
      const key = i < j ? `${i}_${j}` : `${j}_${i}`;
      if (!edgeKeys.has(key)) {
        edgeKeys.add(key);
        edges.push([i, j]);
      }
    }
  }

  // Node geometry.
  const nodePositions = new Float32Array(NODES * 3);
  const nodeRand = new Float32Array(NODES);
  pos.forEach((p, i) => {
    nodePositions[i * 3] = p.x;
    nodePositions[i * 3 + 1] = p.y;
    nodePositions[i * 3 + 2] = p.z;
    nodeRand[i] = Math.random();
  });
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
  nodeGeo.setAttribute('aRand', new THREE.BufferAttribute(nodeRand, 1));

  // Line geometry: 2 verts per edge, with aT (0→1 along edge) + aEdge (phase).
  const linePositions = new Float32Array(edges.length * 2 * 3);
  const lineT = new Float32Array(edges.length * 2);
  const lineEdge = new Float32Array(edges.length * 2);
  edges.forEach(([a, b], e) => {
    const pa = pos[a];
    const pb = pos[b];
    const o = e * 6;
    linePositions[o] = pa.x;
    linePositions[o + 1] = pa.y;
    linePositions[o + 2] = pa.z;
    linePositions[o + 3] = pb.x;
    linePositions[o + 4] = pb.y;
    linePositions[o + 5] = pb.z;
    lineT[e * 2] = 0;
    lineT[e * 2 + 1] = 1;
    const phase = Math.random();
    lineEdge[e * 2] = phase;
    lineEdge[e * 2 + 1] = phase;
  });
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeo.setAttribute('aT', new THREE.BufferAttribute(lineT, 1));
  lineGeo.setAttribute('aEdge', new THREE.BufferAttribute(lineEdge, 1));

  return { nodeGeo, lineGeo };
}

export function NeuronField() {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  const { nodeGeo, lineGeo } = useMemo(build, []);

  const nodeMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uPixelRatio: { value: 1 },
          uColor: { value: NODE_COLOR },
          uSignal: { value: SIGNAL_COLOR },
        },
        vertexShader: NODE_VERT,
        fragmentShader: NODE_FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );

  const lineMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uColor: { value: NODE_COLOR },
          uSignal: { value: SIGNAL_COLOR },
        },
        vertexShader: LINE_VERT,
        fragmentShader: LINE_FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      nodeGeo.dispose();
      lineGeo.dispose();
      nodeMat.dispose();
      lineMat.dispose();
    };
  }, [nodeGeo, lineGeo, nodeMat, lineMat]);

  useFrame((_s, delta) => {
    const dt = Math.min(delta, 0.05);
    const w = getWorld();
    // Appear only in the latter half of the flip (after the flash midpoint).
    const opacity = THREE.MathUtils.smoothstep(w, 0.45, 1.0);

    nodeMat.uniforms.uTime.value += dt;
    nodeMat.uniforms.uOpacity.value = opacity;
    nodeMat.uniforms.uPixelRatio.value = gl.getPixelRatio();
    lineMat.uniforms.uTime.value += dt;
    lineMat.uniforms.uOpacity.value = opacity;

    const g = groupRef.current;
    if (g) {
      g.visible = w > 0.01;
      g.rotation.y += dt * 0.02; // slow drift for life
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <points geometry={nodeGeo} material={nodeMat} frustumCulled={false} />
      <lineSegments geometry={lineGeo} material={lineMat} frustumCulled={false} />
    </group>
  );
}
