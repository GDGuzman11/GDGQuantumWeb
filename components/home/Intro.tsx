/**
 * Landing intro — the opening statement (doubles as "About"). Carries the
 * document's single <h1>. A light ray projected from the Helix core "draws" the
 * headline and statement into being on load (see the gdg-holo-* keyframes in
 * globals.css); reduced-motion users just get the final, legible text.
 *
 * First-person, builder's voice — ambition + curiosity about the mechanics, not
 * a studio sales pitch.
 */
export function Intro() {
  return (
    <div className="relative max-w-2xl">
      {/* Projection ray from the Helix core above, drawing the text into being. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -top-[20vmin] h-[24vmin] w-px -translate-x-1/2"
        style={{
          transformOrigin: 'top',
          background:
            'linear-gradient(to bottom, rgba(126,223,255,0) 0%, rgba(126,223,255,0.7) 45%, rgba(126,223,255,0) 100%)',
          filter: 'blur(0.5px)',
          boxShadow: '0 0 18px rgba(126,223,255,0.45)',
          animation: 'gdg-holo-beam 0.9s ease-out both',
        }}
      />

      {/* Text group — relative so the drifting scanline sweeps through it. */}
      <div className="relative">
        {/* Living scanline — drifts down through the header every few seconds. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(126,223,255,0.6), transparent)',
            filter: 'blur(0.5px)',
            animation: 'gdg-holo-scan 7s linear 2.6s infinite',
          }}
        />

        <h1
          className="font-serif text-[clamp(2rem,6vw,4.25rem)] leading-[1.02] tracking-tight text-ink [text-shadow:0_2px_40px_rgba(0,0,0,0.65),0_0_22px_rgba(126,223,255,0.22)]"
          style={{
            animation:
              'gdg-holo-in 1.25s ease-out 0.45s both, gdg-holo-live 6s ease-in-out 2.2s infinite',
          }}
        >
          Let&rsquo;s build something that didn&rsquo;t exist this morning.
        </h1>

        <p
          className="mx-auto mt-6 max-w-xl font-sans text-base leading-relaxed text-muted [text-shadow:0_1px_24px_rgba(0,0,0,0.7)] sm:text-lg"
          style={{ animation: 'gdg-holo-in 1.25s ease-out 0.95s both' }}
        >
          I&rsquo;m a developer chasing the hard problems &mdash; I want to know
          how everything works, then use it to build things that feel
          impossible. Got one of those? Let&rsquo;s talk.
        </p>
      </div>
    </div>
  );
}
