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
// A premium gun's thematic ON-HIT effect, so it does what its name/description says.
export type WeaponTrait = 'burn' | 'cryo' | 'shock' | 'void';

/** Derive a premium gun's trait from keywords in its name + tagline (free guns get none). */
export function deriveTrait(name: string, tagline = ''): WeaponTrait | undefined {
  const s = `${name} ${tagline}`.toLowerCase();
  if (/burn|fire|inferno|dragon|solar|flare|phoenix|ember|pyre|magma|molten|blaze|scorch|hell/.test(s)) return 'burn';
  if (/cryo|glacier|frost|\bice\b|frozen|winter|arctic|\bcold\b|glacial/.test(s)) return 'cryo';
  if (/storm|shock|thunder|tesla|lightning|\bvolt|\bemp\b|electric|arc\b/.test(s)) return 'shock';
  if (/void|gravity|graviton|singularity|abyss|maelstrom|vortex|black\s?star|oblivion|null/.test(s)) return 'void';
  return undefined;
}

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
  trait?: WeaponTrait; // premium thematic on-hit effect (burn / cryo / shock / void)
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
    // Premium guns get a thematic on-hit trait so they DO what the description says.
    ...(s.tier === 'premium' ? { trait: deriveTrait(s.name, s.tagline) } : {}),
    ...(s.splash != null ? { splash: s.splash } : {}),
    ...(s.charge != null ? { charge: s.charge } : {}),
  };
}

// ── OUTLANDER STARTERS — 10 weapons available immediately (5 free + 5 premium) ──
// Colours are pulled from the reference sheets so the muzzle flash + gun lights match.
const STARTERS: GunDef[] = [
  // FREE (5) — a complete loadout on their own: 2 primary, 2 heavy, 1 secondary.
  starter({ id: 'aurora7', name: 'AURORA-7', category: 'assault', tier: 'free', dmg: 34, rate: 0.11, mag: 32, reserve: 224, reload: 1.6, auto: true, hipFov: 78, adsFov: 56, color: 0x8fbaff, caliber: '5.56×45mm', tagline: 'Light. Precise. Deadly.' }),
  starter({ id: 'm12vindicator', name: 'M-12 VINDICATOR', category: 'mg', tier: 'free', dmg: 24, rate: 0.07, mag: 60, reserve: 360, reload: 2.3, auto: true, hipFov: 82, adsFov: 66, color: 0x9fc0e0, caliber: '7.62mm', tagline: 'Reliable. Rugged. Ruthless.' }),
  starter({ id: 'vanguardsr1', name: 'VANGUARD SR-1', category: 'sniper', tier: 'free', dmg: 220, rate: 1.5, mag: 6, reserve: 36, reload: 2.4, auto: false, hipFov: 78, adsFov: 24, color: 0x9ec8ff, caliber: '.338 Lapua', tagline: 'Built for extreme distances.' }),
  starter({ id: 'm57punisher', name: 'M-57 PUNISHER', category: 'rpg', tier: 'free', dmg: 200, rate: 1.3, mag: 4, reserve: 16, reload: 2.6, auto: false, hipFov: 78, adsFov: 60, color: 0xffb04a, caliber: '90mm HEAT', tagline: 'Anti-armor devastation.', splash: 6 }),
  starter({ id: 'm7defender', name: 'M-7 DEFENDER', category: 'handgun', tier: 'free', dmg: 38, rate: 0.2, mag: 15, reserve: 105, reload: 1.1, auto: false, hipFov: 78, adsFov: 60, color: 0xaecbff, caliber: '9mm Kinetic', tagline: 'Always at your side.' }),
  // PREMIUM (5) — a tier up, mirroring the free set section-for-section.
  starter({ id: 'celestialaegis', name: 'CELESTIAL AEGIS', category: 'assault', tier: 'premium', dmg: 42, rate: 0.1, mag: 36, reserve: 252, reload: 1.5, auto: true, hipFov: 78, adsFov: 55, color: 0xffd27a, caliber: '6.8mm', tagline: 'Divine protection.' }),
  starter({ id: 'typhonmg3', name: 'TYPHON MG-3', category: 'mg', tier: 'premium', dmg: 27, rate: 0.06, mag: 75, reserve: 450, reload: 2.2, auto: true, hipFov: 82, adsFov: 66, color: 0x7fbfff, caliber: '7.62mm', tagline: 'Built for storms.' }),
  starter({ id: 'celestiallance', name: 'CELESTIAL LANCE', category: 'sniper', tier: 'premium', dmg: 320, rate: 1.3, mag: 5, reserve: 35, reload: 2.5, auto: false, hipFov: 78, adsFov: 22, color: 0xcfe8ff, caliber: 'Energy Core', tagline: 'Light of Olympus.' }),
  starter({ id: 'voidstormm10', name: 'VOIDSTORM M-10', category: 'rpg', tier: 'premium', dmg: 300, rate: 1.6, mag: 3, reserve: 12, reload: 2.9, auto: false, hipFov: 78, adsFov: 58, color: 0xb15cff, caliber: 'Void Energy', tagline: 'The void answers.', splash: 7.5 }),
  starter({ id: 'pulsefirem9', name: 'PULSEFIRE M9', category: 'handgun', tier: 'premium', dmg: 30, rate: 0.12, mag: 20, reserve: 140, reload: 1.2, auto: true, hipFov: 80, adsFov: 62, color: 0xc08bff, caliber: '9mm Energy', tagline: 'Never cools down.' }),
];

// ── STORE ROSTER — buyable weapons beyond the starters (grows toward the full sheets).
// Free-tier (from the non-premium sheets) → bought with GOLD; premium-tier → AstroDiamonds.
function assaultGun(id: string, name: string, color: number, caliber: string, tagline: string, dmg = 36, rate = 0.11): GunDef {
  return starter({ id, name, category: 'assault', tier: 'free', dmg, rate, mag: 30, reserve: 210, reload: 1.6, auto: true, hipFov: 78, adsFov: 56, color, caliber, tagline });
}
function mgGun(id: string, name: string, color: number, caliber: string, tagline: string, dmg = 24, rate = 0.07, mag = 60): GunDef {
  return starter({ id, name, category: 'mg', tier: 'free', dmg, rate, mag, reserve: mag * 6, reload: 2.4, auto: true, hipFov: 82, adsFov: 66, color, caliber, tagline });
}
function sniperGun(id: string, name: string, color: number, caliber: string, tagline: string, dmg = 200, rate = 1.4): GunDef {
  // Bolt-action: single click + a 1.3-1.6s cycle, no hold-to-charge.
  return starter({ id, name, category: 'sniper', tier: 'free', dmg, rate, mag: 6, reserve: 36, reload: 2.5, auto: false, hipFov: 78, adsFov: 24, color, caliber, tagline });
}
function rpgGun(id: string, name: string, color: number, caliber: string, tagline: string, dmg = 200, splash = 6): GunDef {
  return starter({ id, name, category: 'rpg', tier: 'free', dmg, rate: 1.4, mag: 4, reserve: 16, reload: 2.7, auto: false, hipFov: 78, adsFov: 60, color, caliber, tagline, splash });
}
function alienGun(id: string, name: string, color: number, tagline: string, dmg = 38, rate = 0.11): GunDef {
  return starter({ id, name, category: 'alienAssault', tier: 'free', dmg, rate, mag: 32, reserve: 224, reload: 1.7, auto: true, hipFov: 78, adsFov: 56, color, caliber: 'Xeno-tech', tagline });
}

export const STORE_GUNS: GunDef[] = [
  // FREE ASSAULT RIFLES — "20 Space Assault Rifles // Human Design" sheet (02-20; AURORA-7 is a starter).
  assaultGun('nebulacarbine', 'NEBULA CARBINE', 0x5fe0d0, '5.56×45mm', 'Adapt. Overcome. Survive.', 34, 0.1),
  assaultGun('pulsarvx9', 'PULSAR-VX9', 0x9fe8ff, '8.6×43mm SPC', 'Energy conduit. Hyper velocity.', 38, 0.1),
  assaultGun('orionprime', 'ORION PRIME', 0xff9a3a, '7.62×39mm', 'Built for the frontier.', 42, 0.13),
  assaultGun('eclipser12', 'ECLIPSE R-12', 0xff4a4a, '6.5×39mm', 'Stalk. Strike. Disappear.', 36, 0.11),
  assaultGun('helixrifle', 'HELIX RIFLE', 0xbfe0ff, '5.56×45mm', 'Evolved. Superior. Lethal.', 35, 0.1),
  assaultGun('nova22', 'NOVA-22', 0xffb347, '6.8×43mm SPC', 'Star-born. Battle-proven.', 40, 0.12),
  assaultGun('quantumedge', 'QUANTUM EDGE', 0x6ff0a0, '6.5×39mm', 'Reality distortion in a barrel.', 37, 0.1),
  assaultGun('voidhunter', 'VOID HUNTER', 0xb15cff, '6.5 Grendel', 'No end. No escape.', 39, 0.12),
  assaultGun('starfall11', 'STARFALL-11', 0x7fdfff, '7.62×51mm', 'From the stars, to the stars.', 44, 0.14),
  assaultGun('hyperionlegion', 'HYPERION LEGION', 0xff6a3a, '7.62×39mm', 'Loyalty. Honor. Destruction.', 41, 0.12),
  assaultGun('astra6', 'ASTRA-6', 0x6fb0ff, '5.56×45mm', 'Beyond the limits.', 34, 0.1),
  assaultGun('titanbreaker', 'TITAN BREAKER', 0xffa838, '8.6×43mm', 'Nothing can stand.', 46, 0.15),
  assaultGun('vegax1', 'VEGA X-1', 0x6fd0ff, '5.56×39mm', 'Sleek. Deadly. Efficient.', 35, 0.09),
  assaultGun('chimera9', 'CHIMERA-9', 0x5fe0b0, '6.5 Creedmoor', 'Adapt or die.', 38, 0.11),
  assaultGun('blackstarfury', 'BLACKSTAR FURY', 0xff3a48, '7.62×39mm', 'Fueled by rage.', 43, 0.13),
  assaultGun('horizonrifle', 'HORIZON RIFLE', 0x7fb8ff, '5.56×45mm', 'No borders. No mercy.', 36, 0.11),
  assaultGun('gravitywell', 'GRAVITY WELL', 0x9a7cff, '6.8×43mm SPC', 'Pull them into oblivion.', 40, 0.12),
  assaultGun('solstice9', 'SOLSTICE-9', 0xffd27a, '5.56×45mm', 'Light in the dark.', 37, 0.11),
  assaultGun('apogee33', 'APOGEE 33', 0x6ff0c0, '8.6×43mm', 'Ascend. Conquer. Repeat.', 45, 0.14),
  // FREE MACHINE GUNS — "20 Space Machine Guns" sheet (skip M-12 VINDICATOR starter + TYPHON MG-3).
  // Single-barrel (02-10):
  mgGun('eclipsewraith', 'ECLIPSE WRAITH', 0x6a8cff, '7.62mm', 'Lightweight. Deadly. Silent.', 22, 0.065, 55),
  mgGun('solarisc97', 'SOLARIS ARMS C-97', 0xff9a3a, '7.62mm', 'Power meets precision.', 26, 0.075, 65),
  mgGun('auroramg1', 'AURORA MG-1', 0x5fe0b0, '5.56mm', 'Strike with the northern light.', 21, 0.06, 70),
  mgGun('hyperionguard', 'HYPERION GUARD', 0x7fb8ff, '7.62mm', 'Defend. Deter. Destroy.', 25, 0.07, 60),
  mgGun('novacarbinex1', 'NOVA CARBINE X1', 0xffb347, '6.8mm', 'Compact fury. Maximum impact.', 23, 0.065, 55),
  mgGun('orionlmg', 'ORION LMG', 0x6fb0ff, '7.62mm', 'Reach beyond the stars.', 27, 0.08, 75),
  mgGun('voidstalker', 'VOID STALKER', 0xb15cff, '6.5mm', 'From the void, we reign.', 24, 0.07, 60),
  mgGun('sentinelm12', 'SENTINEL M12', 0xbfe0ff, '5.56mm', 'Vigilant. Unyielding. Unstoppable.', 22, 0.065, 65),
  // Gatling-style (11-20) — higher mag, faster spin:
  mgGun('ga7hurricane', 'GA-7 HURRICANE', 0x6fd0ff, '7.62mm', 'Unleash the storm.', 20, 0.05, 100),
  mgGun('titanmauler', 'TITAN MAULER', 0xff8a3a, '7.62mm', 'Breaching power. Unmatched.', 24, 0.05, 100),
  mgGun('vortexr880', 'VORTEX R-880', 0x7fdfff, '5.56mm', 'Spin up. Wipe out.', 19, 0.045, 120),
  mgGun('celestialspinner', 'CELESTIAL SPINNER', 0xb15cff, '6.5mm', 'A universe of hurt.', 22, 0.05, 100),
  mgGun('apocalypsegatx', 'APOCALYPSE GAT-X', 0xff3a48, '7.62mm', 'End times, delivered fast.', 23, 0.05, 110),
  mgGun('chronosminigun', 'CHRONOS MINIGUN', 0xffd27a, '5.56mm', 'Time bends to our firepower.', 18, 0.04, 130),
  mgGun('nebuladevastator', 'NEBULA DEVASTATOR', 0x9a7cff, '7.62mm', 'From dust to dust.', 25, 0.055, 100),
  mgGun('omegaresetter', 'OMEGA RESETTER', 0xff4a4a, '7.62mm', 'Erase. Rewrite. Repeat.', 24, 0.05, 110),
  mgGun('polarisrotor', 'POLARIS ROTOR', 0x6fb0ff, '5.56mm', 'Freeze them in their tracks.', 20, 0.05, 100),
  mgGun('dragonfirex6', 'DRAGONFIRE X6', 0xff6a3a, '7.62mm', 'Burn everything.', 22, 0.05, 110),
  // FREE SNIPER RIFLES — "20 Space Sniper Rifles" sheet 1 (02-20; VANGUARD SR-1 is a starter).
  sniperGun('lonestarmt7', 'LONESTAR MT7', 0x9ec8ff, '7.62×61mm', 'High velocity. Pinpoint accuracy.', 230, 1.5),
  sniperGun('eclipserift', 'ECLIPSE RIFT', 0xb15cff, '.408 CheyTac', 'Cold forged. Silent operator.', 250, 1.6),
  sniperGun('polarislance', 'POLARIS LANCE', 0x7fb8ff, '.50 BMG', 'Guided by the north star.', 260, 1.6),
  sniperGun('novaspecter', 'NOVA SPECTER', 0x63ff84, '.338 Lapua', 'Strike from shadow.', 210, 1.4),
  sniperGun('orionr9', 'ORION R-9', 0xff9a3a, '.300 WM', 'Electromagnetic stabilized.', 235, 1.5),
  sniperGun('celestialmarksman', 'CELESTIAL MARKSMAN', 0xbfe0ff, '.408 CheyTac', 'Engineered for orbital drop.', 240, 1.5),
  sniperGun('voidlineage', 'VOID LINEAGE', 0x9a7cff, '.375 CT', 'Ghost rounds. Silent kills.', 245, 1.55),
  sniperGun('silenthorizon', 'SILENT HORIZON', 0x7fdfff, '.338 Lapua', 'Lightweight frame. Heavy impact.', 215, 1.4),
  sniperGun('starfallx1', 'STARFALL X1', 0x6fd0ff, '.50 BMG', 'Anti-material capable.', 260, 1.6),
  sniperGun('quasarprime', 'QUASAR PRIME', 0x9a7cff, '.338 Lapua', 'Reality bends. Dark hour weapon.', 240, 1.5),
  sniperGun('phantomdistance', 'PHANTOM DISTANCE', 0x8fbaff, '.408 CheyTac', 'Ghost round. Guardian series.', 235, 1.5),
  sniperGun('aegislongshot', 'AEGIS LONGSHOT', 0x6ff0a0, '12.7×108mm', 'Shield breaker. Guardian tanks.', 255, 1.6),
  sniperGun('zenith7', 'ZENITH-7', 0x7fb8ff, '.338 Lapua', 'Classic build. Modern response.', 225, 1.45),
  sniperGun('nebulawraith', 'NEBULA WRAITH', 0xb15cff, '.408 CheyTac', 'Clean. Fast. Lethal.', 240, 1.5),
  sniperGun('solarissrx', 'SOLARIS SRX', 0xff7a3a, '.50 BMG', 'Built to end worlds.', 260, 1.65),
  sniperGun('glacieredge', 'GLACIER EDGE', 0xbfe0ff, '.338 Lapua', 'From the void.', 235, 1.5),
  sniperGun('oblivionguard', 'OBLIVION GUARD', 0x9a7cff, '.408 CheyTac', 'Extreme cold. Extreme precision.', 245, 1.55),
  sniperGun('hyperionstrike', 'HYPERION STRIKE', 0xffb347, '.300 WM', 'Speed. Power. Precision.', 220, 1.4),
  sniperGun('duskhunter', 'DUSK HUNTER', 0xff6a3a, '.338 Lapua', 'For the mysteries. By the stars.', 230, 1.5),
  // FREE RPGs — "20 Space RPGs" sheet 1 (02-20; M-57 PUNISHER is a starter).
  rpgGun('arclightrl7', 'ARCLIGHT RL-7', 0xb15cff, '70mm Plasma', 'Light the way to ruin.', 210, 6.5),
  rpgGun('starfiresr3', 'STARFIRE SR-3', 0xff7a3a, '100mm Thermobaric', 'A sun in every shell.', 260, 7.5),
  rpgGun('thunderclap9', 'THUNDERCLAP 9', 0x7fdfff, '120mm HE', 'They hear it before they die.', 240, 7),
  rpgGun('voidstormv2', 'VOIDSTORM V2', 0x9a7cff, '80mm Void', 'The void takes all.', 230, 7),
  rpgGun('ironhailm82', 'IRONHAIL M-82', 0xff9a3a, '60mm HEAP', 'Armor is a suggestion.', 200, 5.5),
  rpgGun('omegadevastator', 'OMEGA DEVASTATOR', 0xffb347, '90mm Cluster', 'Nothing left standing.', 220, 8),
  rpgGun('frostbitefb8', 'FROSTBITE FB-8', 0x7fdfff, '75mm Cryo', 'The last cold they feel.', 190, 6),
  rpgGun('scorpionrl1', 'SCORPION RL-1', 0xff7a3a, '65mm HEAT', 'One sting. One kill.', 210, 5.5),
  rpgGun('heliosh12', 'HELIOS H-12', 0xff5a2a, '100mm Incendiary', 'Burn it to the ground.', 250, 7),
  rpgGun('ravagerr11', 'RAVAGER R-11', 0x9ec8ff, '80mm Anti-Armor', 'Built to break tanks.', 240, 6),
  rpgGun('eclipsee6', 'ECLIPSE E-6', 0x9af0ff, '65mm EMP', 'Kill the lights.', 180, 6),
  rpgGun('bansheeb7', 'BANSHEE B-7', 0xff9a3a, '70mm HE', 'You will hear it coming.', 205, 6),
  rpgGun('dragonflydf2', 'DRAGONFLY DF-2', 0xff7a3a, '100mm Thermobaric', 'Small wings. Big fire.', 255, 7.5),
  rpgGun('novaripper', 'NOVA RIPPER', 0xffb347, '65mm Fragmentation', 'Shred the horizon.', 210, 7),
  rpgGun('wraithw4', 'WRAITH W-4', 0xb15cff, '75mm Guided', 'It finds them.', 220, 6),
  rpgGun('javelinx15', 'JAVELIN X-15', 0x7fb8ff, '80mm Tandem', 'Twice the punch.', 245, 6.5),
  rpgGun('predatorpr5', 'PREDATOR PR-5', 0xff9a3a, '85mm HEAT', 'Hunt. Lock. Erase.', 235, 6),
  rpgGun('titanbreakerrpg', 'TITAN BREAKER', 0x7fdfff, '120mm HE', 'For the giants.', 270, 8),
  rpgGun('blackstarbs2', 'BLACKSTAR BS-2', 0x9a7cff, '75mm Smart', 'It chooses its target.', 225, 6.5),
  // FREE ALIEN ASSAULT RIFLES — "20 Alien Assault Rifles" sheet 1 (Primary section).
  alienGun('xiltharbladecarbine', 'XILTHAR BLADECARBINE', 0x49a6ff, 'Bio-electric discharge.', 36, 0.1),
  alienGun('vorlaxincisor', 'VORLAX INCISOR', 0xb15cff, 'Acidic payload. Life sever.', 40, 0.12),
  alienGun('zyrethpulser', 'ZYRETH PULSER', 0x6fd0ff, 'Phase disruptor. Shield breaker.', 34, 0.09),
  alienGun('korvaxseeker', 'KORVAX SEEKER', 0xffb347, 'Auto-aim swarm rounds.', 32, 0.08),
  alienGun('nergalharbinger', 'NERGAL HARBINGER', 0xff3a48, 'Spore infestation launcher.', 42, 0.13),
  alienGun('qorathdevourer', 'QORATH DEVOURER', 0xff6a3a, 'Feeds on the target it kills.', 44, 0.13),
  alienGun('elysianchorus', 'ELYSIAN CHORUS', 0x63ff84, 'Sonic tremors. Radius kills.', 35, 0.1),
  alienGun('thalixshredder', 'THALIX SHREDDER', 0x6ff0a0, 'Neural overload. Mind break.', 38, 0.11),
  alienGun('maevrisynapse', 'MAEVRI SYNAPSE', 0xb15cff, 'Neural overload. Mind break.', 37, 0.1),
  alienGun('drachonriftmaw', 'DRACHON RIFTMAW', 0xff9a3a, 'Tears through armor and flesh.', 43, 0.12),
  alienGun('solenaestarforge', 'SOLENAE STARFORGE', 0xffd27a, 'Stellar plasma. Infinite pierce.', 39, 0.11),
  alienGun('vaskaobsidian', 'VASKA OBSIDIAN', 0x9a7cff, 'Void-etched. Infinite pierce.', 40, 0.12),
  alienGun('ghorixmauler', 'GHORIX MAULER', 0xff3a48, 'Toxic assault. Armor melt.', 42, 0.13),
  alienGun('illitharlament', 'ILLITHAR LAMENT', 0x7fdfff, 'Memory bane. Sanity fade.', 35, 0.1),
  alienGun('varuunjudicator', "VA'RUUN JUDICATOR", 0x63ff84, 'Extends the eternal law.', 38, 0.11),
  alienGun('uultakcarver', "UUL'TAK CARVER", 0x6ff0a0, 'Bone shatter. No escape.', 41, 0.12),
  alienGun('sarnixobliterator', 'SARNIX OBLITERATOR', 0xff6a3a, 'Nanite swarm. Total erasure.', 43, 0.13),
  alienGun('ryvnnphantom', 'RYVNN PHANTOM', 0x9a7cff, 'Hits without warning.', 36, 0.1),
  alienGun('kerzulannihilator', 'KERZUL ANNIHILATOR', 0xb15cff, 'Pure destruction, weaponized.', 44, 0.13),
  alienGun('omeganullifier', 'OMEGA NULLIFIER', 0x7fb8ff, 'Cosmic collapse. Total end.', 40, 0.12),
];

/** Every buildable/equippable gun: the 10 owned starters + the (buyable) store roster. */
export const GUNS: GunDef[] = [...STARTERS, ...STORE_GUNS];

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
// Only the 10 Outlander starters are owned immediately; STORE_GUNS are bought.
export const RECRUIT_WEAPONS = new Set(STARTERS.map((g) => g.id));
/** Campaign level a player must have reached before locked guns can be purchased. */
export const UNLOCK_GATE_LEVEL = 5;
