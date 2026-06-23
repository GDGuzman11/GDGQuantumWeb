/**
 * The arsenals — 30 weapons per tank (90 total), composed from a dozen
 * behaviour archetypes (see engine.ts for how each `kind` behaves) with tuned,
 * tier-scaled params and themed names. Keeping it generative keeps 90 weapons
 * balanced from one small core instead of 90 hand-written objects.
 */
import type { Weapon, WeaponKind } from './types';
import { tankById } from './tanks';

interface Archetype {
  kind: WeaponKind;
  blastR: number;
  damage: number;
  count: number;
  bounces: number;
  terrain: 'carve' | 'mound' | 'none';
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
  const def = tankById(tankId);
  const names = NAMES[tankId] ?? NAMES.rock;
  return names.map((name, i) => {
    const a = ARCHETYPES[i % ARCHETYPES.length];
    const tier = 1 + Math.floor(i / ARCHETYPES.length) * 0.18;
    return {
      id: `${tankId}-${i}`,
      name,
      kind: a.kind,
      blastR: Math.round(a.blastR * tier),
      damage: Math.round(a.damage * tier),
      color: def.color,
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
