import { describe, expect, it } from "vitest";
import { loopOffset, nextBeatAfter, positionAt, timeOfBeat, type Segment } from "./timeline";

// 4-beat loop, 0.5 s per beat, started at t = 10 s on beat 0.
const seg: Segment = {
  startTime: 10,
  startBeat: 0,
  beatOffsets: [0, 0.5, 1, 1.5],
  loopDuration: 2,
};

describe("timeline", () => {
  it("knows where the beat is at any time", () => {
    expect(positionAt(seg, 10)).toBeCloseTo(0);
    expect(positionAt(seg, 10.25)).toBeCloseTo(0.5);
    expect(positionAt(seg, 11.75)).toBeCloseTo(3.5);
    expect(positionAt(seg, 12)).toBeCloseTo(4); // second time round the loop
  });

  it("does not drift over a long run", () => {
    // 2 hours at 0.5 s per beat = 14400 beats.
    expect(timeOfBeat(seg, 14400)).toBeCloseTo(10 + 7200, 9);
    expect(positionAt(seg, 10 + 7200.25)).toBeCloseTo(14400.5, 6);
  });

  it("finds the next beat to switch on", () => {
    expect(nextBeatAfter(seg, 10.6)).toEqual({ beat: 2, time: 11 });
    expect(nextBeatAfter(seg, 11)).toEqual({ beat: 3, time: 11.5 }); // strictly after
  });

  it("continues the pattern mid-loop after a switch", () => {
    // New segment starting on global beat 6 → third beat of a 4-beat loop.
    const next: Segment = { ...seg, startTime: 13, startBeat: 6 };
    expect(loopOffset(next)).toBe(1);
    expect(positionAt(next, 13)).toBeCloseTo(6);
    expect(timeOfBeat(next, 8)).toBeCloseTo(14);
  });

  it("follows uneven beat spacing from sample rounding", () => {
    const uneven: Segment = {
      startTime: 0,
      startBeat: 0,
      beatOffsets: [0, 0.4, 1, 1.5],
      loopDuration: 2,
    };
    expect(positionAt(uneven, 0.2)).toBeCloseTo(0.5);
    expect(positionAt(uneven, 0.7)).toBeCloseTo(1.5);
  });
});
