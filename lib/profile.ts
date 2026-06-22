/**
 * Single source of truth for "who Gabe is" — consumed by:
 *  - the cinematic About interior (components/home/Hero.tsx),
 *  - the crawlable server-rendered SEO block (components/home/SeoContent.tsx),
 *  - the Person/ProfilePage JSON-LD (app/page.tsx),
 *  - the footer social marks (components/home/SocialLinks.tsx),
 *  - SEO metadata (app/layout.tsx).
 *
 * Keeping it here means the public copy + structured data never drift apart.
 */

/** Canonical external profiles — these become JSON-LD `sameAs` + the footer links. */
export const socialUrls = {
  linkedin: 'https://www.linkedin.com/in/gabe-de-guzman/',
  github: 'https://github.com/GDGuzman11',
  upwork:
    'https://www.upwork.com/freelancers/~015375e3d3c72dea2b?mp_source=share',
} as const;

/** Person facts for structured data + metadata. */
export const profile = {
  name: 'Gabe De Guzman',
  jobTitle: 'Senior Technical Consultant · AI & Full-Stack Engineer',
  description:
    'Gabe De Guzman builds whole systems solo — from production databases and Linux infrastructure to Helix, a local-first AI assistant, to cinematic WebGL on the web.',
  knowsAbout: [
    'AI systems',
    'Local-first AI assistants',
    'PostgreSQL',
    'Oracle',
    'Linux',
    'Database administration',
    'Data engineering',
    'Full-stack development',
    'Next.js',
    'TypeScript',
    'Three.js',
    'WebGL',
    'System integration',
  ],
  sameAs: [socialUrls.linkedin, socialUrls.github, socialUrls.upwork],
} as const;

/** A single Trinity facet: a decorative glyph + a real text label + one line. */
export interface AboutFacet {
  glyph: string;
  facet: string;
  line: string;
}

/**
 * The About "who I am" copy — Signature line × Trinity. Used verbatim by both
 * the cinematic interior and the SEO block so they stay identical.
 */
export const about = {
  /** Big serif identity statement (the core's signature line). */
  signature:
    'I build whole systems alone — from the database, to the black hole, to the voice that answers back.',
  /** Three facets of who Gabe is — identity, not a project list. */
  trinity: [
    {
      glyph: '⬡',
      facet: 'Systems',
      line: 'Production DBA & infrastructure consultant — Linux, Postgres/Oracle, and the integrations utilities run on.',
    },
    {
      glyph: '◈',
      facet: 'AI & Builder',
      line: 'I architect complete systems solo — like Helix, a local-first AI assistant with a memory that learns, forgets, and reasons.',
    },
    {
      glyph: '✦',
      facet: 'Drive',
      line: 'I build to prove a hunch: that the right work feels like play — and pays for the view.',
    },
  ] satisfies AboutFacet[],
} as const;
