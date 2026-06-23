/**
 * Procedural wall textures for the raycaster — generated into small offscreen
 * canvases at runtime (no asset files, no CSP surface). Each is 64x64 and the
 * raycaster samples 1px-wide columns from them. STARSHELL look: dark sci-fi
 * panels with neon seams (our own brand — Star Wars scale, arcade punch).
 */
export type Tex = HTMLCanvasElement;
export const TEX_SIZE = 64;

function panel(base: string, seam: string, rivet: string): Tex {
  const c = document.createElement('canvas');
  c.width = TEX_SIZE;
  c.height = TEX_SIZE;
  const x = c.getContext('2d')!;
  x.fillStyle = base;
  x.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  // subtle noise
  for (let i = 0; i < 420; i++) {
    x.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
    x.fillRect(Math.random() * TEX_SIZE, Math.random() * TEX_SIZE, 1, 1);
  }
  // panel seams (glowing)
  x.strokeStyle = seam;
  x.lineWidth = 2;
  x.strokeRect(1, 1, TEX_SIZE - 2, TEX_SIZE - 2);
  x.beginPath();
  x.moveTo(TEX_SIZE / 2, 2);
  x.lineTo(TEX_SIZE / 2, TEX_SIZE - 2);
  x.stroke();
  // rivets
  x.fillStyle = rivet;
  for (const [px, py] of [[8, 8], [56, 8], [8, 56], [56, 56], [32, 32]]) {
    x.beginPath();
    x.arc(px, py, 2, 0, Math.PI * 2);
    x.fill();
  }
  return c;
}

function hazard(): Tex {
  const c = document.createElement('canvas');
  c.width = TEX_SIZE;
  c.height = TEX_SIZE;
  const x = c.getContext('2d')!;
  x.fillStyle = '#15171f';
  x.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  for (let i = -TEX_SIZE; i < TEX_SIZE; i += 12) {
    x.fillStyle = (i / 12) % 2 === 0 ? '#e6b800' : '#1b1d26';
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i + 12, 0);
    x.lineTo(i + 12 + TEX_SIZE, TEX_SIZE);
    x.lineTo(i + TEX_SIZE, TEX_SIZE);
    x.closePath();
    x.fill();
  }
  x.strokeStyle = '#2a2d3a';
  x.strokeRect(1, 1, TEX_SIZE - 2, TEX_SIZE - 2);
  return c;
}

/** Tiling floor grid — dark metal deck with glowing seams. */
export function groundTex(): Tex {
  const c = document.createElement('canvas');
  c.width = TEX_SIZE;
  c.height = TEX_SIZE;
  const x = c.getContext('2d')!;
  x.fillStyle = '#0e1018';
  x.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  for (let i = 0; i < 300; i++) {
    x.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    x.fillRect(Math.random() * TEX_SIZE, Math.random() * TEX_SIZE, 1, 1);
  }
  x.strokeStyle = '#243047';
  x.lineWidth = 2;
  x.strokeRect(0, 0, TEX_SIZE, TEX_SIZE);
  return c;
}

/** A billboard enemy sprite — armoured void-construct (transparent bg). */
export function enemyTex(): Tex {
  const W = 32;
  const H = 48;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  const px = (xx: number, yy: number, w: number, h: number, col: string) => {
    x.fillStyle = col;
    x.fillRect(xx, yy, w, h);
  };
  // legs
  px(10, 36, 4, 11, '#2a2f45');
  px(18, 36, 4, 11, '#2a2f45');
  // torso (armoured)
  px(8, 18, 16, 20, '#3b4366');
  px(8, 18, 16, 3, '#525d8a');
  // chest core (glow)
  px(14, 24, 4, 5, '#ff4d5e');
  px(13, 25, 6, 3, '#ff8a96');
  // arms
  px(4, 20, 4, 14, '#2f3651');
  px(24, 20, 4, 14, '#2f3651');
  // head / visor
  px(11, 6, 10, 12, '#343b59');
  px(12, 10, 8, 3, '#ff4d5e'); // glowing visor
  px(12, 10, 8, 1, '#ffd0d4');
  return c;
}

let cache: Tex[] | null = null;
/** Lazily build the texture set (client-only). */
export function getTextures(): Tex[] {
  if (cache) return cache;
  cache = [
    panel('#1c2233', '#3a6ea5', '#5a7fb5'), // blue tech
    panel('#241c2e', '#7a4bb0', '#a06fd0'), // violet tech
    panel('#22201a', '#b06a2a', '#d08a4a'), // rust
    hazard(), // hazard stripes
  ];
  return cache;
}
