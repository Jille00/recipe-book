"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * How far to travel from the guard entry to reach where a held-back
 * Back/Forward press was heading.
 *
 * The guard entry is a copy of the page pushed on top of it. Back from there
 * normally lands on the page's own entry (same URL): the user wanted the page
 * before that, two steps down. A longer jump (long-pressing Back) lands on
 * some other entry; the guard entry is re-pushed right above it, so that
 * entry is one step down.
 */
export function historyBackDelta(landedHref: string, guardedHref: string): -1 | -2 {
  return landedHref === guardedHref ? -2 : -1;
}

type Mode =
  /** No guard entry of ours is on top. */
  | "idle"
  /** The current entry is our guard entry. */
  | "armed"
  /** history.back() is on its way to drop the guard entry. */
  | "consuming";

export type HistoryGuard = {
  /**
   * Call right before leaving on purpose (a confirmed link, a saved form).
   * Stops guarding without touching history and says whether the guard entry
   * is still on top: navigate with router.replace() then, so it is swapped for
   * the destination instead of staying behind as a duplicate of this page.
   */
  release: () => boolean;
  /**
   * Leave to wherever Back was (or would be) going, stepping over the guard
   * entry. Stops guarding first.
   */
  back: () => void;
};

/**
 * Guards the browser's Back/Forward buttons inside the app while `when` is
 * true. beforeunload never fires for them: the App Router handles them as
 * popstate on the same document.
 *
 * While guarding, one extra history entry for the current URL sits on top, so
 * the first Back press only moves off that entry. The popstate is caught in
 * the capture phase (before Next.js' own listener, which would render the
 * other page), the entry is pushed again so the page and address stay put,
 * and `onBlocked` is called so the page can ask first. Call `back()` if the
 * user confirms.
 *
 * When `when` turns false without `release()` (the form is clean again), the
 * extra entry is consumed with history.back(), so Back works normally again.
 * Leaving on purpose goes through `release()` + router.replace(), or `back()`,
 * which step over the extra entry instead of racing a history.back().
 *
 * Existing history.state is copied into the extra entry: the App Router keeps
 * its tree there and reloads the page on popstate to an entry without it.
 */
export function useHistoryGuard(when: boolean, onBlocked: () => void): HistoryGuard {
  const onBlockedRef = useRef(onBlocked);
  const whenRef = useRef(when);
  useEffect(() => {
    onBlockedRef.current = onBlocked;
  });

  const modeRef = useRef<Mode>("idle");
  const releasedRef = useRef(false);
  // The guarded page's URL and history state, copied into each guard entry.
  const guardedHrefRef = useRef("");
  const guardedStateRef = useRef<unknown>(null);
  // From the guard entry to the page before this one.
  const backDeltaRef = useRef<number>(-2);

  const pushGuardEntry = useCallback(() => {
    window.history.pushState(guardedStateRef.current, "", guardedHrefRef.current);
    modeRef.current = "armed";
  }, []);

  // Bring history in line with `when`. Runs on every change of `when` and
  // after the guard entry was consumed.
  const sync = useCallback(() => {
    const mode = modeRef.current;
    if (whenRef.current && !releasedRef.current) {
      if (mode !== "idle") return; // armed, or re-arm once the back() lands
      guardedHrefRef.current = window.location.href;
      guardedStateRef.current = window.history.state;
      backDeltaRef.current = -2;
      pushGuardEntry();
    } else if (mode === "armed") {
      // Drop the guard entry only when the page's own entry is right below
      // it. After a longer jump it isn't (that push discarded it), and the
      // guard entry simply stays on as the page's entry.
      if (backDeltaRef.current === -2 && window.location.href === guardedHrefRef.current) {
        modeRef.current = "consuming";
        window.history.back();
      } else {
        modeRef.current = "idle";
      }
    }
  }, [pushGuardEntry]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const mode = modeRef.current;
      if (mode === "idle") return;
      // A fragment jump pushes an entry without state; the App Router
      // ignores those too. Nothing to guard.
      if (event.state === null && mode === "armed") return;

      // Keep the App Router from rendering the entry we just moved to: this
      // page stays, and the router's state still matches it.
      event.stopImmediatePropagation();

      if (mode === "consuming") {
        modeRef.current = "idle";
        sync();
        return;
      }

      backDeltaRef.current = historyBackDelta(window.location.href, guardedHrefRef.current);
      pushGuardEntry();
      onBlockedRef.current();
    };
    // Capture: at the target, capture listeners run before the App Router's.
    window.addEventListener("popstate", onPopState, true);
    return () => window.removeEventListener("popstate", onPopState, true);
  }, [pushGuardEntry, sync]);

  useEffect(() => {
    whenRef.current = when;
    sync();
  }, [when, sync]);

  const release = useCallback(() => {
    releasedRef.current = true;
    const onGuardEntry =
      modeRef.current === "armed" && window.location.href === guardedHrefRef.current;
    modeRef.current = "idle";
    return onGuardEntry;
  }, []);

  const back = useCallback(() => {
    const delta = release() ? backDeltaRef.current : -1;
    window.history.go(delta);
  }, [release]);

  return useMemo(() => ({ release, back }), [release, back]);
}
