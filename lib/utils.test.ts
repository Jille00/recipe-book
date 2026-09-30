import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";
import { cn as cn2 } from "@/lib/utils/cn";

describe.each([
  ["lib/utils", cn],
  ["lib/utils/cn", cn2],
])("cn (%s)", (_name, fn) => {
  it("joins class names and skips falsy values", () => {
    expect(fn("a", false, null, undefined, 0, "", "b")).toBe("a b");
  });

  it("supports object and array syntax", () => {
    expect(fn(["a", { b: true, c: false }], "d")).toBe("a b d");
  });

  it("lets later tailwind classes win conflicts", () => {
    expect(fn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    expect(fn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("returns an empty string for no input", () => {
    expect(fn()).toBe("");
  });
});
