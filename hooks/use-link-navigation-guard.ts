"use client";

import { useEffect, useRef } from "react";

/**
 * The in-app path a click on `event` would navigate to, or null when the click
 * should be left alone: modified clicks (new tab/window), non-primary buttons,
 * links that open elsewhere or download, other sites, and same-page anchors.
 */
export function guardedNavigationTarget(
  event: Pick<MouseEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "defaultPrevented" | "target">,
  location: Pick<Location, "origin" | "pathname" | "search">
): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;

  const anchor =
    event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;

  const url = new URL(anchor.href, location.origin);
  if (url.origin !== location.origin) return null;
  // Jumping to an anchor on this page loses nothing.
  if (url.pathname === location.pathname && url.search === location.search) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * While `when` is true, clicks on links inside the app are held back and
 * handed to `onBlocked` with their destination, so the page can ask first.
 * next/link navigates client-side, which beforeunload never sees.
 *
 * The listener runs in the capture phase on the document, before React's
 * handlers, so stopping it there keeps next/link from navigating.
 */
export function useLinkNavigationGuard(when: boolean, onBlocked: (href: string) => void) {
  const onBlockedRef = useRef(onBlocked);
  useEffect(() => {
    onBlockedRef.current = onBlocked;
  });

  useEffect(() => {
    if (!when) return;
    const handler = (event: MouseEvent) => {
      const href = guardedNavigationTarget(event, window.location);
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      onBlockedRef.current(href);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [when]);
}
