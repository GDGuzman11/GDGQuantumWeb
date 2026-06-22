import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/site-config';

/**
 * Open Graph image (App Router metadata route → rendered by next/og at the
 * Edge). A branded dark card matching the site palette and hero line, used for
 * link unfurls (Slack/iMessage/Twitter/LinkedIn). 1200×630 is the OG standard.
 *
 * The hero is a WebGL particle tunnel that can't be screenshotted at build
 * time, so this is a faithful static re-creation of the dark void + headline
 * rather than a live render — the spec's "hero render as OG image" intent.
 */
export const runtime = 'edge';
export const alt = `${siteConfig.brand} · ${siteConfig.description}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          // Deep near-black void with a soft radial glow — mirrors the dark
          // token scope (--bg #06070a, --accent #6ea8ff).
          background:
            'radial-gradient(120% 120% at 25% 30%, #11203f 0%, #0a0e1a 45%, #06070a 100%)',
          color: '#eaecf2',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Brand row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            fontSize: 26,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: '#8b93a7',
          }}
        >
          <svg width="34" height="38" viewBox="0 0 20 22" fill="none">
            <path
              d="M10 1 18.66 6v10L10 21 1.34 16V6L10 1Z"
              stroke="#6ea8ff"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
          <span>{siteConfig.brand}</span>
        </div>

        {/* Headline — the hero line */}
        <div
          style={{
            display: 'flex',
            fontSize: 82,
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
            maxWidth: 980,
            color: '#eaecf2',
            fontFamily: 'serif',
          }}
        >
          The things we create eventually create us.
        </div>

        {/* Footer line */}
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            color: '#8b93a7',
            maxWidth: 820,
          }}
        >
          A premium studio building considered digital systems.
        </div>
      </div>
    ),
    { ...size },
  );
}
