import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StatusMessage from "../app/components/StatusMessage";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

describe("StatusMessage", () => {
  it("announces loading as status without retry", () => {
    render(
      <StatusMessage
        messageKey="errors.loading"
        onRetry={vi.fn()}
      />
    );

    const status = screen.getByRole("status");

    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("errors.loading");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("announces failures as alerts", () => {
    render(
      <StatusMessage messageKey="errors.network" />
    );

    const alert = screen.getByRole("alert");

    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveTextContent("errors.network");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("invokes retry once", () => {
    const retry = vi.fn();

    render(
      <StatusMessage
        messageKey="errors.server"
        onRetry={retry}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "errors.retry"
      })
    );

    expect(retry).toHaveBeenCalledOnce();
  });

  it("does not show retry button when callback missing", () => {
    render(
      <StatusMessage messageKey="errors.timeout" />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not invoke retry while loading", () => {
    const retry = vi.fn();

    render(
      <StatusMessage
        messageKey="errors.loading"
        onRetry={retry}
      />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(retry).not.toHaveBeenCalled();
  });

  it("updates from loading to error", () => {
    const retry = vi.fn();

    const { rerender } = render(
      <StatusMessage messageKey="errors.loading" />
    );

    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(
      <StatusMessage
        messageKey="errors.network"
        onRetry={retry}
      />
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    const alert = screen.getByRole("alert");

    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveTextContent("errors.network");

    fireEvent.click(
      screen.getByRole("button", {
        name: "errors.retry"
      })
    );

    expect(retry).toHaveBeenCalledOnce();
  });

  it("removes retry when returning to loading", () => {
    const retry = vi.fn();

    const { rerender } = render(
      <StatusMessage
        messageKey="errors.server"
        onRetry={retry}
      />
    );

    expect(
      screen.getByRole("button", {
        name: "errors.retry"
      })
    ).toBeInTheDocument();

    rerender(
      <StatusMessage
        messageKey="errors.loading"
        onRetry={retry}
      />
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(retry).not.toHaveBeenCalled();
  });
});
