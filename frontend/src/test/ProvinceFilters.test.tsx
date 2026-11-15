import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProvinceFilters from "../app/components/dashboard/ProvinceFilters";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: { name?: string; defaultValue?: string }
    ) =>
      options?.name
        ? `${key} ${options.name}`
        : options?.defaultValue ?? key
  })
}));

const renderFilters = (
  selectedProvinces: string[] = [],
  onToggleProvince = vi.fn(),
  onClearProvinces = vi.fn()
) =>
  render(
    <ProvinceFilters
      selectedProvinces={selectedProvinces}
      onToggleProvince={onToggleProvince}
      onClearProvinces={onClearProvinces}
    />
  );

describe("ProvinceFilters", () => {
  it("starts with All Canada selected and no Clear button", () => {
    renderFilters();

    expect(
      screen.getByRole("button", { name: "allCanada" })
    ).toHaveAttribute("aria-pressed", "true");

    expect(
      screen.queryByRole("button", { name: "clear" })
    ).not.toBeInTheDocument();
  });

  it("toggles QC when clicked", () => {
    const toggle = vi.fn();

    renderFilters([], toggle);

    fireEvent.click(
      screen.getByRole("button", {
        name: /filterRegion.*Quebec/i
      })
    );

    expect(toggle).toHaveBeenCalledExactlyOnceWith("QC");
  });

  it("marks multiple provinces selected", () => {
    renderFilters(["QC", "ON"]);

    expect(
      screen.getByRole("button", {
        name: /filterRegion.*Quebec/i
      })
    ).toHaveAttribute("aria-pressed", "true");

    expect(
      screen.getByRole("button", {
        name: /filterRegion.*Ontario/i
      })
    ).toHaveAttribute("aria-pressed", "true");

    expect(
      screen.getByRole("button", { name: "allCanada" })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("clears filters using either button", () => {
    const clear = vi.fn();

    renderFilters(["QC"], vi.fn(), clear);

    fireEvent.click(
      screen.getByRole("button", { name: "clear" })
    );

    fireEvent.click(
      screen.getByRole("button", { name: "allCanada" })
    );

    expect(clear).toHaveBeenCalledTimes(2);
  });

  it("does not mark unselected provinces as selected", () => {
    renderFilters(["QC"]);

    expect(
      screen.getByRole("button", {
        name: /filterRegion.*Quebec/i
      })
    ).toHaveAttribute("aria-pressed", "true");

    expect(
      screen.getByRole("button", {
        name: /filterRegion.*Ontario/i
      })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("updates selection when props change", () => {
    const toggle = vi.fn();
    const clear = vi.fn();

    const { rerender } = renderFilters([], toggle, clear);

    rerender(
      <ProvinceFilters
        selectedProvinces={["QC"]}
        onToggleProvince={toggle}
        onClearProvinces={clear}
      />
    );

    expect(
      screen.getByRole("button", {
        name: /filterRegion.*Quebec/i
      })
    ).toHaveAttribute("aria-pressed", "true");

    expect(
      screen.getByRole("button", { name: "allCanada" })
    ).toHaveAttribute("aria-pressed", "false");

    expect(
      screen.getByRole("button", { name: "clear" })
    ).toBeInTheDocument();

    rerender(
      <ProvinceFilters
        selectedProvinces={[]}
        onToggleProvince={toggle}
        onClearProvinces={clear}
      />
    );

    expect(
      screen.getByRole("button", { name: "allCanada" })
    ).toHaveAttribute("aria-pressed", "true");

    expect(
      screen.queryByRole("button", { name: "clear" })
    ).not.toBeInTheDocument();
  });

  it("does not toggle a province when clearing filters", () => {
    const toggle = vi.fn();
    const clear = vi.fn();

    renderFilters(["QC", "ON"], toggle, clear);

    fireEvent.click(
      screen.getByRole("button", { name: "clear" })
    );

    expect(clear).toHaveBeenCalledOnce();
    expect(toggle).not.toHaveBeenCalled();
  });
});
