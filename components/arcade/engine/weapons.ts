/**
 * The arsenals — 30 weapons per tank (90 total), composed from a dozen
 * behaviour archetypes (see engine.ts for how each `kind` behaves) with tuned,
 * tier-scaled params and themed names. Keeping it generative keeps 90 weapons
 * balanced from one small core instead of 90 hand-written objects.
 */
import type { ExplosionStyle, Weapon, WeaponKind } from './types';

interface Archetype {
  kind: WeaponKind;
  blastR: number;
  damage: number;
  count: number;
  bounces: number;
  terrain: 'carve' | 'mound' | 'none';
}

/** Per-tank hue range so each weapon gets a unique themed colour. */
const THEME: Record<string, { h0: number; h1: number; sat: number }> = {
  rock: { h0: 8, h1: 48, sat: 88 }, // red → amber → gold
  ice: { h0: 168, h1: 214, sat: 82 }, // teal → cyan → blue
  energy: { h0: 258, h1: 314, sat: 82 }, // violet → magenta
};

const FX: ExplosionStyle[] = ['burst', 'shards', 'ring', 'sparkle', 'plume', 'implode'];

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const hex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// The ~12 archetypes, in escalating-variety order. Each tank's 30 cycles this
// list ~2.5x, scaling up each lap so later weapons in the list hit harder.
const ARCHETYPES: Archetype[] = [
  { kind: 'single', blastR: 34, damage: 32, count: 0, bounces: 0, terrain: 'carve' },
  { kind: 'spread', blastR: 22, damage: 15, count: 3, bounces: 0, terrain: 'carve' },
  { kind: 'cluster', blastR: 24, damage: 16, count: 5, bounces: 0, terrain: 'carve' },
  { kind: 'digger', blastR: 20, damage: 22, count: 0, bounces: 0, terrain: 'carve' },
  { kind: 'heavy', blastR: 50, damage: 44, count: 0, bounces: 0, terrain: 'carve' },
  { kind: 'roller', blastR: 34, damage: 30, count: 0, bounces: 0, terrain: 'carve' },
  { kind: 'bouncer', blastR: 30, damage: 26, count: 0, bounces: 2, terrain: 'carve' },
  { kind: 'builder', blastR: 42, damage: 6, count: 0, bounces: 0, terrain: 'mound' },
  { kind: 'airstrike', blastR: 24, damage: 15, count: 4, bounces: 0, terrain: 'carve' },
  { kind: 'homing', blastR: 30, damage: 28, count: 0, bounces: 0, terrain: 'carve' },
  { kind: 'beam', blastR: 16, damage: 30, count: 0, bounces: 0, terrain: 'none' },
  { kind: 'nuke', blastR: 70, damage: 58, count: 0, bounces: 0, terrain: 'carve' },
];

const NAMES: Record<string, string[]> = {
  rock: [
    'Pebble', 'Buckshot', 'Frag Cluster', 'Trench Digger', 'Boulder', 'Rockslide',
    'Ricochet', 'Sandbag', 'Sky Hammer', 'Seeker Stone', 'Rail Slug', 'Meteor',
    'Tungsten Slug', 'Gravel Spray', 'Shrapnel Shell', 'Bunker Buster', 'Howitzer',
    'Avalanche', 'Pinball', 'Bedrock Wall', 'Hailstorm', 'Homestone', 'Lance Slug',
    'Asteroid', 'Deadweight', 'Scatter Shot', 'Mortar Cluster', 'Quarry Blast',
    'Landslide', 'Doomstone',
  ],
  ice: [
    'Frost Shard', 'Sleet Spray', 'Sleet Cluster', 'Ice Lance', 'Glacier', 'Snowdrift',
    'Skipper', 'Snow Wall', 'Hailfall', 'Frost Seeker', 'Cryo Beam', 'Comet',
    'Icicle', 'Diamond Dust', 'Flurry Burst', 'Permafrost', 'Blizzard',
    'Iceberg', 'Black Ice', 'Snowbank', 'Whiteout', 'Hoarfrost', 'Frost Lance',
    'Cometfall', 'Deep Freeze', 'Crystal Spray', 'Sleet Storm', 'Rime Blast',
    'Avalanche', 'Absolute Zero',
  ],
  energy: [
    'Ion Bolt', 'Quark Spray', 'Particle Storm', 'Drill Laser', 'Plasma Orb',
    'Graviton', 'Tesla Arc', 'Hard Light', 'Star Rain', 'Homing Photon', 'Rail Beam',
    'Singularity', 'Pulse Bolt', 'Cosmic Dust', 'Flak Burst', 'Void Lance',
    'Fusion Core', 'Nova', 'Warp Bounce', 'Light Wall', 'Meteor Swarm', 'Magnetar',
    'Beam Lance', 'Supernova', 'Antimatter', 'Scatter Beam', 'Quasar Burst',
    'Disruptor', 'Annihilator', 'Big Bang',
  ],
};

function buildArsenal(tankId: string): Weapon[] {
  const names = NAMES[tankId] ?? NAMES.rock;
  const th = THEME[tankId] ?? THEME.rock;
  const n = names.length;
  return names.map((name, i) => {
    const a = ARCHETYPES[i % ARCHETYPES.length];
    const tier = 1 + Math.floor(i / ARCHETYPES.length) * 0.18;
    // Unique colour (hue swept across the theme range + lightness wobble),
    // unique explosion FX, and per-weapon modulated damage/blast so no two
    // weapons read identically.
    const hue = th.h0 + ((th.h1 - th.h0) * i) / (n - 1);
    const light = 58 + ((i % 3) - 1) * 7;
    return {
      id: `${tankId}-${i}`,
      name,
      kind: a.kind,
      blastR: Math.round(a.blastR * tier * (1 + ((i % 3) - 1) * 0.06)),
      damage: Math.round(a.damage * tier * (1 + ((i % 5) - 2) * 0.07)),
      color: hslToHex(hue, th.sat, light),
      fx: FX[(i * 5) % FX.length],
      count: a.count,
      bounces: a.bounces,
      terrain: a.terrain,
    };
  });
}

const ARSENALS: Record<string, Weapon[]> = {
  rock: buildArsenal('rock'),
  ice: buildArsenal('ice'),
  energy: buildArsenal('energy'),
};

/** The full 30-weapon arsenal for a tank. */
export function arsenalFor(tankId: string): Weapon[] {
  return ARSENALS[tankId] ?? ARSENALS.rock;
}

/** Weapons the AI is allowed to use (arced kinds it can aim reliably). */
const AI_BANNED: WeaponKind[] = ['beam', 'airstrike', 'builder'];
export function aiArsenalFor(tankId: string): Weapon[] {
  return arsenalFor(tankId).filter((w) => !AI_BANNED.includes(w.kind));
}
