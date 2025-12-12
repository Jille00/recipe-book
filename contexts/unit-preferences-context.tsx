"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { UnitSystem } from "@/types/units";

const STORAGE_KEY = "recipe-book-unit-system";
const OVERRIDES_KEY = "recipe-book-unit-overrides";

interface UnitPreferencesContextValue {
  globalPreference: UnitSystem;
  setGlobalPreference: (system: UnitSystem) => void;
  recipeOverrides: Record<string, UnitSystem>;
  setRecipeOverride: (recipeId: string, system: UnitSystem | null) => void;
  getEffectiveSystem: (recipeId?: string) => UnitSystem;
  isLoaded: boolean;
}

export const UnitPreferencesContext =
  createContext<UnitPreferencesContextValue | null>(null);

interface UnitPreferencesProviderProps {
  children: ReactNode;
  defaultSystem?: UnitSystem;
}

export function UnitPreferencesProvider({
  children,
  defaultSystem = "imperial",
}: UnitPreferencesProviderProps) {
  const [globalPreference, setGlobalPreferenceState] =
    useState<UnitSystem>(defaultSystem);
  const [recipeOverrides, setRecipeOverrides] = useState<
    Record<string, UnitSystem>
  >({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load preferences on mount - try API first, fall back to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadPreferences = async () => {
      // First, load from localStorage (instant)
      try {
        const storedSystem = localStorage.getItem(STORAGE_KEY);
        if (storedSystem === "metric" || storedSystem === "imperial") {
          setGlobalPreferenceState(storedSystem);
        }

        const storedOverrides = localStorage.getItem(OVERRIDES_KEY);
        if (storedOverrides) {
          const parsed = JSON.parse(storedOverrides);
          if (typeof parsed === "object" && parsed !== null) {
            setRecipeOverrides(parsed);
          }
        }
      } catch {
        // Ignore localStorage errors
      }

      // Then try to fetch from API (for authenticated users)
      try {
        const response = await fetch("/api/user/preferences");
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          if (data.unitSystem === "metric" || data.unitSystem === "imperial") {
            setGlobalPreferenceState(data.unitSystem);
            // Sync to localStorage as well
            localStorage.setItem(STORAGE_KEY, data.unitSystem);
          }
        }
      } catch {
        // User not authenticated or API error - use localStorage values
      }

      setIsLoaded(true);
    };

    loadPreferences();
  }, []);

  // Save global preference to both localStorage and API (if authenticated)
  const setGlobalPreference = useCallback(
    async (system: UnitSystem) => {
      setGlobalPreferenceState(system);

      // Always save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, system);
      } catch {
        // Ignore localStorage errors
      }

      // Save to API if authenticated
      if (isAuthenticated) {
        try {
          await fetch("/api/user/preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ unitSystem: system }),
          });
        } catch {
          // Ignore API errors - localStorage is the fallback
        }
      }
    },
    [isAuthenticated]
  );

  // Set or clear a recipe-specific override (localStorage only)
  const setRecipeOverride = useCallback(
    (recipeId: string, system: UnitSystem | null) => {
      setRecipeOverrides((prev) => {
        const next = { ...prev };
        if (system === null) {
          delete next[recipeId];
        } else {
          next[recipeId] = system;
        }

        try {
          localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
        } catch {
          // Ignore localStorage errors
        }

        return next;
      });
    },
    []
  );

  // Get the effective unit system for a recipe (override or global)
  const getEffectiveSystem = useCallback(
    (recipeId?: string): UnitSystem => {
      if (recipeId && recipeOverrides[recipeId]) {
        return recipeOverrides[recipeId];
      }
      return globalPreference;
    },
    [globalPreference, recipeOverrides]
  );

  return (
    <UnitPreferencesContext.Provider
      value={{
        globalPreference,
        setGlobalPreference,
        recipeOverrides,
        setRecipeOverride,
        getEffectiveSystem,
        isLoaded,
      }}
    >
      {children}
    </UnitPreferencesContext.Provider>
  );
}
