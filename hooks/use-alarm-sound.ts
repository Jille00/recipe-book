"use client";

import { useCallback, useEffect, useRef } from "react";

type AudioContextConstructor = typeof AudioContext;

/**
 * A short three-beep alarm made with Web Audio, so no sound file is needed.
 *
 * Browsers only let a page make sound after the user has interacted with it,
 * so call `prime()` from a click (e.g. starting a timer); `play()` later can
 * then sound even though no click is involved.
 */
export function useAlarmSound() {
  const contextRef = useRef<AudioContext | null>(null);

  const prime = useCallback(() => {
    try {
      if (!contextRef.current) {
        const Context: AudioContextConstructor | undefined =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: AudioContextConstructor })
            .webkitAudioContext;
        if (!Context) return;
        contextRef.current = new Context();
      }
      if (contextRef.current.state === "suspended") {
        contextRef.current.resume().catch(() => {});
      }
    } catch {
      // No audio here; the visual alert still shows.
    }
  }, []);

  const play = useCallback(() => {
    const context = contextRef.current;
    if (!context) return;
    try {
      if (context.state === "suspended") context.resume().catch(() => {});
      const start = context.currentTime + 0.05;
      for (let beep = 0; beep < 3; beep++) {
        const at = start + beep * 0.35;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.3, at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(at);
        oscillator.stop(at + 0.3);
      }
    } catch {
      // Ignore audio failures
    }
  }, []);

  useEffect(
    () => () => {
      contextRef.current?.close().catch(() => {});
      contextRef.current = null;
    },
    []
  );

  return { prime, play };
}
