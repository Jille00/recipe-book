import { describe, expect, it } from "vitest";
import {
  HANDLE_PATTERN,
  RESERVED_HANDLES,
  normalizeHandle,
  profilePath,
  validateHandle,
} from "./handle";

describe("normalizeHandle", () => {
  it("trims, drops a leading @ and lowercases", () => {
    expect(normalizeHandle("  @Jille-Cooks ")).toBe("jille-cooks");
    expect(normalizeHandle("ABC")).toBe("abc");
  });
});

describe("validateHandle", () => {
  it("accepts valid handles and returns them lowercased", () => {
    expect(validateHandle("jille")).toEqual({ ok: true, handle: "jille" });
    expect(validateHandle("Chef-42")).toEqual({ ok: true, handle: "chef-42" });
    expect(validateHandle("abc")).toEqual({ ok: true, handle: "abc" });
    expect(validateHandle("a".repeat(30))).toEqual({ ok: true, handle: "a".repeat(30) });
  });

  it("rejects too short and too long", () => {
    expect(validateHandle("ab")).toMatchObject({ ok: false, error: expect.stringMatching(/3 to 30/) });
    expect(validateHandle("a".repeat(31))).toMatchObject({ ok: false });
    expect(validateHandle("   ")).toMatchObject({ ok: false });
  });

  it("rejects characters outside a-z, 0-9 and -", () => {
    for (const bad of ["jille_c", "jille.c", "jillé", "jille c", "ab/c", "<script>"]) {
      expect(validateHandle(bad)).toMatchObject({
        ok: false,
        error: expect.stringMatching(/letters, numbers and hyphens/),
      });
    }
  });

  it("rejects a leading or trailing hyphen", () => {
    expect(validateHandle("-jille")).toMatchObject({ ok: false, error: expect.stringMatching(/hyphen/) });
    expect(validateHandle("jille-")).toMatchObject({ ok: false, error: expect.stringMatching(/hyphen/) });
  });

  it("rejects reserved words, whatever the case", () => {
    for (const word of ["admin", "API", "settings", "login", "recipes", "browse", "tags", "@Kookboek"]) {
      expect(validateHandle(word)).toMatchObject({
        ok: false,
        error: expect.stringMatching(/reserved/),
      });
    }
  });

  it("agrees with the database pattern for every accepted handle", () => {
    for (const handle of ["abc", "a-b", "a1-2b", "x".repeat(30)]) {
      const result = validateHandle(handle);
      expect(result.ok).toBe(true);
      if (result.ok) expect(HANDLE_PATTERN.test(result.handle)).toBe(true);
    }
  });
});

describe("RESERVED_HANDLES", () => {
  it("is all lowercase so normalised input can match it", () => {
    for (const word of RESERVED_HANDLES) {
      expect(word).toBe(word.toLowerCase());
    }
  });
});

describe("profilePath", () => {
  it("builds /u/{handle}", () => {
    expect(profilePath("jille")).toBe("/u/jille");
  });
});
