/**
 * A step plays one sample, several samples at once, or nothing (null).
 * BPM is never part of a pattern — it is always a separate runtime setting.
 */
export type Step = string | readonly string[] | null;

export type Pattern = {
  id: string;
  name: string;
  /** How many steps make one beat (1 = quarter notes, 2 = eighths, 3 = triplets). */
  stepsPerBeat: number;
  /** Length must be a whole number of beats. */
  sequence: readonly Step[];
};

export function beatsInPattern(pattern: Pattern): number {
  return pattern.sequence.length / pattern.stepsPerBeat;
}

export function stepSamples(step: Step): readonly string[] {
  if (step === null) return [];
  return typeof step === "string" ? [step] : step;
}

// Placeholder patterns using the generated sounds in placeholderSounds.ts.
// One beat = one running step, so these are written in 4-beat bars.
const K = "kick";
const S = "snare";
const H = "hat";
const D = "drum";

const RK = "rock_kick";
const RS = "rock_snare";
const RR = "rock_ride";
const RC = "rock_crash";

/**
 * One bar of the rock groove in sixteenths (0 = beat 1, 4 = beat 2, …):
 * snare on 2 and 4, a cymbal on every beat (`opening` on beat 1), and the
 * kick on the given sixteenths.
 */
function rockBar(kicks: number[], opening = RR): Step[] {
  return Array.from({ length: 16 }, (_, i) => {
    const hits: string[] = [];
    if (kicks.includes(i)) hits.push(RK);
    if (i === 4 || i === 12) hits.push(RS);
    if (i % 4 === 0) hits.push(i === 0 ? opening : RR);
    return hits.length > 0 ? hits : null;
  });
}

// Kick figures transcribed from the reference drum stem (see Sound/rozbor-emptiness-machine.md).
const ROCK_A = [0, 10, 14]; // 1, 3-and, 4-and
const ROCK_B = [2, 8]; // 1-and, 3
const ROCK_B2 = [2, 8, 10]; // 1-and, 3, 3-and

export const PLACEHOLDER_PATTERNS: readonly Pattern[] = [
  {
    id: "basic",
    name: "Basic",
    // Plain drum on every step, every hit identical — no accented first beat.
    stepsPerBeat: 1,
    sequence: [D, D, D, D],
  },
  {
    id: "electro",
    name: "Electro",
    // House: kick on every running step, closed hat on every offbeat.
    stepsPerBeat: 2,
    sequence: [K, H, K, H, K, H, K, H],
  },
  {
    id: "rock",
    name: "Rock",
    // Recorded kit (see sampleFiles.ts) playing the 8-bar groove of the
    // reference stem: a syncopated two-bar kick figure, a variation in bar 4,
    // and a crash opening the phrase.
    stepsPerBeat: 4,
    sequence: [
      rockBar(ROCK_A, RC),
      rockBar(ROCK_B),
      rockBar(ROCK_A),
      rockBar(ROCK_B2),
      rockBar(ROCK_A),
      rockBar(ROCK_B),
      rockBar(ROCK_A),
      rockBar(ROCK_B),
    ].flat(),
  },
  {
    id: "punk",
    name: "Punk",
    // Fast punk skank: kick on every running step, snare on every upbeat
    // between them, and one extra sixteenth snare that pushes into the next
    // bar. Two sounds only — the snare sits where the other tracks are silent,
    // which is what makes it drive.
    stepsPerBeat: 4,
    sequence: [K, null, S, null, K, null, S, null, K, null, S, null, K, null, S, S],
  },
  {
    id: "metal",
    name: "Metal",
    stepsPerBeat: 2,
    sequence: [[K, H], K, [K, S], K, [K, H], K, [K, S], K],
  },
];
