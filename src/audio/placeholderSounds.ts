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

function clap(sr: number) {
  const n = noise(7);
  // Three quick bursts, like several hands clapping slightly apart.
  return render(sr, 0.18, (t) => {
    const burst = Math.max(
      Math.exp(-t * 60),
      Math.exp(-Math.max(0, t - 0.01) * 60),
      Math.exp(-Math.max(0, t - 0.02) * 25),
    );
    return 0.4 * n() * burst * (t < 0.02 ? 0.7 : 1);
  });
}

export function placeholderSamples(sampleRate: number): SampleBank {
  return {
    kick: [kick(sampleRate)],
    snare: [snare(sampleRate)],
    hat: [metallic(sampleRate, 0.06, 70, 0.25, 3)],
    openhat: [metallic(sampleRate, 0.25, 14, 0.2, 4)],
    ride: [metallic(sampleRate, 0.4, 9, 0.15, 5)],
    clap: [clap(sampleRate)],
  };
}
