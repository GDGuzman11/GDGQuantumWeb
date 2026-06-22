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
  jobTitle: 'Senior Technical Consultant · AI & Full-Stack Developer',
  description:
    'Gabe De Guzman is a software developer who works across the whole stack, from production databases and Linux infrastructure to Helix, a local-first AI assistant, and cinematic WebGL on the web.',
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
    'From production databases to AI that thinks. Hi, I’m Gabe.',
    'A full-stack developer with a soft spot for problems that need the whole stack.',
    'I turn “what if” into running software.',
    'Developer by trade. Builder by obsession. Curious about everything.',
    'The developer behind the systems, the AI, and the orb you’re flying through.',
    'Full-stack by craft, from the database all the way up to the black hole.',
    'I like the hard problems. The ones that need a bit of everything.',
    'Where infrastructure meets imagination. Come on in.',
    'A software developer quietly obsessed with how everything works.',
    'One builder, the whole stack, and a soft spot for the impossible.',
  ] as const,
  /** Section ① — the intro that sets the story. */
  intro:
    'Hi, I’m Gabe, a software developer who loves turning big ideas into real, working software. By day I keep production databases healthy and well-fed as a senior technical consultant. Off the clock I build things like Helix, a local-first AI assistant, mostly to find out whether I can. So far the answer keeps coming back yes.',
  /** Section ③ — the closing that reels them in (ties back, own flair). */
  closing:
    'The logos are just the tools, though. The real work is turning a vague “wouldn’t it be cool if” into something that actually runs: a database that holds, an interface that breathes, an AI that remembers your name. If your idea sounds a little unreasonable, that’s usually my favourite place to start.',
} as const;
