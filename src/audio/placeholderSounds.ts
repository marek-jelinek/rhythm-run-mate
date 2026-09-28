import type { SampleBank } from "./mix";

// Simple drum sounds generated in code, used until real WAV samples exist.
// All are mono; the mixer copies mono samples to both channels.

/** Deterministic noise so every render is identical (and testable). */
function noise(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 0xffffffff) * 2 - 1;
  };
}

function render(sampleRate: number, seconds: number, fn: (t: number, i: number) => number) {
  const out = new Float32Array(Math.round(sampleRate * seconds));
  for (let i = 0; i < out.length; i++) out[i] = fn(i / sampleRate, i);
  return out;
}

function kick(sr: number) {
  let phase = 0;
  return render(sr, 0.3, (t) => {
    const freq = 50 + 110 * Math.exp(-t * 30);
    phase += (2 * Math.PI * freq) / sr;
    return 0.9 * Math.sin(phase) * Math.exp(-t * 9);
  });
}

function snare(sr: number) {
  const n = noise(1);
  return render(
    sr,
    0.2,
    (t) =>
      0.45 * n() * Math.exp(-t * 22) + 0.3 * Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 30),
  );
}

/** Noise with the low end removed (a one-pole high-pass), for cymbals. */
function metallic(sr: number, seconds: number, decay: number, gain: number, seed: number) {
  const n = noise(seed);
  let prevIn = 0;
  let prevOut = 0;
  return render(sr, seconds, (t) => {
    const x = n();
    prevOut = 0.85 * (prevOut + x - prevIn);
    prevIn = x;
    return gain * prevOut * Math.exp(-t * decay);
  });
}

/**
 * Plain acoustic-style drum: a short beater click on top of a body that drops
 * in pitch the way a real drum head does. No tuning differences between hits —
 * every stroke sounds the same.
 */
function drum(sr: number) {
  const n = noise(11);
  let phase = 0;
  let lp = 0;
  return render(sr, 0.35, (t) => {
    const freq = 60 + 120 * Math.exp(-t * 55);
    phase += (2 * Math.PI * freq) / sr;
    const body = Math.sin(phase) * Math.exp(-t * 11);
    // Beater click, softened by a one-pole low-pass so it thuds instead of hissing.
    lp += 0.35 * (n() - lp);
    const click = lp * Math.exp(-t * 220);
    return 0.85 * body + 0.5 * click;
  });
}

export function placeholderSamples(sampleRate: number): SampleBank {
  return {
    kick: [kick(sampleRate)],
    drum: [drum(sampleRate)],
    snare: [snare(sampleRate)],
    hat: [metallic(sampleRate, 0.06, 70, 0.25, 3)],
  };
}
