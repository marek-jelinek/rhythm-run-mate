// Tempo rules from the spec: 160–190 BPM in fixed steps of 5.
export const BPM_MIN = 160;
export const BPM_MAX = 190;
export const BPM_STEP = 5;
export const BPM_DEFAULT = 175;

/** Snap any number to the nearest allowed BPM value. */
export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return BPM_DEFAULT;
  const snapped = BPM_MIN + Math.round((bpm - BPM_MIN) / BPM_STEP) * BPM_STEP;
  return Math.min(BPM_MAX, Math.max(BPM_MIN, snapped));
}

/** One step up (+1) or down (-1), never leaving the allowed range. */
export function stepBpm(bpm: number, dir: 1 | -1): number {
  return clampBpm(clampBpm(bpm) + dir * BPM_STEP);
}

/**
 * Sample positions of every step in one loop.
 *
 * Each onset is rounded from its exact position independently, so rounding
 * errors never accumulate: onset k is always within half a sample of
 * k * samplesPerStep.
 */
export function stepOnsets(
  bpm: number,
  sampleRate: number,
  steps: number,
  stepsPerBeat: number,
): { onsets: number[]; length: number } {
  const samplesPerStep = (sampleRate * 60) / bpm / stepsPerBeat;
  const onsets = Array.from({ length: steps }, (_, i) => Math.round(i * samplesPerStep));
  return { onsets, length: loopSafeLength(Math.round(steps * samplesPerStep), sampleRate) };
}

/**
 * Nearest loop length (in samples) whose duration survives the round trip
 * samples → seconds → samples exactly.
 *
 * Found by measuring in Chromium: a looping AudioBufferSourceNode whose
 * length doesn't convert exactly (e.g. 60632 samples at 48 kHz, the 190 BPM
 * loop) jumps to the wrong spot at every wrap, so the rhythm breaks after
 * the first loop. Moving the end by a sample or two (~0.02 ms) avoids it.
 */
export function loopSafeLength(length: number, sampleRate: number): number {
  const exact = (n: number) => (n / sampleRate) * sampleRate === n;
  for (let d = 0; d < 1000; d++) {
    if (exact(length + d)) return length + d;
    if (d > 0 && length - d > 0 && exact(length - d)) return length - d;
  }
  return length;
}
