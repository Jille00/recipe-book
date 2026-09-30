"use client";

import { useState, useCallback, useMemo } from "react";

interface UseRecipeScalingReturn {
  scaledServings: number;
  originalServings: number;
  scaleFactor: number;
  maxServings: number;
  setScaledServings: (servings: number) => void;
  increment: () => void;
  decrement: () => void;
  resetToOriginal: () => void;
  isScaled: boolean;
}

// Default cap: at least 99, or a few times a large batch recipe's servings
// (120 cookies can go to 480), but never unbounded.
const DEFAULT_MAX_SERVINGS = 99;
const DEFAULT_MAX_MULTIPLE = 4;
const DEFAULT_MAX_SERVINGS_LIMIT = 999;

interface UseRecipeScalingOptions {
  minServings?: number;
  maxServings?: number;
}

export function useRecipeScaling(
  originalServings: number,
  options: UseRecipeScalingOptions = {}
): UseRecipeScalingReturn {
  const { minServings = 1 } = options;

  // Ensure original servings is valid
  const validOriginal = Number.isFinite(originalServings)
    ? Math.max(originalServings || 1, 1)
    : 1;

  // The original servings must always be reachable, otherwise the first step
  // away from a >99-serving recipe would jump straight to the cap.
  const maxServings = Math.max(
    options.maxServings ??
      Math.max(
        DEFAULT_MAX_SERVINGS,
        Math.min(
          Math.ceil(validOriginal) * DEFAULT_MAX_MULTIPLE,
          DEFAULT_MAX_SERVINGS_LIMIT
        )
      ),
    Math.ceil(validOriginal)
  );

  const [scaledServings, setScaledServingsState] = useState(validOriginal);

  const scaleFactor = useMemo(() => {
    return scaledServings / validOriginal;
  }, [scaledServings, validOriginal]);

  const isScaled = scaledServings !== validOriginal;

  const setScaledServings = useCallback(
    (servings: number) => {
      // Ignore NaN / Infinity rather than poisoning the state
      if (!Number.isFinite(servings)) return;
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
    maxServings,
    setScaledServings,
    increment,
    decrement,
    resetToOriginal,
    isScaled,
  };
}
