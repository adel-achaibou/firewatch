import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FireCard from "../app/components/dashboard/FireCard";
import type { Fire } from "../app/types/fire";

const mocks = vi.hoisted(() => ({ language: "en" }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: mocks.language }
  })
}));

const fire = {
  nationalFireId: "QC-123",
  agencyCode: "QC",
  latitude: 46.12345,
  longitude: -73.45678,
  stageOfControlStatus: "OC",
  fireSize: 25,
  nationalFireCause: "H",
  percentContained: 50,
  statusDate: "2026-10-01T12:00:00Z"
} as Fire;

const unknownFire = {
  ...fire,
  nationalFireId: "UNK-1",
  agencyCode: "XX",
  stageOfControlStatus: "UNKNOWN",
  fireSize: null,
  nationalFireCause: null,
  percentContained: null,
  statusDate: null
} as Fire;

function setup(data: Fire = fire, index = 0) {
  const onRemoveFire = vi.fn();
  const view = render(
    <FireCard fire={data} index={index} onRemoveFire={onRemoveFire} />
  );
  return { ...view, onRemoveFire };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  mocks.language = "en";
});

describe("FireCard", () => {
  it("renders fire identity, index and coordinates", () => {
    setup(fire, 2);
    expect(screen.getByRole("heading", { name: "QC-123" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("46.123°")).toBeInTheDocument();
    expect(screen.getByText("-73.457°")).toBeInTheDocument();
  });

  it("renders known province and status in English", () => {
    setup();
    expect(screen.getByText("provinces.QC")).toBeInTheDocument();
    expect(screen.getByText("Out of Control")).toBeInTheDocument();
  });

  it("renders known fire cause in English", () => {
    setup();
    expect(screen.getByText("Human")).toBeInTheDocument();
  });

  it("renders containment when available", () => {
    setup();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("contained")).toBeInTheDocument();
  });

  it("renders zero percent containment", () => {
    setup({ ...fire, percentContained: 0 });
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders full containment", () => {
    setup({ ...fire, percentContained: 100 });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("hides containment when null", () => {
    setup({ ...fire, percentContained: null });
    expect(screen.queryByText("contained")).not.toBeInTheDocument();
  });

  it("renders unknown province", () => {
    setup(unknownFire);
    expect(screen.getByText("provinces.XX")).toBeInTheDocument();
  });

  it("renders unknown status", () => {
    setup(unknownFire);
    expect(screen.getByText("unknownStatus")).toBeInTheDocument();
  });

  it("renders unknown cause and size", () => {
    setup(unknownFire);
    expect(screen.getAllByText("unknown").length).toBeGreaterThanOrEqual(2);
  });

  it("renders unknown date without crashing", () => {
    setup(unknownFire);
    expect(screen.getByText("statusDate")).toBeInTheDocument();
    expect(screen.getAllByText("unknown").length).toBeGreaterThanOrEqual(2);
  });

  it("uses French translations for known status", () => {
    mocks.language = "fr";
    setup();
    expect(screen.getByText("status.OC")).toBeInTheDocument();
  });

  it("uses French translations for known cause", () => {
    mocks.language = "fr";
    setup();
    expect(screen.getByText("causes.H")).toBeInTheDocument();
  });

  it("uses French translations for province", () => {
    mocks.language = "fr";
    setup();
    expect(screen.getByText("provinces.QC")).toBeInTheDocument();
  });

  it("handles unknown status and cause in French", () => {
    mocks.language = "fr";
    setup(unknownFire);
    expect(screen.getByText("status.UNKNOWN")).toBeInTheDocument();
    expect(screen.getByText("causes.null")).toBeInTheDocument();
  });

  it("uses English fallback when language is neither fr nor en", () => {
    mocks.language = "es";
    setup();
    expect(screen.getByText("Out of Control")).toBeInTheDocument();
    expect(screen.getByText("Human")).toBeInTheDocument();
  });

  it("provides an accessible removal button", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "remove QC-123" })
    ).toHaveAttribute("title", "removeTitle");
  });

  it("delays removal by 240 milliseconds", () => {
    vi.useFakeTimers();
    const { onRemoveFire } = setup();
    fireEvent.click(screen.getByRole("button", { name: "remove QC-123" }));
    act(() => vi.advanceTimersByTime(239));
    expect(onRemoveFire).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onRemoveFire).toHaveBeenCalledExactlyOnceWith("QC-123");
  });

  it("ignores repeated removal clicks", () => {
    vi.useFakeTimers();
    const { onRemoveFire } = setup();
    const button = screen.getByRole("button", { name: "remove QC-123" });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    act(() => vi.advanceTimersByTime(240));
    expect(onRemoveFire).toHaveBeenCalledExactlyOnceWith("QC-123");
  });

  it("applies the removal animation immediately", () => {
    vi.useFakeTimers();
    setup();
    const article = screen.getByRole("article");
    expect(article.className).toContain("opacity-100");
    fireEvent.click(screen.getByRole("button", { name: "remove QC-123" }));
    expect(article.className).toContain("opacity-0");
  });

  it("uses the correct ID when removing another fire", () => {
    vi.useFakeTimers();
    const { onRemoveFire } = setup({ ...fire, nationalFireId: "ON-999" });
    fireEvent.click(screen.getByRole("button", { name: "remove ON-999" }));
    act(() => vi.advanceTimersByTime(240));
    expect(onRemoveFire).toHaveBeenCalledExactlyOnceWith("ON-999");
  });
});
