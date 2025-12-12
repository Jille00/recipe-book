"use client";

import { useState, useCallback, useMemo } from "react";

interface UseRecipeScalingReturn {
  scaledServings: number;
  originalServings: number;
  scaleFactor: number;
  setScaledServings: (servings: number) => void;
  increment: () => void;
  decrement: () => void;
  resetToOriginal: () => void;
  isScaled: boolean;
}

interface UseRecipeScalingOptions {
  minServings?: number;
  maxServings?: number;
}

export function useRecipeScaling(
  originalServings: number,
  options: UseRecipeScalingOptions = {}
): UseRecipeScalingReturn {
  const { minServings = 1, maxServings = 99 } = options;

  // Ensure original servings is valid
  const validOriginal = Math.max(originalServings || 1, 1);

  const [scaledServings, setScaledServingsState] = useState(validOriginal);

  const scaleFactor = useMemo(() => {
    return scaledServings / validOriginal;
  }, [scaledServings, validOriginal]);

  const isScaled = scaledServings !== validOriginal;

  const setScaledServings = useCallback(
    (servings: number) => {
      const clamped = Math.max(minServings, Math.min(maxServings, servings));
      setScaledServingsState(clamped);
    },
    [minServings, maxServings]
  );

  const increment = useCallback(() => {
    setScaledServings(scaledServings + 1);
  }, [scaledServings, setScaledServings]);

  const decrement = useCallback(() => {
    setScaledServings(scaledServings - 1);
  }, [scaledServings, setScaledServings]);

  const resetToOriginal = useCallback(() => {
    setScaledServingsState(validOriginal);
  }, [validOriginal]);

  return {
    scaledServings,
    originalServings: validOriginal,
    scaleFactor,
    setScaledServings,
    increment,
    decrement,
    resetToOriginal,
    isScaled,
  };
}
