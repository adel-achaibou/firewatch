import { describe, expect, it } from "vitest";
import en from "../app/i18n/locales/en.json";
import fr from "../app/i18n/locales/fr.json";
function flatten(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
}
describe("i18n locale resources", () => {
  it("has English and French translations", () => {
    expect(Object.keys(en).length).toBeGreaterThan(0);
    expect(Object.keys(fr).length).toBeGreaterThan(0);
  });
  it("uses matching keys for English and French", () => {
    expect(flatten(fr).sort()).toEqual(flatten(en).sort());
  });
  it("contains no blank translations", () => {
    const allValues = (obj: unknown): string[] => {
      if (typeof obj === "string") return [obj];
      if (typeof obj !== "object" || obj === null) return [];
      return Object.values(obj).flatMap(allValues);
    };
    expect(allValues(en).every(s => s.trim().length > 0)).toBe(true);
    expect(allValues(fr).every(s => s.trim().length > 0)).toBe(true);
  });
  it("uses matching interpolation variables in both languages", () => {
    const extractVariables = (value: string): string[] =>
      [...value.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)]
        .map((match) => match[1])
        .sort();

    const collect = (
      value: unknown,
      prefix = ""
    ): Record<string, string[]> => {
      if (typeof value === "string") {
        return { [prefix]: extractVariables(value) };
      }

      if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
      ) {
        return {};
      }

      return Object.assign(
        {},
        ...Object.entries(value).map(([key, child]) =>
          collect(child, prefix ? `${prefix}.${key}` : key)
        )
      );
    };

    expect(collect(fr)).toEqual(collect(en));
  });
});
