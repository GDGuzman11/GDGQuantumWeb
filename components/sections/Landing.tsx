import { Panel } from './Panel';
import { HeroContent } from '@/components/hero/HeroContent';

/**
 * Panel 01 — Landing / hero (#home).
 *
 * A thin server wrapper around the panel shell; the hero copy (the document's
 * single <h1>, the LCP element) and the GSAP entrance reveal live in HeroContent
 * (a client component). Keeping the panel boundary here means the hero internals
 * can be swapped without touching the section's structure.
 *
 * Phase 3R — Landing is the only DARK, cinematic panel. `theme="dark"` re-values
 * the semantic tokens (so the hero copy renders light without hard-coded hex),
 * and `transparent` lets the fixed dark backdrop + particle tunnel (mounted once
 * in the deck chrome, behind the content) show through. About/Systems/Contact
 * stay on the locked light palette.
 */
export function Landing() {
  return (
    <Panel id="home" index="01" ariaLabel="Landing" theme="dark" transparent>
      <HeroContent />
    </Panel>
  );
}
