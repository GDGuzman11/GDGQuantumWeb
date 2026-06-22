import { TECH_ICON_PATHS } from '@/lib/tech-icons';

/**
 * Gabe's stack — the union of everything across his three bodies of work:
 * Helix (the local-first AI assistant), his day job (Senior Technical
 * Consultant · MDM full-stack), and this GDG Quantum site. Ordered, per the
 * About design, into Languages → Frameworks → Tools.
 *
 * Each entry resolves a real brand logo by name from TECH_ICON_PATHS; entries
 * with no brand glyph in simple-icons (Oracle, Slack) fall back to a text chip
 * (the renderer checks `path`).
 */

export interface Tech {
  name: string;
  /** Brand-logo path (24x24), or null → render the name as a text chip. */
  path: string | null;
}

export interface TechGroup {
  /** Decorative glyph for the row label. */
  glyph: string;
  label: string;
  items: Tech[];
}

const tech = (name: string): Tech => ({
  name,
  path: TECH_ICON_PATHS[name] ?? null,
});

export const TECH_STACK: TechGroup[] = [
  {
    glyph: '⌨',
    label: 'Languages',
    items: ['TypeScript', 'JavaScript', 'Python', 'SQL', 'Bash'].map(tech),
  },
  {
    glyph: '⬡',
    label: 'Frameworks',
    items: [
      'Next.js',
      'React',
      'FastAPI',
      'Tauri',
      'Three.js',
      'GSAP',
      'Tailwind CSS',
      'Prisma',
      'Vite',
      'Zod',
      'React Hook Form',
    ].map(tech),
  },
  {
    glyph: '⚙',
    label: 'Tools',
    items: [
      'PostgreSQL',
      'Oracle',
      'SQLite',
      'Redis',
      'Linux',
      'Apache Tomcat',
      'Git',
      'GitHub',
      'Vercel',
      'Cloudflare',
      'Anthropic',
      'Ollama',
      'ElevenLabs',
      'Slack',
      'Gmail',
      'Resend',
    ].map(tech),
  },
];

/** Flat list of every tech name — used for the crawlable SEO text. */
export const TECH_NAMES: string[] = TECH_STACK.flatMap((g) =>
  g.items.map((t) => t.name),
);
