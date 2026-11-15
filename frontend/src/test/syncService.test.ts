import { beforeEach, describe, expect, it, vi } from "vitest";
import { axiosInstance } from "../app/library/axiosInstance";
import {
  fetchLastSync,
  fetchSyncOverview
} from "../app/services/syncService";

vi.mock("../app/library/axiosInstance", () => ({
  axiosInstance: { get: vi.fn() }
}));

const get = vi.mocked(axiosInstance.get);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("syncService", () => {
  it("returns null when no successful synchronization exists", async () => {
    get.mockResolvedValueOnce({
      status: 204,
      data: undefined
    });

    await expect(fetchLastSync()).resolves.toBeNull();

    expect(get).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/cwfis/sync/last-success",
      { signal: undefined }
    );
  });

  it("returns the successful synchronization response", async () => {
    const data = {
      id: 7,
      status: "SUCCESS"
    };

    get.mockResolvedValueOnce({
      status: 200,
      data
    });

    await expect(fetchLastSync()).resolves.toEqual(data);

    expect(get).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/cwfis/sync/last-success",
      { signal: undefined }
    );
  });

  it("forwards cancellation signals to fetchLastSync", async () => {
    const controller = new AbortController();

    get.mockResolvedValueOnce({
      status: 204,
      data: undefined
    });

    await fetchLastSync(controller.signal);

    expect(get).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/cwfis/sync/last-success",
      { signal: controller.signal }
    );
  });

  it("returns sync overview and forwards cancellation signal", async () => {
    const controller = new AbortController();

    const data = {
      latestStatus: "RUNNING",
      latestStartedAt: "2026-11-05T10:00:00Z",
      lastSuccessfulAt: null
    };

    get.mockResolvedValueOnce({ data });

    await expect(
      fetchSyncOverview(controller.signal)
    ).resolves.toEqual(data);

    expect(get).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/cwfis/sync/status",
      { signal: controller.signal }
    );
  });

  it("fetches sync overview without a signal", async () => {
    const data = {
      latestStatus: "SUCCESS"
    };

    get.mockResolvedValueOnce({ data });

    await expect(fetchSyncOverview()).resolves.toEqual(data);

    expect(get).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/cwfis/sync/status",
      { signal: undefined }
    );
  });

  it("propagates errors from fetchLastSync", async () => {
    const error = new Error("Server unavailable");

    get.mockRejectedValueOnce(error);

    await expect(fetchLastSync()).rejects.toBe(error);

    expect(get).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/cwfis/sync/last-success",
      { signal: undefined }
    );
  });

  it("propagates network failures from fetchSyncOverview", async () => {
    const error = new Error("Network down");

    get.mockRejectedValueOnce(error);

    await expect(fetchSyncOverview()).rejects.toBe(error);

    expect(get).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/cwfis/sync/status",
      { signal: undefined }
    );
  });

  it("propagates cancellation errors without converting them to null", async () => {
    const controller = new AbortController();

    const cancellationError = new Error("Request canceled");
    cancellationError.name = "CanceledError";

    get.mockRejectedValueOnce(cancellationError);

    controller.abort();

    await expect(
      fetchLastSync(controller.signal)
    ).rejects.toBe(cancellationError);

    expect(get).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/cwfis/sync/last-success",
      { signal: controller.signal }
    );
  });
});
