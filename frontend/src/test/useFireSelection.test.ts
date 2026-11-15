import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFireSelection } from "../app/hooks/useFireSelection";
import type { Fire } from "../app/types/fire";

const KEY = "firewatch-tracked-fires";
const qc = { nationalFireId: "QC-001", agencyCode: "QC", percentContained: 10 } as Fire;
const on = { nationalFireId: "ON-001", agencyCode: "ON", percentContained: 20 } as Fire;
const fires = [qc, on];

const setup = (data: Fire[] = fires) =>
  renderHook(({ fires }) => useFireSelection(fires), { initialProps: { fires: data } });

const stored = () => JSON.parse(localStorage.getItem(KEY)!);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useFireSelection", () => {
  it("starts with no tracked fires or selected provinces", () => {
    const { result } = setup();
    expect(result.current.selectedFires).toEqual([]);
    expect(result.current.selectedProvinces).toEqual([]);
    expect(stored()).toEqual([]);
  });

  it("tracks a fire and persists its ID", () => {
    const { result } = setup();
    act(() => result.current.selectFire(qc));
    expect(result.current.selectedFires).toEqual([qc]);
    expect(stored()).toEqual(["QC-001"]);
  });

  it("untracks a fire when selected twice", () => {
    const { result } = setup();
    act(() => result.current.selectFire(qc));
    act(() => result.current.selectFire(qc));
    expect(result.current.selectedFires).toEqual([]);
    expect(stored()).toEqual([]);
  });

  it("tracks multiple fires independently", () => {
    const { result } = setup();
    act(() => {
      result.current.selectFire(qc);
      result.current.selectFire(on);
    });
    expect(result.current.selectedFires).toEqual([qc, on]);
    expect(stored()).toEqual(["QC-001", "ON-001"]);
  });

  it("removes only the requested tracked fire", () => {
    const { result } = setup();
    act(() => {
      result.current.selectFire(qc);
      result.current.selectFire(on);
    });
    act(() => result.current.removeFire("QC-001"));
    expect(result.current.selectedFires).toEqual([on]);
    expect(stored()).toEqual(["ON-001"]);
  });

  it("does not change tracking when removing an unknown ID", () => {
    const { result } = setup();
    act(() => result.current.selectFire(qc));
    act(() => result.current.removeFire("MISSING"));
    expect(result.current.selectedFires).toEqual([qc]);
    expect(stored()).toEqual(["QC-001"]);
  });

  it("restores saved tracked fires", () => {
    localStorage.setItem(KEY, JSON.stringify(["QC-001"]));
    const { result } = setup();
    expect(result.current.selectedFires).toEqual([qc]);
  });

  it("restores multiple saved fires in API order", () => {
    localStorage.setItem(KEY, JSON.stringify(["ON-001", "QC-001"]));
    const { result } = setup();
    expect(result.current.selectedFires).toEqual([qc, on]);
  });

  it("deduplicates saved IDs", () => {
    localStorage.setItem(KEY, JSON.stringify(["QC-001", "QC-001", "ON-001"]));
    const { result } = setup();
    expect(result.current.selectedFires).toEqual([qc, on]);
    expect(stored()).toEqual(["QC-001", "ON-001"]);
  });

  it("filters non-string IDs from saved data", () => {
    localStorage.setItem(KEY, JSON.stringify(["QC-001", 42, null, {}, "ON-001"]));
    const { result } = setup();
    expect(result.current.selectedFires).toEqual([qc, on]);
    expect(stored()).toEqual(["QC-001", "ON-001"]);
  });

  it("ignores saved IDs missing from the current API response", () => {
    localStorage.setItem(KEY, JSON.stringify(["QC-001", "MISSING"]));
    const { result } = setup();
    expect(result.current.selectedFires).toEqual([qc]);
    expect(stored()).toEqual(["QC-001", "MISSING"]);
  });

  it("restores a tracked fire when it reappears in API data", () => {
    localStorage.setItem(KEY, JSON.stringify(["QC-001"]));
    const { result, rerender } = setup([]);
    expect(result.current.selectedFires).toEqual([]);
    rerender({ fires });
    expect(result.current.selectedFires).toEqual([qc]);
  });

  it("uses updated API data for tracked fires", () => {
    const { result, rerender } = setup();
    act(() => result.current.selectFire(qc));
    const updated = { ...qc, percentContained: 75 };
    rerender({ fires: [updated, on] });
    expect(result.current.selectedFires).toEqual([updated]);
    expect(stored()).toEqual(["QC-001"]);
  });

  it("handles invalid JSON in localStorage", () => {
    localStorage.setItem(KEY, "invalid-json");
    const { result } = setup();
    expect(result.current.selectedFires).toEqual([]);
    expect(stored()).toEqual([]);
  });

  it("handles non-array JSON in localStorage", () => {
    localStorage.setItem(KEY, JSON.stringify({ ids: ["QC-001"] }));
    const { result } = setup();
    expect(result.current.selectedFires).toEqual([]);
    expect(stored()).toEqual([]);
  });

  it("handles an empty saved array", () => {
    localStorage.setItem(KEY, "[]");
    const { result } = setup();
    expect(result.current.selectedFires).toEqual([]);
  });

  it("handles localStorage read failures", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    const { result } = setup();
    expect(result.current.selectedFires).toEqual([]);
  });

  it("does not crash when localStorage writes fail", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    const { result } = setup();
    act(() => result.current.selectFire(qc));
    expect(result.current.selectedFires).toEqual([qc]);
    expect(error).toHaveBeenCalled();
  });

  it("toggles provinces independently of tracked fires", () => {
    const { result } = setup();
    act(() => {
      result.current.selectFire(qc);
      result.current.toggleProvince("QC");
    });
    expect(result.current.selectedProvinces).toEqual(["QC"]);
    expect(result.current.selectedFires).toEqual([qc]);
    act(() => result.current.toggleProvince("QC"));
    expect(result.current.selectedProvinces).toEqual([]);
    expect(result.current.selectedFires).toEqual([qc]);
  });

  it("supports multiple selected provinces", () => {
    const { result } = setup();
    act(() => {
      result.current.toggleProvince("QC");
      result.current.toggleProvince("ON");
    });
    expect(result.current.selectedProvinces).toEqual(["QC", "ON"]);
    act(() => result.current.toggleProvince("QC"));
    expect(result.current.selectedProvinces).toEqual(["ON"]);
  });

  it("clears provinces without removing tracked fires", () => {
    const { result } = setup();
    act(() => {
      result.current.selectFire(qc);
      result.current.toggleProvince("QC");
      result.current.toggleProvince("ON");
    });
    act(() => result.current.clearProvinces());
    expect(result.current.selectedProvinces).toEqual([]);
    expect(result.current.selectedFires).toEqual([qc]);
    expect(stored()).toEqual(["QC-001"]);
  });
});
