// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CookMode } from "./cook-mode";
import { cookStepStorageKey } from "@/lib/cook-mode";

const instructions = [
  { id: "1", convertedText: "Preheat the oven to 180°C (356°F)." },
  { id: "2", convertedText: "Mix the flour and sugar." },
  { id: "3", convertedText: "Bake 1-2 min until golden." },
];

const ingredients = [
  { id: "a", text: "flour", amount: "1", unit: "cup", converted: { displayAmount: "240", unit: "ml" } },
  { id: "b", text: "eggs", amount: "2", scaledAmount: "4", wasScaled: true },
];

function renderCookMode(props: Partial<React.ComponentProps<typeof CookMode>> = {}) {
  return render(
    <CookMode
      recipeId="recipe-1"
      title="Test Cake"
      ingredients={ingredients}
      instructions={instructions}
      {...props}
    />
  );
}

const open = () => fireEvent.click(screen.getByRole("button", { name: /cook/i }));
const dialog = () => screen.getByRole("dialog");
const currentStep = () =>
  screen.getByRole("region", { name: "Current step" }).textContent ?? "";

let wakeLockRequest: ReturnType<typeof vi.fn>;
let wakeLockRelease: ReturnType<typeof vi.fn>;

beforeEach(() => {
  sessionStorage.clear();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  wakeLockRelease = vi.fn(() => Promise.resolve());
  wakeLockRequest = vi.fn(() =>
    Promise.resolve({ released: false, release: wakeLockRelease })
  );
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request: wakeLockRequest },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  // @ts-expect-error -- removing the stub again
  delete navigator.wakeLock;
});

describe("CookMode", () => {
  it("renders nothing for a recipe without steps", () => {
    const { container } = renderCookMode({ instructions: [] });
    expect(container.innerHTML).toBe("");
  });

  it("opens full screen on the first step, with the ingredients", () => {
    renderCookMode();
    open();
    expect(screen.getAllByText("Step 1 of 3").length).toBeGreaterThan(0);
    expect(currentStep()).toMatch(/Preheat the oven/);
    expect(screen.getByText("240 ml")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
    expect(document.activeElement?.textContent).toMatch(/next/i);
  });

  it("moves between steps with the arrow keys and remembers the step", () => {
    renderCookMode();
    open();
    fireEvent.keyDown(dialog(), { key: "ArrowRight" });
    expect(currentStep()).toMatch(/Mix the flour/);
    expect(sessionStorage.getItem(cookStepStorageKey("recipe-1"))).toBe("1");
    fireEvent.keyDown(dialog(), { key: "ArrowLeft" });
    fireEvent.keyDown(dialog(), { key: "ArrowLeft" });
    expect(currentStep()).toMatch(/Preheat the oven/);
    fireEvent.keyDown(dialog(), { key: "ArrowRight" });
    fireEvent.keyDown(dialog(), { key: "ArrowRight" });

    // Closing with Escape and opening again returns to the same step
    fireEvent.keyDown(dialog(), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    open();
    expect(currentStep()).toMatch(/golden/);
    expect(screen.getByRole("button", { name: /finish/i })).toBeTruthy();
  });

  it("forgets the step after finishing", () => {
    sessionStorage.setItem(cookStepStorageKey("recipe-1"), "2");
    renderCookMode();
    open();
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(sessionStorage.getItem(cookStepStorageKey("recipe-1"))).toBeNull();
  });

  it("keeps the screen awake while open", async () => {
    renderCookMode();
    await act(async () => open());
    expect(wakeLockRequest).toHaveBeenCalledWith("screen");
    await act(async () => fireEvent.keyDown(dialog(), { key: "Escape" }));
    expect(wakeLockRelease).toHaveBeenCalled();
  });

  it("offers a timer for a duration and alerts when it runs out", () => {
    vi.useFakeTimers();
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibrate });
    sessionStorage.setItem(cookStepStorageKey("recipe-1"), "2");
    renderCookMode();
    open();

    // "1-2 min" uses the upper bound
    expect(screen.getByRole("timer").textContent).toBe("2:00");
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByRole("timer").textContent).toBe("1:00");

    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByRole("timer").textContent).toBe("1:00");

    fireEvent.click(screen.getByRole("button", { name: /resume/i }));
    act(() => vi.advanceTimersByTime(61_000));
    expect(screen.getByRole("alert").textContent).toMatch(/Time's up: 1-2 min/);
    expect(vibrate).toHaveBeenCalled();
    expect(screen.getByRole("timer").textContent).toBe("Done");
  });
});
