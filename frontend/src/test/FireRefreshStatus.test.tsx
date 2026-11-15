import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FireRefreshStatus from "../app/components/FireRefreshStatus";

const lang = vi.hoisted(() => ({ value: "en" }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { resolvedLanguage: lang.value },
  }),
}));

beforeEach(() => {
  lang.value = "en";
});

describe("FireRefreshStatus", () => {
  const defaultProps = {
    lastUpdated: null,
    refreshing: false,
    errorKey: null,
    onRetry: vi.fn(),
  };

  it("renders nothing when idle without error", () => {
    const { container } = render(
      <FireRefreshStatus {...defaultProps} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows refreshing status", () => {
    render(
      <FireRefreshStatus
        {...defaultProps}
        refreshing={true}
      />
    );

    const status = screen.getByRole("status");

    expect(status).toHaveTextContent("Refreshing…");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows refreshing and failure independently", () => {
    render(
      <FireRefreshStatus
        {...defaultProps}
        refreshing={true}
        errorKey="errors.network"
      />
    );

    expect(screen.getByText("Refreshing…")).toBeInTheDocument();
    expect(screen.getByText(/Refresh failed/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry" })
    ).toBeInTheDocument();
  });

  it("retries exactly once after an error", () => {
    const retry = vi.fn();

    render(
      <FireRefreshStatus
        {...defaultProps}
        errorKey="errors.network"
        onRetry={retry}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Retry" })
    );

    expect(retry).toHaveBeenCalledOnce();
  });

  it("does not display retry without an error", () => {
    render(
      <FireRefreshStatus
        {...defaultProps}
        refreshing={true}
      />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("clears the error message when the error is resolved", () => {
    const { rerender, container } = render(
      <FireRefreshStatus
        {...defaultProps}
        errorKey="errors.network"
      />
    );

    expect(screen.getByText(/Refresh failed/)).toBeInTheDocument();

    rerender(
      <FireRefreshStatus {...defaultProps} />
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("updates from refreshing to failure", () => {
    const { rerender } = render(
      <FireRefreshStatus
        {...defaultProps}
        refreshing={true}
      />
    );

    expect(screen.getByText("Refreshing…")).toBeInTheDocument();

    rerender(
      <FireRefreshStatus
        {...defaultProps}
        refreshing={false}
        errorKey="errors.network"
      />
    );

    expect(screen.queryByText("Refreshing…")).not.toBeInTheDocument();
    expect(screen.getByText(/Refresh failed/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry" })
    ).toBeInTheDocument();
  });

  it("uses French labels", () => {
    lang.value = "fr";

    render(
      <FireRefreshStatus
        {...defaultProps}
        refreshing={true}
        errorKey="errors.network"
      />
    );

    expect(screen.getByText("Actualisation…")).toBeInTheDocument();
    expect(screen.getByText(/Actualisation échouée/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Réessayer" })
    ).toBeInTheDocument();
  });
});
