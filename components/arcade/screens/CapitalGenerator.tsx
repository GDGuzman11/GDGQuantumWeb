'use client';

/**
 * DEV-ONLY Capital Ship ("Star Destroyer") generator + preview. Pick PRIMARY + SECONDARY
 * DNA, hit GENERATE — the AI route (Claude, in the Capital Ship cinematic voice) designs
 * a ship and returns a CapitalSpec; a live rotating 3D preview builds it, and the cinematic
 * write-up (lore / engineering / arrival / weapons / audio…) shows beside it. Degrades to
 * the deterministic roll offline / without a key. Never mounted outside dev.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { animateCapital, buildCapital } from '../fps/capital/model';
import { DNA_TYPES, type CapitalDNAType } from '../fps/capital/dna';
import { generateCapital } from '../fps/capital/client';
import { CAPITAL_CATALOG } from '../fps/capital/catalog';
import type { CapitalSpec } from '../fps/capital/spec';

const disposeGroup = (o: THREE.Object3D) => {
  o.traverse((n) => {
    const m = n as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else if (mat) mat.dispose();
  });
};

export function CapitalGenerator({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'author' | 'catalog'>('author');
  const [query, setQuery] = useState('');
  const [primary, setPrimary] = useState<CapitalDNAType>('heavyIndustrial');
  const [secondary, setSecondary] = useState<CapitalDNAType>('orbitalSiege');
  const [spec, setSpec] = useState<CapitalSpec | null>(null);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<'ai' | 'fallback' | 'catalog' | null>(null);
  const [note, setNote] = useState('');
  const [kept, setKept] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CAPITAL_CATALOG;
    return CAPITAL_CATALOG.filter((s) => s.name.toLowerCase().includes(q) || s.hull.includes(q) || s.primary.toLowerCase().includes(q));
  }, [query]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const shipRef = useRef<THREE.Group | null>(null);
  const fitRef = useRef(200);
  const recentRef = useRef<string[]>([]); // last few ship names → tell the AI to diverge every reroll

  const gen = async (seed?: number) => {
    setBusy(true);
    const avoid = Array.from(new Set([...kept, ...recentRef.current]));
    const res = await generateCapital({ primary, secondary, existing: avoid, seed });
    setSpec(res.spec);
    setSource(res.source);
    setNote(res.note ?? '');
    recentRef.current = [res.spec.name, ...recentRef.current.filter((n) => n !== res.spec.name)].slice(0, 8);
    setBusy(false);
  };

  // Initial roll.
  useEffect(() => {
    void gen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Renderer + orbit loop (mount once).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x05070d);
    scene.add(new THREE.HemisphereLight(0x9fbfff, 0x202028, 1.4));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(1, 1.4, 0.8);
    scene.add(dir);
    const camera = new THREE.PerspectiveCamera(45, 1.6, 0.5, 3000);
    const resize = () => {
      const w = canvas.clientWidth || 600;
      const h = canvas.clientHeight || 360;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);
    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      const now = performance.now();
      if (shipRef.current) animateCapital(shipRef.current, 0.016, now);
      const t = (now - t0) / 1000;
      const R = fitRef.current;
      camera.position.set(Math.cos(t * 0.22) * R, R * 0.42, Math.sin(t * 0.22) * R);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (shipRef.current) disposeGroup(shipRef.current);
      renderer.dispose();
    };
  }, []);

  // Rebuild the ship whenever the spec changes.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !spec) return;
    if (shipRef.current) {
      scene.remove(shipRef.current);
      disposeGroup(shipRef.current);
    }
    const ship = buildCapital(spec, 'desktop');
    scene.add(ship);
    shipRef.current = ship;
    fitRef.current = spec.length * 1.15;
  }, [spec]);

  const Line = ({ label, value }: { label: string; value?: string }) =>
    value ? (
      <div className="mt-1.5">
        <p className="font-pixel text-[6px] uppercase tracking-[0.2em] text-[#ffd27a]/70">{label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/85">{value}</p>
      </div>
    ) : null;

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-black/90 px-3 py-2 sm:px-5 sm:py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="font-pixel text-[10px] tracking-[0.2em] text-[#ff7a2a] sm:text-[13px]">⬢ CAPITAL SHIP GENERATOR</p>
          <div className="flex gap-1">
            {(['author', 'catalog'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`min-h-[26px] rounded border px-3 font-pixel text-[8px] uppercase tracking-[0.15em] ${tab === t ? 'border-[#ff7a2a]/60 bg-[#ff7a2a]/15 text-[#ffb27a]' : 'border-white/15 bg-white/[0.03] text-white/45 hover:bg-white/10'}`}>
                {t === 'author' ? 'Author' : `Catalog · ${CAPITAL_CATALOG.length}`}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={onBack} className="min-h-[28px] rounded border border-white/20 bg-white/[0.04] px-3 font-pixel text-[8px] uppercase text-white/60 hover:bg-white/10">◂ BACK</button>
      </div>

      {tab === 'author' ? (
        <>
          {/* DNA pickers + actions */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-pixel text-[7px] uppercase tracking-[0.2em] text-white/40">Primary</span>
            <select value={primary} onChange={(e) => setPrimary(e.target.value as CapitalDNAType)} className="rounded border border-white/15 bg-black/60 px-2 py-1 font-pixel text-[9px] text-[#7fdfff]">
              {DNA_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <span className="font-pixel text-[7px] uppercase tracking-[0.2em] text-white/40">Secondary</span>
            <select value={secondary} onChange={(e) => setSecondary(e.target.value as CapitalDNAType)} className="rounded border border-white/15 bg-black/60 px-2 py-1 font-pixel text-[9px] text-[#c8a8ff]">
              {DNA_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <button type="button" disabled={busy} onClick={() => gen()} className="min-h-[30px] rounded border border-[#aef5c8]/50 bg-[#aef5c8]/10 px-4 font-pixel text-[9px] uppercase text-[#aef5c8] hover:bg-[#aef5c8]/20 disabled:opacity-40">
              {busy ? 'Generating…' : '✦ Generate'}
            </button>
            <button type="button" disabled={busy} onClick={() => gen(Math.floor(Math.random() * 1e9))} className="min-h-[30px] rounded border border-[#7fdfff]/50 bg-[#7fdfff]/10 px-4 font-pixel text-[9px] uppercase text-[#7fdfff] hover:bg-[#7fdfff]/20 disabled:opacity-40">⟲ Reroll</button>
            {spec && <button type="button" onClick={() => setKept((k) => (k.includes(spec.name) ? k : [...k, spec.name]))} className="min-h-[30px] rounded border border-[#ffd27a]/50 bg-[#ffd27a]/10 px-4 font-pixel text-[9px] uppercase text-[#ffd27a] hover:bg-[#ffd27a]/20">★ Keep</button>}
            {source && <span className={`font-pixel text-[8px] uppercase tracking-[0.15em] ${source === 'ai' ? 'text-[#63ff84]' : source === 'catalog' ? 'text-[#ffb27a]' : 'text-white/45'}`}>{source === 'ai' ? '◉ AI' : source === 'catalog' ? '◈ catalog' : '○ fallback'}</span>}
          </div>
          {note && <p className="mt-1 font-pixel text-[7px] text-white/40">{note}</p>}
        </>
      ) : (
        <div className="mt-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="filter by name / family / DNA…" className="w-full rounded border border-white/15 bg-black/60 px-3 py-1.5 font-pixel text-[9px] text-white/80 placeholder:text-white/30" />
          <div className="mt-2 grid max-h-[26vh] grid-cols-2 gap-1 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((s, i) => {
              const active = spec?.name === s.name && spec?.seed === s.seed;
              return (
                <button key={`${s.name}-${s.seed}-${i}`} type="button" onClick={() => { setSpec(s); setSource('catalog'); setNote(s.lore ?? ''); }} className={`rounded border px-2 py-1 text-left ${active ? 'border-[#ff7a2a]/60 bg-[#ff7a2a]/12' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06]'}`}>
                  <p className="truncate font-pixel text-[8px] text-white/85">{s.name}</p>
                  <p className="truncate font-pixel text-[6px] uppercase tracking-[0.12em] text-white/35">{s.hull} · {s.primary}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
        {/* preview */}
        <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-md border border-white/10 bg-black">
          <canvas ref={canvasRef} className="h-full w-full" />
          {spec && (
            <div className="pointer-events-none absolute bottom-2 left-3">
              <p className="font-pixel text-[14px] text-white drop-shadow sm:text-[18px]">{spec.name}</p>
              <p className="font-pixel text-[7px] uppercase tracking-[0.2em] text-[#ff7a2a]/90">{spec.classification} · {spec.primary} ▸ {spec.secondary}</p>
            </div>
          )}
        </div>
        {/* spec write-up */}
        <div className="min-h-0 w-full overflow-y-auto rounded-md border border-white/10 bg-white/[0.02] p-3 md:w-[42%]">
          {spec ? (
            <>
              <div className="flex flex-wrap gap-x-3 gap-y-1 font-pixel text-[7px] uppercase tracking-[0.15em] text-white/50">
                <span>HULL {spec.hull}</span><span>BRIDGE {spec.bridge}</span><span>LEN {spec.length}</span>
                <span>ENGINES {spec.engines}</span><span>TURRETS {spec.turrets}</span><span>BAYS {spec.bays}</span>
              </div>
              <Line label="Lore" value={spec.lore} />
              <Line label="Silhouette" value={spec.silhouette} />
              <Line label="Engineering" value={spec.engineering} />
              <Line label="Arrival" value={spec.arrival} />
              <Line label="Weapons" value={spec.weapons} />
              <Line label="Audio" value={spec.audio} />
              <Line label="Deployment" value={spec.deployment} />
              <Line label="Departure" value={spec.departure} />
              <Line label="Why it's unlike any other" value={spec.whyUnique} />
            </>
          ) : (
            <p className="font-pixel text-[8px] text-white/40">Generating the first Capital Ship…</p>
          )}
        </div>
      </div>
    </div>
  );
}
