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
    stepsPerBeat: 2,
    sequence: [[K, H], H, [S, H], [K, H], [K, H], H, [S, H], H],
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
