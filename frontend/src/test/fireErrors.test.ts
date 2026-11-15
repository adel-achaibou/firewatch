import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import { getFireErrorKey, validateFires } from "../app/utils/fireErrors";

const validFire = {
  nationalFireId: "QC-001",
  agencyCode: "QC",
  stageOfControlStatus: "OC",
  latitude: 46.8,
  longitude: -71.2,
  fireSize: 150,
  nationalFireCause: "N",
  percentContained: 40,
  statusDate: "2026-11-13T10:00:00Z",
};

describe("validateFires", () => {
  it("accepts an empty list", () => {
    expect(validateFires([])).toEqual([]);
  });

  it("returns valid fires", () => {
    expect(validateFires([validFire])).toEqual([validFire]);
  });

  it("accepts nullable fields", () => {
    const fire = {
      ...validFire,
      fireSize: null,
      nationalFireCause: null,
      percentContained: null,
      statusDate: null,
    };

    expect(validateFires([fire])).toEqual([fire]);
  });

  it.each([null, {}, "fires", 42])(
    "rejects a non-array response: %s",
    (data) => {
      expect(() => validateFires(data)).toThrow(
        "Invalid fires response"
      );
    }
  );

  it.each([
    null,
    {},
    { ...validFire, nationalFireId: null },
    { ...validFire, nationalFireId: " " },
    { ...validFire, agencyCode: 4 },
    { ...validFire, stageOfControlStatus: null },
    { ...validFire, latitude: 91 },
    { ...validFire, latitude: -91 },
    { ...validFire, longitude: 181 },
    { ...validFire, longitude: -181 },
    { ...validFire, latitude: NaN },
    { ...validFire, longitude: Infinity },
    { ...validFire, latitude: "46.8" },
    { ...validFire, fireSize: -1 },
    { ...validFire, fireSize: NaN },
    { ...validFire, fireSize: Infinity },
    { ...validFire, fireSize: "150" },
    { ...validFire, percentContained: -1 },
    { ...validFire, percentContained: 101 },
    { ...validFire, percentContained: NaN },
    { ...validFire, percentContained: "40" },
    { ...validFire, statusDate: "invalid-date" },
    { ...validFire, statusDate: "" },
    { ...validFire, statusDate: 123 },
    { ...validFire, nationalFireCause: 123 },
  ])("rejects malformed fire data: %#", (fire) => {
    expect(() => validateFires([fire])).toThrow(
      "Invalid fires response"
    );
  });

  it("accepts valid coordinate boundaries", () => {
    expect(
      validateFires([
        { ...validFire, latitude: 90, longitude: -180 },
      ])
    ).toHaveLength(1);
  });

  it("accepts valid containment boundaries", () => {
    expect(
      validateFires([
        { ...validFire, percentContained: 0 },
        { ...validFire, percentContained: 100 },
      ])
    ).toHaveLength(2);
  });

  it("accepts zero fire size", () => {
    expect(
      validateFires([{ ...validFire, fireSize: 0 }])
    ).toHaveLength(1);
  });

  it("rejects the entire response when one fire is invalid", () => {
    expect(() =>
      validateFires([
        validFire,
        { ...validFire, longitude: 999 },
      ])
    ).toThrow();
  });
});

describe("getFireErrorKey", () => {
  const httpError = (status: number) =>
    new AxiosError(
      "HTTP failure",
      "ERR_BAD_RESPONSE",
      undefined,
      undefined,
      {
        data: null,
        status,
        statusText: "Error",
        headers: {},
        config: { headers: {} } as never,
      }
    );

  it("maps 404", () => {
    expect(getFireErrorKey(httpError(404))).toBe("errors.notFound");
  });

  it.each([500, 502, 503])(
    "maps HTTP %i to server error",
    (status) => {
      expect(getFireErrorKey(httpError(status))).toBe(
        "errors.server"
      );
    }
  );

  it("maps timeout", () => {
    expect(
      getFireErrorKey(
        new AxiosError("timeout", "ECONNABORTED")
      )
    ).toBe("errors.timeout");
  });

  it("maps network failure", () => {
    expect(
      getFireErrorKey(
        new AxiosError("offline", "ERR_NETWORK")
      )
    ).toBe("errors.network");
  });

  it("maps unknown errors", () => {
    expect(getFireErrorKey(new Error("oops"))).toBe(
      "errors.generic"
    );
  });

  it("maps non-404 4xx to generic", () => {
    expect(getFireErrorKey(httpError(400))).toBe(
      "errors.generic"
    );
  });
});
