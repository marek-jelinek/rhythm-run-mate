/**
 * Timing math for one playing loop ("segment"), kept free of Web Audio so it
 * can be unit-tested. Times are in seconds on the audio clock
 * (AudioContext.currentTime). Beats are counted globally from the moment
 * playback started, so they keep counting across BPM and track changes.
 */
export type Segment = {
  /** Audio-clock time at which this segment starts sounding. */
  startTime: number;
  /** Global beat number that sounds at startTime. */
  startBeat: number;
  /** Start of each beat within the loop, in seconds from the loop start. */
  beatOffsets: readonly number[];
  loopDuration: number;
};

function beats(seg: Segment) {
  return seg.beatOffsets.length;
}

/** Where in the loop (seconds) playback begins, so the pattern continues on the right beat. */
export function loopOffset(seg: Segment): number {
  return seg.beatOffsets[mod(seg.startBeat, beats(seg))]!;
}

/** Audio-clock time of the loop's virtual beginning just before startTime. */
function loopZero(seg: Segment) {
  return seg.startTime - loopOffset(seg);
}

/** Global beat number of the loop's first beat at loopZero. */
function beatZero(seg: Segment) {
  return seg.startBeat - mod(seg.startBeat, beats(seg));
}

/** Global beat position (e.g. 12.25 = a quarter of the way through beat 12) at `time`. */
export function positionAt(seg: Segment, time: number): number {
  const since = time - loopZero(seg);
  const loops = Math.floor(since / seg.loopDuration);
  const inLoop = since - loops * seg.loopDuration;
  const n = beats(seg);
  let k = n - 1;
  while (k > 0 && seg.beatOffsets[k]! > inLoop) k--;
  const from = seg.beatOffsets[k]!;
  const to = k + 1 < n ? seg.beatOffsets[k + 1]! : seg.loopDuration;
  return beatZero(seg) + loops * n + k + (inLoop - from) / (to - from);
}

/** Audio-clock time at which global beat `beat` sounds in this segment. */
export function timeOfBeat(seg: Segment, beat: number): number {
  const rel = beat - beatZero(seg);
  const n = beats(seg);
  return loopZero(seg) + Math.floor(rel / n) * seg.loopDuration + seg.beatOffsets[mod(rel, n)]!;
}

/** The first beat that starts strictly after `time`. */
export function nextBeatAfter(seg: Segment, time: number): { beat: number; time: number } {
  let beat = Math.floor(positionAt(seg, time)) + 1;
  // Guard against floating-point edge cases right on a beat boundary.
  while (timeOfBeat(seg, beat) <= time) beat++;
  return { beat, time: timeOfBeat(seg, beat) };
}

function mod(a: number, n: number) {
  return ((a % n) + n) % n;
}
