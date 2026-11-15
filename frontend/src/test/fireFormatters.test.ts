import { describe, expect, it } from "vitest";
import { statusColor, formatArea, formatDate } from "../app/utils/fireFormatters";

describe("statusColor", () => {
  it.each(["OC", "BH", "UC", "EX", "UNKNOWN"]) ("returns CSS classes for %s", (status) => {
    expect(statusColor(status)).toContain("bg-");
    expect(statusColor(status)).toContain("text-");
  });
  it("uses fallback for unknown statuses", () => expect(statusColor("EX")).toBe(statusColor("unknown")));
  it("distinguishes the three active states", () => {
    expect(new Set([statusColor("OC"), statusColor("BH"), statusColor("UC")]).size).toBe(3);
  });
});

describe("formatArea", () => {
  it("uses the unknown label for null", () => expect(formatArea(null, "Unknown", "en")).toBe("Unknown"));
  it("preserves zero", () => expect(formatArea(0, "Unknown", "en")).toContain("0 ha"));
  it("includes hectares", () => expect(formatArea(1234, "Inconnu", "fr")).toMatch(/ha$/));
  it("formats both languages", () => {
    expect(formatArea(1234.5, "Unknown", "en")).toContain("ha");
    expect(formatArea(1234.5, "Inconnu", "fr")).toContain("ha");
  });
});

describe("formatDate", () => {
  it("uses fallback for null or empty date", () => {
    expect(formatDate(null, "Unknown", "en")).toBe("Unknown");
    expect(formatDate("", "Unknown", "en")).toBe("Unknown");
  });
  it("uses fallback for invalid date", () => expect(formatDate("not-a-date", "Unknown", "en")).toBe("Unknown"));
  it("formats dates in French and English", () => {
    expect(formatDate("2026-10-30T12:00:00Z", "Unknown", "en")).not.toBe("Unknown");
    expect(formatDate("2026-10-30T12:00:00Z", "Inconnu", "fr")).not.toBe("Inconnu");
  });
  it("uses UTC rather than local time", () => {
    expect(formatDate("2026-11-01T00:30:00Z", "Unknown", "en"))
      .toBe(formatDate("2026-10-31T20:30:00-04:00", "Unknown", "en"));
  });
});
