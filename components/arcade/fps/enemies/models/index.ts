/**
 * Enemy model dispatcher. Phase 1 ships the generic trooper for every class;
 * Phase 2 adds the 10 per-class builders into ENEMY_BUILDERS. Also a disposal
 * helper that frees a model's geometries + materials on level rebuild.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { buildTrooper } from './trooper';

type Builder = (tier: RenderTier) => THREE.Group;

const ENEMY_BUILDERS: Record<string, Builder> = {
  // Phase 2: rifleman / scout / breacher / marksman / suppressor / engineer /
  // tank / elite / commander / berserker. Until then everything is the trooper.
};

export function buildEnemyModel(cls: string, tier: RenderTier): THREE.Group {
  return (ENEMY_BUILDERS[cls] ?? buildTrooper)(tier);
}

export function disposeEnemyModel(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else if (mat) mat.dispose();
  });
}
