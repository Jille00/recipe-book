import { describe, expect, it } from "vitest";
import { nutritionInputsKey } from "./nutrition-inputs";

type Row = { text: string; amount?: string; unit?: string };

const flour: Row = { text: "flour", amount: "200", unit: "g" };
const eggs: Row = { text: "eggs", amount: "2", unit: "" };
const milk: Row = { text: "milk", amount: "250", unit: "ml" };

const base = [flour, eggs, milk];

describe("nutritionInputsKey", () => {
  describe("stays the same when nothing that affects nutrition changed", () => {
    it("is deterministic", () => {
      expect(nutritionInputsKey(base, 4)).toBe(nutritionInputsKey(base, 4));
    });

    it("ignores ingredient order", () => {
      expect(nutritionInputsKey([milk, flour, eggs], 4)).toBe(nutritionInputsKey(base, 4));
    });

    it("ignores case and surrounding or repeated whitespace", () => {
      const messy: Row[] = [
        { text: "  FLOUR ", amount: " 200 ", unit: "G" },
        { text: "Eggs", amount: "2", unit: "  " },
        { text: "Milk", amount: "250", unit: "ML" },
      ];
      expect(nutritionInputsKey(messy, 4)).toBe(nutritionInputsKey(base, 4));
      expect(nutritionInputsKey([{ text: "brown   sugar" }], 1)).toBe(
        nutritionInputsKey([{ text: "brown sugar" }], 1)
      );
    });

    it("ignores blank ingredient rows, even with an amount", () => {
      const withBlanks: Row[] = [
        { text: "" },
        flour,
        { text: "   ", amount: "3", unit: "cup" },
        eggs,
        milk,
      ];
      expect(nutritionInputsKey(withBlanks, 4)).toBe(nutritionInputsKey(base, 4));
    });

    it("ignores properties other than text, amount and unit", () => {
      const withIds = base.map((row, i) => ({ ...row, id: `id-${i}`, note: "x" }));
      expect(nutritionInputsKey(withIds, 4)).toBe(nutritionInputsKey(base, 4));
    });

    it("treats a missing amount or unit like an empty one", () => {
      expect(nutritionInputsKey([{ text: "salt" }], 2)).toBe(
        nutritionInputsKey([{ text: "salt", amount: "", unit: "" }], 2)
      );
    });

    it("treats servings as a string and as a number the same", () => {
      expect(nutritionInputsKey(base, "4")).toBe(nutritionInputsKey(base, 4));
      expect(nutritionInputsKey(base, " 4 ")).toBe(nutritionInputsKey(base, 4));
    });

    it("reads servings the way parseInt does", () => {
      expect(nutritionInputsKey(base, "4 people")).toBe(nutritionInputsKey(base, 4));
      expect(nutritionInputsKey(base, "2.7")).toBe(nutritionInputsKey(base, 2));
      expect(nutritionInputsKey(base, 2.7)).toBe(nutritionInputsKey(base, 2));
    });

    it.each([["abc"], ["0"], ["-3"], [0], [-2], [NaN], [""], [null], [undefined]])(
      "treats the invalid servings %j as no servings",
      (servings) => {
        expect(nutritionInputsKey(base, servings)).toBe(nutritionInputsKey(base, null));
      }
    );
  });

  describe("changes when an input that affects nutrition changed", () => {
    const original = nutritionInputsKey(base, 4);

    it("changes when an amount changes", () => {
      expect(nutritionInputsKey([{ ...flour, amount: "250" }, eggs, milk], 4)).not.toBe(original);
    });

    it("changes when a unit changes", () => {
      expect(nutritionInputsKey([{ ...flour, unit: "kg" }, eggs, milk], 4)).not.toBe(original);
    });

    it("changes when ingredient text changes", () => {
      expect(nutritionInputsKey([{ ...flour, text: "almond flour" }, eggs, milk], 4)).not.toBe(original);
    });

    it("changes when an ingredient is added", () => {
      expect(nutritionInputsKey([...base, { text: "butter", amount: "50", unit: "g" }], 4)).not.toBe(original);
    });

    it("changes when an ingredient is removed", () => {
      expect(nutritionInputsKey([flour, eggs], 4)).not.toBe(original);
    });

    it("changes when the same ingredient is listed twice", () => {
      expect(nutritionInputsKey([...base, flour], 4)).not.toBe(original);
    });

    it("changes when servings change", () => {
      expect(nutritionInputsKey(base, 6)).not.toBe(original);
    });

    it("changes when servings are cleared", () => {
      expect(nutritionInputsKey(base, "")).not.toBe(original);
      expect(nutritionInputsKey(base, null)).not.toBe(original);
    });

    it("distinguishes values moved between fields", () => {
      expect(nutritionInputsKey([{ text: "flour", amount: "200 g", unit: "" }], 1)).not.toBe(
        nutritionInputsKey([{ text: "flour", amount: "200", unit: "g" }], 1)
      );
    });
  });

  describe("has no collisions from text that contains JSON delimiters", () => {
    it("keeps quotes and commas inside one field apart from separate fields", () => {
      const smuggled = nutritionInputsKey([{ text: 'x', amount: '1","g', unit: "" }], 1);
      const honest = nutritionInputsKey([{ text: "x", amount: "1", unit: "g" }], 1);
      expect(smuggled).not.toBe(honest);
    });

    it("keeps one row with brackets apart from two rows", () => {
      const oneRow = nutritionInputsKey([{ text: 'a"],["","","b', amount: "", unit: "" }], 1);
      const twoRows = nutritionInputsKey([{ text: "a" }, { text: "b" }], 1);
      expect(oneRow).not.toBe(twoRows);
    });

    it("keeps servings apart from ingredient text", () => {
      expect(nutritionInputsKey([{ text: '4",["' }], null)).not.toBe(nutritionInputsKey([{ text: "" }], 4));
    });

    it("produces valid JSON", () => {
      expect(() => JSON.parse(nutritionInputsKey([{ text: 'a"\\]', amount: "{", unit: "}" }], 3))).not.toThrow();
    });
  });
});
