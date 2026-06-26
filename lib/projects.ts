/**
 * Projects showcase — the single source of truth for the cinematic Projects
 * interior (components/home/ProjectsInterior.tsx) and the crawlable SEO copy
 * (components/home/SeoContent.tsx). Update content here; the UI reads the array.
 *
 * The deck card uses: name / codename / tagline / story / highlights / tech /
 * media / links. The expanded case study additionally uses: role, gallery
 * (videos + pictures), sections (the "how it's built" breakdown), and unique.
 *
 * MEDIA: drop files into /public/projects and point `media` / `gallery[].src`
 *   at them. A missing file degrades to a tasteful gradient placeholder (never a
 *   broken <img>/<video>), so the structure stands before the assets land.
 *
 * LINKS: `live` / `source` / `play` render as CTA buttons. A private project
 *   (`private: true`) shows no external links.
 */

export interface ProjectMedia {
  image?: string;
  video?: string;
  poster?: string;
}

export interface ProjectLinks {
  live?: string;
  source?: string;
  play?: string;
}

/** One gallery item shown in the expanded case study's media section. */
export interface GalleryItem {
  kind: 'image' | 'video';
  /** File under /public/projects (falls back to a placeholder if absent). */
  src: string;
  /** Poster for a video. */
  poster?: string;
  /** Short caption describing the shot. */
  caption?: string;
}

/** One "how it's built" block — a titled, readable chunk. */
export interface ProjectSection {
  title: string;
  body: string;
}

export interface Project {
  id: string;
  name: string;
  codename: string;
  tagline: string;
  /** 2-3 sentence overview: what it is + why it matters. */
  story: string;
  /** Scope / contribution (matters to hiring managers). */
  role?: string;
  /** Short "spec sheet" facts (the metrics strip). */
  highlights: string[];
  tech: string[];
  media?: ProjectMedia;
  /** Videos + pictures for the gallery section. */
  gallery?: GalleryItem[];
  /** The component breakdown — how it's made. */
  sections?: ProjectSection[];
  /** The one memorable differentiator. */
  unique?: string;
  links?: ProjectLinks;
  accent: string;
  private?: boolean;
}

export const projects: Project[] = [
  {
    id: 'helix',
    name: 'Helix',
    codename: 'HELIX',
    tagline: 'A local-first AI assistant that wakes to your voice and remembers.',
    story:
      'My flagship build: a personal AI assistant that runs entirely on my own laptop. It wakes on a spoken word, thinks with Claude, replies in a calm British voice, and runs a team of six background agents. Its defining feature is an intelligent memory that decides what is worth remembering, forgets gracefully over time, and renders everything it knows as a live 3D neural brain you can fly through.',
    role: 'Solo build — backend, AI, voice pipeline, 3D HUD, and security.',
    highlights: [
      'Runs fully local on a 4 GB-VRAM laptop',
      'Intelligent 3-layer memory + live 3D brain',
      '243 passing tests · secrets never on disk',
    ],
    tech: ['Python', 'FastAPI', 'Claude', 'Tauri', 'React', 'TypeScript', 'Three.js'],
    media: { image: '/projects/helix.jpg' },
    gallery: [
      { kind: 'image', src: '/projects/helix-orb.jpg', caption: 'The Helix orb — its identity + voice state.' },
      { kind: 'image', src: '/projects/helix-brain.jpg', caption: 'The 3D memory brain you can fly through.' },
      { kind: 'image', src: '/projects/helix-agents.jpg', caption: 'Six background agents, live status + tasks.' },
    ],
    sections: [
      { title: 'Voice pipeline', body: 'A wake word triggers local speech-to-text; Claude reasons over the result and replies through a custom British text-to-speech voice. A fully-local model stands in when the network is gone.' },
      { title: 'The memory brain', body: 'Three layers — a verbatim diary, distilled "sticky-note" facts, and a vector store for semantic recall. A cheap model judges what is worth keeping, resolves contradictions, and lets old facts fade over time.' },
      { title: 'Six agents', body: 'A background runtime of role-based agents (lead, frontend, backend, security, and more) with a task queue, live status, and a per-agent permission matrix for the tools they can touch.' },
      { title: 'Local and secure', body: 'Everything runs on a 4 GB-VRAM laptop. Secrets live in the OS credential store (never on disk), the backend is bound to loopback only, and recalled memory is wrapped in an untrusted-content boundary against prompt injection.' },
    ],
    unique:
      'It runs entirely on my own machine and treats memory like a mind, not a database — deciding what is worth keeping, forgetting gracefully, and letting you literally fly through everything it knows as a living 3D brain.',
    accent: '#7fdfff',
    private: true,
  },
  {
    id: 'gdg-quantum',
    name: 'GDG Quantum',
    codename: 'GDG-QUANTUM',
    tagline: 'The cinematic WebGL site you are flying through right now.',
    story:
      'This site. A single-page experience built around a live 3D orb you navigate by diving into it, with a full WebGL world and a hidden browser game one click away. The hard part was making it cinematic AND fast AND accessible AND working on phones, all at once, while keeping the homepage under 100 kB.',
    role: 'Solo build — design, front end, backend, security, and deploy.',
    highlights: [
      'Under 100 kB First Load on every device',
      'WebGL world + a whole game, async-isolated',
      'Nonce-CSP · WCAG AA · SEO-hardened',
    ],
    tech: ['Next.js', 'TypeScript', 'Three.js', 'GSAP', 'Tailwind CSS', 'Prisma', 'PostgreSQL'],
    media: { image: '/projects/gdg-quantum.jpg' },
    gallery: [
      { kind: 'image', src: '/projects/gdg-orb.jpg', caption: 'The landing — the Helix orb in a night sky.' },
      { kind: 'image', src: '/projects/gdg-projects.jpg', caption: 'The Projects deck (you are here).' },
      { kind: 'image', src: '/projects/gdg-contact.jpg', caption: 'The Contact singularity + transmission console.' },
    ],
    sections: [
      { title: 'One WebGL world', body: 'The night sky and the orb render in a single camera. Navigation is a continuous "dive depth" scalar — moving between sections is the camera flying deeper into the orb, not a page change.' },
      { title: 'Performance discipline', body: 'Three.js, the post-processing, and an entire hidden game are split into async chunks, so the page you land on still ships under 100 kB and the headline stays the largest paint.' },
      { title: 'A real backend', body: 'The contact form runs through a Next.js Server Action into Postgres + transactional email, wrapped in a full security envelope: honeypot, time-trap, Cloudflare Turnstile, rate limiting, and a per-request nonce CSP.' },
      { title: 'Accessible and crawlable', body: 'The cinematic interiors are client-only, so the same copy is server-rendered as crawlable HTML with Person/ProfilePage structured data, plus reduced-motion and no-WebGL fallbacks.' },
    ],
    unique:
      'A whole WebGL world and a from-scratch game live one click away, yet the page you land on loads in under 100 kB. Cinematic and fast are usually a trade-off; here they are not.',
    links: { live: 'https://gdgquantum.com', source: 'https://github.com/GDGuzman11/GDGQuantumWeb' },
    accent: '#6ea8ff',
  },
  {
    id: 'starshell',
    name: 'Starshell',
    codename: 'STARSHELL',
    tagline: "A '93-pixel first-person shooter built in the browser, no game engine.",
    story:
      'A retro FPS I wrote from scratch on Three.js: the renderer, the physics, the hitscan combat, and a squad-coordinated alien AI that flanks, climbs, and zeroes in on you. There are zero asset files. Every texture and sound is generated by code at runtime. It is a full 20-level campaign that runs on a phone.',
    role: 'Solo build — engine, combat, AI, level generation, and audio.',
    highlights: [
      'No game engine · zero asset files',
      'Squad AI: line-of-sight, flanking, climbing',
      '20-level campaign · ~288 kB, runs on mobile',
    ],
    tech: ['Three.js', 'TypeScript', 'Tailwind CSS', 'Web Audio'],
    media: { image: '/projects/starshell.jpg' },
    gallery: [
      { kind: 'image', src: '/projects/starshell-fight.jpg', caption: 'A firefight in the procedural warzone city.' },
      { kind: 'image', src: '/projects/starshell-arsenal.jpg', caption: 'The loadout — ~18 guns + 12 throwables.' },
      { kind: 'image', src: '/projects/starshell-boss.jpg', caption: 'A boss fight (every 5th level).' },
    ],
    sections: [
      { title: 'No engine', body: 'Built directly on Three.js — a hand-written render loop, an AABB physics/collision world with ladders and ziplines, and pointer-lock input. Rendered at 480×270 with nearest-filter textures and CSS-upscaled for the retro look.' },
      { title: 'Procedural everything', body: 'There are no image or sound files. Every texture (walls, enemy sprites, bosses) is drawn to a canvas at runtime, and every sound effect is generated through the Web Audio API.' },
      { title: 'Combat and arsenal', body: 'Hitscan guns via raycasting, an ~18-weapon arsenal across rifle / MG / laser / sniper / launcher families, ADS zoom, and 12 throwables with status effects (burn, slow, stun, blind) and lingering zones.' },
      { title: 'Squad AI', body: 'Enemies do not know where you are until they see you. Once spotted, the squad shares intel and takes roles — tank, sniper that climbs a tower to perch, pincer flankers — and their aim zeroes in the longer they hold line-of-sight on you.' },
    ],
    unique:
      'A complete first-person shooter with no game engine and not a single asset file — every pixel and every sound is generated by code at runtime, the whole thing in about 288 kB.',
    links: { play: '/arcade', source: 'https://github.com/GDGuzman11/Starshell' },
    accent: '#ffd27a',
  },
];
