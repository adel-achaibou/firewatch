import { describe, expect, it } from "vitest";
import { createFireMarker } from "../app/components/map/createFireMarker";

describe("createFireMarker", () => {
  it("creates an orange marker without a number when not selected", () => {
    const marker = createFireMarker(false, 1);
    expect(marker.tagName).toBe("DIV");
    expect(marker.style.width).toBe("34px");
    expect(marker.style.backgroundColor).toBe("rgb(249, 115, 22)");
    expect(marker.querySelector("img")).not.toBeNull();
    expect(marker.querySelector("span")).toBeNull();
  });
  it("shows a numbered blue marker when selected", () => {
    const marker = createFireMarker(true, 3);
    expect(marker.style.width).toBe("48px");
    expect(marker.style.backgroundColor).toBe("rgb(37, 99, 235)");
    expect(marker.querySelector("span")).toHaveTextContent("3");
  });
  it("uses smaller markers on mobile", () => {
    expect(createFireMarker(false, 1, true).style.width).toBe("19px");
    const selected = createFireMarker(true, 2, true);
    expect(selected.style.width).toBe("28px");
    expect(selected.querySelector("span")).toHaveTextContent("2");
  });
  it("sets decorative icon alt to empty", () => {
    expect(createFireMarker(false, 1).querySelector("img")?.alt).toBe("");
  });
});
