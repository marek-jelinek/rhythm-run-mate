import { describe, expect, it } from "vitest";
import { mixLoop, validatePattern, type SampleBank } from "./mix";
import { PLACEHOLDER_PATTERNS, beatsInPattern, type Pattern } from "./patterns";
import { placeholderSamples } from "./placeholderSounds";

// 44100 Hz at 175 BPM: one beat = 15120 samples, easy to check by hand.
const SR = 44100;
const BPM = 175;
const BEAT = 15120;

const click: SampleBank = {
  click: [new Float32Array([0.5])],
  soft: [new Float32Array([0.25])],
  tail: [new Float32Array(BEAT * 2).fill(0.1)],
};

function pattern(sequence: Pattern["sequence"], stepsPerBeat = 1): Pattern {
  return { id: "t", name: "T", stepsPerBeat, sequence };
}

describe("mixLoop", () => {
  it("puts every hit on its exact sample", () => {
    const loop = mixLoop(pattern(["click", null, "click", "click"]), click, BPM, SR);
    const [left] = loop.channels;
    const hits = [...left!.keys()].filter((i) => left![i] !== 0);
    expect(hits).toEqual([0, 2 * BEAT, 3 * BEAT]);
    expect(left!.length).toBe(4 * BEAT);
    expect(loop.beatOnsets).toEqual([0, BEAT, 2 * BEAT, 3 * BEAT]);
  });

  it("reports beats, not steps, for patterns with several steps per beat", () => {
    const loop = mixLoop(pattern(["click", "click", "click", "click"], 2), click, BPM, SR);
    expect(loop.beatOnsets).toEqual([0, BEAT]);
    expect(loop.channels[0]!.length).toBe(2 * BEAT);
  });

  it("wraps a sound ringing past the loop end back to the start", () => {
    // A 2-beat sound on the last beat of a 2-beat loop covers the whole loop once.
    const loop = mixLoop(pattern([null, "tail"]), click, BPM, SR);
    expect(loop.channels[0]!.every((v) => Math.abs(v - 0.1) < 1e-6)).toBe(true);
  });

  it("layers sounds on one step and copies mono to both channels", () => {
    const loop = mixLoop(pattern([["soft", "soft"]]), click, BPM, SR);
    expect(loop.channels[0]![0]).toBeCloseTo(0.5);
    expect(loop.channels[1]![0]).toBeCloseTo(0.5);
  });

  it("scales the loop down instead of clipping", () => {
    const loop = mixLoop(pattern([["click", "click", "click"]]), click, BPM, SR);
    expect(loop.channels[0]![0]).toBeCloseTo(0.98);
  });

  it("rejects broken patterns", () => {
    expect(() => validatePattern(pattern(["click", "click", "click"], 2), click)).toThrow(
      /whole number/,
    );
    expect(() => validatePattern(pattern(["nope"]), click)).toThrow(/unknown sample/);
  });
});

describe("placeholder tracks", () => {
  it("has the 5 genres from the spec, all playable", () => {
    expect(PLACEHOLDER_PATTERNS.map((p) => p.name)).toEqual([
      "Basic",
      "Electro",
      "Rock",
      "Punk",
      "Metal",
    ]);
    const samples = placeholderSamples(SR);
    for (const p of PLACEHOLDER_PATTERNS) {
      const loop = mixLoop(p, samples, BPM, SR);
      // One onset per beat. Most tracks are a single bar; Electro is a long
      // build that adds a layer every few bars.
      expect(loop.beatOnsets).toHaveLength(beatsInPattern(p));
      for (const ch of loop.channels)
        expect(ch.every((v) => Number.isFinite(v) && Math.abs(v) <= 0.9801)).toBe(true);
    }
  });
});
