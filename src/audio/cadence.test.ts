import { describe, expect, it } from "vitest";
import { clampBpm, loopSafeLength, stepBpm, stepOnsets } from "./cadence";

describe("BPM rules", () => {
  it("only ever produces the allowed values", () => {
    const allowed = [160, 165, 170, 175, 180, 185, 190];
    for (let bpm = 100; bpm <= 250; bpm += 0.5) expect(allowed).toContain(clampBpm(bpm));
    expect(clampBpm(Number.NaN)).toBe(175);
  });

  it("steps by 5 and stops at the ends", () => {
    expect(stepBpm(175, 1)).toBe(180);
    expect(stepBpm(175, -1)).toBe(170);
    expect(stepBpm(190, 1)).toBe(190);
    expect(stepBpm(160, -1)).toBe(160);
  });
});

describe("step onsets", () => {
  it("are exact when the tempo divides the sample rate evenly", () => {
    // 44100 Hz at 175 BPM = exactly 15120 samples per beat.
    const { onsets, length } = stepOnsets(175, 44100, 4, 1);
    expect(onsets).toEqual([0, 15120, 30240, 45360]);
    expect(length).toBe(60480);
  });

  it("never accumulate rounding error", () => {
    for (const sr of [44100, 48000]) {
      for (const bpm of [160, 165, 170, 175, 180, 185, 190]) {
        const steps = 12;
        const { onsets, length } = stepOnsets(bpm, sr, steps, 3);
        const exact = (sr * 60) / bpm / 3;
        onsets.forEach((o, i) => expect(Math.abs(o - i * exact)).toBeLessThanOrEqual(0.5));
        // Loop end may move a few samples to stay browser-safe (see loopSafeLength).
        expect(Math.abs(length - steps * exact)).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe("loopSafeLength", () => {
  it("keeps the 190 BPM loop from breaking in Chromium", () => {
    // 60632 samples at 48 kHz was measured to loop wrongly; its neighbour works.
    expect(loopSafeLength(60632, 48000)).not.toBe(60632);
    expect(Math.abs(loopSafeLength(60632, 48000) - 60632)).toBeLessThanOrEqual(2);
  });

  it("always finds an exact length within 3 samples for real tempos", () => {
    for (const sr of [22050, 44100, 48000, 96000]) {
      for (let bpm = 160; bpm <= 190; bpm += 5) {
        for (const steps of [4, 8, 12, 16]) {
          const { length } = stepOnsets(bpm, sr, steps, 2);
          expect((length / sr) * sr).toBe(length);
        }
      }
    }
  });
});
