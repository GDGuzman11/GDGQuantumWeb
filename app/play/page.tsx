import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/user';
import { getProgress, getRuns } from '@/app/actions/progress';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { PlaySlots } from '@/components/arcade/PlaySlots';

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

  const [progress, runs] = await Promise.all([getProgress(), getRuns()]);
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

        {/* pilot strip — AstroDiamonds moved into the runs belt (shared wallet). */}
        <div className="mx-auto mt-7 flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
          <div>
            <p className="text-[11px] text-white sm:text-[13px]">{user.displayName}</p>
            <p className="mt-1 text-[7px] tracking-[0.2em] text-[#7fdfff]/80">{rank}</p>
          </div>
          <div className="text-right">
            <p className="text-[13px] text-[#aef5c8]">{best}</p>
            <p className="mt-0.5 text-[6px] tracking-[0.2em] text-white/40">BEST LEVEL</p>
          </div>
        </div>

        {/* continue / start + resumable slots belt */}
        <PlaySlots runs={runs} astro={astro} />

        {/* secondary tiles */}
        <div className="mx-auto mt-3 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/profile" className="rounded-lg border border-[#c8a8ff]/30 bg-[#c8a8ff]/[0.06] p-4 text-center transition-colors hover:bg-[#c8a8ff]/15">
            <p className="text-[8px] text-[#c8a8ff]">Profile</p>
            <p className="mt-1 text-[6px] tracking-[0.2em] text-white/40">VIEW ▸</p>
          </Link>
          {['Armory', 'Achievements', 'Records'].map((label) => (
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
