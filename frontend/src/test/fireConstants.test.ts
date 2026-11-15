import { describe, expect, it } from "vitest";
import { agencyCode } from "../app/constants/agencyCode";
import { stageOfControlStatus } from "../app/constants/stageOfControlStatus";
import { nationalFireCauses } from "../app/constants/nationalFireCauses";

describe("FireWatch reference constants", () => {
  it("maps all Canadian provinces and territories plus Parks Canada", () => {
    expect(Object.keys(agencyCode)).toHaveLength(14);
    expect(agencyCode.QC).toBe("Quebec");
    expect(agencyCode.ON).toBe("Ontario");
    expect(agencyCode.PC).toBe("Parks Canada");
  });
  it("contains nonempty agency names", () => {
    expect(Object.values(agencyCode).every((name) => name.trim().length > 0)).toBe(true);
  });
  it("maps all supported control statuses", () => {
    expect(stageOfControlStatus).toEqual({
      OC: "Out of Control", BH: "Being Held", UC: "Under Control", EX: "Extinguished",
    });
  });
  it("maps the three national fire causes", () => {
    expect(nationalFireCauses).toEqual({ H: "Human", N: "Natural", U: "Undetermined" });
  });
});
