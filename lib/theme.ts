/** The themes the header toggle offers (next-themes values). */
export const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export type ThemeChoice = (typeof THEME_OPTIONS)[number]["value"];

/** Narrow whatever next-themes reports (possibly undefined before mount). */
export function toThemeChoice(value: string | null | undefined): ThemeChoice {
  return THEME_OPTIONS.some((option) => option.value === value)
    ? (value as ThemeChoice)
    : "system";
}

/**
 * Accessible name for the icon-only theme button, spelling out the current
 * setting (and, for "system", what it resolved to) so a screen reader user
 * hears the state and not just "Theme".
 */
export function themeButtonLabel(
  theme: string | null | undefined,
  resolvedTheme: string | null | undefined
): string {
  const choice = toThemeChoice(theme);
  if (choice === "system") {
    const resolved = resolvedTheme === "dark" ? "dark" : "light";
    return `Theme: system (${resolved}). Change theme`;
  }
  return `Theme: ${choice}. Change theme`;
}
