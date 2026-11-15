
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardHeader from "../app/components/dashboard/DashboardHeader";

const { changeLanguage, language } = vi.hoisted(() => ({
  changeLanguage: vi.fn().mockResolvedValue(undefined),
  language: { current: "en" }
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      get resolvedLanguage() {
        return language.current;
      },
      changeLanguage
    }
  })
}));

vi.mock("../app/components/LastCwfisSync", () => ({
  default: () => <div data-testid="last-sync" />
}));

beforeEach(() => {
  localStorage.clear();
  changeLanguage.mockClear();
  language.current = "en";
});

describe("DashboardHeader", () => {
  it("renders branding and marks English active", () => {
    render(<DashboardHeader />);

    expect(
      screen.getByRole("heading", { name: "FireWatch" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "EN" })
    ).toHaveAttribute("aria-pressed", "true");

    expect(
      screen.getByRole("button", { name: "FR" })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("switches to French and stores preference", () => {
    render(<DashboardHeader />);

    fireEvent.click(
      screen.getByRole("button", { name: "FR" })
    );

    expect(changeLanguage).toHaveBeenCalledExactlyOnceWith("fr");
    expect(localStorage.getItem("firewatch-language")).toBe("fr");
  });

  it("switches to English and stores preference", () => {
    language.current = "fr";

    render(<DashboardHeader />);

    fireEvent.click(
      screen.getByRole("button", { name: "EN" })
    );

    expect(changeLanguage).toHaveBeenCalledExactlyOnceWith("en");
    expect(localStorage.getItem("firewatch-language")).toBe("en");
  });

  it("marks French active when selected", () => {
    language.current = "fr";

    render(<DashboardHeader />);

    expect(
      screen.getByRole("button", { name: "FR" })
    ).toHaveAttribute("aria-pressed", "true");

    expect(
      screen.getByRole("button", { name: "EN" })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("updates language controls and description after rerender", () => {
    const { rerender } = render(<DashboardHeader />);

    expect(
      screen.getByText(/Explore active wildfires across Canada/)
    ).toBeInTheDocument();

    language.current = "fr";
    rerender(<DashboardHeader />);

    expect(
      screen.getByRole("button", { name: "FR" })
    ).toHaveAttribute("aria-pressed", "true");

    expect(
      screen.getByRole("button", { name: "EN" })
    ).toHaveAttribute("aria-pressed", "false");

    expect(
      screen.getByText(/Explorez les feux de forêt actifs au Canada/)
    ).toBeInTheDocument();
  });

  it("renders the synchronization status component", () => {
    render(<DashboardHeader />);

    expect(
      screen.getByTestId("last-sync")
    ).toBeInTheDocument();
  });
});
