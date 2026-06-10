import { Preloader } from '@/components/chrome/Preloader';
import { TopBar } from '@/components/chrome/TopBar';
import { SectionNav } from '@/components/chrome/SectionNav';
import { PanelDeck } from '@/components/deck/PanelDeck';
import { TunnelStage } from '@/components/hero/tunnel/TunnelStage';
import { Landing } from '@/components/sections/Landing';
import { About } from '@/components/sections/About';
import { Systems } from '@/components/sections/Systems';
import { Contact } from '@/components/sections/Contact';

/**
 * Phase 3R — cinematic Landing + directional deck.
 *
 * The four panels are passed to `PanelDeck`, which owns the snap engine: one
 * gesture moves exactly one panel through a per-pair directional transition
 * (0↔1 down, 1↔2 side, 2↔3 up), all funnelled through `goToPanel(index)`.
 *
 * Two layers are handed to the deck so they live INSIDE the DeckProvider (and
 * thus read the active index) but OUTSIDE the transformed content:
 *  - `chrome`  — fixed TopBar + SectionNav (adapt to the dark Landing on panel 0)
 *  - `backdrop`— the persistent particle-tunnel host (fixed, z-0, behind the
 *                transparent Landing; opacity crossfades as you leave panel 0)
 *
 * The Preloader sits above everything (dark, to match the Landing entry) and is
 * unaffected by the deck.
 */
export default function Home() {
  return (
    <>
      <Preloader />

      <PanelDeck
        chrome={
          <>
            <TopBar />
            <SectionNav />
          </>
        }
        backdrop={<TunnelStage />}
        panels={[
          <Landing key="home" />,
          <About key="about" />,
          <Systems key="systems" />,
          <Contact key="contact" />,
        ]}
      />
    </>
  );
}
