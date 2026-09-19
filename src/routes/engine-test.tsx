import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BPM_DEFAULT, stepBpm } from "@/audio/cadence";
import { CadenceEngine, type EnginePosition } from "@/audio/engine";
import { PLACEHOLDER_PATTERNS } from "@/audio/patterns";

// Hidden developer page for testing the audio engine on its own, without the
// real UI. Not linked from anywhere.
export const Route = createFileRoute("/engine-test")({
  head: () => ({
    meta: [{ title: "Engine test" }, { name: "robots", content: "noindex" }],
  }),
  component: EngineTest,
});

function EngineTest() {
  const engineRef = useRef<CadenceEngine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(BPM_DEFAULT);
  const [patternId, setPatternId] = useState(PLACEHOLDER_PATTERNS[0]!.id);
  const [volume, setVolume] = useState(70);
  const [pos, setPos] = useState<EnginePosition | null>(null);
  const pulseRef = useRef<HTMLDivElement>(null);

  const engine = () => {
    if (!engineRef.current) {
      engineRef.current = new CadenceEngine(PLACEHOLDER_PATTERNS);
      // Lets automated timing checks reach the engine during development.
      if (import.meta.env.DEV)
        (window as { __engine?: CadenceEngine }).__engine = engineRef.current;
    }
    return engineRef.current;
  };

  useEffect(() => () => void engineRef.current?.dispose(), []);

  // Visuals read the beat from the audio clock every frame — never their own timer.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let lastBeat = -1;
    const draw = () => {
      const p = engineRef.current?.getPosition() ?? null;
      if (pulseRef.current) {
        const scale = p ? 1 + 0.6 * Math.exp(-p.phase * 6) : 1;
        pulseRef.current.style.transform = `scale(${scale})`;
        pulseRef.current.style.background = p?.beatInPattern === 0 ? "#f97316" : "#e5e7eb";
      }
      if (p && p.beat !== lastBeat) {
        lastBeat = p.beat;
        setPos(p);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const toggle = () => {
    const e = engine();
    if (e.playing) {
      e.stop();
      setPlaying(false);
      setPos(null);
    } else {
      void e.start();
      setPlaying(true);
    }
  };

  const changeBpm = (dir: 1 | -1) => {
    const next = stepBpm(bpm, dir);
    engine().setBpm(next);
    setBpm(next);
  };

  const box = "rounded border border-neutral-600 px-4 py-2 disabled:opacity-40";

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6 font-mono text-sm">
      <h1 className="text-lg font-bold">Audio engine test</h1>

      <div className="flex h-32 items-center justify-center">
        <div ref={pulseRef} className="size-16 rounded-full bg-neutral-200" />
      </div>

      <button type="button" className={box} onClick={toggle}>
        {playing ? "Stop" : "Start"}
      </button>

      <div className="flex items-center gap-3">
        <button type="button" className={box} onClick={() => changeBpm(-1)}>
          −5
        </button>
        <span className="w-20 text-center text-2xl">{bpm}</span>
        <button type="button" className={box} onClick={() => changeBpm(1)}>
          +5
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PLACEHOLDER_PATTERNS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={box}
            aria-pressed={p.id === patternId}
            style={p.id === patternId ? { background: "#404040" } : undefined}
            onClick={() => {
              engine().setPattern(p.id);
              setPatternId(p.id);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-3">
        Volume
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(ev) => {
            const v = Number(ev.target.value);
            engine().setVolume(v / 100);
            setVolume(v);
          }}
        />
        {volume}
      </label>

      <dl className="grid grid-cols-2 gap-1" data-testid="readout">
        <dt>Beat</dt>
        <dd>{pos?.beat ?? "–"}</dd>
        <dt>Beat in pattern</dt>
        <dd>{pos ? pos.beatInPattern + 1 : "–"}</dd>
        <dt>Heard BPM</dt>
        <dd>{pos?.bpm ?? "–"}</dd>
        <dt>Heard track</dt>
        <dd>{pos?.patternId ?? "–"}</dd>
      </dl>
    </main>
  );
}
