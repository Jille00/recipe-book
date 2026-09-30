import { describe, expect, it } from "vitest";
import { THEME_OPTIONS, themeButtonLabel, toThemeChoice } from "./theme";

describe("toThemeChoice", () => {
  it("keeps the known themes", () => {
    for (const { value } of THEME_OPTIONS) {
      expect(toThemeChoice(value)).toBe(value);
    }
  });

  it("falls back to system for unknown or missing values", () => {
    expect(toThemeChoice(undefined)).toBe("system");
    expect(toThemeChoice(null)).toBe("system");
    expect(toThemeChoice("sepia")).toBe("system");
  });
});

describe("themeButtonLabel", () => {
  it("names an explicit choice", () => {
    expect(themeButtonLabel("dark", "dark")).toBe("Theme: dark. Change theme");
    expect(themeButtonLabel("light", "light")).toBe("Theme: light. Change theme");
  });

  it("adds what system resolved to", () => {
    expect(themeButtonLabel("system", "dark")).toBe(
      "Theme: system (dark). Change theme"
    );
    expect(themeButtonLabel(undefined, undefined)).toBe(
      "Theme: system (light). Change theme"
    );
  });
});
