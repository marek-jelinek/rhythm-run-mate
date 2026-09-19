import { stepOnsets } from "./cadence";
import { beatsInPattern, stepSamples, type Pattern } from "./patterns";

/** Sample name → audio data per channel (1 = mono, 2 = stereo). */
export type SampleBank = Record<string, readonly Float32Array[]>;

export type MixedLoop = {
  channels: Float32Array<ArrayBuffer>[];
  sampleRate: number;
  /** Sample position of every beat (not step) in the loop. */
  beatOnsets: number[];
};

/** Peak level the loop is scaled down to if layered hits would clip. */
const PEAK_LIMIT = 0.98;

export function validatePattern(pattern: Pattern, samples: SampleBank): void {
  const beats = beatsInPattern(pattern);
  if (!Number.isInteger(beats) || beats < 1) {
    throw new Error(
      `Pattern "${pattern.id}": ${pattern.sequence.length} steps is not a whole number of beats at ${pattern.stepsPerBeat} steps per beat`,
    );
  }
  for (const step of pattern.sequence) {
    for (const name of stepSamples(step)) {
      if (!samples[name]) throw new Error(`Pattern "${pattern.id}" uses unknown sample "${name}"`);
    }
  }
}

/**
 * Mix one loop of `pattern` at `bpm`. A sound that rings past the end of the
 * loop wraps around to its start, so the loop repeats seamlessly.
 */
export function mixLoop(
  pattern: Pattern,
  samples: SampleBank,
  bpm: number,
  sampleRate: number,
  channelCount = 2,
): MixedLoop {
  validatePattern(pattern, samples);
  const { onsets, length } = stepOnsets(
    bpm,
    sampleRate,
    pattern.sequence.length,
    pattern.stepsPerBeat,
  );
  const channels = Array.from({ length: channelCount }, () => new Float32Array(length));

  pattern.sequence.forEach((step, i) => {
    const onset = onsets[i]!;
    for (const name of stepSamples(step)) {
      const sample = samples[name]!;
      channels.forEach((out, ch) => {
        const data = sample[Math.min(ch, sample.length - 1)]!;
        for (let j = 0; j < data.length; j++) out[(onset + j) % length]! += data[j]!;
      });
    }
  });

  let peak = 0;
  for (const out of channels) for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > PEAK_LIMIT) {
    const scale = PEAK_LIMIT / peak;
    for (const out of channels) for (let j = 0; j < out.length; j++) out[j]! *= scale;
  }

  const beatOnsets = onsets.filter((_, i) => i % pattern.stepsPerBeat === 0);
  return { channels, sampleRate, beatOnsets };
}
