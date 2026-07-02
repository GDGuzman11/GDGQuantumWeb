import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/user';
import { getProgress } from '@/app/actions/progress';
import { LogoutButton } from '@/components/auth/LogoutButton';

export const metadata: Metadata = { title: 'Pilot Console · Starshell', robots: { index: false, follow: false } };

const DIVISION_NAMES: Record<string, string> = {
  vanguard: 'Vanguard',
  ghost: 'Ghost',
  warden: 'Warden',
  phantom: 'Phantom',
  lifeline: 'Lifeline',
};

/** Signed-in command hub. Middleware gates /play; this re-checks authoritatively. */
export default async function PlayPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/play');

  const progress = await getProgress();
  const marine = (progress?.marine ?? null) as { marineLevel?: number; division?: string | null } | null;
  const marineLevel = typeof marine?.marineLevel === 'number' ? marine.marineLevel : 1;
  const divName = marine?.division ? DIVISION_NAMES[marine.division] : null;
  const rank = divName ? `${divName.toUpperCase()} · LVL ${marineLevel}` : `RECRUIT · LVL ${marineLevel}`;
  const best = progress?.bestLevel ?? 0;
  const astro = progress?.astro ?? 0;

  return (
    <main id="content" className="min-h-[100svh] w-full bg-black px-4 py-8 font-pixel text-white sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        {/* header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-[8px] tracking-[0.3em] text-[#7fdfff]/60 transition-colors hover:text-[#7fdfff]">GDG QUANTUM</Link>
          <LogoutButton />
        </div>

        <div className="mt-8 text-center">
          <p className="text-[24px] text-[#7fdfff] sm:text-[30px]">STARSHELL</p>
          <p className="mt-2 text-[9px] tracking-[0.25em] text-white/55">PILOT CONSOLE</p>
        </div>

        {/* pilot strip */}
        <div className="mx-auto mt-7 flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
          <div>
            <p className="text-[11px] text-white sm:text-[13px]">{user.displayName}</p>
            <p className="mt-1 text-[7px] tracking-[0.2em] text-[#7fdfff]/80">{rank}</p>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-[13px] text-[#ffd27a]">◈ {astro}</p>
              <p className="mt-0.5 text-[6px] tracking-[0.2em] text-white/40">ASTRODIAMONDS</p>
            </div>
            <div>
              <p className="text-[13px] text-[#aef5c8]">{best}</p>
              <p className="mt-0.5 text-[6px] tracking-[0.2em] text-white/40">BEST LEVEL</p>
            </div>
          </div>
        </div>

        {/* primary actions */}
        <div className="mx-auto mt-5 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/arcade" className="rounded-lg border border-[#aef5c8]/40 bg-[#aef5c8]/10 p-5 transition-colors hover:bg-[#aef5c8]/20">
            <p className="text-[12px] text-[#aef5c8]">▸ CONTINUE JOURNEY</p>
            <p className="mt-2 text-[7px] leading-relaxed text-white/50">Deploy with your Marine, armory and progression.</p>
          </Link>
          <Link href="/arcade" className="rounded-lg border border-[#7fdfff]/40 bg-[#7fdfff]/10 p-5 transition-colors hover:bg-[#7fdfff]/20">
            <p className="text-[12px] text-[#7fdfff]">✦ START NEW RUN</p>
            <p className="mt-2 text-[7px] leading-relaxed text-white/50">Fresh campaign run — permanent unlocks carry over.</p>
          </Link>
        </div>

        {/* secondary tiles (coming in the next passes) */}
        <div className="mx-auto mt-3 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
          {['Profile', 'Armory', 'Achievements', 'Records'].map((label) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-center opacity-60">
              <p className="text-[8px] text-white/70">{label}</p>
              <p className="mt-1 text-[6px] tracking-[0.2em] text-white/30">SOON</p>
            </div>
          ))}
        </div>

        {!user.emailVerified ? (
          <p className="mx-auto mt-6 max-w-xl text-center text-[7px] leading-relaxed text-white/35">
            Tip: check your inbox to verify your email — it keeps password recovery working.
          </p>
        ) : null}
      </div>
    </main>
  );
}
