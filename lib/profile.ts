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

/**
 * The About copy — three beats: a randomized header, an intro, the stack table
 * (lib/tech-stack.ts), and a closing line. Used by the cinematic interior and
 * the crawlable SEO block so the public copy stays identical.
 */
export const about = {
  /**
   * The header re-rolls on each visit to the About section (a different one
   * every time, never repeating back-to-back). Professional + SEO + curious +
   * welcoming. The first is the SSR/crawlable default (the rest are picked
   * client-side once you dive in).
   */
  headers: [
    'From production databases to AI that thinks — meet the builder.',
    'A full-stack engineer who builds whole systems, solo.',
    'I turn “what if” into running software.',
    'Engineer by trade. Builder by obsession. Curious about everything.',
    'The developer behind the systems, the AI, and the orb you’re flying through.',
    'Full-stack by craft — from the database up to the black hole.',
    'I build the hard things end to end, alone.',
    'Where infrastructure meets imagination — meet Gabe.',
    'A software engineer quietly obsessed with how everything works.',
    'One builder, the whole stack — and a habit of shipping the impossible.',
  ] as const,
  /** Section ① — the intro that sets the story. */
  intro:
    'I’m Gabe — a software engineer who builds entire systems alone, from the production databases that keep real infrastructure running to a local-first AI that reasons and remembers. By day, a senior technical consultant. The rest of the time, I’m building things that didn’t exist this morning.',
  /** Section ③ — the closing that reels them in (ties back, own flair). */
  closing:
    'But the stack is just vocabulary. What I really do is give wild ideas a pulse — a database that holds, an interface that breathes, an AI that remembers your name. If you’ve got something that shouldn’t be possible yet, that’s exactly where I like to start.',
} as const;
