import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Fire } from "../app/types/fire";

const mocks = vi.hoisted(() => ({
  maps: [] as any[],
  markers: [] as any[],
  setWorkerUrl: vi.fn(),
  markerFactory: vi.fn(() => document.createElement("button")),
  throwOnConstruction: false
}));

vi.mock("maplibre-gl/dist/maplibre-gl-worker.mjs?url", () => ({ default: "mock-worker" }));
vi.mock("../app/components/map/createFireMarker", () => ({ createFireMarker: mocks.markerFactory }));

vi.mock("maplibre-gl", () => ({
  setWorkerUrl: mocks.setWorkerUrl,
  NavigationControl: class {},
  Map: class {
    handlers: Record<string, (...args: any[]) => void> = {};
    options: any;
    container: HTMLElement;
    fitBounds = vi.fn();
    panBy = vi.fn();
    addControl = vi.fn();
    remove = vi.fn();
    off = vi.fn();
    isStyleLoaded = vi.fn(() => false);
    project = vi.fn(() => ({ x: 100, y: 700 }));

    constructor(options: any) {
      if (mocks.throwOnConstruction) throw new Error("Map initialization failed");
      this.options = options;
      this.container = options.container;
      mocks.maps.push(this);
    }

    getContainer() { return this.container; }
    on(name: string, cb: (...args: any[]) => void) { this.handlers[name] = cb; }
    emit(name: string, event?: any) { this.handlers[name]?.(event); }
  },
  Marker: class {
    options: any;
    setLngLat = vi.fn(() => this);
    addTo = vi.fn(() => this);
    remove = vi.fn();

    constructor(options: any) {
      this.options = options;
      mocks.markers.push(this);
    }
  }
}));

import WildfireMap from "../app/components/WildfireMap";

const fire = { nationalFireId: "QC-001", latitude: 48, longitude: -72 } as Fire;
const other = { nationalFireId: "ON-002", latitude: 45, longitude: -80 } as Fire;
type Props = React.ComponentProps<typeof WildfireMap>;

function props(overrides: Partial<Props> = {}): Props {
  return { fires: [fire], selectedFires: [], onSelectFire: vi.fn(), onMapErrorChange: vi.fn(), mobilePanelHeight: 225, ...overrides };
}

const originalWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
const originalHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");

function dimensions(width: number, height = 800) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => height });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.maps.length = 0;
  mocks.markers.length = 0;
  mocks.throwOnConstruction = false;
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalWidth) Object.defineProperty(HTMLElement.prototype, "clientWidth", originalWidth);
  else Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
  if (originalHeight) Object.defineProperty(HTMLElement.prototype, "clientHeight", originalHeight);
  else Reflect.deleteProperty(HTMLElement.prototype, "clientHeight");
});

describe("WildfireMap", () => {
  it("creates a map with expected style and geographic bounds", () => {
    render(<WildfireMap {...props()} />);
    expect(mocks.maps).toHaveLength(1);
    expect(mocks.maps[0].options.style).toContain("openfreemap");
    expect(mocks.maps[0].options.maxBounds).toEqual([[-170, 15], [-40, 85]]);
    expect(mocks.maps[0].options.center).toEqual([-106, 55]);
    expect(mocks.maps[0].options.zoom).toBe(3);
  });

  it("creates markers after load and handles clicks", () => {
    const p = props();
    render(<WildfireMap {...p} />);
    expect(mocks.markers).toHaveLength(0);
    act(() => mocks.maps[0].emit("load"));
    expect(mocks.markers).toHaveLength(1);
    expect(mocks.markers[0].setLngLat).toHaveBeenCalledWith([-72, 48]);
    fireEvent.click(mocks.markers[0].options.element);
    expect(p.onSelectFire).toHaveBeenCalledExactlyOnceWith(fire);
    expect(p.onMapErrorChange).toHaveBeenCalledWith(false);
  });

  it("does not recreate map when panel height changes", () => {
    const p = props();
    const { rerender } = render(<WildfireMap {...p} />);
    act(() => mocks.maps[0].emit("load"));
    rerender(<WildfireMap {...p} mobilePanelHeight={405} />);
    expect(mocks.maps).toHaveLength(1);
  });

  it("reports style loading errors", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const p = props();
    render(<WildfireMap {...p} />);
    act(() => mocks.maps[0].emit("error", { error: { message: "bad style" } }));
    expect(p.onMapErrorChange).toHaveBeenCalledWith(true);
  });

  it("ignores errors after the style has loaded", () => {
    const p = props();
    render(<WildfireMap {...p} />);
    const map = mocks.maps[0];
    map.isStyleLoaded.mockReturnValue(true);
    act(() => map.emit("error", { error: { message: "tile failed" } }));
    expect(p.onMapErrorChange).not.toHaveBeenCalledWith(true);
  });

  it("reports map constructor failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.throwOnConstruction = true;
    const p = props();
    render(<WildfireMap {...p} />);
    await act(async () => { await Promise.resolve(); });
    expect(mocks.maps).toHaveLength(0);
    expect(p.onMapErrorChange).toHaveBeenCalledWith(true);
  });

  it("removes map and markers on unmount", () => {
    const { unmount } = render(<WildfireMap {...props()} />);
    act(() => mocks.maps[0].emit("load"));
    const marker = mocks.markers[0];
    const map = mocks.maps[0];
    unmount();
    expect(marker.remove).toHaveBeenCalled();
    expect(map.off).toHaveBeenCalledWith("load", expect.any(Function));
    expect(map.off).toHaveBeenCalledWith("error", expect.any(Function));
    expect(map.remove).toHaveBeenCalled();
  });

  it("ignores late load and error events after unmount", () => {
    const p = props();
    const { unmount } = render(<WildfireMap {...p} />);
    const map = mocks.maps[0];
    unmount();
    act(() => {
      map.emit("load");
      map.emit("error", { error: { message: "late error" } });
    });
    expect(mocks.markers).toHaveLength(0);
    expect(p.onMapErrorChange).not.toHaveBeenCalled();
  });

  it("recreates the map when retryCount changes", () => {
    const p = props();
    const { rerender } = render(<WildfireMap {...p} />);
    rerender(<WildfireMap {...p} retryCount={1} />);
    expect(mocks.maps).toHaveLength(2);
    expect(mocks.maps[0].remove).toHaveBeenCalled();
  });

  it("fits Canada above the mobile panel", () => {
    dimensions(400);
    render(<WildfireMap {...props()} />);
    const map = mocks.maps[0];
    act(() => map.emit("load"));
    expect(map.fitBounds).toHaveBeenCalledWith([[-141, 42], [-52, 75]], expect.objectContaining({ duration: 0 }));
    expect(map.addControl).not.toHaveBeenCalled();
    expect(map.options.attributionControl).toEqual({ compact: true });
  });

  it("adds navigation controls on desktop without mobile fit", () => {
    dimensions(1200);
    render(<WildfireMap {...props()} />);
    const map = mocks.maps[0];
    act(() => map.emit("load"));
    expect(map.addControl).toHaveBeenCalledTimes(1);
    expect(map.fitBounds).not.toHaveBeenCalled();
    expect(map.options.attributionControl).toEqual({ compact: false });
  });

  it("pans to reveal active fire behind mobile panel", () => {
    dimensions(400);
    render(<WildfireMap {...props({ activeFire: fire })} />);
    const map = mocks.maps[0];
    act(() => map.emit("load"));
    expect(map.panBy).toHaveBeenCalledWith([0, -173], { duration: 350 });
    expect(mocks.markers[0].options.element.style.outline).toBe("3px solid white");
  });

  it("does not pan when active fire is already visible", () => {
    dimensions(400);
    render(<WildfireMap {...props({ activeFire: fire })} />);
    const map = mocks.maps[0];
    map.project.mockReturnValue({ x: 100, y: 100 });
    act(() => map.emit("load"));
    expect(map.panBy).not.toHaveBeenCalled();
  });

  it("does not pan on desktop", () => {
    dimensions(1200);
    render(<WildfireMap {...props({ activeFire: fire })} />);
    const map = mocks.maps[0];
    act(() => map.emit("load"));
    expect(map.panBy).not.toHaveBeenCalled();
  });

  it("does not pan without an active fire", () => {
    dimensions(400);
    render(<WildfireMap {...props()} />);
    const map = mocks.maps[0];
    act(() => map.emit("load"));
    expect(map.panBy).not.toHaveBeenCalled();
  });

  it("replaces markers when fires or selection changes", () => {
    const p = props();
    const { rerender } = render(<WildfireMap {...p} />);
    act(() => mocks.maps[0].emit("load"));
    const previous = mocks.markers[0];
    const latest = vi.fn();
    rerender(<WildfireMap {...p} fires={[other]} selectedFires={[other]} onSelectFire={latest} />);
    expect(previous.remove).toHaveBeenCalled();
    expect(mocks.markerFactory).toHaveBeenLastCalledWith(true, 1, expect.any(Boolean), "ON-002");
    fireEvent.click(mocks.markers.at(-1).options.element);
    expect(latest).toHaveBeenCalledExactlyOnceWith(other);
    expect(mocks.maps).toHaveLength(1);
  });

  it("uses latest callback without recreating markers", () => {
    const p = props();
    const { rerender } = render(<WildfireMap {...p} />);
    act(() => mocks.maps[0].emit("load"));
    const latest = vi.fn();
    rerender(<WildfireMap {...p} onSelectFire={latest} />);
    expect(mocks.markers).toHaveLength(1);
    fireEvent.click(mocks.markers[0].options.element);
    expect(latest).toHaveBeenCalledExactlyOnceWith(fire);
  });

  it("removes all markers when inventory becomes empty", () => {
    const p = props({ fires: [fire, other] });
    const { rerender } = render(<WildfireMap {...p} />);
    act(() => mocks.maps[0].emit("load"));
    expect(mocks.markers).toHaveLength(2);
    rerender(<WildfireMap {...p} fires={[]} />);
    expect(mocks.markers[0].remove).toHaveBeenCalled();
    expect(mocks.markers[1].remove).toHaveBeenCalled();
    expect(mocks.markers).toHaveLength(2);
  });
});
