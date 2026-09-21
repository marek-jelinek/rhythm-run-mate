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
const D = "drum";
const G = "ghost";
const B = "sub";
const T = "tick";
const TA = "tickAccent";

/**
 * Layers of the Electro track, switched on block by block so the energy
 * builds: bare four-on-the-floor kick first, full kit by the end. When the
 * loop wraps it drops straight back to the bare kick — the usual house reset.
 */
type HouseLayer = "kick" | "offHat" | "openHat" | "hats16" | "clap" | "ride" | "ghosts" | "sub";

const HOUSE_BUILD: readonly (readonly HouseLayer[])[] = [
  ["kick"],
  ["kick", "offHat"],
  ["kick", "offHat", "clap"],
  ["kick", "offHat", "clap", "ghosts"],
  ["kick", "openHat", "clap", "ghosts", "sub"],
  ["kick", "openHat", "clap", "hats16", "sub"],
  ["kick", "openHat", "clap", "hats16", "ride", "sub"],
  ["kick", "openHat", "clap", "hats16", "ride", "ghosts", "sub"],
];

/** Bars per block. 8 blocks x 5 bars x 4 beats = 160 beats, about a minute of running. */
const BARS_PER_BLOCK = 5;
const STEPS_PER_BAR = 16;

function houseBuildSequence(): readonly Step[] {
  const seq: Step[] = [];
  for (const layers of HOUSE_BUILD) {
    const has = (l: HouseLayer) => layers.includes(l);
    for (let bar = 0; bar < BARS_PER_BLOCK; bar++) {
      for (let i = 0; i < STEPS_PER_BAR; i++) {
        const onBeat = i % 4 === 0;
        const offBeat = i % 4 === 2;
        const hits: string[] = [];
        if (has("kick") && onBeat) hits.push(K);
        if (has("sub") && i === 0) hits.push(B);
        if (has("clap") && (i === 4 || i === 12)) hits.push(C);
        if (has("offHat") && offBeat) hits.push(H);
        if (has("openHat") && offBeat) hits.push(O);
        if (has("hats16") && i % 2 === 1) hits.push(H);
        if (has("ride") && onBeat) hits.push(R);
        if (has("ghosts") && (i === 7 || i === 15)) hits.push(G);
        seq.push(hits.length === 0 ? null : hits.length === 1 ? hits[0]! : hits);
      }
    }
  }
  return seq;
}

export const PLACEHOLDER_PATTERNS: readonly Pattern[] = [
  {
    id: "pop",
    name: "Pop",
    // Plain drum on every step, every hit identical — no accented first beat.
    stepsPerBeat: 1,
    sequence: [D, D, D, D],
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
    stepsPerBeat: 4,
    sequence: houseBuildSequence(),
  },
];
