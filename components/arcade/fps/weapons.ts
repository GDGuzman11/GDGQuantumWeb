/**
 * Player gun arsenal — across the rifle / MG / laser / sniper / pistol families,
 * each with its own feel (auto vs semi, fire rate, damage, mag, reload, ADS
 * zoom, tracer colour). Hitscan. The loadout is 2 primaries + 1 sidearm; the
 * full 20-weapon pool + selection screen + gold shop build on top of this.
 */
export type Family = 'rifle' | 'mg' | 'laser' | 'sniper' | 'pistol' | 'launcher';

// OUTLANDER weapon taxonomy (from the reference sheets). CATEGORY = the sheet type;
// SECTION = the loadout slot it fills; TIER = free (starter) / premium / store.
export type WeaponCategory = 'assault' | 'alienAssault' | 'mg' | 'sniper' | 'rpg' | 'handgun';
export type WeaponSection = 'primary' | 'heavy' | 'secondary';
export type WeaponTier = 'free' | 'premium';

/** Which loadout SECTION each category fills. */
export const CATEGORY_SECTION: Record<WeaponCategory, WeaponSection> = {
  assault: 'primary',
  alienAssault: 'primary',
  mg: 'primary',
  sniper: 'heavy',
  rpg: 'heavy',
  handgun: 'secondary',
};
/** Which mechanical FAMILY (fire feel / audio / combat) each category maps to. */
export const CATEGORY_FAMILY: Record<WeaponCategory, Family> = {
  assault: 'rifle',
  alienAssault: 'rifle',
  mg: 'mg',
  sniper: 'sniper',
  rpg: 'launcher',
  handgun: 'pistol',
};
/** Human-readable category labels (store / loadout headers). */
export const CATEGORY_LABEL: Record<WeaponCategory, string> = {
  assault: 'Assault Rifle',
  alienAssault: 'Alien Assault Rifle',
  mg: 'Machine Gun',
  sniper: 'Sniper Rifle',
  rpg: 'RPG',
  handgun: 'Handgun',
};
export const SECTION_LABEL: Record<WeaponSection, string> = { primary: 'Primary', heavy: 'Heavy', secondary: 'Secondary' };

export interface GunDef {
  id: string;
  name: string;
  family: Family;
  category: WeaponCategory; // the reference-sheet type
  section: WeaponSection; // loadout slot (derived from category)
  tier: WeaponTier; // free starter vs premium
  owner: string; // whom the weapon belongs to (Store grouping) — 'outlander' for now
  dmg: number;
  rate: number; // seconds between shots
  mag: number;
  reserve: number;
  reload: number;
  auto: boolean; // hold-to-fire vs one-per-click
  scoped: boolean; // sniper scope overlay on ADS
  hipFov: number;
  adsFov: number;
  color: number; // tracer + muzzle-flash + gun-light colour (from the sheet art)
  caliber?: string; // flavour, from the sheet
  tagline?: string; // flavour, from the sheet
  splash?: number; // explosive AoE radius (launchers); 0/undefined = hitscan single-target
  burst?: number; // fires an N-round burst per trigger pull
  heat?: boolean; // energy weapon: no reload — builds heat + overheats instead
  charge?: number; // seconds to hold before the shot releases (snipers / heavy)
}

/** Compact starter row → expanded GunDef (fills family/section from the category). */
type Starter = {
  id: string;
  name: string;
  category: WeaponCategory;
  tier: WeaponTier;
  dmg: number;
  rate: number;
  mag: number;
  reserve: number;
  reload: number;
  auto: boolean;
  hipFov: number;
  adsFov: number;
  color: number;
  caliber?: string;
  tagline?: string;
  splash?: number;
  charge?: number;
  scoped?: boolean;
};
function starter(s: Starter): GunDef {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    section: CATEGORY_SECTION[s.category],
    family: CATEGORY_FAMILY[s.category],
    tier: s.tier,
    owner: 'outlander',
    dmg: s.dmg,
    rate: s.rate,
    mag: s.mag,
    reserve: s.reserve,
    reload: s.reload,
    auto: s.auto,
    scoped: s.scoped ?? s.category === 'sniper',
    hipFov: s.hipFov,
    adsFov: s.adsFov,
    color: s.color,
    caliber: s.caliber,
    tagline: s.tagline,
    ...(s.splash != null ? { splash: s.splash } : {}),
    ...(s.charge != null ? { charge: s.charge } : {}),
  };
}

// ── OUTLANDER STARTERS — 10 weapons available immediately (5 free + 5 premium) ──
// Colours are pulled from the reference sheets so the muzzle flash + gun lights match.
export const GUNS: GunDef[] = [
  // FREE (5) — a complete loadout on their own: 2 primary, 2 heavy, 1 secondary.
  starter({ id: 'aurora7', name: 'AURORA-7', category: 'assault', tier: 'free', dmg: 34, rate: 0.11, mag: 32, reserve: 224, reload: 1.6, auto: true, hipFov: 78, adsFov: 56, color: 0x8fbaff, caliber: '5.56×45mm', tagline: 'Light. Precise. Deadly.' }),
  starter({ id: 'm12vindicator', name: 'M-12 VINDICATOR', category: 'mg', tier: 'free', dmg: 24, rate: 0.07, mag: 60, reserve: 360, reload: 2.3, auto: true, hipFov: 82, adsFov: 66, color: 0x9fc0e0, caliber: '7.62mm', tagline: 'Reliable. Rugged. Ruthless.' }),
  starter({ id: 'vanguardsr1', name: 'VANGUARD SR-1', category: 'sniper', tier: 'free', dmg: 220, rate: 1.0, mag: 6, reserve: 36, reload: 2.4, auto: false, hipFov: 78, adsFov: 24, color: 0x9ec8ff, caliber: '.338 Lapua', tagline: 'Built for extreme distances.', charge: 0.5 }),
  starter({ id: 'm57punisher', name: 'M-57 PUNISHER', category: 'rpg', tier: 'free', dmg: 200, rate: 1.3, mag: 4, reserve: 16, reload: 2.6, auto: false, hipFov: 78, adsFov: 60, color: 0xffb04a, caliber: '90mm HEAT', tagline: 'Anti-armor devastation.', splash: 6 }),
  starter({ id: 'm7defender', name: 'M-7 DEFENDER', category: 'handgun', tier: 'free', dmg: 38, rate: 0.2, mag: 15, reserve: 105, reload: 1.1, auto: false, hipFov: 78, adsFov: 60, color: 0xaecbff, caliber: '9mm Kinetic', tagline: 'Always at your side.' }),
  // PREMIUM (5) — a tier up, mirroring the free set section-for-section.
  starter({ id: 'celestialaegis', name: 'CELESTIAL AEGIS', category: 'assault', tier: 'premium', dmg: 42, rate: 0.1, mag: 36, reserve: 252, reload: 1.5, auto: true, hipFov: 78, adsFov: 55, color: 0xffd27a, caliber: '6.8mm', tagline: 'Divine protection.' }),
  starter({ id: 'typhonmg3', name: 'TYPHON MG-3', category: 'mg', tier: 'premium', dmg: 27, rate: 0.06, mag: 75, reserve: 450, reload: 2.2, auto: true, hipFov: 82, adsFov: 66, color: 0x7fbfff, caliber: '7.62mm', tagline: 'Built for storms.' }),
  starter({ id: 'celestiallance', name: 'CELESTIAL LANCE', category: 'sniper', tier: 'premium', dmg: 320, rate: 1.1, mag: 5, reserve: 35, reload: 2.5, auto: false, hipFov: 78, adsFov: 22, color: 0xcfe8ff, caliber: 'Energy Core', tagline: 'Light of Olympus.', charge: 0.6 }),
  starter({ id: 'voidstormm10', name: 'VOIDSTORM M-10', category: 'rpg', tier: 'premium', dmg: 300, rate: 1.6, mag: 3, reserve: 12, reload: 2.9, auto: false, hipFov: 78, adsFov: 58, color: 0xb15cff, caliber: 'Void Energy', tagline: 'The void answers.', splash: 7.5 }),
  starter({ id: 'pulsefirem9', name: 'PULSEFIRE M9', category: 'handgun', tier: 'premium', dmg: 30, rate: 0.12, mag: 20, reserve: 140, reload: 1.2, auto: true, hipFov: 80, adsFov: 62, color: 0xc08bff, caliber: '9mm Energy', tagline: 'Never cools down.' }),
];

export function gunById(id: string): GunDef {
  return GUNS.find((g) => g.id === id) ?? GUNS[0];
}

// Loadout pools by SECTION (disjoint): PRIMARY = assault / alien-assault / MG;
// HEAVY = sniper / RPG; SECONDARY = handguns. The exported names are kept for
// back-compat with existing importers (SECONDARIES == the Heavy pool, SIDEARMS ==
// the Secondary pool); the loadout screen labels them Primary / Heavy / Secondary.
export const PRIMARIES = GUNS.filter((g) => g.section === 'primary');
export const HEAVIES = GUNS.filter((g) => g.section === 'heavy');
export const SECONDARIES = HEAVIES; // alias: old "secondary" fire-role pool == new Heavy
export const SIDEARMS = GUNS.filter((g) => g.section === 'secondary');

/** Throwables — one occupies the loadout's throwable slot.
 *  Each detonation can do up to four things: an instant blast (AoE damage), a
 *  status applied to enemies in radius (stun/slow/burn/blind), a lingering zone
 *  (fire/gas/cryo/smoke/decoy), and a pull/push impulse. */
export type ThrowKind =
  | 'frag'
  | 'smoke'
  | 'incendiary'
  | 'cryo'
  | 'shock'
  | 'flash'
  | 'cluster'
  | 'gas'
  | 'gravity'
  | 'concussion'
  | 'decoy'
  | 'plasma';
export type ZoneKind = 'fire' | 'gas' | 'cryo' | 'smoke' | 'decoy';
export interface ThrowDef {
  id: string;
  name: string;
  kind: ThrowKind;
  count: number;
  fuse: number; // seconds
  color: number;
  blast: { dmg: number; radius: number };
  status?: { radius: number; duration: number; stun?: number; slow?: number; burn?: number; blind?: number };
  zone?: { kind: ZoneKind; radius: number; duration: number; dps?: number; slow?: number; blocksLoS?: boolean; lure?: boolean };
  cluster?: number; // number of delayed secondary blasts
  pull?: number; // yank enemies toward the blast (gravity)
  push?: number; // shove enemies away from the blast (concussion)
}

export const THROWABLES: ThrowDef[] = [
  { id: 'frag', name: 'FRAG', kind: 'frag', count: 10, fuse: 1.4, color: 0xffae3a, blast: { dmg: 360, radius: 6.5 } },
  { id: 'smoke', name: 'SMOKE', kind: 'smoke', count: 10, fuse: 1.0, color: 0x9aa3b8, blast: { dmg: 0, radius: 0 }, zone: { kind: 'smoke', radius: 5.5, duration: 8, blocksLoS: true } },
  { id: 'incendiary', name: 'MOLOTOV', kind: 'incendiary', count: 10, fuse: 1.1, color: 0xff5a2a, blast: { dmg: 95, radius: 4 }, zone: { kind: 'fire', radius: 4.5, duration: 6, dps: 90 } },
  { id: 'cryo', name: 'CRYO BOMB', kind: 'cryo', count: 10, fuse: 1.3, color: 0x7fdfff, blast: { dmg: 80, radius: 4.5 }, status: { radius: 5.5, duration: 4.5, slow: 0.6 }, zone: { kind: 'cryo', radius: 5, duration: 4.5, slow: 0.5 } },
  { id: 'shock', name: 'EMP SHOCK', kind: 'shock', count: 10, fuse: 1.2, color: 0x9af0ff, blast: { dmg: 120, radius: 5 }, status: { radius: 5.5, duration: 2.4, stun: 2.4 } },
  { id: 'flash', name: 'FLASHBANG', kind: 'flash', count: 10, fuse: 1.4, color: 0xffffff, blast: { dmg: 0, radius: 0 }, status: { radius: 10, duration: 4.5, blind: 4.5 } },
  { id: 'cluster', name: 'CLUSTER', kind: 'cluster', count: 10, fuse: 1.3, color: 0xffd27a, blast: { dmg: 150, radius: 4 }, cluster: 5 },
  { id: 'gas', name: 'TOXIN', kind: 'gas', count: 10, fuse: 1.2, color: 0x9cff6a, blast: { dmg: 0, radius: 0 }, zone: { kind: 'gas', radius: 5.5, duration: 7, dps: 60, blocksLoS: true } },
  { id: 'gravity', name: 'SINGULARITY', kind: 'gravity', count: 10, fuse: 1.6, color: 0xc08bff, blast: { dmg: 360, radius: 7 }, pull: 5 },
  { id: 'concussion', name: 'CONCUSSION', kind: 'concussion', count: 10, fuse: 1.1, color: 0xffe9a8, blast: { dmg: 130, radius: 6 }, status: { radius: 6, duration: 1.3, stun: 1.3 }, push: 5 },
  { id: 'decoy', name: 'DECOY', kind: 'decoy', count: 10, fuse: 0.5, color: 0xaef5c8, blast: { dmg: 0, radius: 0 }, zone: { kind: 'decoy', radius: 1.2, duration: 6, lure: true } },
  { id: 'plasma', name: 'PLASMA ORB', kind: 'plasma', count: 10, fuse: 1.0, color: 0xff5d6e, blast: { dmg: 480, radius: 5 } },
];
export function throwById(id: string): ThrowDef {
  return THROWABLES.find((t) => t.id === id) ?? THROWABLES[0];
}

/** STANDARD ISSUE — the weapons every Marine starts with, free from level 1. Every OTHER
 *  gun is LOCKED and bought permanently with AstroDiamonds (after reaching level 5). */
// The 10 Outlander starters are all immediately available (5 free + 5 premium).
export const RECRUIT_WEAPONS = new Set(GUNS.map((g) => g.id));
/** Campaign level a player must have reached before locked guns can be purchased. */
export const UNLOCK_GATE_LEVEL = 5;
