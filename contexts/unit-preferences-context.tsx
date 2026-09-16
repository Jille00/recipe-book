"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useSession } from "@/lib/auth-client";
import type { UnitSystem } from "@/types/units";

const STORAGE_KEY = "recipe-book-unit-system";
const OVERRIDES_KEY = "recipe-book-unit-overrides";

/**
 * The only locales still on US customary / imperial units. Everything else -
 * including nl-NL, this cookbook's primary audience - is metric, so metric is
 * both the detected default and the fallback.
 */
const IMPERIAL_LOCALES = new Set(["en-us", "en-lr", "en-mm", "my-mm"]);

function isUnitSystem(value: unknown): value is UnitSystem {
  return value === "metric" || value === "imperial";
}

/**
 * Derive a unit system from the browser locale.
 *
 * Only ever called from `getSnapshot` below, i.e. on the client. The server
 * snapshot returns `defaultSystem` instead, so the SSR markup and the
 * hydrating render agree and React swaps in the detected value afterwards -
 * no hydration mismatch.
 */
function detectSystemFromLocale(fallback: UnitSystem): UnitSystem {
  if (typeof navigator === "undefined") return fallback;

  const locales =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];

  for (const locale of locales) {
    if (!locale) continue;
    const normalized = locale.toLowerCase();
    if (IMPERIAL_LOCALES.has(normalized)) return "imperial";
    // The first locale carrying a region tells us where the visitor is; it is
    // not in the imperial list, so it is a metric one.
    if (normalized.includes("-")) return "metric";
  }

  // Only region-less locales ("en", "nl", ...) - fall back to metric.
  return fallback;
}

/* -------------------------------------------------------------------------
 * localStorage as an external store
 *
 * Reading storage during render would break hydration, and reading it in an
 * effect means a cascading re-render. `useSyncExternalStore` is the pattern
 * that fits: a server snapshot for SSR/hydration, a client snapshot after.
 * ---------------------------------------------------------------------- */

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribeToStorage(listener: () => void) {
  listeners.add(listener);
  // Keep other tabs of the same cookbook in sync too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore localStorage errors (private mode, blocked storage, ...)
  }
}

const EMPTY_OVERRIDES: Record<string, UnitSystem> = {};

// `getSnapshot` must return a referentially stable value, so the parsed
// overrides object is cached against the raw string it came from.
let overridesRawCache: string | null | undefined;
let overridesCache: Record<string, UnitSystem> = EMPTY_OVERRIDES;

function parseOverrides(raw: string | null): Record<string, UnitSystem> {
  if (!raw) return EMPTY_OVERRIDES;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_OVERRIDES;

    const sanitized: Record<string, UnitSystem> = {};
    for (const [recipeId, system] of Object.entries(
      parsed as Record<string, unknown>
    )) {
      if (isUnitSystem(system)) sanitized[recipeId] = system;
    }
    return sanitized;
  } catch {
    return EMPTY_OVERRIDES;
  }
}

function getOverridesSnapshot(): Record<string, UnitSystem> {
  const raw = readRaw(OVERRIDES_KEY);
  if (raw !== overridesRawCache) {
    overridesRawCache = raw;
    overridesCache = parseOverrides(raw);
  }
  return overridesCache;
}

function getOverridesServerSnapshot(): Record<string, UnitSystem> {
  return EMPTY_OVERRIDES;
}

function writeOverrides(next: Record<string, UnitSystem>) {
  writeRaw(OVERRIDES_KEY, JSON.stringify(next));
  // Keep the in-memory snapshot authoritative even if the write was blocked.
  overridesRawCache = readRaw(OVERRIDES_KEY);
  overridesCache = next;
  emitChange();
}

function writeStoredSystem(system: UnitSystem) {
  writeRaw(STORAGE_KEY, system);
  emitChange();
}

/* -------------------------------------------------------------------------
 * Server preference request, de-duplicated per document
 *
 * The provider is mounted once in `app/layout.tsx`, but its mount effect can
 * still run more than once per document: React StrictMode double-invokes
 * effects in development, and any remount of the client tree re-runs it. The
 * previous implementation fired a bare `fetch` from that effect for *every*
 * visitor, so each repeat produced another 401 for signed-out users. Caching
 * the in-flight promise per user collapses the repeats into one request, and
 * the session gate below means signed-out visitors make none at all.
 * ---------------------------------------------------------------------- */

let cachedPreferenceUserId: string | null = null;
let cachedPreferenceRequest: Promise<UnitSystem | null> | null = null;

function fetchServerPreference(userId: string): Promise<UnitSystem | null> {
  if (cachedPreferenceUserId !== userId || !cachedPreferenceRequest) {
    cachedPreferenceUserId = userId;
    cachedPreferenceRequest = fetch("/api/user/preferences")
      .then(async (response) => {
        if (!response.ok) return null;
        const data: unknown = await response.json();
        const unitSystem = (data as { unitSystem?: unknown } | null)?.unitSystem;
        return isUnitSystem(unitSystem) ? unitSystem : null;
      })
      .catch(() => null);
  }
  return cachedPreferenceRequest;
}

function invalidateServerPreference() {
  cachedPreferenceUserId = null;
  cachedPreferenceRequest = null;
}

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
  defaultSystem = "metric",
}: UnitPreferencesProviderProps) {
  const getLocalSnapshot = useCallback(
    (): UnitSystem => {
      const stored = readRaw(STORAGE_KEY);
      if (isUnitSystem(stored)) return stored;
      return detectSystemFromLocale(defaultSystem);
    },
    [defaultSystem]
  );

  const getLocalServerSnapshot = useCallback(
    (): UnitSystem => defaultSystem,
    [defaultSystem]
  );

  // Stored choice, else browser locale, else metric.
  const localPreference = useSyncExternalStore(
    subscribeToStorage,
    getLocalSnapshot,
    getLocalServerSnapshot
  );

  const recipeOverrides = useSyncExternalStore(
    subscribeToStorage,
    getOverridesSnapshot,
    getOverridesServerSnapshot
  );

  const { data: session, isPending: isSessionPending } = useSession();
  const userId = session?.user?.id ?? null;

  // The preference stored on a signed-in user's profile, tagged with the user
  // it belongs to so a sign-out/sign-in cannot leak the previous one.
  const [serverPreference, setServerPreference] = useState<{
    userId: string;
    system: UnitSystem | null;
  } | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    fetchServerPreference(userId).then((system) => {
      if (cancelled) return;
      setServerPreference({ userId, system });
      if (system) {
        // Mirror it locally so the next page load starts on the right system.
        writeStoredSystem(system);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const resolvedServerPreference =
    serverPreference && serverPreference.userId === userId
      ? serverPreference.system
      : null;

  const globalPreference = resolvedServerPreference ?? localPreference;

  const isLoaded =
    !isSessionPending &&
    (userId === null || serverPreference?.userId === userId);

  // Save global preference to both localStorage and API (if authenticated)
  const setGlobalPreference = useCallback(
    async (system: UnitSystem) => {
      writeStoredSystem(system);

      if (!userId) return;

      // Reflect the choice immediately and drop the now-stale cached GET.
      setServerPreference({ userId, system });
      invalidateServerPreference();

      try {
        await fetch("/api/user/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unitSystem: system }),
        });
      } catch {
        // Ignore API errors - localStorage is the fallback
      }
    },
    [userId]
  );

  // Set or clear a recipe-specific override (localStorage only)
  const setRecipeOverride = useCallback(
    (recipeId: string, system: UnitSystem | null) => {
      const next = { ...getOverridesSnapshot() };
      if (system === null) {
        delete next[recipeId];
      } else {
        next[recipeId] = system;
      }
      writeOverrides(next);
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
