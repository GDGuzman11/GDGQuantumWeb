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
