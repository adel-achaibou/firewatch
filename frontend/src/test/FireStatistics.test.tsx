import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FireStatistics from "../app/components/dashboard/FireStatistics";
import type { Fire } from "../app/types/fire";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

const fire = (status: string) => ({
  nationalFireId: status,
  stageOfControlStatus: status
}) as Fire;

describe("FireStatistics", () => {
  it("displays zero counts for no fires", () => {
    render(<FireStatistics fires={[]} hasLoaded={true} />);

    const section = screen.getByRole("region", {
      name: "overview"
    });

    expect(
      within(section).getByText("reported").nextElementSibling
    ).toHaveTextContent(/^0$/);

    expect(
      within(section).getByText("outOfControl").nextElementSibling
    ).toHaveTextContent(/^0$/);
  });

  it("counts only OC as out of control", () => {
    render(
      <FireStatistics
        fires={[
          fire("OC"),
          fire("BH"),
          fire("OC"),
          fire("UC")
        ]}
        hasLoaded={true}
      />
    );

    expect(
      screen.getByText("reported").nextElementSibling
    ).toHaveTextContent(/^4$/);

    expect(
      screen.getByText("outOfControl").nextElementSibling
    ).toHaveTextContent(/^2$/);
  });

  it("uses the filtered fires passed in props", () => {
    const { rerender } = render(
      <FireStatistics
        fires={[fire("OC"), fire("BH")]}
        hasLoaded={true}
      />
    );

    rerender(
      <FireStatistics
        fires={[fire("BH")]}
        hasLoaded={true}
      />
    );

    expect(
      screen.getByText("reported").nextElementSibling
    ).toHaveTextContent(/^1$/);

    expect(
      screen.getByText("outOfControl").nextElementSibling
    ).toHaveTextContent(/^0$/);
  });

  it("does not display zero counts before data has loaded", () => {
    render(
      <FireStatistics
        fires={[]}
        hasLoaded={false}
      />
    );

    const section = screen.getByRole("region", {
      name: "overview"
    });

    expect(
      within(section).getByText("reported").nextElementSibling
    ).toHaveTextContent(/^—$/);

    expect(
      within(section).getByText("outOfControl").nextElementSibling
    ).toHaveTextContent(/^—$/);
  });
});
