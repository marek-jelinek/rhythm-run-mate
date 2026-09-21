import { BPM_DEFAULT, clampBpm, stepBpm } from "./cadence";
import { mixLoop, type SampleBank } from "./mix";
import type { Pattern } from "./patterns";
import { placeholderSamples } from "./placeholderSounds";
import { nextBeatAfter, positionAt, loopOffset, type Segment } from "./timeline";

/** Delay between pressing Play and the first beat, so the start is never clipped. */
const START_DELAY = 0.06;
/** Minimum time needed to prepare a BPM/track switch before the beat it lands on. */
const SWITCH_LEAD = 0.03;
/** Short fades that stop clicks when a loop is cut off. */
const SWITCH_FADE = 0.004;
const STOP_FADE = 0.03;
const VOLUME_RAMP = 0.03;
/**
 * How much mixed audio to keep in memory, in seconds. A budget rather than a
 * count of loops, so a long pattern can never fill memory with copies of itself.
 */
const LOOP_CACHE_SECONDS = 180;

type PlayingSegment = Segment & {
  source: AudioBufferSourceNode;
  gain: GainNode;
  patternId: string;
  bpm: number;
};

export type EnginePosition = {
  /** Global beat number since Play, counting across BPM and track changes. */
  beat: number;
  /** 0 at the beat's hit, rising to 1 just before the next beat. */
  phase: number;
  /** Which beat of the current pattern is sounding (0-based). */
  beatInPattern: number;
  bpm: number;
  patternId: string;
};

type Loop = { buffer: AudioBuffer; beatOnsets: number[] };

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/**
 * Plays a drum pattern on repeat at an exact tempo.
 *
 * One loop of the pattern is mixed ahead of time and played with
 * `loop = true`, so beat timing comes from the audio hardware and needs no
 * JavaScript timers (which drift and get paused when the phone screen is
 * off). BPM and track changes switch to a newly mixed loop on the next beat.
 *
 * No React in here — the UI talks to it only through the public methods.
 */
export class CadenceEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private samples: SampleBank | null = null;
  private segments: PlayingSegment[] = [];
  private loopCache = new Map<string, Loop>();
  private _playing = false;
  private _bpm = BPM_DEFAULT;
  private _patternId: string;
  private _volume = 0.7;
  private warmTimer: number | null = null;

  constructor(private readonly patterns: readonly Pattern[]) {
    if (patterns.length === 0) throw new Error("CadenceEngine needs at least one pattern");
    this._patternId = patterns[0]!.id;
  }

  get playing() {
    return this._playing;
  }
  get bpm() {
    return this._bpm;
  }
  get patternId() {
    return this._patternId;
  }
  get volume() {
    return this._volume;
  }

  /** Must be called from a tap/click — browsers only allow sound to start after one. */
  async start(): Promise<void> {
    if (this._playing) return;
    this._playing = true;
    const ctx = this.ensureContext();
    await ctx.resume();
    if (!this._playing || this.segments.length > 0) return; // stopped or started meanwhile
    this.segments = [this.startSegment(ctx.currentTime + START_DELAY, 0)];
  }

  stop(): void {
    if (!this._playing) return;
    this._playing = false;
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const seg of this.segments) {
      seg.gain.gain.cancelScheduledValues(now);
      seg.gain.gain.setValueAtTime(seg.gain.gain.value, now);
      seg.gain.gain.linearRampToValueAtTime(0, now + STOP_FADE);
      seg.source.stop(now + STOP_FADE);
    }
    this.segments = [];
  }

  setBpm(bpm: number): void {
    const next = clampBpm(bpm);
    if (next === this._bpm) return;
    this._bpm = next;
    this.switchOnNextBeat();
  }

  setPattern(id: string): void {
    if (id === this._patternId) return;
    if (!this.patterns.some((p) => p.id === id)) throw new Error(`Unknown pattern "${id}"`);
    this._patternId = id;
    this.switchOnNextBeat();
  }

  /** 0 = silent, 1 = full. */
  setVolume(volume: number): void {
    this._volume = Math.min(1, Math.max(0, volume));
    if (this.ctx && this.master) {
      // Short ramp avoids crackle while dragging a slider. A plain linear
      // ramp from a pinned start value, because Safari handles
      // setTargetAtTime unreliably.
      const gain = this.master.gain;
      const now = this.ctx.currentTime;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(this._volume, now + VOLUME_RAMP);
    }
  }

  /** Where the beat is right now, as heard from the speaker. For visuals; call every frame. */
  getPosition(): EnginePosition | null {
    const ctx = this.ctx;
    if (!ctx || !this._playing) return null;
    const heard = heardTime(ctx);
    const seg = [...this.segments].reverse().find((s) => s.startTime <= heard);
    if (!seg) return null; // first beat not audible yet
    const pos = positionAt(seg, heard);
    const beat = Math.floor(pos);
    const n = seg.beatOffsets.length;
    return {
      beat,
      phase: pos - beat,
      beatInPattern: ((beat % n) + n) % n,
      bpm: seg.bpm,
      patternId: seg.patternId,
    };
  }

  /** Release the audio device. The engine can't be used afterwards. */
  async dispose(): Promise<void> {
    this.stop();
    if (this.warmTimer !== null) clearTimeout(this.warmTimer);
    document.removeEventListener("visibilitychange", this.recover);
    await this.ctx?.close();
    this.ctx = null;
  }

  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx;
    // iPhone (Safari 16.4+): treat us like a music player — keep playing
    // when the screen locks and ignore the silent switch.
    const session = (navigator as AudioSessionNavigator).audioSession;
    if (session) session.type = "playback";

    const ctx = new AudioContext({ latencyHint: "interactive" });
    const master = ctx.createGain();
    master.gain.value = this._volume;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.samples = placeholderSamples(ctx.sampleRate);
    ctx.addEventListener("statechange", this.recover);
    document.addEventListener("visibilitychange", this.recover);
    return ctx;
  }

  /** The phone may pause audio (phone call, other app). Try to resume while we should be playing. */
  private recover = () => {
    if (this._playing && this.ctx && this.ctx.state !== "running") {
      this.ctx.resume().catch(() => {
        // Needs a user tap on some browsers; the next Play press will resume.
      });
    }
  };

  private switchOnNextBeat(): void {
    const ctx = this.ctx;
    if (!this._playing || !ctx || this.segments.length === 0) return;
    const earliest = ctx.currentTime + SWITCH_LEAD;

    // Switches that haven't started yet are replaced — the newest setting wins.
    const cancelled = this.segments.filter((s) => s.startTime > earliest);
    for (const seg of cancelled) {
      seg.source.stop();
      seg.gain.disconnect();
    }
    this.segments = this.segments.filter((s) => s.startTime <= earliest);

    const current = this.segments.at(-1);
    if (!current) {
      // Changed right after Play, before the first beat: just start with the new setting.
      const first = cancelled[0]!;
      this.segments = [this.startSegment(first.startTime, first.startBeat)];
      return;
    }
    const { beat, time } = nextBeatAfter(current, earliest);

    // Fade the old loop out right before the switch beat (cancelling any
    // fade set up by a replaced switch), then cut it.
    const g = current.gain.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(1, ctx.currentTime);
    g.setValueAtTime(1, time - SWITCH_FADE);
    g.linearRampToValueAtTime(0, time);
    try {
      current.source.stop(time); // the latest stop() call replaces earlier ones
    } catch {
      // Older browsers reject a second stop(); the earlier one lands on this same beat.
    }

    this.segments.push(this.startSegment(time, beat));
    // Drop loops that have finished for good.
    this.segments = this.segments.slice(-2);
  }

  private startSegment(time: number, beat: number): PlayingSegment {
    const ctx = this.ctx!;
    const pattern = this.patterns.find((p) => p.id === this._patternId)!;
    const { buffer, beatOnsets } = this.loop(pattern, this._bpm);
    const sr = buffer.sampleRate;
    const seg: Segment = {
      startTime: time,
      startBeat: beat,
      beatOffsets: beatOnsets.map((s) => s / sr),
      loopDuration: buffer.length / sr,
    };

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    source.connect(gain).connect(this.master!);
    source.onended = () => gain.disconnect();
    source.start(time, loopOffset(seg));

    this.warmNeighbours();
    return { ...seg, source, gain, patternId: pattern.id, bpm: this._bpm };
  }

  /**
   * Mix the tempos on either side of the current one while nothing is waiting
   * for them, so pressing +/- never has to mix a loop on the spot.
   */
  private warmNeighbours(): void {
    if (this.warmTimer !== null) clearTimeout(this.warmTimer);
    this.warmTimer = window.setTimeout(() => {
      this.warmTimer = null;
      if (!this.ctx) return;
      const pattern = this.patterns.find((p) => p.id === this._patternId);
      if (!pattern) return;
      for (const bpm of [stepBpm(this._bpm, 1), stepBpm(this._bpm, -1)]) {
        if (bpm !== this._bpm) this.loop(pattern, bpm);
      }
    }, 400);
  }

  /** Drop the least recently used loops until the cache fits its budget. */
  private trimCache(): void {
    let total = 0;
    for (const l of this.loopCache.values()) total += l.buffer.duration;
    for (const key of [...this.loopCache.keys()].slice(0, -1)) {
      if (total <= LOOP_CACHE_SECONDS) break;
      total -= this.loopCache.get(key)!.buffer.duration;
      this.loopCache.delete(key);
    }
  }

  private loop(pattern: Pattern, bpm: number): Loop {
    const ctx = this.ctx!;
    const key = `${pattern.id}@${bpm}`;
    const cached = this.loopCache.get(key);
    if (cached) {
      // Re-insert so the most recently used loops stay cached.
      this.loopCache.delete(key);
      this.loopCache.set(key, cached);
      return cached;
    }
    // Mono: every sample is mono anyway, so a second channel would only
    // double the memory of the long loops for identical sound.
    const mixed = mixLoop(pattern, this.samples!, bpm, ctx.sampleRate, 1);
    const buffer = ctx.createBuffer(
      mixed.channels.length,
      mixed.channels[0]!.length,
      ctx.sampleRate,
    );
    mixed.channels.forEach((data, ch) => buffer.copyToChannel(data, ch));
    const loop = { buffer, beatOnsets: mixed.beatOnsets };
    this.loopCache.set(key, loop);
    this.trimCache();
    return loop;
  }
}

/** Audio-clock time of what's coming out of the speaker right now (accounts for output delay). */
function heardTime(ctx: AudioContext): number {
  if (typeof ctx.getOutputTimestamp === "function") {
    const ts = ctx.getOutputTimestamp();
    if (
      ts.contextTime !== undefined &&
      ts.performanceTime !== undefined &&
      ts.performanceTime > 0
    ) {
      return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
    }
  }
  return ctx.currentTime - (ctx.outputLatency || 0);
}
