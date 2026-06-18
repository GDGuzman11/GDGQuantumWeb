/**
 * Annotation "signs" over the centered Helix logo — three labels, each with a
 * thin leader line + glowing target dot pointing at a distinct spot on the logo:
 *   About    → an upper halo arc
 *   Projects → the gold atom core
 *   Contact  → a lower drifting dot
 *
 * Laid out in a centered, square, responsive "field" (slightly larger than the
 * logo) so the labels sit just outside the logo while the lines reach in. SVG
 * (viewBox 0..100) draws the lines/dots; HTML buttons hold the labels so they
 * use the site typography and are keyboard-focusable (ready to wire to
 * navigation). Coordinates are percentages of the field, so SVG + HTML align.
 */

type Align = 'left' | 'right' | 'center';

type Sign = {
  label: string;
  index: string;
  /** Point on the logo the line points AT (% of field). */
  target: [number, number];
  /** Where the label attaches (% of field). */
  node: [number, number];
  align: Align;
};

const SIGNS: Sign[] = [
  { label: 'About', index: '01', target: [40, 30], node: [16, 20], align: 'left' },
  { label: 'Projects', index: '02', target: [60, 48], node: [86, 40], align: 'right' },
  { label: 'Contact', index: '03', target: [52, 68], node: [50, 92], align: 'center' },
];

function labelStyle({ node, align }: Sign): React.CSSProperties {
  const [x, y] = node;
  if (align === 'left') {
    return {
      right: `calc(${100 - x}% + 14px)`,
      top: `${y}%`,
      transform: 'translateY(-50%)',
      textAlign: 'right',
    };
  }
  if (align === 'right') {
    return {
      left: `calc(${x}% + 14px)`,
      top: `${y}%`,
      transform: 'translateY(-50%)',
      textAlign: 'left',
    };
  }
  return {
    left: `${x}%`,
    top: `calc(${y}% + 12px)`,
    transform: 'translateX(-50%)',
    textAlign: 'center',
  };
}

export function HelixSigns() {
  return (
    <nav
      aria-label="Sections"
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ width: 'min(96vmin, 820px)', height: 'min(96vmin, 820px)' }}
    >
      {/* Leader lines + dots */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden
      >
        {SIGNS.map((s) => (
          <g key={s.label}>
            <line
              x1={s.node[0]}
              y1={s.node[1]}
              x2={s.target[0]}
              y2={s.target[1]}
              stroke="rgba(126,223,255,0.45)"
              strokeWidth={0.25}
            />
            {/* node anchor */}
            <circle cx={s.node[0]} cy={s.node[1]} r={0.45} fill="rgba(255,255,255,0.85)" />
            {/* glowing target on the logo */}
            <circle
              cx={s.target[0]}
              cy={s.target[1]}
              r={0.8}
              fill="#7fdfff"
              className="animate-pulse"
              style={{ filter: 'drop-shadow(0 0 1.2px #7fdfff)' }}
            />
          </g>
        ))}
      </svg>

      {/* Labels */}
      {SIGNS.map((s) => (
        <div key={s.label} className="absolute" style={labelStyle(s)}>
          <button
            type="button"
            aria-label={s.label}
            className="group pointer-events-auto inline-flex items-baseline gap-2 focus:outline-none"
            style={{ textShadow: '0 1px 10px rgba(0,0,0,0.85)' }}
          >
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#7fdfff]/80">
              {s.index}
            </span>
            <span className="font-sans text-xs uppercase tracking-[0.28em] text-white/85 transition-colors duration-300 group-hover:text-[#7fdfff] group-focus-visible:text-[#7fdfff]">
              {s.label}
            </span>
          </button>
        </div>
      ))}
    </nav>
  );
}
