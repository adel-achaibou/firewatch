import { beforeEach, describe, expect, it, vi } from "vitest";
import { axiosInstance } from "../app/library/axiosInstance";
import { fetchFireById, fetchFires } from "../app/services/fireService";

vi.mock("../app/library/axiosInstance", () => ({
  axiosInstance: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

const getMock = vi.mocked(axiosInstance.get);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fireService", () => {
  it("fetches all fires from the correct endpoint", async () => {
    const fires = [
      { nationalFireId: "QC-001" }
    ];

    getMock.mockResolvedValueOnce({ data: fires });

    await expect(fetchFires()).resolves.toEqual(fires);

    expect(getMock).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/fires",
      { signal: undefined }
    );
  });

  it("passes an AbortSignal", async () => {
    const controller = new AbortController();

    getMock.mockResolvedValueOnce({ data: [] });

    await fetchFires(controller.signal);

    expect(getMock).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/fires",
      { signal: controller.signal }
    );
  });

  it("fetches a fire by its ID", async () => {
    const fire = { nationalFireId: "QC-001" };

    getMock.mockResolvedValueOnce({ data: fire });

    await expect(fetchFireById("QC-001"))
      .resolves.toEqual(fire);

    expect(getMock).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/fires/QC-001"
    );
  });

  it("encodes special characters in fire IDs", async () => {
    const fire = { nationalFireId: "QC/001 #A" };

    getMock.mockResolvedValueOnce({ data: fire });

    await expect(fetchFireById("QC/001 #A"))
      .resolves.toEqual(fire);

    expect(getMock).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/fires/QC%2F001%20%23A"
    );
  });

  it("propagates HTTP errors when fetching fires", async () => {
    getMock.mockRejectedValueOnce(
      new Error("Network unavailable")
    );

    await expect(fetchFires())
      .rejects.toThrow("Network unavailable");
  });

  it("propagates HTTP errors when fetching a single fire", async () => {
    getMock.mockRejectedValueOnce(
      new Error("Fire not found")
    );

    await expect(fetchFireById("UNKNOWN"))
      .rejects.toThrow("Fire not found");

    expect(getMock).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/fires/UNKNOWN"
    );
  });

  it("propagates cancellation errors", async () => {
    const controller = new AbortController();

    const cancellationError = new Error("Request canceled");
    cancellationError.name = "CanceledError";

    getMock.mockRejectedValueOnce(cancellationError);

    controller.abort();

    await expect(fetchFires(controller.signal))
      .rejects.toBe(cancellationError);

    expect(getMock).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/fires",
      { signal: controller.signal }
    );
  });
});
