"use client";

import { useEffect } from "react";

/**
 * Keep the screen on while `enabled` (Screen Wake Lock API). The browser drops
 * the lock whenever the page is hidden, so it is asked for again when the page
 * comes back. Where the API is missing or refuses, nothing happens.
 */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (document.visibilityState !== "visible") return;
      if (sentinel && !sentinel.released) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        sentinel = lock;
      } catch {
        // Refused (low battery, permissions policy, ...). The screen may dim.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void request();
    };

    void request();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [enabled]);
}
