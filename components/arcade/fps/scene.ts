/**
 * Builds the Three.js world from a Level3D. Low-poly boxes + canvas textures
 * (nearest-filtered) under simple lighting + fog — rendered at low resolution
 * (see useFpsLoop) and CSS-upscaled for the '93 pixel look.
 */
import * as THREE from 'three';
import type { Level3D } from './level3d';
import { getTextures, groundTex } from './textures';

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

export function buildWorld(level: Level3D): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05060c');
  scene.fog = new THREE.Fog('#05060c', 8, level.size * 1.1);

  scene.add(new THREE.AmbientLight('#7088b0', 1.1));
  const dir = new THREE.DirectionalLight('#cfe0ff', 1.2);
  dir.position.set(0.4, 1, 0.25);
  scene.add(dir);

  const disposables: { dispose: () => void }[] = [];

  // Ground
  const gtex = tex(groundTex(), level.size);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(level.size, level.size),
    new THREE.MeshLambertMaterial({ map: gtex }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  disposables.push(ground.geometry, ground.material as THREE.Material, gtex);

  // Wall/box materials (one per texture, shared)
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

  // Ladder visuals (emissive rungs)
  const ladMat = new THREE.MeshBasicMaterial({ color: '#7fdfff' });
  disposables.push(ladMat);
  for (const l of level.ladders) {
    // Thin rungs spanning the ladder's wide axis (faces ±z if sx>sz, else ±x).
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

  return {
    scene,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
