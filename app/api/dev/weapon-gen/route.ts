/**
 * DEV-ONLY weapon generator route — the AI half of the Design DNA System. Given a
 * PRIMARY + SECONDARY DNA it asks Claude to "analyse both profiles, resolve conflicts,
 * and produce one cohesive weapon," returning a strict `WeaponBlueprint` JSON that the
 * client assembler turns into a real gun.
 *
 * Hard-gated to development: it returns 404 in production, so it never ships publicly
 * and `ANTHROPIC_API_KEY` never needs to exist in the deployed environment. The client
 * falls back to the deterministic generator when this route is absent/unavailable
 * (standalone repo, offline, or no key).
 */
import { NextResponse } from 'next/server';
import type { Family } from '@/components/arcade/fps/weapons';
import { DESIGN_DNA, DNA, isDesignDNA } from '@/components/arcade/fps/gen/dna';
import { AUDIO_FAMILIES, TEMPLATE_IDS, WEAPON_FAMILIES, normalizeForFamily, parseWeaponBlueprint } from '@/components/arcade/fps/gen/blueprint';
import { GEN_DIVISIONS, isGenDivision } from '@/components/arcade/fps/gen/divisions';
import { featureHash } from '@/components/arcade/fps/gen/similarity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const isDev = process.env.NODE_ENV !== 'production';
const MODEL = process.env.WEAPON_GEN_MODEL || 'claude-sonnet-4-6';
const API = 'https://api.anthropic.com/v1/messages';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

function dnaFacts(name: string): string {
  const p = DNA[name as keyof typeof DNA];
  if (!p) return name;
  return `- ${name}: ${p.philosophy} Palette hints ${p.body.map(hex).join(', ')}; accent ${hex(p.accent)}; silhouettes ${p.silhouettes.join('/')}; audio ${p.audio.join('/')}; vocab ${p.words.slice(0, 5).join(', ')}.`;
}

function systemPrompt(): string {
  return [
    'You are the STARSHELL Design DNA weapon generator. Every weapon fuses a PRIMARY DNA (~70% of the identity) with a SECONDARY DNA (~30%). Never blend equally — the weapon must have one dominant philosophy. Resolve conflicts intelligently into ONE cohesive, believable, intentionally-engineered military weapon.',
    '',
    'You output ONLY a single JSON object (no markdown fences, no prose) matching this TypeScript shape:',
    '{ id, name, family, stats:{dmg,rate,mag,reserve,reload,auto,scoped,hipFov,adsFov,color,splash?,burst?,heat?,charge?}, audio:{family,vol,pitch,jitter,len,bass,grit,charge?,loop?}, model:{template,palette:{body:number[],accent:number},slots:[{slot,len,girth,segs,vents,muzzle,taper,emissive,moving?}]}, componentTheme:{body:number[],accent,nameVocab:string[],geometryBias:{girth,vents,emissive,animated,muzzle},statBias:{dmg,rate,mag,reload,handling}}, lore, dna:{primary,secondary,featureHash} }',
    '',
    'Constraints (values outside ranges are clamped, so stay in range):',
    `- family ∈ ${WEAPON_FAMILIES.join(' | ')}. Choose the family that best expresses the fused DNA. DNA is flavour; family is mechanics.`,
    `- model.template ∈ ${TEMPLATE_IDS.join(' | ')}.`,
    `- audio.family ∈ ${AUDIO_FAMILIES.join(' | ')}.`,
    '- stats: dmg 8..500, rate 0.05..2.6 (seconds/shot), mag 2..75, reserve 0..400, reload 1.0..3.6, hipFov 74..84, adsFov 20..70. splash 2..10 (launchers). heat only for laser. Sustained-fire families (rifle/mg/laser) auto=true; slow high-damage (sniper/launcher) auto=false; sniper scoped=true.',
    '- audio: vol 0.4..1.1, pitch 0.6..1.9, jitter 0..0.25, len 0.4..1.8, bass 0..1, grit 0..1. loop=true only for continuous/rotary weapons.',
    '- model.palette.body/accent + componentTheme colours are integers (0xRRGGBB). Prefer the DNA palette hints. accent = the ONE glow colour.',
    '- model.slots: 3..6 attachments appropriate to the template (e.g. barrel/receiver/magazine/optic for rifles; emitter/core/cooling/reactor for energy; tube/warhead for launchers). Per slot: len 0.5..2, girth 0.6..1.4, segs 0..8, vents 0..5, muzzle 0..3, taper -0.3..0.3, emissive 0..1. moving ∈ spin|glow|coil|bolt (optional) marks an animated part — but keep it REALISTIC: spin/coil ONLY on rotary mechanisms (barrel cluster, tube, cooling fan, feed drum, core/reactor/emitter energy rings); bolt ONLY on a bolt or slide; glow (a light pulse) anywhere. NEVER spin a magazine/stock/optic/grip/receiver.',
    '- componentTheme seeds the weapon’s upgrade PARTS so they inherit this DNA: body/accent = the part palette, nameVocab = words for part names, geometryBias 0..1, statBias -1..1 (which stats the parts favour).',
    '- name: 2 short uppercase words drawn from the two DNA vocabularies. lore: one vivid sentence. dna.primary/secondary: echo the inputs. featureHash: "" (the server fills it).',
    '',
    'Design DNA reference:',
    DESIGN_DNA.map(dnaFacts).join('\n'),
  ].join('\n');
}

function userPrompt(primary: string, secondary: string, family: Family | null, division: string | null, existing: string[]): string {
  const dedup = existing.length
    ? `\n\nAvoid these existing DNA signatures / names (make something visibly distinct): ${existing.slice(0, 40).join(', ')}.`
    : '';
  const fam = family ? `\nThe weapon MUST be family "${family}" — choose a template + stats appropriate to it.` : '';
  const d = division && isGenDivision(division) ? GEN_DIVISIONS[division] : null;
  const divLine = d
    ? `\nThis weapon is issued to the ${d.name} division: ${d.philosophy} Lean its identity — accent near #${d.accent.toString(16)}, and draw naming/lore from: ${d.words.slice(0, 6).join(', ')}. Set "division":"${d.id}".`
    : '';
  return `Generate one weapon. PRIMARY DNA: ${primary}. SECONDARY DNA: ${secondary}.${fam}${divLine}${dedup}`;
}

/** Pull the first balanced JSON object out of the model's text (defensive). */
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

async function callClaude(key: string, primary: string, secondary: string, family: Family | null, division: string | null, existing: string[]): Promise<unknown> {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1600,
      system: systemPrompt(),
      messages: [{ role: 'user', content: userPrompt(primary, secondary, family, division, existing) }],
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

  let body: { primary?: string; secondary?: string; family?: string; division?: string; existing?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-request' }, { status: 400 });
  }
  const primary = String(body.primary ?? '');
  const secondary = String(body.secondary ?? '');
  if (!isDesignDNA(primary) || !isDesignDNA(secondary)) {
    return NextResponse.json({ ok: false, error: 'bad-dna' }, { status: 400 });
  }
  const family = (WEAPON_FAMILIES as string[]).includes(String(body.family)) ? (body.family as Family) : null;
  const division = typeof body.division === 'string' && isGenDivision(body.division) ? body.division : null;
  const existing = Array.isArray(body.existing) ? body.existing.filter((x): x is string => typeof x === 'string') : [];

  try {
    let raw = await callClaude(key, primary, secondary, family, division, existing);
    let bp = parseWeaponBlueprint(raw);
    if (!bp) {
      // one repair retry
      raw = await callClaude(key, primary, secondary, family, division, existing);
      bp = parseWeaponBlueprint(raw);
    }
    if (!bp) return NextResponse.json({ ok: false, error: 'invalid-json' }, { status: 502 });
    if (family) normalizeForFamily(bp, family); // guarantee the weapon type is tagged/pooled right
    if (division) bp.division = division;
    bp.dna.primary = primary;
    bp.dna.secondary = secondary;
    bp.dna.featureHash = featureHash(bp);
    return NextResponse.json({ ok: true, blueprint: bp, source: 'ai' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'upstream', message: String(e) }, { status: 502 });
  }
}
