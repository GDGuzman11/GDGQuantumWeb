/**
 * Canvas2D raycaster (Wolfenstein/early-Doom style). Renders at a low internal
 * resolution (the canvas backing store) and is CSS-upscaled with
 * image-rendering: pixelated for the '93 look. Walls are textured via 1px-wide
 * drawImage column slices; floor/ceiling are flat with a horizon.
 */
import { cell, type Level } from './map';
import type { Player } from './player';
import { TEX_SIZE, type Tex } from './textures';

export function renderView(
  ctx: CanvasRenderingContext2D,
  lvl: Level,
  p: Player,
  textures: Tex[],
  W: number,
  H: number,
): void {
  // Ceiling + floor
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, 0, W, H / 2);
  const floor = ctx.createLinearGradient(0, H / 2, 0, H);
  floor.addColorStop(0, '#191c26');
  floor.addColorStop(1, '#0c0e16');
  ctx.fillStyle = floor;
  ctx.fillRect(0, H / 2, W, H / 2);

  for (let x = 0; x < W; x++) {
    const cameraX = (2 * x) / W - 1;
    const rayX = p.dirX + p.planeX * cameraX;
    const rayY = p.dirY + p.planeY * cameraX;

    let mapX = Math.floor(p.x);
    let mapY = Math.floor(p.y);
    const deltaX = Math.abs(1 / rayX);
    const deltaY = Math.abs(1 / rayY);

    let stepX: number;
    let stepY: number;
    let sideX: number;
    let sideY: number;
    if (rayX < 0) {
      stepX = -1;
      sideX = (p.x - mapX) * deltaX;
    } else {
      stepX = 1;
      sideX = (mapX + 1 - p.x) * deltaX;
    }
    if (rayY < 0) {
      stepY = -1;
      sideY = (p.y - mapY) * deltaY;
    } else {
      stepY = 1;
      sideY = (mapY + 1 - p.y) * deltaY;
    }

    let hit = 0;
    let side = 0;
    let guard = 0;
    while (hit === 0 && guard++ < 256) {
      if (sideX < sideY) {
        sideX += deltaX;
        mapX += stepX;
        side = 0;
      } else {
        sideY += deltaY;
        mapY += stepY;
        side = 1;
      }
      hit = cell(lvl, mapX, mapY);
    }

    const perp = side === 0 ? sideX - deltaX : sideY - deltaY;
    const lineH = Math.floor(H / Math.max(0.0001, perp));
    const drawStart = -lineH / 2 + H / 2;

    // Texture column
    let wallX = side === 0 ? p.y + perp * rayY : p.x + perp * rayX;
    wallX -= Math.floor(wallX);
    let texX = Math.floor(wallX * TEX_SIZE);
    if ((side === 0 && rayX > 0) || (side === 1 && rayY < 0)) texX = TEX_SIZE - texX - 1;
    const tex = textures[(hit - 1) % textures.length];
    ctx.drawImage(tex, texX, 0, 1, TEX_SIZE, x, drawStart, 1, lineH);

    // Distance + side shading
    const shade = Math.min(0.82, perp / 9) + (side === 1 ? 0.16 : 0);
    if (shade > 0.01) {
      ctx.fillStyle = `rgba(4,5,12,${Math.min(0.85, shade)})`;
      ctx.fillRect(x, drawStart, 1, lineH);
    }
  }
}
