/*
 * PARKED — not used on the main screen right now (removed 21. 9. 2026).
 *
 * The pulsing circle that visualises the beat. Kept here in one piece so it can
 * be put back without rebuilding it. To restore, add to src/routes/index.tsx:
 *
 *   import { BeatDot } from "@/components/BeatDot";
 *   ...inside the BPM section, above the number:
 *   <BeatDot playing={playing} getPosition={getPosition} />
 */
import { useRef } from "react";
import type { EnginePosition } from "@/audio/engine";
import { useBeatFrame } from "@/audio/useCadenceEngine";
import { cn } from "@/lib/utils";

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

export function BeatDot({
  playing,
  getPosition,
}: {
  playing: boolean;
  getPosition: () => EnginePosition | null;
}) {
  const dotRef = useRef<HTMLSpanElement>(null);
  useBeatFrame(dotRef, playing, getPosition, (el, pos) => pulse(el, pos?.phase ?? null));

  return (
    <div className="relative flex size-[clamp(3.5rem,11vh,8rem)] shrink-0 items-center justify-center">
      <span
        ref={dotRef}
        className={cn(
          "relative size-[clamp(1.75rem,4.5vh,3rem)] rounded-full bg-foreground",
          !playing && "opacity-60",
        )}
      />
    </div>
  );
}
