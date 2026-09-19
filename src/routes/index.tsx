import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Minus, Plus, Play, Square, Volume2 } from "lucide-react";
import { BPM_MAX, BPM_MIN } from "@/audio/cadence";
import { PLACEHOLDER_PATTERNS } from "@/audio/patterns";
import { useBeatFrame, useCadenceEngine } from "@/audio/useCadenceEngine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Running Cadence Player" },
      {
        name: "description",
        content: "Keep a steady running rhythm with a looping beat from 160 to 190 BPM.",
      },
      { property: "og:title", content: "Running Cadence Player" },
      {
        property: "og:description",
        content: "A musical metronome for runners. Pick your tempo, pick your track, run.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CadencePlayer,
});

const TRACKS = PLACEHOLDER_PATTERNS;

/** Pulse shape kept from the Lovable design: quick swell after the hit, slow settle. */
function pulse(el: HTMLElement, phase: number | null) {
  if (phase === null) {
    el.style.transform = "";
    el.style.opacity = "";
    return;
  }
  const scale = phase < 0.15 ? 1 + 0.18 * (phase / 0.15) : 1.18 - 0.18 * ((phase - 0.15) / 0.85);
  el.style.transform = `scale(${scale})`;
  el.style.opacity = String(1 - 0.1 * phase);
}

function CadencePlayer() {
  const { playing, bpm, patternId, volume, toggle, step, selectPattern, setVolume, getPosition } =
    useCadenceEngine(TRACKS);
  const dotRef = useRef<HTMLSpanElement>(null);
  useBeatFrame(dotRef, playing, getPosition, (el, pos) => pulse(el, pos?.phase ?? null));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-5 pt-6 pb-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl font-extrabold tracking-[0.2em] uppercase">Cadence</h1>
      </header>

      {/* BPM display + visualizer */}
      <section className="relative flex flex-col items-center rounded-3xl bg-surface px-4 pt-8 pb-6">
        <div className="relative mb-6 flex size-32 items-center justify-center">
          <span
            ref={dotRef}
            className={cn("relative size-12 rounded-full bg-foreground", !playing && "opacity-60")}
          />
        </div>

        <div className="font-display tabular mt-4 text-[7.5rem] leading-none font-black tracking-tight">
          {bpm}
        </div>
        <div className="font-display text-sm font-bold tracking-[0.35em] text-muted-foreground uppercase">
          Steps / min
        </div>
      </section>

      {/* BPM controls */}
      <section className="grid grid-cols-2 gap-3">
        <StepButton onClick={() => step(-1)} disabled={bpm <= BPM_MIN} label="Decrease tempo">
          <Minus className="size-9" strokeWidth={3} />
        </StepButton>
        <StepButton onClick={() => step(1)} disabled={bpm >= BPM_MAX} label="Increase tempo">
          <Plus className="size-9" strokeWidth={3} />
        </StepButton>
      </section>

      {/* Play / Stop */}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        className={cn(
          "font-display flex h-24 w-full items-center justify-center gap-3 rounded-3xl text-3xl font-black tracking-[0.25em] uppercase transition-transform active:scale-[0.97]",
          playing
            ? "bg-secondary text-accent ring-2 ring-accent"
            : "bg-accent text-accent-foreground shadow-[0_10px_40px_-10px_var(--accent)]",
        )}
      >
        {playing ? (
          <>
            <Square className="size-8 fill-current" /> Stop
          </>
        ) : (
          <>
            <Play className="size-8 fill-current" /> Play
          </>
        )}
      </button>

      {/* Track selector */}
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xs font-bold tracking-[0.3em] text-muted-foreground uppercase">
          Track
        </h2>
        <div className="grid grid-cols-5 gap-2">
          {TRACKS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectPattern(t.id)}
              aria-pressed={patternId === t.id}
              className={cn(
                "font-display h-14 rounded-xl text-sm font-extrabold tracking-wide uppercase transition-colors",
                patternId === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground active:bg-surface-raised",
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      </section>

      {/* Volume */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xs font-bold tracking-[0.3em] text-muted-foreground uppercase">
            Volume
          </h2>
          <span className="font-display tabular text-lg font-extrabold">{volume}</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
          <Volume2 className="size-6 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="h-3 w-full cursor-pointer accent-primary"
          />
        </div>
      </section>
    </main>
  );
}

function StepButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-20 items-center justify-center rounded-2xl bg-surface-raised text-foreground transition-transform active:scale-95 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
