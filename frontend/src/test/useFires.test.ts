import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFires } from "../app/hooks/useFires";
import { fetchFires } from "../app/services/fireService";
import type { Fire } from "../app/types/fire";

vi.mock("../app/services/fireService", () => ({ fetchFires: vi.fn() }));

const mockedFetch = vi.mocked(fetchFires);
const fire = (id: string) => ({ nationalFireId: id, agencyCode: "QC", stageOfControlStatus: "OC", latitude: 50, longitude: -70 }) as Fire;
const tick = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  mockedFetch.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useFires", () => {
  it("loads and validates fires on mount", async () => {
    mockedFetch.mockResolvedValue([fire("QC-1")]);
    const { result } = renderHook(() => useFires());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(result.current.fires).toHaveLength(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.refreshing).toBe(false);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
    expect(result.current.errorKey).toBeNull();
  });

  it("accepts an empty valid response", async () => {
    mockedFetch.mockResolvedValue([]);
    const { result } = renderHook(() => useFires());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(result.current.fires).toEqual([]);
  });

  it("keeps loading true until the initial request completes", async () => {
    const request = deferred<Fire[]>();
    mockedFetch.mockReturnValueOnce(request.promise);
    const { result } = renderHook(() => useFires());
    expect(result.current.loading).toBe(true);
    expect(result.current.hasLoaded).toBe(false);
    expect(result.current.lastUpdated).toBeNull();
    await act(async () => { request.resolve([fire("QC-1")]); });
    expect(result.current.loading).toBe(false);
    expect(result.current.hasLoaded).toBe(true);
  });

  it("reports malformed data without replacing previous data", async () => {
    mockedFetch.mockResolvedValueOnce([fire("QC-1")]).mockResolvedValueOnce([{ nationalFireId: 5 }] as unknown as Fire[]);
    const { result } = renderHook(() => useFires());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const previousUpdate = result.current.lastUpdated;
    await act(async () => { await result.current.reload(); });
    expect(result.current.errorKey).toBe("errors.invalidData");
    expect(result.current.fires[0].nationalFireId).toBe("QC-1");
    expect(result.current.lastUpdated).toBe(previousUpdate);
    expect(console.error).toHaveBeenCalled();
  });

  it("reports invalid initial data without marking it loaded", async () => {
    mockedFetch.mockResolvedValueOnce([{ nationalFireId: 5 }] as unknown as Fire[]);
    const { result } = renderHook(() => useFires());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasLoaded).toBe(false);
    expect(result.current.errorKey).toBe("errors.invalidData");
    expect(result.current.fires).toEqual([]);
    expect(result.current.lastUpdated).toBeNull();
  });

  it("recovers from a failed initial request", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([fire("QC-2")]);
    const { result } = renderHook(() => useFires());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasLoaded).toBe(false);
    expect(result.current.errorKey).not.toBeNull();
    await act(async () => { await result.current.reload(); });
    expect(result.current.errorKey).toBeNull();
    expect(result.current.hasLoaded).toBe(true);
    expect(result.current.fires[0].nationalFireId).toBe("QC-2");
  });

  it("preserves previously loaded data after a network failure", async () => {
    mockedFetch.mockResolvedValueOnce([fire("QC-1")]).mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useFires());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const previousUpdate = result.current.lastUpdated;
    await act(async () => { await result.current.reload(); });
    expect(result.current.fires.map(f => f.nationalFireId)).toEqual(["QC-1"]);
    expect(result.current.hasLoaded).toBe(true);
    expect(result.current.lastUpdated).toBe(previousUpdate);
    expect(result.current.errorKey).not.toBeNull();
    expect(result.current.refreshing).toBe(false);
  });

  it("replaces old fires and clears previous errors after recovery", async () => {
    mockedFetch.mockResolvedValueOnce([fire("QC-1")]).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([fire("ON-2")]);
    const { result } = renderHook(() => useFires());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    await act(async () => { await result.current.reload(); });
    expect(result.current.errorKey).not.toBeNull();
    await act(async () => { await result.current.reload(); });
    expect(result.current.fires.map(f => f.nationalFireId)).toEqual(["ON-2"]);
    expect(result.current.errorKey).toBeNull();
  });

  it("shows refreshing while a manual reload is pending", async () => {
    const request = deferred<Fire[]>();
    mockedFetch.mockResolvedValueOnce([fire("QC-1")]).mockReturnValueOnce(request.promise);
    const { result } = renderHook(() => useFires());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    let pending!: Promise<void>;
    act(() => { pending = result.current.reload(); });
    expect(result.current.refreshing).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.fires[0].nationalFireId).toBe("QC-1");
    await act(async () => { request.resolve([fire("QC-2")]); await pending; });
    expect(result.current.refreshing).toBe(false);
    expect(result.current.fires[0].nationalFireId).toBe("QC-2");
  });

  it("does not start overlapping initial requests", async () => {
    const request = deferred<Fire[]>();
    mockedFetch.mockReturnValueOnce(request.promise);
    const { result } = renderHook(() => useFires());
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    await act(async () => { await result.current.reload(); });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    await act(async () => { request.resolve([fire("QC-1")]); });
    expect(result.current.hasLoaded).toBe(true);
  });

  it("does not start overlapping refresh requests", async () => {
    const request = deferred<Fire[]>();
    mockedFetch.mockResolvedValueOnce([fire("QC-1")]).mockReturnValueOnce(request.promise);
    const { result } = renderHook(() => useFires());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    let pending!: Promise<void>;
    act(() => { pending = result.current.reload(); });
    await act(async () => { await result.current.reload(); });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    await act(async () => { request.resolve([fire("QC-2")]); await pending; });
    expect(result.current.fires[0].nationalFireId).toBe("QC-2");
  });

  it("aborts an active initial request on unmount", () => {
    mockedFetch.mockImplementation(() => new Promise<Fire[]>(() => {}));
    const { unmount } = renderHook(() => useFires());
    const signal = mockedFetch.mock.calls[0][0];
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("aborts an active refresh on unmount", async () => {
    const request = deferred<Fire[]>();
    mockedFetch.mockResolvedValueOnce([fire("QC-1")]).mockReturnValueOnce(request.promise);
    const { result, unmount } = renderHook(() => useFires());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    act(() => { void result.current.reload(); });
    const signal = mockedFetch.mock.calls[1][0];
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => { request.resolve([fire("QC-2")]); });
  });

  it("ignores late successful responses after unmount", async () => {
    const request = deferred<Fire[]>();
    mockedFetch.mockReturnValueOnce(request.promise);
    const { unmount } = renderHook(() => useFires());
    unmount();
    await act(async () => { request.resolve([fire("QC-1")]); });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("ignores late rejected responses after unmount", async () => {
    const request = deferred<Fire[]>();
    mockedFetch.mockReturnValueOnce(request.promise);
    const { unmount } = renderHook(() => useFires());
    unmount();
    await act(async () => { request.reject(new Error("late failure")); });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("refreshes after five minutes when the tab is visible", async () => {
    vi.useFakeTimers();
    mockedFetch.mockResolvedValue([fire("QC-1")]);
    const { result } = renderHook(() => useFires());
    await tick();
    expect(result.current.hasLoaded).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it("does not refresh before five minutes", async () => {
    vi.useFakeTimers();
    mockedFetch.mockResolvedValue([fire("QC-1")]);
    renderHook(() => useFires());
    await tick();
    await act(async () => { await vi.advanceTimersByTimeAsync(299_999); });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("does not refresh automatically while the tab is hidden", async () => {
    vi.useFakeTimers();
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    mockedFetch.mockResolvedValue([fire("QC-1")]);
    renderHook(() => useFires());
    await tick();
    await act(async () => { await vi.advanceTimersByTimeAsync(600_000); });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    visibility.mockRestore();
  });

  it("refreshes when returning to a visible tab", async () => {
    mockedFetch.mockResolvedValue([fire("QC-1")]);
    const { result } = renderHook(() => useFires());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); await Promise.resolve(); });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it("ignores visibility events while the tab is hidden", async () => {
    mockedFetch.mockResolvedValue([fire("QC-1")]);
    const { result } = renderHook(() => useFires());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    visibility.mockRestore();
  });

  it("does not refresh after unmount on visibility changes", async () => {
    mockedFetch.mockResolvedValue([fire("QC-1")]);
    const { result, unmount } = renderHook(() => useFires());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    unmount();
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
});
