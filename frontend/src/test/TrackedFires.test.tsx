import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrackedFires from "../app/components/dashboard/TrackedFires";
import type { Fire } from "../app/types/fire";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

vi.mock("../app/components/dashboard/FireCard", () => ({
  default: ({
    fire,
    index,
    onRemoveFire
  }: {
    fire: Fire;
    index: number;
    onRemoveFire: (fireId: string) => void;
  }) => (
    <div data-testid="fire-card">
      <span>{index + 1}: {fire.nationalFireId}</span>
      <button
        type="button"
        onClick={() => onRemoveFire(fire.nationalFireId)}
      >
        Remove {fire.nationalFireId}
      </button>
    </div>
  )
}));

const fire = (id: string) => ({
  nationalFireId: id
}) as Fire;

describe("TrackedFires", () => {
  it("shows empty state and zero", () => {
    render(
      <TrackedFires
        selectedFires={[]}
        onRemoveFire={vi.fn()}
      />
    );

    const section = screen.getByRole("region", {
      name: "tracked"
    });

    expect(within(section).getByText("none")).toBeInTheDocument();
    expect(within(section).getByText("noneHelp")).toBeInTheDocument();
    expect(within(section).getByText("0")).toBeInTheDocument();
    expect(screen.queryByTestId("fire-card")).not.toBeInTheDocument();
  });

  it("shows count and numbered cards in input order", () => {
    render(
      <TrackedFires
        selectedFires={[fire("QC-1"), fire("ON-2")]}
        onRemoveFire={vi.fn()}
      />
    );

    expect(screen.getByText("2")).toBeInTheDocument();

    const cards = screen.getAllByTestId("fire-card");

    expect(cards).toHaveLength(2);
    expect(cards.map(card =>
      within(card).getByText(/^\d+: /).textContent
    )).toEqual([
      "1: QC-1",
      "2: ON-2"
    ]);

    expect(screen.queryByText("none")).not.toBeInTheDocument();
  });

  it("forwards removal with the correct fire ID", () => {
    const onRemoveFire = vi.fn();

    render(
      <TrackedFires
        selectedFires={[fire("QC-1"), fire("ON-2")]}
        onRemoveFire={onRemoveFire}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove ON-2"
      })
    );

    expect(onRemoveFire).toHaveBeenCalledExactlyOnceWith("ON-2");
  });

  it("updates when tracked fires are removed", () => {
    const { rerender } = render(
      <TrackedFires
        selectedFires={[fire("QC-1"), fire("ON-2")]}
        onRemoveFire={vi.fn()}
      />
    );

    rerender(
      <TrackedFires
        selectedFires={[fire("ON-2")]}
        onRemoveFire={vi.fn()}
      />
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getAllByTestId("fire-card")).toHaveLength(1);
    expect(screen.getByText("1: ON-2")).toBeInTheDocument();
    expect(screen.queryByText("1: QC-1")).not.toBeInTheDocument();
  });

  it("returns to empty state after all fires are removed", () => {
    const { rerender } = render(
      <TrackedFires
        selectedFires={[fire("QC-1")]}
        onRemoveFire={vi.fn()}
      />
    );

    rerender(
      <TrackedFires
        selectedFires={[]}
        onRemoveFire={vi.fn()}
      />
    );

    expect(screen.getByText("none")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByTestId("fire-card")).not.toBeInTheDocument();
  });

  it("displays newly tracked fires", () => {
    const { rerender } = render(
      <TrackedFires
        selectedFires={[]}
        onRemoveFire={vi.fn()}
      />
    );

    rerender(
      <TrackedFires
        selectedFires={[fire("AB-123")]}
        onRemoveFire={vi.fn()}
      />
    );

    expect(screen.getByText("1: AB-123")).toBeInTheDocument();
    expect(screen.queryByText("none")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("fire-card")).toHaveLength(1);
  });
});
