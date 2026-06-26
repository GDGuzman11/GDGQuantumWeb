import { about, profile } from '@/lib/profile';
import { TECH_STACK } from '@/lib/tech-stack';
import { projects } from '@/lib/projects';

/**
 * Crawlable, server-rendered copy of the site's section content.
 *
 * The cinematic About/Projects/Contact interiors live in a client-only React
 * portal that mounts only when you "dive" into the orb — so search engines and
 * assistive tech would otherwise see an empty page. This renders the SAME copy
 * as honest, semantic HTML in the initial server response. It's visually
 * offscreen (`sr-only`) because the WebGL world is the visual presentation, but
 * it is fully present in the DOM, indexable, and screen-reader navigable.
 *
 * Pure server component (no `use client`) so the text ships in the SSR'd HTML.
 */
export function SeoContent() {
  return (
    <section className="sr-only" aria-label={`About ${profile.name}`}>
      <h2>About {profile.name}</h2>
      <p>{about.headers[0]}</p>
      <p>{about.intro}</p>
      {TECH_STACK.map((group) => (
        <p key={group.label}>
          <strong>{group.label}:</strong>{' '}
          {group.items.map((t) => t.name).join(', ')}
        </p>
      ))}
      <p>{about.closing}</p>

      <h2>Projects</h2>
      <p>Selected work by {profile.name}. Fly into the orb to explore the case studies.</p>
      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            <strong>{p.name}</strong> — {p.tagline} {p.story}{' '}
            {p.links?.live ? <a href={p.links.live}>Live</a> : null}
            {p.links?.source ? <a href={p.links.source}>Source</a> : null}
          </li>
        ))}
      </ul>

      <h2>Contact</h2>
      <p>
        Have an idea worth building? Transmit a message through the contact form,
        or find {profile.name} on{' '}
        <a href={profile.sameAs[0]}>LinkedIn</a>,{' '}
        <a href={profile.sameAs[1]}>GitHub</a>, and{' '}
        <a href={profile.sameAs[2]}>Upwork</a>.
      </p>
    </section>
  );
}
