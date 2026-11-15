import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const dashboard = page.locator("aside");
  const overview = dashboard.getByRole("region", { name: "Overview" });

  await expect(overview.getByText("Reported fires")).toBeVisible();
  await expect(overview.getByText("3", { exact: true })).toBeVisible();
});

test("shows all three API fires initially", async ({ page }) => {
  const dashboard = page.locator("aside");
  const overview = dashboard.getByRole("region", { name: "Overview" });

  await expect(overview.getByText("3", { exact: true })).toBeVisible();
  await expect(dashboard.getByRole("button", { name: "All Canada" })).toHaveAttribute("aria-pressed", "true");
  await expect(dashboard.getByRole("button", { name: "Filter Quebec" })).toHaveAttribute("aria-pressed", "false");
  await expect(dashboard.getByRole("button", { name: "Filter Ontario" })).toHaveAttribute("aria-pressed", "false");
  await expect(dashboard.getByRole("button", { name: "Filter British Columbia" })).toHaveAttribute("aria-pressed", "false");
});

test("filters by Quebec and clears the selection", async ({ page }) => {
  const dashboard = page.locator("aside");
  const overview = dashboard.getByRole("region", { name: "Overview" });
  const quebec = dashboard.getByRole("button", { name: "Filter Quebec" });
  const ontario = dashboard.getByRole("button", { name: "Filter Ontario" });

  await quebec.click();

  await expect(quebec).toHaveAttribute("aria-pressed", "true");
  await expect(ontario).toHaveAttribute("aria-pressed", "false");
  await expect(overview.getByText("1", { exact: true }).first()).toBeVisible();

  await dashboard.getByRole("button", { name: "Clear filters" }).click();

  await expect(quebec).toHaveAttribute("aria-pressed", "false");
  await expect(dashboard.getByRole("button", { name: "All Canada" })).toHaveAttribute("aria-pressed", "true");
  await expect(overview.getByText("3", { exact: true })).toBeVisible();
});

test("supports selecting two provinces and toggling one off", async ({ page }) => {
  const dashboard = page.locator("aside");
  const overview = dashboard.getByRole("region", { name: "Overview" });
  const quebec = dashboard.getByRole("button", { name: "Filter Quebec" });
  const ontario = dashboard.getByRole("button", { name: "Filter Ontario" });

  await quebec.click();
  await ontario.click();

  await expect(quebec).toHaveAttribute("aria-pressed", "true");
  await expect(ontario).toHaveAttribute("aria-pressed", "true");
  await expect(overview.getByText("2", { exact: true })).toBeVisible();

  await quebec.click();

  await expect(quebec).toHaveAttribute("aria-pressed", "false");
  await expect(ontario).toHaveAttribute("aria-pressed", "true");
  await expect(overview.getByText("1", { exact: true }).first()).toBeVisible();

  await ontario.click();

  await expect(ontario).toHaveAttribute("aria-pressed", "false");
  await expect(dashboard.getByRole("button", { name: "All Canada" })).toHaveAttribute("aria-pressed", "true");
  await expect(overview.getByText("3", { exact: true })).toBeVisible();
});
