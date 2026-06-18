/**
 * Landing intro — the "About"-style statement that doubles as the site's
 * opening. Carries the document's single <h1> (the headline statement), with a
 * short intro to the site beneath. Same typographic treatment as the original
 * hero (big serif line + muted sub), recoloured for the pure-black night sky.
 */
export function Intro() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-[clamp(2rem,6vw,4.25rem)] leading-[1.02] tracking-tight text-ink [text-shadow:0_2px_40px_rgba(0,0,0,0.65)]">
        The things we create eventually create us.
      </h1>

      <p className="mx-auto mt-6 max-w-xl font-sans text-base leading-relaxed text-muted [text-shadow:0_1px_24px_rgba(0,0,0,0.7)] sm:text-lg">
        GDG Quantum is a studio for considered digital systems &mdash;
        interfaces, tools, and experiences built with intention. Consider this
        the home base: explore the projects, get to know the thinking behind
        them, and reach out when you&rsquo;re ready to build something of your
        own.
      </p>
    </div>
  );
}
