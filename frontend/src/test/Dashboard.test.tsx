import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Dashboard from "../app/components/Dashboard";
import type { Fire } from "../app/types/fire";

const mocks = vi.hoisted(() => ({ language: "en" }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: mocks.language }
  })
}));

vi.mock("../app/components/dashboard/DashboardHeader", () => ({
  default: () => <div>header-stub</div>
}));

vi.mock("../app/components/dashboard/FireStatistics", () => ({
  default: ({ fires, hasLoaded }: { fires: Fire[]; hasLoaded: boolean }) => (
    <div>stats:{fires.length}:{String(hasLoaded)}</div>
  )
}));

vi.mock("../app/components/dashboard/ProvinceFilters", () => ({
  default: ({
    selectedProvinces,
    onToggleProvince,
    onClearProvinces
  }: {
    selectedProvinces: string[];
    onToggleProvince: (code: string) => void;
    onClearProvinces: () => void;
  }) => (
    <div>
      <span>provinces:{selectedProvinces.join(",")}</span>
      <button onClick={() => onToggleProvince("QC")}>choose QC</button>
      <button onClick={onClearProvinces}>clear provinces</button>
    </div>
  )
}));

vi.mock("../app/components/dashboard/TrackedFires", () => ({
  default: ({
    selectedFires,
    onRemoveFire
  }: {
    selectedFires: Fire[];
    onRemoveFire: (id: string) => void;
  }) => (
    <button onClick={() => onRemoveFire("QC-1")}>
      tracked:{selectedFires.length}
    </button>
  )
}));

vi.mock("../app/components/FireRefreshStatus", () => ({
  default: ({
    lastUpdated,
    refreshing,
    errorKey,
    onRetry
  }: {
    lastUpdated: Date | null;
    refreshing: boolean;
    errorKey: string | null;
    onRetry: () => void;
  }) => (
    <div>
      <span>refreshing:{String(refreshing)}</span>
      <span>error:{errorKey ?? "none"}</span>
      <span>updated:{lastUpdated?.toISOString() ?? "none"}</span>
      <button onClick={onRetry}>refresh-stub</button>
    </div>
  )
}));

const fire = { nationalFireId: "QC-1" } as Fire;

function props() {
  return {
    fires: [fire],
    hasLoaded: true,
    trackedOnly: false,
    onTrackedOnlyChange: vi.fn(),
    selectedProvinces: [] as string[],
    selectedFires: [fire],
    onToggleProvince: vi.fn(),
    onClearProvinces: vi.fn(),
    onRemoveFire: vi.fn(),
    lastUpdated: null as Date | null,
    refreshing: false,
    refreshError: null as string | null,
    onRefresh: vi.fn()
  };
}

afterEach(() => {
  mocks.language = "en";
  vi.restoreAllMocks();
});

describe("Dashboard", () => {
  it("passes fires and tracked selection to child components", () => {
    render(<Dashboard {...props()} />);
    expect(screen.getByText("stats:1:true")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tracked:1" })).toBeInTheDocument();
  });

  it("shows the tracked-only filter in English", () => {
    render(<Dashboard {...props()} />);
    expect(
      screen.getByRole("checkbox", { name: "Show tracked fires only" })
    ).not.toBeChecked();
  });

  it("shows the tracked-only filter in French", () => {
    mocks.language = "fr";
    render(<Dashboard {...props()} />);
    expect(
      screen.getByRole("checkbox", {
        name: "Afficher uniquement les feux suivis"
      })
    ).not.toBeChecked();
  });

  it("uses English fallback for other languages", () => {
    mocks.language = "es";
    render(<Dashboard {...props()} />);
    expect(
      screen.getByRole("checkbox", { name: "Show tracked fires only" })
    ).toBeInTheDocument();
  });

  it("notifies when tracked-only is enabled", () => {
    const p = props();
    render(<Dashboard {...p} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(p.onTrackedOnlyChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("notifies when tracked-only is disabled", () => {
    const p = { ...props(), trackedOnly: true };
    render(<Dashboard {...p} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(p.onTrackedOnlyChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("reflects changes to the tracked-only prop", () => {
    const p = props();
    const { rerender } = render(<Dashboard {...p} />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    rerender(<Dashboard {...p} trackedOnly={true} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("forwards province selection and clearing", () => {
    const p = props();
    render(<Dashboard {...p} selectedProvinces={["ON"]} />);
    expect(screen.getByText("provinces:ON")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "choose QC" }));
    fireEvent.click(screen.getByRole("button", { name: "clear provinces" }));
    expect(p.onToggleProvince).toHaveBeenCalledExactlyOnceWith("QC");
    expect(p.onClearProvinces).toHaveBeenCalledOnce();
  });

  it("forwards tracked fire removal", () => {
    const p = props();
    render(<Dashboard {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "tracked:1" }));
    expect(p.onRemoveFire).toHaveBeenCalledExactlyOnceWith("QC-1");
  });

  it("forwards manual refresh", () => {
    const p = props();
    render(<Dashboard {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "refresh-stub" }));
    expect(p.onRefresh).toHaveBeenCalledOnce();
  });

  it("forwards initial loading state and empty inventory", () => {
    render(
      <Dashboard
        {...props()}
        fires={[]}
        selectedFires={[]}
        hasLoaded={false}
      />
    );
    expect(screen.getByText("stats:0:false")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tracked:0" })).toBeInTheDocument();
  });

  it("forwards refresh status, error and last update", () => {
    const date = new Date("2026-11-13T12:00:00Z");
    render(
      <Dashboard
        {...props()}
        refreshing={true}
        refreshError="errors.network"
        lastUpdated={date}
      />
    );
    expect(screen.getByText("refreshing:true")).toBeInTheDocument();
    expect(screen.getByText("error:errors.network")).toBeInTheDocument();
    expect(screen.getByText("updated:2026-11-13T12:00:00.000Z")).toBeInTheDocument();
  });

  it("renders the translated footer", () => {
    render(<Dashboard {...props()} />);
    expect(screen.getByText("footer")).toBeInTheDocument();
  });
});
