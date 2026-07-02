import Link from 'next/link';
import type { ReactNode } from 'react';

/** Centered dark Starshell auth card — shared shell for login/register/reset. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main id="content" className="flex min-h-[100svh] w-full items-center justify-center bg-black px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="font-pixel text-[9px] tracking-[0.3em] text-[#7fdfff]/60 transition-colors hover:text-[#7fdfff]">
            GDG QUANTUM
          </Link>
          <p className="mt-4 font-pixel text-[20px] text-[#7fdfff]">STARSHELL</p>
          <h1 className="mt-4 font-serif text-2xl tracking-tight text-ink">{title}</h1>
          {subtitle ? <p className="mt-2 font-sans text-sm leading-relaxed text-muted">{subtitle}</p> : null}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">{children}</div>
        {footer ? <div className="mt-5 text-center font-sans text-sm text-muted">{footer}</div> : null}
      </div>
    </main>
  );
}

/** Shared submit-button classes (cyan pixel action). */
export const authButtonClass =
  'w-full rounded-md border border-[#7fdfff]/40 bg-[#7fdfff]/10 py-3 font-pixel text-[10px] uppercase tracking-[0.15em] text-[#7fdfff] transition-colors hover:bg-[#7fdfff]/20 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7fdfff]';
