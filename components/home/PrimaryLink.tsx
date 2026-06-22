'use client';

/**
 * The hero's underline-on-hover text link with a directional arrow. Shared by
 * the landing entry points (Hero) and the section interiors (AboutInterior),
 * kept in its own file so the lazy interior chunk doesn't pull in Hero.
 */
export function PrimaryLink({
  label,
  onClick,
  direction = 'right',
}: {
  label: string;
  onClick: () => void;
  direction?: 'left' | 'right';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.28em] text-white/75 transition-colors duration-300 hover:text-white focus:outline-none focus-visible:text-white"
    >
      {direction === 'left' ? (
        <span
          aria-hidden
          className="inline-block transition-transform duration-300 group-hover:-translate-x-1"
        >
          &larr;
        </span>
      ) : null}
      <span>{label}</span>
      {direction === 'right' ? (
        <span
          aria-hidden
          className="inline-block transition-transform duration-300 group-hover:translate-x-1"
        >
          &rarr;
        </span>
      ) : null}
      <span
        aria-hidden
        className="absolute -bottom-1 left-0 h-px w-0 bg-white/60 transition-all duration-300 group-hover:w-full"
      />
    </button>
  );
}
