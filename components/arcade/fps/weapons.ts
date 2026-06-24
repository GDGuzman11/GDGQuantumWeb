/**
 * Player gun arsenal — across the rifle / MG / laser / sniper / pistol families,
 * each with its own feel (auto vs semi, fire rate, damage, mag, reload, ADS
 * zoom, tracer colour). Hitscan. The loadout is 2 primaries + 1 sidearm; the
 * full 20-weapon pool + selection screen + gold shop build on top of this.
 */
export type Family = 'rifle' | 'mg' | 'laser' | 'sniper' | 'pistol';

export interface GunDef {
  id: string;
  name: string;
  family: Family;
  dmg: number;
  rate: number; // seconds between shots
  mag: number;
  reserve: number;
  reload: number;
  auto: boolean; // hold-to-fire vs one-per-click
  scoped: boolean; // sniper scope overlay on ADS
  hipFov: number;
  adsFov: number;
  color: number; // tracer colour
}

export const GUNS: GunDef[] = [
  { id: 'ar', name: 'PULSE AR', family: 'rifle', dmg: 28, rate: 0.11, mag: 30, reserve: 180, reload: 1.6, auto: true, scoped: false, hipFov: 78, adsFov: 58, color: 0xffe9a8 },
  { id: 'carbine', name: 'CARBINE', family: 'rifle', dmg: 40, rate: 0.22, mag: 20, reserve: 140, reload: 1.5, auto: false, scoped: false, hipFov: 78, adsFov: 55, color: 0xffd27a },
  { id: 'smg', name: 'NOVA SMG', family: 'mg', dmg: 19, rate: 0.07, mag: 40, reserve: 280, reload: 1.7, auto: true, scoped: false, hipFov: 80, adsFov: 64, color: 0xff8a96 },
  { id: 'lmg', name: 'SIEGE LMG', family: 'mg', dmg: 26, rate: 0.09, mag: 75, reserve: 300, reload: 2.6, auto: true, scoped: false, hipFov: 80, adsFov: 64, color: 0xff5d6e },
  { id: 'pulse', name: 'ION REPEATER', family: 'laser', dmg: 22, rate: 0.08, mag: 50, reserve: 250, reload: 1.8, auto: true, scoped: false, hipFov: 78, adsFov: 58, color: 0x7fdfff },
  { id: 'beam', name: 'LANCE BEAM', family: 'laser', dmg: 58, rate: 0.42, mag: 12, reserve: 90, reload: 2.0, auto: false, scoped: false, hipFov: 78, adsFov: 48, color: 0x9af0ff },
  { id: 'rail', name: 'RAILGUN', family: 'sniper', dmg: 130, rate: 0.95, mag: 5, reserve: 40, reload: 2.4, auto: false, scoped: true, hipFov: 78, adsFov: 22, color: 0xc8a8ff },
  { id: 'marksman', name: 'MARKSMAN', family: 'sniper', dmg: 85, rate: 0.5, mag: 10, reserve: 60, reload: 2.0, auto: false, scoped: true, hipFov: 78, adsFov: 38, color: 0xd8c0ff },
  { id: 'sidearm', name: 'SIDEARM', family: 'pistol', dmg: 32, rate: 0.2, mag: 14, reserve: 90, reload: 1.2, auto: false, scoped: false, hipFov: 78, adsFov: 60, color: 0xaef5c8 },
];

export function gunById(id: string): GunDef {
  return GUNS.find((g) => g.id === id) ?? GUNS[0];
}

/** Default loadout: 2 primaries + 1 sidearm (selection screen comes later). */
export const DEFAULT_LOADOUT = ['ar', 'rail', 'sidearm'];
