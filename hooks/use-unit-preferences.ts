"use client";

import { useContext } from "react";
import { UnitPreferencesContext } from "@/contexts/unit-preferences-context";
import type { UnitSystem } from "@/types/units";

/**
 * Hook to access unit preferences context
 */
export function useUnitPreferences() {
  const context = useContext(UnitPreferencesContext);

  if (!context) {
    throw new Error(
      "useUnitPreferences must be used within a UnitPreferencesProvider"
    );
  }

  return context;
}

/**
 * Hook to get the effective unit system for a specific recipe
 */
export function useRecipeUnitSystem(recipeId: string): {
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem | null) => void;
  isOverridden: boolean;
} {
  const { getEffectiveSystem, setRecipeOverride, recipeOverrides } =
    useUnitPreferences();

  const unitSystem = getEffectiveSystem(recipeId);
  const isOverridden = recipeId in recipeOverrides;

  const setUnitSystem = (system: UnitSystem | null) => {
    setRecipeOverride(recipeId, system);
  };

  return {
    unitSystem,
    setUnitSystem,
    isOverridden,
  };
}
