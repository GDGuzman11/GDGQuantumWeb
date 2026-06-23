/**
 * The three playable tanks. Simple procedural designs (drawn in render.ts) +
 * one light perk each so the pick matters without unbalancing.
 */
export interface TankDef {
  id: string;
  name: string;
  color: string;
  accent: string;
  perk: string;
  dmgTakenMul: number; // <1 = tougher
  moveMul: number; // >1 = more fuel
  blastMul: number; // >1 = bigger blasts
}

export const TANKS: TankDef[] = [
  {
    id: 'rock',
    name: 'GRANITE',
    color: '#ffae5d',
    accent: '#ffd9a8',
    perk: 'ARMOUR · takes 15% less damage',
    dmgTakenMul: 0.85,
    moveMul: 1,
    blastMul: 1,
  },
  {
    id: 'ice',
    name: 'COMET',
    color: '#7fdfff',
    accent: '#cdf3ff',
    perk: 'THRUSTERS · 40% more move fuel',
    dmgTakenMul: 1,
    moveMul: 1.4,
    blastMul: 1,
  },
  {
    id: 'energy',
    name: 'PULSAR',
    color: '#c08bff',
    accent: '#e6d4ff',
    perk: 'OVERCHARGE · 12% bigger blasts',
    dmgTakenMul: 1,
    moveMul: 1,
    blastMul: 1.12,
  },
];

export function tankById(id: string): TankDef {
  return TANKS.find((t) => t.id === id) ?? TANKS[0];
}
