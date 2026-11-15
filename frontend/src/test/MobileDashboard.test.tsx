import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MobileDashboard from "../app/components/MobileDashboard";
import type { Fire } from "../app/types/fire";

const language = vi.hoisted(() => ({ current: "en", change: vi.fn() }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: language.current, changeLanguage: language.change }
  })
}));
vi.mock("../app/components/FireRefreshStatus", () => ({ default: () => <div>Refresh status</div> }));
vi.mock("../app/components/dashboard/ProvinceFilters", () => ({ default: () => <div>Province filters</div> }));
vi.mock("../app/components/dashboard/TrackedFires", () => ({ default: () => <div>Tracked fires</div> }));

const fire = { nationalFireId: "QC-001", agencyCode: "QC", stageOfControlStatus: "OC", latitude: 48, longitude: -72, fireSize: 10, percentContained: 20 } as Fire;
const controlledFire = { ...fire, nationalFireId: "ON-002", stageOfControlStatus: "UC" } as Fire;
type Props = React.ComponentProps<typeof MobileDashboard>;

function props(overrides: Partial<Props> = {}): Props {
  return {
    fires: [fire], hasLoaded: true, activeFire: null, fireSelectionCount: 0,
    selectedFires: [], selectedProvinces: [], onToggleProvince: vi.fn(), onClearProvinces: vi.fn(),
    onTrackFire: vi.fn(), onRemoveFire: vi.fn(), onCloseFire: vi.fn(),
    trackedOnly: false, onTrackedOnlyChange: vi.fn(), onPanelHeightChange: vi.fn(),
    lastUpdated: null, refreshing: false, refreshError: null, onRefresh: vi.fn(), ...overrides
  };
}

const originalHeight = window.innerHeight;
const originalCapture = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "setPointerCapture");
const originalCancel = globalThis.cancelAnimationFrame;

beforeEach(() => {
  vi.clearAllMocks();
  language.current = "en";
  localStorage.clear();
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", { configurable: true, value: vi.fn() });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Object.defineProperty(window, "innerHeight", { configurable: true, value: originalHeight });
  if (originalCapture) Object.defineProperty(HTMLElement.prototype, "setPointerCapture", originalCapture);
  else Reflect.deleteProperty(HTMLElement.prototype, "setPointerCapture");
  if (originalCancel) globalThis.cancelAnimationFrame = originalCancel;
});

function panel() {
  return screen.getByRole("region");
}

function handle(container: HTMLElement) {
  const element = container.querySelector('[aria-hidden="true"][class*="cursor-grab"]');
  if (!(element instanceof HTMLElement)) throw new Error("Drag handle missing");
  return element;
}

function drag(element: HTMLElement, from: number, to: number, pointerId = 1) {
  fireEvent.pointerDown(element, { pointerId, pointerType: "touch", clientY: from });
  fireEvent.pointerMove(element, { pointerId, pointerType: "touch", clientY: to });
  fireEvent.pointerUp(element, { pointerId, pointerType: "touch", clientY: to });
}

describe("MobileDashboard", () => {
  it("shows overview and reports initial height", () => {
    const p = props();
    render(<MobileDashboard {...p} />);
    expect(screen.getByText("FireWatch")).toBeInTheDocument();
    expect(screen.getByText("Refresh status")).toBeInTheDocument();
    expect(panel().style.height).toBe("225px");
    expect(p.onPanelHeightChange).toHaveBeenCalledWith(225);
  });

  it("shows placeholders before fires load", () => {
    render(<MobileDashboard {...props({ hasLoaded: false })} />);
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("shows total fires and counts only out-of-control fires", () => {
    render(<MobileDashboard {...props({ fires: [fire, controlledFire, { ...fire, nationalFireId: "QC-003" }] })} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows zero counts for an empty loaded inventory", () => {
    render(<MobileDashboard {...props({ fires: [] })} />);
    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it("toggles tracked-only on and off", () => {
    const p = props();
    const { rerender } = render(<MobileDashboard {...p} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(p.onTrackedOnlyChange).toHaveBeenCalledWith(true);
    rerender(<MobileDashboard {...p} trackedOnly />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(p.onTrackedOnlyChange).toHaveBeenCalledWith(false);
  });

  it("shows fire details and can track and close them", () => {
    const p = props({ activeFire: fire, fireSelectionCount: 1 });
    render(<MobileDashboard {...p} />);
    expect(screen.getByText("QC-001")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ Track this fire" }));
    expect(p.onTrackFire).toHaveBeenCalledExactlyOnceWith(fire);
    expect(p.onCloseFire).toHaveBeenCalledTimes(1);
  });

  it("closes details without tracking the fire", () => {
    const p = props({ activeFire: fire });
    render(<MobileDashboard {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Close fire details" }));
    expect(p.onCloseFire).toHaveBeenCalledTimes(1);
    expect(p.onTrackFire).not.toHaveBeenCalled();
  });

  it("disables tracking when the fire is already tracked", () => {
    const p = props({ activeFire: fire, selectedFires: [{ ...fire }] });
    render(<MobileDashboard {...p} />);
    expect(screen.getByRole("button", { name: "Already tracked" })).toBeDisabled();
    expect(p.onTrackFire).not.toHaveBeenCalled();
  });

  it("shows unknown values for missing fire details", () => {
    const incomplete = { ...fire, fireSize: null, percentContained: null } as Fire;
    render(<MobileDashboard {...props({ activeFire: incomplete })} />);
    expect(screen.getAllByText("unknown").length).toBeGreaterThanOrEqual(2);
  });

  it("changes language and persists the preference", () => {
    render(<MobileDashboard {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "FR" }));
    expect(language.change).toHaveBeenCalledWith("fr");
    expect(localStorage.getItem("firewatch-language")).toBe("fr");
  });

  it("renders French fire actions when language is French", () => {
    language.current = "fr";
    render(<MobileDashboard {...props({ activeFire: fire })} />);
    expect(screen.getByRole("button", { name: "+ Suivre ce feu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fermer la fiche" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "FR" })).toHaveAttribute("aria-pressed", "true");
  });

  it("expands and collapses with the mouse wheel", () => {
    render(<MobileDashboard {...props()} />);
    fireEvent.wheel(panel(), { deltaY: 100 });
    expect(panel().style.height).toBe("624px");
    fireEvent.wheel(panel(), { deltaY: -100 });
    expect(panel().style.height).toBe("225px");
  });

  it("ignores wheel movements below the threshold", () => {
    render(<MobileDashboard {...props()} />);
    fireEvent.wheel(panel(), { deltaY: 15 });
    fireEvent.wheel(panel(), { deltaY: -15 });
    expect(panel().style.height).toBe("225px");
  });

  it("does not expand past the maximum position", () => {
    render(<MobileDashboard {...props()} />);
    fireEvent.wheel(panel(), { deltaY: 100 });
    fireEvent.wheel(panel(), { deltaY: 100 });
    expect(panel().style.height).toBe("624px");
  });

  it("does not collapse past the minimum position", () => {
    render(<MobileDashboard {...props()} />);
    fireEvent.wheel(panel(), { deltaY: -100 });
    fireEvent.wheel(panel(), { deltaY: -100 });
    expect(panel().style.height).toBe("48px");
  });

  it("updates panel height on window resize", () => {
    const p = props();
    render(<MobileDashboard {...p} />);
    act(() => {
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 300 });
      fireEvent(window, new Event("resize"));
    });
    expect(p.onPanelHeightChange).toHaveBeenLastCalledWith(180);
  });

  it("caps expanded height at 680 pixels", () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 1200 });
    render(<MobileDashboard {...props()} />);
    fireEvent.wheel(panel(), { deltaY: 100 });
    expect(panel().style.height).toBe("680px");
  });

  it("snaps to minimal when dragged down and reopens by wheel", () => {
    const { container } = render(<MobileDashboard {...props()} />);
    drag(handle(container), 100, 400);
    expect(panel().style.height).toBe("48px");
    expect(screen.queryByText("FireWatch")).not.toBeInTheDocument();
    fireEvent.wheel(panel(), { deltaY: 100 });
    expect(panel().style.height).toBe("225px");
    expect(screen.getByText("FireWatch")).toBeInTheDocument();
  });

  it("snaps to expanded when dragged upward", () => {
    const { container } = render(<MobileDashboard {...props()} />);
    drag(handle(container), 400, 0);
    expect(panel().style.height).toBe("624px");
    expect(screen.getByText("Province filters")).toBeInTheDocument();
  });

  it("clamps downward dragging to minimal height", () => {
    const { container } = render(<MobileDashboard {...props()} />);
    drag(handle(container), 0, 2000);
    expect(panel().style.height).toBe("48px");
  });

  it("clamps upward dragging to expanded height", () => {
    const { container } = render(<MobileDashboard {...props()} />);
    drag(handle(container), 2000, 0);
    expect(panel().style.height).toBe("624px");
  });

  it("ignores non-primary mouse drags and mismatched pointer IDs", () => {
    const { container } = render(<MobileDashboard {...props()} />);
    const h = handle(container);
    fireEvent.pointerDown(h, { pointerId: 2, pointerType: "mouse", button: 2, clientY: 100 });
    fireEvent.pointerMove(h, { pointerId: 2, pointerType: "mouse", clientY: 400 });
    expect(panel().style.height).toBe("225px");
    fireEvent.pointerDown(h, { pointerId: 2, pointerType: "touch", clientY: 100 });
    fireEvent.pointerMove(h, { pointerId: 3, pointerType: "touch", clientY: 400 });
    fireEvent.pointerUp(h, { pointerId: 3, pointerType: "touch", clientY: 400 });
    expect(panel().style.height).toBe("225px");
  });

  it("does not start dragging from interactive controls", () => {
    const { container } = render(<MobileDashboard {...props()} />);
    const h = handle(container);
    const button = document.createElement("button");
    h.appendChild(button);
    fireEvent.pointerDown(button, { pointerId: 1, pointerType: "touch", clientY: 100 });
    fireEvent.pointerMove(h, { pointerId: 1, pointerType: "touch", clientY: 400 });
    fireEvent.pointerUp(h, { pointerId: 1, pointerType: "touch", clientY: 400 });
    expect(panel().style.height).toBe("225px");
  });

  it("reopens overview when the same fire is selected again", () => {
    const p = props({ activeFire: fire, fireSelectionCount: 1 });
    const { rerender } = render(<MobileDashboard {...p} />);
    fireEvent.wheel(panel(), { deltaY: 100 });
    rerender(<MobileDashboard {...p} fireSelectionCount={2} />);
    expect(panel().style.height).toBe("405px");
    expect(screen.getByText("QC-001")).toBeInTheDocument();
  });

  it("keeps previous fire briefly while close animation runs", () => {
    vi.useFakeTimers();
    const p = props({ activeFire: fire });
    const { rerender } = render(<MobileDashboard {...p} />);
    rerender(<MobileDashboard {...p} activeFire={null} />);
    expect(screen.getByText("QC-001")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(249));
    expect(screen.getByText("QC-001")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2));
    expect(screen.queryByText("QC-001")).not.toBeInTheDocument();
  });

  it("cancels closing when a fire is selected again", () => {
    vi.useFakeTimers();
    const p = props({ activeFire: fire });
    const { rerender } = render(<MobileDashboard {...p} />);
    rerender(<MobileDashboard {...p} activeFire={null} />);
    rerender(<MobileDashboard {...p} activeFire={controlledFire} />);
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByText("ON-002")).toBeInTheDocument();
    expect(screen.queryByText("QC-001")).not.toBeInTheDocument();
  });
});
