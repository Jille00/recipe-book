import { describe, it, expect } from "vitest";
import { nutritionInputsKey } from "@/lib/utils/nutrition-inputs";

const flour = { text: "flour", amount: "200", unit: "g" };
const eggs = { text: "eggs", amount: "2", unit: undefined };

describe("nutritionInputsKey", () => {
  it("is stable for identical inputs", () => {
    expect(nutritionInputsKey([flour, eggs], 4)).toBe(nutritionInputsKey([flour, eggs], 4));
  });

  it("ignores ingredient order", () => {
    expect(nutritionInputsKey([flour, eggs], 4)).toBe(nutritionInputsKey([eggs, flour], 4));
  });

  it("ignores case and repeated/surrounding whitespace", () => {
    expect(nutritionInputsKey([flour], 4)).toBe(
      nutritionInputsKey([{ text: "  Flour ", amount: " 200", unit: "G " }], 4)
    );
    expect(nutritionInputsKey([{ text: "brown   sugar" }], 1)).toBe(
      nutritionInputsKey([{ text: "Brown sugar" }], 1)
    );
  });

  it("ignores blank ingredient rows", () => {
    expect(nutritionInputsKey([flour, { text: "   ", amount: "5", unit: "g" }, { text: "" }], 4)).toBe(
      nutritionInputsKey([flour], 4)
    );
  });

  it("treats missing amount/unit like empty strings", () => {
    expect(nutritionInputsKey([{ text: "salt" }], 1)).toBe(
      nutritionInputsKey([{ text: "salt", amount: "", unit: "" }], 1)
    );
  });

  it("changes when an amount, unit or text changes", () => {
    const base = nutritionInputsKey([flour], 4);
    expect(nutritionInputsKey([{ ...flour, amount: "300" }], 4)).not.toBe(base);
    expect(nutritionInputsKey([{ ...flour, unit: "kg" }], 4)).not.toBe(base);
    expect(nutritionInputsKey([{ ...flour, text: "sugar" }], 4)).not.toBe(base);
  });

  it("changes when an ingredient is added or removed", () => {
    expect(nutritionInputsKey([flour, eggs], 4)).not.toBe(nutritionInputsKey([flour], 4));
  });

  it("changes when servings change", () => {
    expect(nutritionInputsKey([flour], 4)).not.toBe(nutritionInputsKey([flour], 2));
  });

  it("reads servings like parseInt (numbers and strings agree)", () => {
    expect(nutritionInputsKey([flour], "4")).toBe(nutritionInputsKey([flour], 4));
    expect(nutritionInputsKey([flour], "4 people")).toBe(nutritionInputsKey([flour], 4));
    expect(nutritionInputsKey([flour], 4.7)).toBe(nutritionInputsKey([flour], 4));
    expect(nutritionInputsKey([flour], "4.7")).toBe(nutritionInputsKey([flour], 4));
  });

  it("treats missing/invalid/non-positive servings the same", () => {
    const none = nutritionInputsKey([flour], null);
    for (const s of [undefined, "", "abc", 0, -2, "0", NaN, Infinity]) {
      expect(nutritionInputsKey([flour], s as number | string | undefined)).toBe(none);
    }
  });

  it("does not confuse field boundaries (no delimiter collisions)", () => {
    expect(nutritionInputsKey([{ text: "b c", amount: "a", unit: "" }], 1)).not.toBe(
      nutritionInputsKey([{ text: "c", amount: "a", unit: "b" }], 1)
    );
  });

  it("handles no ingredients", () => {
    expect(nutritionInputsKey([], 2)).toBe(JSON.stringify(["2", []]));
  });
});
