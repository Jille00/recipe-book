"use client";

import { useEffect } from "react";

/**
 * Asks the browser to confirm leaving the page (reload, closing the tab,
 * typing another address) while `when` is true. Browsers show their own
 * generic message; custom text is ignored.
 *
 * Client-side navigation inside the app does not unload the page, so it is
 * not covered - guard in-app actions such as Cancel separately.
 */
export function useBeforeUnload(when: boolean) {
  useEffect(() => {
    if (!when) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Still required by some browsers to show the prompt.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when]);
}
