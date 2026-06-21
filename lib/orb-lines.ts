/**
 * Orb-tap easter egg — copy + escalation sequence.
 *
 * Tapping the Helix orb is pure cinematic feedback: the orb glows in a mood
 * colour, fires a ray at the headline, and the headline rewrites to the next
 * line in an escalating, increasingly sarcastic run. The finale redirects to
 * Contact and the counter resets.
 *
 * Pure data + a tiny resolver — no DOM, no React — so it stays trivially
 * editable and adds nothing to the client bundle's runtime weight.
 */

/** The landing's resting headline (also the document's single <h1> content). */
export const BASE_HEADLINE = 'Let’s build something that didn’t exist this morning.';

/** Taps 1–2 pull a random line from this pool (tap 2 distinct from tap 1). */
export const ORB_LINES: readonly string[] = [
  'Bring the idea — I’ll bring the build.',
  'Let’s make something the internet hasn’t seen yet.',
  'Two heads, one impossible idea. Let’s go.',
  'You dream it, I’ll make it real.',
  'Let’s build something worth staying up for.',
  'Big idea? Let’s give it a pulse.',
  'From ‘what if’ to ‘it’s live.’',
  'Let’s turn your maybe into a demo.',
  'The future’s not gonna build itself.',
  'Got a wild one? That’s my favourite kind.',
] as const;

/** Mood drives the orb-flash / ray colour AND the headline glow styling. */
export type OrbMood = 'base' | 'white' | 'blue' | 'faint' | 'red';

/** Flash / ray colours per mood (CSS colour strings). */
export const MOOD_COLOR: Record<Exclude<OrbMood, 'base'>, string> = {
  white: '#ffffff',
  blue: '#6ea8ff',
  faint: '#9aa3b8',
  red: '#ff4d4d',
};

export interface OrbStep {
  /** Headline text to type out. */
  headline: string;
  /** Mood for the headline glow + orb flash. */
  mood: OrbMood;
  /** Flash / ray colour. */
  color: string;
  /** Render the 👏 clap animation in the headline. */
  clap: boolean;
  /** Tap 6 — redirect to Contact + reset the counter. */
  finale: boolean;
  /** Taps 1–2 — re-randomised each cycle, so the chosen line is remembered. */
  randomLine: boolean;
}

/** Pick a random pool line, optionally excluding one (so tap 2 ≠ tap 1). */
export function pickRandomLine(exclude?: string | null): string {
  const pool = exclude ? ORB_LINES.filter((l) => l !== exclude) : ORB_LINES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Resolve the step for a given tap count (1..6+).
 * `lastRandom` is the line shown on tap 1, so tap 2 picks a distinct one.
 */
export function orbStep(tap: number, lastRandom?: string | null): OrbStep {
  switch (tap) {
    case 1:
      return {
        headline: pickRandomLine(),
        mood: 'white',
        color: MOOD_COLOR.white,
        clap: false,
        finale: false,
        randomLine: true,
      };
    case 2:
      return {
        headline: pickRandomLine(lastRandom),
        mood: 'white',
        color: MOOD_COLOR.white,
        clap: false,
        finale: false,
        randomLine: true,
      };
    case 3:
      return {
        headline: '…really? again?',
        mood: 'blue',
        color: MOOD_COLOR.blue,
        clap: false,
        finale: false,
        randomLine: false,
      };
    case 4:
      return {
        headline: 'Never give up. 👏 Never surrender. 👏',
        mood: 'faint',
        color: MOOD_COLOR.faint,
        clap: true,
        finale: false,
        randomLine: false,
      };
    case 5:
      return {
        headline: 'Wow. Still clicking. Truly visionary.',
        mood: 'faint',
        color: MOOD_COLOR.faint,
        clap: false,
        finale: false,
        randomLine: false,
      };
    default:
      // Tap 6 (and any overshoot) — the finale.
      return {
        headline:
          'Okay — you’ve clicked way too many damn times. Here’s the contact info.',
        mood: 'red',
        color: MOOD_COLOR.red,
        clap: false,
        finale: true,
        randomLine: false,
      };
  }
}
