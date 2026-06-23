/**
 * Builds the Three.js world from a Level3D. Low-poly boxes + canvas textures
 * (nearest-filtered) under lighting + light fog, wrapped in a vivid, seeded
 * universe backdrop (nebula sky sphere + a starfield of points — the same
 * Three.js approach as the landing's constellation, turned up). Rendered at low
 * resolution (see useFpsLoop) and CSS-upscaled for the '93 pixel look. Every
 * level's sky is different (seeded), so each arena has its own view.
 */
import * as THREE from 'three';
import type { Level3D } from './level3d';
import { getTextures, groundTex } from './textures';
import { rng } from './rand';

export interface World {
  scene: THREE.Scene;
  dispose: () => void;
}

function tex(canvas: HTMLCanvasElement, repeat = 1): THREE.Texture {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const PALETTES: string[][] = [
  ['#3a6ea5', '#7a4bb0', '#c44b8f'],
  ['#2aa1a1', '#4b6bb0', '#8f4bc4'],
  ['#b0742a', '#7a4bb0', '#3a6ea5'],
  ['#4bc47a', '#2aa1a1', '#4b6bb0'],
  ['#c44b6b', '#8f4bc4', '#4b6bb0'],
];

/** Seeded nebula backdrop (equirect canvas → sky sphere). */
function nebula(seed: number): HTMLCanvasElement {
  const r = rng(seed ^ 0x51ed);
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = '#05060e';
  x.fillRect(0, 0, c.width, c.height);
  const pal = PALETTES[Math.floor(r() * PALETTES.length)];
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const cxp = r() * c.width;
    const cyp = r() * c.height;
    const rad = 90 + r() * 240;
    const col = pal[Math.floor(r() * pal.length)];
    const g = x.createRadialGradient(cxp, cyp, 0, cxp, cyp, rad);
    g.addColorStop(0, col + 'cc');
    g.addColorStop(1, col + '00');
    x.fillStyle = g;
    x.fillRect(cxp - rad, cyp - rad, rad * 2, rad * 2);
  }
  x.globalCompositeOperation = 'source-over';
  return c;
}

/** Seeded starfield as additive points on a far sphere. */
function starfield(seed: number, radius: number): THREE.Points {
  const r = rng(seed ^ 0x9a17);
  const N = 900;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const tints = [
    [1, 1, 1],
    [0.6, 0.8, 1],
    [1, 0.85, 0.5],
    [0.8, 0.6, 1],
    [0.6, 1, 0.9],
  ];
  for (let i = 0; i < N; i++) {
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(th) * s * radius;
    pos[i * 3 + 1] = Math.abs(u) * radius * 0.9 + 4; // bias above the horizon
    pos[i * 3 + 2] = Math.sin(th) * s * radius;
    const t = tints[Math.floor(r() * tints.length)];
    const b = 0.6 + r() * 0.4;
    col[i * 3] = t[0] * b;
    col[i * 3 + 1] = t[1] * b;
    col[i * 3 + 2] = t[2] * b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 2,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.renderOrder = -1;
  return pts;
}

export function buildWorld(level: Level3D): World {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#0a0e1c', level.size * 0.45, level.size * 1.9);

  // Brighter lighting (it was too dark)
  scene.add(new THREE.HemisphereLight('#bcd0ff', '#28304a', 1.4));
  const dir = new THREE.DirectionalLight('#dfe8ff', 1.5);
  dir.position.set(0.4, 1, 0.25);
  scene.add(dir);
  scene.add(new THREE.AmbientLight('#56607e', 0.6));

  const disposables: { dispose: () => void }[] = [];

  // Universe backdrop — nebula sky sphere + starfield (seeded, unfogged)
  const skyTex = new THREE.CanvasTexture(nebula(level.seed));
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(level.size * 3, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  scene.add(sky);
  disposables.push(sky.geometry, sky.material as THREE.Material, skyTex);
  const stars = starfield(level.seed, level.size * 2.4);
  scene.add(stars);
  disposables.push(stars.geometry, stars.material as THREE.Material);

  // Ground
  const gtex = tex(groundTex(), level.size);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(level.size, level.size),
    new THREE.MeshLambertMaterial({ map: gtex }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  disposables.push(ground.geometry, ground.material as THREE.Material, gtex);

  // Walls / boxes
  const canvases = getTextures();
  const mats = canvases.map((c) => new THREE.MeshLambertMaterial({ map: tex(c) }));
  disposables.push(...mats);
  for (const b of level.boxes) {
    const geo = new THREE.BoxGeometry(b.sx, b.sy, b.sz);
    const mesh = new THREE.Mesh(geo, mats[b.tex % mats.length]);
    mesh.position.set(b.x, b.y, b.z);
    scene.add(mesh);
    disposables.push(geo);
  }

  // Ladder rungs (thin emissive bars, orientation-aware)
  const ladMat = new THREE.MeshBasicMaterial({ color: '#7fdfff' });
  disposables.push(ladMat);
  for (const l of level.ladders) {
    const along = l.sx >= l.sz;
    const rw = along ? l.sx : 0.1;
    const rd = along ? 0.1 : l.sz;
    for (let y = l.y0 + 0.35; y < l.y1; y += 0.45) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.06, rd), ladMat);
      rung.position.set(l.x, y, l.z);
      scene.add(rung);
      disposables.push(rung.geometry);
    }
  }

  return { scene, dispose: () => disposables.forEach((d) => d.dispose()) };
}
