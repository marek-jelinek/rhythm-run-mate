import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { BPM_DEFAULT, stepBpm } from "./cadence";
import { CadenceEngine, type EnginePosition } from "./engine";
import type { Pattern } from "./patterns";

/**
 * Connects React UI to the audio engine. The engine is created on first use
 * (it needs a tap to start sound anyway) and released when the page unmounts.
 * UI state here mirrors what was sent to the engine; the engine stays the
 * source of truth for timing.
 */
export function useCadenceEngine(patterns: readonly Pattern[]) {
  const engineRef = useRef<CadenceEngine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(BPM_DEFAULT);
  // Latest BPM, so several quick taps each build on the previous one.
  const bpmRef = useRef(BPM_DEFAULT);
  const [patternId, setPatternId] = useState(patterns[0]!.id);
  /** 0–100, as shown on screen. */
  const [volume, setVolumeState] = useState(70);

  const engine = useCallback(() => {
    if (!engineRef.current) {
      const e = new CadenceEngine(patterns);
      e.setBpm(bpmRef.current);
      e.setPattern(patternId);
      e.setVolume(volume / 100);
      engineRef.current = e;
      // Lets automated timing checks reach the engine during development.
      if (import.meta.env.DEV) (window as { __engine?: CadenceEngine }).__engine = e;
    }
    return engineRef.current;
  }, [patterns, patternId, volume]);

  useEffect(
    () => () => {
      void engineRef.current?.dispose();
      engineRef.current = null;
    },
    [],
  );

  const toggle = () => {
    const e = engine();
    if (e.playing) {
      e.stop();
      setPlaying(false);
    } else {
      void e.start();
      setPlaying(true);
    }
  };

  const step = (dir: 1 | -1) => {
    const next = stepBpm(bpmRef.current, dir);
    bpmRef.current = next;
    engineRef.current?.setBpm(next);
    setBpm(next);
  };

  const selectPattern = (id: string) => {
    engineRef.current?.setPattern(id);
    setPatternId(id);
  };

  const setVolume = (v: number) => {
    engineRef.current?.setVolume(v / 100);
    setVolumeState(v);
  };

  const getPosition = useCallback(
    (): EnginePosition | null => engineRef.current?.getPosition() ?? null,
    [],
  );

  return { playing, bpm, patternId, volume, toggle, step, selectPattern, setVolume, getPosition };
}

/**
 * Drives an element's style from the audio clock on every animation frame,
 * so visuals can never drift from the sound. `apply` gets null when stopped
 * or before the first beat is heard.
 */
export function useBeatFrame<T extends HTMLElement>(
  ref: RefObject<T | null>,
  playing: boolean,
  getPosition: () => EnginePosition | null,
  apply: (el: T, pos: EnginePosition | null) => void,
) {
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    const el = ref.current;
    if (!playing) {
      if (el) applyRef.current(el, null);
      return;
    }
    let frame = 0;
    const draw = () => {
      if (ref.current) applyRef.current(ref.current, getPosition());
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [ref, playing, getPosition]);
}
