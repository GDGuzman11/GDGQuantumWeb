/**
 * DEV-ONLY Capital Ship ("Star Destroyer") generator route — the AI half. Given a
 * PRIMARY + SECONDARY DNA it asks Claude, in the voice of the Capital Ship cinematic
 * prompt, to design one civilization-ending war machine and return a strict CapitalSpec
 * JSON (structured model fields + cinematic text) that the preview builds.
 *
 * Hard-gated to development (404 in production), so it never ships publicly and
 * ANTHROPIC_API_KEY never needs to exist in the deployed environment. The client falls
 * back to the deterministic roll when this route is absent/offline/keyless.
 */
import { NextResponse } from 'next/server';
import { BRIDGES, DNA_TYPES, HULLS } from '@/components/arcade/fps/capital/dna';
import { parseCapitalSpec } from '@/components/arcade/fps/capital/spec';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const isDev = process.env.NODE_ENV !== 'production';
const MODEL = process.env.WEAPON_GEN_MODEL || 'claude-sonnet-4-6';
const API = 'https://api.anthropic.com/v1/messages';

function systemPrompt(): string {
  return [
    'You are the STARSHELL CAPITAL SHIP generator — Executive Creative Director + AAA Vehicle Art Director + Naval Architect. You design civilization-ending war machines that arrive every third level once the battlefield falls silent, block out the sky, observe, deploy, and bombard. Each must be an ICON recognisable from silhouette alone — the moment it arrives, players think "something terrible is about to happen."',
    'Fuse a PRIMARY DNA (~70% of the identity) with a SECONDARY DNA (~30%) into ONE dominant engineering philosophy. Never blend equally. Never resemble Star Destroyers, UNSC/Covenant, Mass Effect, Homeworld, Warhammer, EVE, Battlestar, The Expanse, or Star Citizen — create an entirely original STARSHELL military-industrial language. It must look ENGINEERED (armor plates, ribs, docking bays, reactor cooling, turrets, launch tubes, engines, sensor towers) — never smooth, never ornamental. Audio is sub-bass hull-groan + reactor hum, NEVER high-pitched laser whine.',
    '',
    'Output ONLY one JSON object (no markdown fences, no prose) matching:',
    '{ name, classification, primary, secondary, hull, bridge, length, engines, turrets, bays, accent, body, lore, silhouette, engineering, arrival, weapons, audio, deployment, departure, whyUnique }',
    '',
    'Constraints (out-of-range values are clamped, so stay in range):',
    `- primary, secondary ∈ ${DNA_TYPES.join(' | ')} (distinct).`,
    `- hull ∈ ${HULLS.join(' | ')} (the silhouette family). bridge ∈ ${BRIDGES.join(' | ')} (command-tower placement).`,
    '- length 110..200 (world units — it must dominate a ~200-unit sky). engines 2..6. turrets 4..18. bays 1..4.',
    '- accent, body: integer colours 0xRRGGBB. accent = the ONE energy/glow colour; body = the dark hull colour.',
    '- name: an ominous 1-2 word ship name. classification: a short class ("Siege Dreadnought", "Void Bastion"…).',
    '- lore, silhouette, engineering, arrival, weapons, audio, deployment, departure, whyUnique: one vivid sentence each, in the cinematic voice above. arrival = a UNIQUE entry (hyperspace rupture, orbital eclipse, gravity distortion…). weapons = invented siege weapons (kinetic lances, mass drivers, gravitic artillery, missile cathedrals), never generic lasers. whyUnique = why this ship is unlike any previous generation.',
  ].join('\n');
}

function userPrompt(primary: string, secondary: string, existing: string[], seed: number): string {
  const dedup = existing.length
    ? `\n\nThese ships already exist — make THIS one clearly distinct from every one of them in hull silhouette, command-tower placement, proportions, accent colour, and arrival: ${existing.slice(0, 30).join(', ')}.`
    : '';
  return `Design one Capital Ship. PRIMARY DNA: ${primary}. SECONDARY DNA: ${secondary}. Design variant #${(seed >>> 0) % 100000} — commit DECISIVELY to a bold, specific silhouette for THIS variant: pick a hull form (wedge / slab / spined / tridented / cathedral) and vary length, engine, turret and bay counts so it does not read as a generic ${primary} ship. Two variants of the same DNA must look unmistakably different.${dedup}`;
}

function extractJson(text: string): unknown {
  const fenced = text.replace(/```json\s*|\s*```/g, '');
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(fenced.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callClaude(key: string, primary: string, secondary: string, existing: string[], seed: number): Promise<unknown> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1600, temperature: 1, system: systemPrompt(), messages: [{ role: 'user', content: userPrompt(primary, secondary, existing, seed) }] }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
  return extractJson(text);
}

export async function POST(req: Request) {
  if (!isDev) return new NextResponse(null, { status: 404 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: 'no-key', message: 'ANTHROPIC_API_KEY is not set — using the deterministic fallback.' }, { status: 503 });

  let body: { primary?: string; secondary?: string; seed?: number; existing?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-request' }, { status: 400 });
  }
  const primary = String(body.primary ?? '');
  const secondary = String(body.secondary ?? '');
  if (!(DNA_TYPES as string[]).includes(primary) || !(DNA_TYPES as string[]).includes(secondary)) {
    return NextResponse.json({ ok: false, error: 'bad-dna' }, { status: 400 });
  }
  const seed = typeof body.seed === 'number' ? body.seed : Date.now();
  const existing = Array.isArray(body.existing) ? body.existing.filter((x): x is string => typeof x === 'string') : [];

  try {
    let raw = await callClaude(key, primary, secondary, existing, seed);
    let spec = parseCapitalSpec(raw, seed);
    if (!spec) {
      raw = await callClaude(key, primary, secondary, existing, seed);
      spec = parseCapitalSpec(raw, seed);
    }
    if (!spec) return NextResponse.json({ ok: false, error: 'invalid-json' }, { status: 502 });
    // Enforce the requested DNA tags regardless of what the model returned.
    spec.primary = primary as typeof spec.primary;
    spec.secondary = secondary as typeof spec.secondary;
    return NextResponse.json({ ok: true, spec, source: 'ai' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'upstream', message: String(e) }, { status: 502 });
  }
}
