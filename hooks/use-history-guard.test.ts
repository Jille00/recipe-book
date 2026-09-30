// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { historyBackDelta, useHistoryGuard } from "./use-history-guard";

describe("historyBackDelta", () => {
  const edit = "https://example.test/recipes/1/edit";

  it("steps over the page's own entry after a plain Back", () => {
    expect(historyBackDelta(edit, edit)).toBe(-2);
  });

  it("goes one step when a longer jump landed elsewhere", () => {
    expect(historyBackDelta("https://example.test/recipes", edit)).toBe(-1);
  });
});

/**
 * History traversal is asynchronous. A popstate listener can't tell us when
 * it landed: the guard hides some from later listeners on purpose.
 */
function settle() {
  return act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)));
}

async function traverse(delta: number) {
  window.history.go(delta);
  await settle();
}

describe("useHistoryGuard", () => {
  // Stands in for the App Router's own (bubble-phase) popstate listener.
  const routerPopState = vi.fn();
  let startLength: number;

  beforeEach(() => {
    window.history.pushState({ __NA: true, page: "list" }, "", "/recipes");
    window.history.pushState({ __NA: true, page: "edit" }, "", "/recipes/1/edit");
    startLength = window.history.length;
    routerPopState.mockClear();
    window.addEventListener("popstate", routerPopState);
  });

  afterEach(() => {
    cleanup();
    window.removeEventListener("popstate", routerPopState);
  });

  it("does nothing while `when` is false", () => {
    renderHook(() => useHistoryGuard(false, vi.fn()));
    expect(window.history.length).toBe(startLength);
  });

  it("pushes one copy of the current entry, keeping its state", () => {
    renderHook(() => useHistoryGuard(true, vi.fn()));
    expect(window.history.length).toBe(startLength + 1);
    expect(window.location.pathname).toBe("/recipes/1/edit");
    expect(window.history.state).toEqual({ __NA: true, page: "edit" });
  });

  it("holds Back, re-arms, and hides the popstate from the router", async () => {
    const onBlocked = vi.fn();
    renderHook(() => useHistoryGuard(true, onBlocked));

    await traverse(-1);

    expect(onBlocked).toHaveBeenCalledTimes(1);
    expect(routerPopState).not.toHaveBeenCalled();
    // Back on the guard entry, which is again the last one.
    expect(window.location.pathname).toBe("/recipes/1/edit");
    expect(window.history.length).toBe(startLength + 1);

    // A second press is held back the same way.
    await traverse(-1);
    expect(onBlocked).toHaveBeenCalledTimes(2);
    expect(window.history.length).toBe(startLength + 1);
  });

  it("back() after a held Back lands on the page before, not a copy", async () => {
    const { result } = renderHook(() => useHistoryGuard(true, vi.fn()));
    await traverse(-1);

    act(() => result.current.back());
    await settle();

    expect(window.location.pathname).toBe("/recipes");
    expect(window.history.state).toEqual({ __NA: true, page: "list" });
    // The router renders that page; nothing was pushed on the way.
    expect(routerPopState).toHaveBeenCalledTimes(1);
    expect(window.history.length).toBe(startLength + 1);
  });

  it("back() without a held Back (Cancel) also steps over the guard entry", async () => {
    const { result } = renderHook(() => useHistoryGuard(true, vi.fn()));
    act(() => result.current.back());
    await settle();
    expect(window.location.pathname).toBe("/recipes");
  });

  it("after a longer jump, back() goes to where the jump was heading", async () => {
    const onBlocked = vi.fn();
    const { result } = renderHook(() => useHistoryGuard(true, onBlocked));
    // Guard entry -> two steps down, past the page's own entry.
    await traverse(-2);
    expect(onBlocked).toHaveBeenCalledTimes(1);
    // The page stays: its URL and state are put back on top.
    expect(window.location.pathname).toBe("/recipes/1/edit");
    expect(window.history.state).toEqual({ __NA: true, page: "edit" });

    act(() => result.current.back());
    await settle();
    expect(window.location.pathname).toBe("/recipes");
  });

  it("consumes the guard entry when `when` turns false, unseen by the router", async () => {
    const onBlocked = vi.fn();
    const { rerender } = renderHook(({ when }) => useHistoryGuard(when, onBlocked), {
      initialProps: { when: true },
    });

    rerender({ when: false });
    await settle();

    expect(window.location.pathname).toBe("/recipes/1/edit");
    expect(routerPopState).not.toHaveBeenCalled();
    expect(onBlocked).not.toHaveBeenCalled();

    // Back is no longer guarded: it reaches the previous page.
    await traverse(-1);
    expect(window.location.pathname).toBe("/recipes");
    expect(onBlocked).not.toHaveBeenCalled();
  });

  it("re-arms after the consuming back() lands when `when` flips back quickly", async () => {
    const onBlocked = vi.fn();
    const { rerender } = renderHook(({ when }) => useHistoryGuard(when, onBlocked), {
      initialProps: { when: true },
    });

    rerender({ when: false });
    rerender({ when: true });
    await settle();

    // One guard entry again, on top of the page's own entry.
    expect(window.history.length).toBe(startLength + 1);
    await traverse(-1);
    expect(onBlocked).toHaveBeenCalledTimes(1);
  });

  it("release() reports the guard entry and stops guarding without traversing", async () => {
    const onBlocked = vi.fn();
    const { result, rerender } = renderHook(
      ({ when }) => useHistoryGuard(when, onBlocked),
      { initialProps: { when: true } }
    );

    let onGuardEntry = false;
    act(() => {
      onGuardEntry = result.current.release();
    });
    rerender({ when: false });

    expect(onGuardEntry).toBe(true);
    // No consuming back(): the caller replaces the guard entry instead.
    expect(window.location.pathname).toBe("/recipes/1/edit");
    await traverse(-1);
    expect(onBlocked).not.toHaveBeenCalled();
    expect(routerPopState).toHaveBeenCalledTimes(1);
  });
});
