import type { SampleBank } from "./mix";

/**
 * Recorded drum hits in /public/sounds. Each has a placeholder sound to fall
 * back on (or null for silence), so the beat still plays if a file fails to
 * load and the patterns can be tested without a browser.
 */
export const SAMPLE_FILES: Record<string, { url: string; fallback: string | null }> = {
  rock_kick: { url: "/sounds/rock/kick.wav", fallback: "kick" },
  rock_snare: { url: "/sounds/rock/snare.wav", fallback: "snare" },
  rock_ride: { url: "/sounds/rock/ride.wav", fallback: "hat" },
  rock_crash: { url: "/sounds/rock/crash.wav", fallback: "hat" },
  rock_tom: { url: "/sounds/rock/tom.wav", fallback: "drum" },
};

const SILENCE = [new Float32Array(1)];

/** Placeholder sounds plus every file sample, each filled in by its fallback. */
export function withFallbacks(placeholders: SampleBank): SampleBank {
  const bank: SampleBank = { ...placeholders };
  for (const [name, { fallback }] of Object.entries(SAMPLE_FILES)) {
    bank[name] = (fallback && placeholders[fallback]) || SILENCE;
  }
  return bank;
}

let downloads: Promise<Record<string, ArrayBuffer | null>> | null = null;

/**
 * Download all sample files once. Safe to call early (e.g. on page load) so
 * the files are ready by the time Play is pressed; a failed file becomes null.
 */
export function fetchSampleFiles(): Promise<Record<string, ArrayBuffer | null>> {
  downloads ??= Promise.all(
    Object.entries(SAMPLE_FILES).map(async ([name, { url }]) => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status}`);
        return [name, await res.arrayBuffer()] as const;
      } catch (err) {
        console.warn(`Sample "${name}" failed to load, using a placeholder`, err);
        return [name, null] as const;
      }
    }),
  ).then(Object.fromEntries);
  return downloads;
}

/**
 * Decode the downloaded files at the context's sample rate (the browser
 * resamples them) on top of the fallback bank. Mono: only the first channel is kept.
 */
export async function loadSamples(
  ctx: BaseAudioContext,
  fallbacks: SampleBank,
): Promise<SampleBank> {
  const files = await fetchSampleFiles();
  const bank: SampleBank = { ...fallbacks };
  await Promise.all(
    Object.entries(files).map(async ([name, data]) => {
      if (!data) return;
      try {
        // decodeAudioData detaches the buffer it gets, so hand it a copy.
        const audio = await ctx.decodeAudioData(data.slice(0));
        bank[name] = [audio.getChannelData(0)];
      } catch (err) {
        console.warn(`Sample "${name}" could not be decoded, using a placeholder`, err);
      }
    }),
  );
  return bank;
}
