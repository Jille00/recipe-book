// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecipeScaling } from "./use-recipe-scaling";

describe("useRecipeScaling", () => {
  it("starts at the original servings with factor 1", () => {
    const { result } = renderHook(() => useRecipeScaling(4));
    expect(result.current).toMatchObject({
      scaledServings: 4,
      originalServings: 4,
      scaleFactor: 1,
      isScaled: false,
    });
  });

  it.each([0, -3, NaN])("treats invalid original servings (%d) as 1", (servings) => {
    const { result } = renderHook(() => useRecipeScaling(servings));
    expect(result.current.originalServings).toBe(1);
    expect(result.current.scaledServings).toBe(1);
    expect(result.current.scaleFactor).toBe(1);
  });

  it("increments and decrements, updating the factor", () => {
    const { result } = renderHook(() => useRecipeScaling(4));
    act(() => result.current.increment());
    expect(result.current.scaledServings).toBe(5);
    expect(result.current.scaleFactor).toBe(1.25);
    expect(result.current.isScaled).toBe(true);

    act(() => result.current.decrement());
    act(() => result.current.decrement());
    expect(result.current.scaledServings).toBe(3);
    expect(result.current.scaleFactor).toBe(0.75);
  });

  it("clamps to the default min (1) and max (99)", () => {
    const { result } = renderHook(() => useRecipeScaling(1));
    act(() => result.current.decrement());
    expect(result.current.scaledServings).toBe(1);

    act(() => result.current.setScaledServings(500));
    expect(result.current.scaledServings).toBe(99);

    act(() => result.current.setScaledServings(-5));
    expect(result.current.scaledServings).toBe(1);
  });

  it("respects custom min and max", () => {
    const { result } = renderHook(() =>
      useRecipeScaling(4, { minServings: 2, maxServings: 6 })
    );
    act(() => result.current.setScaledServings(1));
    expect(result.current.scaledServings).toBe(2);
    act(() => result.current.setScaledServings(10));
    expect(result.current.scaledServings).toBe(6);
  });

  it("resets to the original servings", () => {
    const { result } = renderHook(() => useRecipeScaling(4));
    act(() => result.current.setScaledServings(10));
    expect(result.current.scaleFactor).toBe(2.5);
    act(() => result.current.resetToOriginal());
    expect(result.current.scaledServings).toBe(4);
    expect(result.current.isScaled).toBe(false);
  });

  it("accepts a decimal original servings value", () => {
    const { result } = renderHook(() => useRecipeScaling(2.5));
    expect(result.current.originalServings).toBe(2.5);
    act(() => result.current.setScaledServings(5));
    expect(result.current.scaleFactor).toBe(2);
  });

  it("decrements a >99-serving recipe by one", () => {
    const { result } = renderHook(() => useRecipeScaling(120));
    expect(result.current.scaledServings).toBe(120);
    act(() => result.current.decrement());
    expect(result.current.scaledServings).toBe(119);
  });

  it("raises the default max for a >99-serving recipe", () => {
    const { result } = renderHook(() => useRecipeScaling(120));
    expect(result.current.maxServings).toBe(480);
    act(() => result.current.increment());
    expect(result.current.scaledServings).toBe(121);
  });

  it("caps the raised default max", () => {
    const { result } = renderHook(() => useRecipeScaling(500));
    expect(result.current.maxServings).toBe(999);
    const { result: huge } = renderHook(() => useRecipeScaling(5000));
    expect(huge.current.maxServings).toBe(5000);
  });

  it("ignores non-finite values passed to setScaledServings", () => {
    const { result } = renderHook(() => useRecipeScaling(4));
    act(() => result.current.setScaledServings(NaN));
    expect(result.current.scaledServings).toBe(4);
    act(() => result.current.setScaledServings(Infinity));
    expect(result.current.scaledServings).toBe(4);
  });
});
