import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { Fire } from "../app/types/fire";

const mocks = vi.hoisted(() => ({
  useFires: vi.fn(), useFireSelection: vi.fn(),
  mapProps: null as any, desktopProps: null as any, mobileProps: null as any
}));

vi.mock("../app/hooks/useFires", () => ({ useFires: mocks.useFires }));
vi.mock("../app/hooks/useFireSelection", () => ({ useFireSelection: mocks.useFireSelection }));
vi.mock("../app/components/WildfireMap", () => ({
  default: (props: any) => {
    mocks.mapProps = props;
    return <div data-testid="map"><button onClick={() => props.onSelectFire(fire)}>Map marker</button></div>;
  }
}));
vi.mock("../app/components/Dashboard", () => ({
  default: (props: any) => {
    mocks.desktopProps = props;
    return <button onClick={() => props.onTrackedOnlyChange(true)}>Desktop tracked only</button>;
  }
}));
vi.mock("../app/components/MobileDashboard", () => ({
  default: (props: any) => {
    mocks.mobileProps = props;
    return <button onClick={() => props.onPanelHeightChange(405)}>Mobile sheet</button>;
  }
}));
vi.mock("../app/components/StatusMessage", () => ({
  default: ({ messageKey, onRetry }: any) => (
    <div role="alert">{messageKey}<button disabled={!onRetry} onClick={onRetry}>Retry</button></div>
  )
}));

import Home from "../app/Pages/Home";

const fire = { nationalFireId: "QC-001", agencyCode: "QC" } as Fire;
const other = { nationalFireId: "ON-001", agencyCode: "ON" } as Fire;
const selection = {
  selectedProvinces: [] as string[], selectedFires: [] as Fire[],
  toggleProvince: vi.fn(), selectFire: vi.fn(), removeFire: vi.fn(), clearProvinces: vi.fn()
};
const reload = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  mocks.mapProps = null;
  mocks.desktopProps = null;
  mocks.mobileProps = null;
  mocks.useFires.mockReturnValue({
    fires: [fire, other], loading: false, refreshing: false,
    errorKey: null, lastUpdated: null, hasLoaded: true, reload
  });
  mocks.useFireSelection.mockReturnValue({ ...selection });
});

afterEach(() => vi.unstubAllGlobals());

describe("Home", () => {
  it("passes API fires to selection hook and map", async () => {
    render(<Home />);
    await screen.findByText("Map marker");
    expect(mocks.useFireSelection).toHaveBeenCalledWith([fire, other]);
    expect(mocks.mapProps.fires).toEqual([fire, other]);
  });

  it("filters map and dashboard by selected province", async () => {
    mocks.useFireSelection.mockReturnValue({ ...selection, selectedProvinces: ["QC"] });
    render(<Home />);
    await screen.findByTestId("map");
    expect(mocks.mapProps.fires).toEqual([fire]);
    expect(mocks.desktopProps.fires).toEqual([fire]);
  });

  it("filters map to tracked fires only", async () => {
    mocks.useFireSelection.mockReturnValue({ ...selection, selectedFires: [fire] });
    render(<Home />);
    await screen.findByTestId("map");
    fireEvent.click(screen.getByText("Desktop tracked only"));
    expect(mocks.mapProps.fires).toEqual([fire]);
  });

  it("tracks clicked marker on desktop", async () => {
    vi.stubGlobal("innerWidth", 1400);
    render(<Home />);
    await screen.findByTestId("map");
    fireEvent.click(screen.getByText("Map marker"));
    expect(selection.selectFire).toHaveBeenCalledWith(fire);
  });

  it("opens clicked marker on mobile instead of tracking", async () => {
    vi.stubGlobal("innerWidth", 390);
    render(<Home />);
    await screen.findByTestId("map");
    fireEvent.click(screen.getByText("Map marker"));
    expect(mocks.mobileProps.activeFire).toEqual(fire);
    expect(mocks.mobileProps.fireSelectionCount).toBe(1);
    expect(selection.selectFire).not.toHaveBeenCalled();
  });

  it("preserves map data during a background refresh failure", async () => {
    mocks.useFires.mockReturnValue({
      fires: [fire], loading: false, refreshing: false,
      errorKey: "errors.network", lastUpdated: new Date(), hasLoaded: true, reload
    });
    render(<Home />);
    await screen.findByTestId("map");
    expect(mocks.mapProps.fires).toEqual([fire]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.desktopProps.refreshError).toBe("errors.network");
  });

  it("shows a blocking error on initial load failure and retries", async () => {
    mocks.useFires.mockReturnValue({
      fires: [], loading: false, refreshing: false,
      errorKey: "errors.network", lastUpdated: null, hasLoaded: false, reload
    });
    render(<Home />);
    expect(screen.getByRole("alert")).toHaveTextContent("errors.network");
    fireEvent.click(screen.getByText("Retry"));
    expect(reload).toHaveBeenCalled();
    await screen.findByTestId("map");
  });

  it("updates map sheet-height CSS variable", async () => {
    const { container } = render(<Home />);
    await screen.findByTestId("map");
    fireEvent.click(screen.getByText("Mobile sheet"));
    expect(container.querySelector('[style*="--fw-sheet-height"]')).toHaveStyle("--fw-sheet-height: 405px");
  });

  it("displays loading state without a retry button", async () => {
    mocks.useFires.mockReturnValue({
      fires: [], loading: true, refreshing: true,
      errorKey: null, lastUpdated: null, hasLoaded: false, reload
    });
    render(<Home />);
    expect(screen.getByRole("alert")).toHaveTextContent("errors.loading");
    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
    await screen.findByTestId("map");
  });

  it("shows map error and rebuilds the map when retrying", async () => {
    render(<Home />);
    await screen.findByTestId("map");
    expect(mocks.mapProps.retryCount).toBe(0);
    act(() => mocks.mapProps.onMapErrorChange(true));
    expect(screen.getByRole("alert")).toHaveTextContent("errors.map");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.mapProps.retryCount).toBe(1);
  });

  it("forwards mobile tracking and close actions", async () => {
    render(<Home />);
    await screen.findByTestId("map");
    act(() => mocks.mobileProps.onTrackFire(fire));
    expect(selection.selectFire).toHaveBeenCalledWith(fire);
    act(() => mocks.mobileProps.onRemoveFire("QC-001"));
    expect(selection.removeFire).toHaveBeenCalledWith("QC-001");
    act(() => mocks.mapProps.onSelectFire(fire));
    act(() => mocks.mobileProps.onCloseFire());
    expect(mocks.mobileProps.activeFire).toBeNull();
  });

  it("forwards refresh requests from both dashboards", async () => {
    render(<Home />);
    await screen.findByTestId("map");
    act(() => { mocks.desktopProps.onRefresh(); mocks.mobileProps.onRefresh(); });
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
