import { Panel } from './Panel';
import { SYSTEMS_LABEL } from '@/lib/site-config';
import { ProjectsShowcase } from './projects/ProjectsShowcase';

/**
 * Panel 02 — Projects (#systems).
 *
 * The light-speed warp dive lands here straight from Welcome. The section is the
 * showcase centerpiece: three glassmorphic terminal cards that expand into a
 * full-screen, scroll-locked case study (see components/sections/projects/).
 * It keeps the swappable SYSTEMS_LABEL constant so its name lives in one place.
 *
 * NOTE: the internal id/hash stays `systems` so deep-links and the deck wiring
 * are unchanged; only the visible label reads "Projects".
 */
export function Systems() {
  return (
    <Panel id="systems" index="02" ariaLabel={SYSTEMS_LABEL} theme="dark" transparent>
      <ProjectsShowcase />
    </Panel>
  );
}
