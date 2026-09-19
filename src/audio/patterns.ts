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
const O = "openhat";
const C = "clap";
const R = "ride";
const T = "tick";
const TA = "tickAccent";

export const PLACEHOLDER_PATTERNS: readonly Pattern[] = [
  {
    id: "pop",
    name: "Pop",
    // Classic metronome: a tick on every step, higher tick on the first.
    stepsPerBeat: 1,
    sequence: [TA, T, T, T],
  },
  {
    id: "rock",
    name: "Rock",
    stepsPerBeat: 2,
    sequence: [[K, H], H, [S, H], [K, H], [K, H], H, [S, H], H],
  },
  {
    id: "metal",
    name: "Metal",
    stepsPerBeat: 2,
    sequence: [[K, H], K, [K, S], K, [K, H], K, [K, S], K],
  },
  {
    id: "jazz",
    name: "Jazz",
    stepsPerBeat: 3,
    // Swung ride: on the beat and on the last triplet of every other beat.
    sequence: [[R, K], null, null, [R, H], null, R, [R, K], null, null, [R, H], null, R],
  },
  {
    id: "electro",
    name: "Electro",
    stepsPerBeat: 2,
    sequence: [K, O, [K, C], O, K, O, [K, C], O],
  },
];
