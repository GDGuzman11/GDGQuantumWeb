/**
 * DEV-ONLY armour-set generator route — the AI half of the Design DNA System for
 * armour. Given a division + PRIMARY/SECONDARY DNA it asks Claude to fuse them into
 * one cohesive `ArmorSetBlueprint` (the set's DNA identity: palette, naming vocabulary,
 * geometry + stat lean) which the client turns into a themed per-slot outfit.
 *
 * Hard-gated to development (404 in production), so it never ships publicly and needs
 * no key in the deployed environment. The client falls back to the deterministic
 * generator when this route is absent/unavailable.
 */
import { NextResponse } from 'next/server';
import { DESIGN_DNA, DNA, isDesignDNA } from '@/components/arcade/fps/gen/dna';
import { GEN_DIVISIONS, isGenDivision } from '@/components/arcade/fps/gen/divisions';
import { armorSetHash, parseArmorSet } from '@/components/arcade/fps/gen/armorBlueprint';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const isDev = process.env.NODE_ENV !== 'production';
const MODEL = process.env.WEAPON_GEN_MODEL || 'claude-sonnet-4-6';
const API = 'https://api.anthropic.com/v1/messages';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

function dnaFacts(name: string): string {
  const p = DNA[name as keyof typeof DNA];
  if (!p) return name;
  return `- ${name}: ${p.philosophy} Palette hints ${p.body.map(hex).join(', ')}; accent ${hex(p.accent)}; vocab ${p.words.slice(0, 5).join(', ')}.`;
}

function systemPrompt(): string {
  return [
    'You are the STARSHELL Design DNA ARMOUR generator. You design a division-issued armour SET whose whole per-slot piece tree shares ONE DNA identity. Fuse a PRIMARY DNA (~70%) with a SECONDARY DNA (~30%) — never blend equally; one philosophy dominates. Resolve conflicts into a cohesive, believable, intentionally-engineered set.',
    '',
    'You output ONLY a single JSON object (no markdown fences, no prose) matching this shape:',
    '{ id, name, division, theme:{ body:number[], accent:number, nameVocab:string[], geometryBias:{girth,vents,emissive}, statBias:{dmg,mag,reload,handling} }, lore, dna:{primary,secondary,featureHash} }',
    '',
    'Constraints (values outside ranges are clamped, so stay in range):',
    '- division = the given Combat Division id (echo it exactly). The set is issued to that division and should read in its voice.',
    '- theme.body/accent = integer colours (0xRRGGBB). Prefer the DNA palette hints; accent is the ONE glow colour (a division accent is a good base).',
    '- theme.nameVocab = 6..14 SHORT words drawn from the two DNA vocabularies + the division voice; they seed every armour piece’s name.',
    '- theme.geometryBias values 0..1: girth (bulk/mass), vents (ribs/cutouts), emissive (glow). Heavier DNA → higher girth; energy/experimental → higher emissive.',
    '- theme.statBias values -1..1 = which DEFENSIVE stats the set favours: dmg→armor, mag→shield, reload→recovery, handling→mobility.',
    '- name: 2 short uppercase words (division + DNA flavour). lore: one vivid sentence. dna.primary/secondary: echo the inputs. featureHash: "" (server fills it).',
    '',
    'Design DNA reference:',
    DESIGN_DNA.map(dnaFacts).join('\n'),
  ].join('\n');
}

function userPrompt(primary: string, secondary: string, division: string, existing: string[]): string {
  const d = GEN_DIVISIONS[division as keyof typeof GEN_DIVISIONS];
  const divLine = d ? `\nDIVISION: ${d.id} (${d.name}) — ${d.philosophy} Accent near ${hex(d.accent)}; voice: ${d.words.slice(0, 6).join(', ')}.` : `\nDIVISION: ${division}`;
  const dedup = existing.length ? `\n\nAvoid these existing sets (make something visibly distinct): ${existing.slice(0, 40).join(', ')}.` : '';
  return `Generate one armour set. PRIMARY DNA: ${primary}. SECONDARY DNA: ${secondary}.${divLine}${dedup}`;
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

async function callClaude(key: string, primary: string, secondary: string, division: string, existing: string[]): Promise<unknown> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      system: systemPrompt(),
      messages: [{ role: 'user', content: userPrompt(primary, secondary, division, existing) }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
  return extractJson(text);
}

export async function POST(req: Request) {
  if (!isDev) return new NextResponse(null, { status: 404 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: 'no-key', message: 'ANTHROPIC_API_KEY is not set — using the deterministic fallback.' }, { status: 503 });
  }

  let body: { primary?: string; secondary?: string; division?: string; existing?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-request' }, { status: 400 });
  }
  const primary = String(body.primary ?? '');
  const secondary = String(body.secondary ?? '');
  const division = String(body.division ?? '');
  if (!isDesignDNA(primary) || !isDesignDNA(secondary)) return NextResponse.json({ ok: false, error: 'bad-dna' }, { status: 400 });
  if (!isGenDivision(division)) return NextResponse.json({ ok: false, error: 'bad-division' }, { status: 400 });
  const existing = Array.isArray(body.existing) ? body.existing.filter((x): x is string => typeof x === 'string') : [];

  try {
    let raw = await callClaude(key, primary, secondary, division, existing);
    let bp = parseArmorSet(raw);
    if (!bp) {
      raw = await callClaude(key, primary, secondary, division, existing);
      bp = parseArmorSet(raw);
    }
    if (!bp) return NextResponse.json({ ok: false, error: 'invalid-json' }, { status: 502 });
    bp.division = division; // force the requested division
    bp.dna.primary = primary;
    bp.dna.secondary = secondary;
    bp.dna.featureHash = armorSetHash(bp);
    return NextResponse.json({ ok: true, blueprint: bp, source: 'ai' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'upstream', message: String(e) }, { status: 502 });
  }
}
