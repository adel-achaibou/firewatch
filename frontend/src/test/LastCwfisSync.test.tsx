import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LastCwfisSync from "../app/components/LastCwfisSync";
import { fetchSyncOverview } from "../app/services/syncService";

const lang = vi.hoisted(() => ({ value: "en" }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { resolvedLanguage: lang.value } }) }));
vi.mock("../app/services/syncService", () => ({ fetchSyncOverview: vi.fn() }));

const fetchOverview = vi.mocked(fetchSyncOverview);
const NOW = Date.parse("2026-11-06T12:00:00Z");
type Overview = Awaited<ReturnType<typeof fetchSyncOverview>>;

function overview(lastSuccessfulAt: string | null): Overview {
  return { latestStatus: "SUCCESS", latestStartedAt: null, lastSuccessfulAt } as Overview;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  lang.value = "en";
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("LastCwfisSync freshness", () => {
  it("shows nothing while the initial request is pending", () => {
    fetchOverview.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<LastCwfisSync />);
    expect(container).toBeEmptyDOMElement();
  });

  it("reports unknown freshness after a network failure", async () => {
    fetchOverview.mockRejectedValueOnce(new Error("offline"));
    render(<LastCwfisSync />);
    expect(await screen.findByRole("status")).toHaveTextContent("Data freshness unknown");
  });

  it("reports unknown freshness when no successful sync exists", async () => {
    fetchOverview.mockResolvedValueOnce(overview(null));
    render(<LastCwfisSync />);
    expect(await screen.findByRole("status")).toHaveTextContent("Data freshness unknown");
  });

  it("reports an invalid timestamp as unknown", async () => {
    fetchOverview.mockResolvedValueOnce(overview("not-a-date"));
    render(<LastCwfisSync />);
    expect(await screen.findByRole("status")).toHaveTextContent("Data freshness unknown");
  });

  it.each([
    ["2026-11-06T12:00:00Z", "Just updated"],
    ["2026-11-06T11:45:00Z", "Updated 15 min ago"],
    ["2026-11-06T10:00:00Z", "Data may be outdated · Updated 2 h ago"],
    ["2026-11-05T12:00:00Z", "Updated on"],
  ])("formats freshness for %s", async (timestamp, expected) => {
    fetchOverview.mockResolvedValueOnce(overview(timestamp));
    render(<LastCwfisSync />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(expected));
  });

  it("uses French labels", async () => {
    lang.value = "fr";
    fetchOverview.mockResolvedValueOnce(overview("2026-11-06T11:45:00Z"));
    render(<LastCwfisSync />);
    expect(await screen.findByRole("status")).toHaveTextContent("Mis à jour il y a 15 min");
  });

  it("uses French stale-data warning", async () => {
    lang.value = "fr";
    fetchOverview.mockResolvedValueOnce(overview("2026-11-06T10:00:00Z"));
    render(<LastCwfisSync />);
    expect(await screen.findByRole("status")).toHaveTextContent("Données potentiellement obsolètes");
  });

  it("clamps future timestamps to zero age", async () => {
    fetchOverview.mockResolvedValueOnce(overview("2026-11-06T12:10:00Z"));
    render(<LastCwfisSync />);
    expect(await screen.findByRole("status")).toHaveTextContent("Just updated");
  });

  it("keeps the last successful sync after a refresh failure", async () => {
    fetchOverview.mockResolvedValueOnce(overview("2026-11-06T11:45:00Z")).mockRejectedValueOnce(new Error("Network unavailable"));
    render(<LastCwfisSync />);
    expect(await screen.findByRole("status")).toHaveTextContent("Updated 15 min ago");
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(fetchOverview).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent("Updated 15 min ago");
  });

  it("refreshes when the document becomes visible", async () => {
    fetchOverview.mockResolvedValueOnce(overview("2026-11-06T11:45:00Z")).mockResolvedValueOnce(overview("2026-11-06T11:59:00Z"));
    render(<LastCwfisSync />);
    expect(await screen.findByRole("status")).toHaveTextContent("Updated 15 min ago");
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(fetchOverview).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent("Updated 1 min ago");
  });

  it("does not refresh when the document is hidden", async () => {
    fetchOverview.mockResolvedValueOnce(overview("2026-11-06T11:45:00Z"));
    render(<LastCwfisSync />);
    await screen.findByRole("status");
    const spy = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(fetchOverview).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("updates freshness automatically after one minute", async () => {
    vi.useFakeTimers();
    fetchOverview.mockResolvedValue(overview("2026-11-06T11:45:00Z"));
    render(<LastCwfisSync />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole("status")).toHaveTextContent("Updated 15 min ago");
    vi.spyOn(Date, "now").mockReturnValue(NOW + 60_000);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.getByRole("status")).toHaveTextContent("Updated 16 min ago");
  });

  it("prevents overlapping synchronization requests", async () => {
    const request = deferred<Overview>();
    fetchOverview.mockReturnValueOnce(request.promise).mockResolvedValueOnce(overview("2026-11-06T11:59:00Z"));
    render(<LastCwfisSync />);
    expect(fetchOverview).toHaveBeenCalledTimes(1);
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(fetchOverview).toHaveBeenCalledTimes(1);
    await act(async () => { request.resolve(overview("2026-11-06T11:45:00Z")); });
    expect(screen.getByRole("status")).toHaveTextContent("Updated 15 min ago");
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(fetchOverview).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent("Updated 1 min ago");
  });

  it("aborts the request when the component unmounts", () => {
    fetchOverview.mockImplementation(() => new Promise(() => {}));
    const { unmount } = render(<LastCwfisSync />);
    const signal = fetchOverview.mock.calls[0]?.[0];
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("ignores a late successful response after unmount", async () => {
    const request = deferred<Overview>();
    fetchOverview.mockReturnValueOnce(request.promise);
    const { unmount } = render(<LastCwfisSync />);
    const signal = fetchOverview.mock.calls[0]?.[0];
    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => { request.resolve(overview("2026-11-06T11:45:00Z")); });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("ignores a late rejected response after unmount", async () => {
    const request = deferred<Overview>();
    fetchOverview.mockReturnValueOnce(request.promise);
    const { unmount } = render(<LastCwfisSync />);
    unmount();
    await act(async () => { request.reject(new Error("Late network failure")); });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("removes visibility listeners after unmount", async () => {
    fetchOverview.mockResolvedValue(overview("2026-11-06T11:45:00Z"));
    const { unmount } = render(<LastCwfisSync />);
    await screen.findByRole("status");
    unmount();
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(fetchOverview).toHaveBeenCalledTimes(1);
  });
});
