import { createFileRoute } from "@tanstack/react-router";
import { Minus, Plus, Play, Square, Volume2 } from "lucide-react";
import { BPM_MAX, BPM_MIN } from "@/audio/cadence";
import { PLACEHOLDER_PATTERNS } from "@/audio/patterns";
import { useCadenceEngine } from "@/audio/useCadenceEngine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Step Master" },
      {
        name: "description",
        content: "Keep a steady running rhythm with a looping beat from 160 to 190 BPM.",
      },
      { property: "og:title", content: "Step Master" },
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

function CadencePlayer() {
  // The beat visualiser is parked in src/components/BeatDot.tsx — see the note there.
  const { playing, bpm, patternId, volume, toggle, step, selectPattern, setVolume } =
    useCadenceEngine(TRACKS);

  return (
    /*
     * One screen, never scrolls: the page is exactly as tall as the viewport
     * and only the BPM block flexes. Everything else uses clamp() sizes, so the
     * controls shrink a little on short phones and stop growing on tall ones.
     */
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col gap-[clamp(0.5rem,1.6vh,1.25rem)] overflow-hidden px-5 pt-[clamp(0.5rem,2vh,1.5rem)] pb-[calc(env(safe-area-inset-bottom)+clamp(0.5rem,1.5vh,2rem))]">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-center">
        <h1 className="font-display text-[clamp(1rem,2.4vh,1.25rem)] font-extrabold tracking-[0.2em] uppercase">
          Step master
        </h1>
      </header>

      {/* BPM display + visualizer — the only part that takes the leftover height */}
      <section className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(0.5rem,2vh,1.5rem)] overflow-hidden rounded-3xl bg-surface px-4 py-[clamp(0.75rem,2vh,1.5rem)]">
        <div className="flex flex-col items-center">
          <div className="font-display tabular text-[clamp(3.5rem,16vh,7.5rem)] leading-none font-black tracking-tight">
            {bpm}
          </div>
          <div className="font-display text-[clamp(0.65rem,1.5vh,0.875rem)] font-bold tracking-[0.35em] text-muted-foreground uppercase">
            Steps / min
          </div>
        </div>
      </section>

      {/* BPM controls */}
      <section className="grid shrink-0 grid-cols-2 gap-3">
        <StepButton onClick={() => step(-1)} disabled={bpm <= BPM_MIN} label="Decrease tempo">
          <Minus className="size-[clamp(1.5rem,4vh,2.25rem)]" strokeWidth={3} />
        </StepButton>
        <StepButton onClick={() => step(1)} disabled={bpm >= BPM_MAX} label="Increase tempo">
          <Plus className="size-[clamp(1.5rem,4vh,2.25rem)]" strokeWidth={3} />
        </StepButton>
      </section>

      {/* Play / Stop */}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        className={cn(
          "font-display flex h-[clamp(3.5rem,10vh,6rem)] w-full shrink-0 items-center justify-center gap-3 rounded-3xl text-[clamp(1.25rem,3.4vh,1.875rem)] font-black tracking-[0.25em] uppercase transition-transform active:scale-[0.97]",
          playing
            ? "bg-secondary text-accent ring-2 ring-accent"
            : "bg-accent text-accent-foreground shadow-[0_10px_40px_-10px_var(--accent)]",
        )}
      >
        {playing ? (
          <>
            <Square className="size-[clamp(1.25rem,3.4vh,2rem)] fill-current" /> Stop
          </>
        ) : (
          <>
            <Play className="size-[clamp(1.25rem,3.4vh,2rem)] fill-current" /> Play
          </>
        )}
      </button>

      {/* Track selector */}
      <section className="flex shrink-0 flex-col gap-[clamp(0.25rem,1vh,0.5rem)]">
        <h2 className="font-display text-xs font-bold tracking-[0.3em] text-muted-foreground uppercase">
          Track
        </h2>
        <div className="grid grid-cols-5 gap-[clamp(0.25rem,1.5vw,0.5rem)]">
          {TRACKS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectPattern(t.id)}
              aria-pressed={patternId === t.id}
              className={cn(
                "font-display h-[clamp(2.5rem,6.5vh,3.5rem)] rounded-xl text-[clamp(0.7rem,3vw,0.875rem)] font-extrabold tracking-wide uppercase transition-colors",
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
      <section className="flex shrink-0 flex-col gap-[clamp(0.25rem,1vh,0.5rem)]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xs font-bold tracking-[0.3em] text-muted-foreground uppercase">
            Volume
          </h2>
          <span className="font-display tabular text-[clamp(0.9rem,2.2vh,1.125rem)] font-extrabold">
            {volume}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-[clamp(0.5rem,1.5vh,0.75rem)]">
          <Volume2 className="size-[clamp(1.1rem,3vh,1.5rem)] shrink-0 text-muted-foreground" />
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
      className="flex h-[clamp(3rem,8vh,5rem)] items-center justify-center rounded-2xl bg-surface-raised text-foreground transition-transform active:scale-95 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
