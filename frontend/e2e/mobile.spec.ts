import { expect, test } from "./fixtures";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true
});

const marker = (id: string) => `[data-fire-id="${id}"]`;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Overview" })).toBeVisible();
});

test("renders mobile sheet and hides desktop dashboard", async ({ page }) => {
  const sheet = page.getByRole("region", { name: "Overview" });

  await expect(sheet).toBeVisible();
  await expect(page.locator("aside")).toBeHidden();
  await expect(sheet.getByText("Reported fires")).toBeVisible();
  await expect(sheet.getByText("3", { exact: true }).first()).toBeVisible();
});

test("mobile tracked-only mode updates displayed fire statistics", async ({ page }) => {
  const sheet = page.getByRole("region", { name: "Overview" });
  const checkbox = sheet.getByRole("checkbox", { name: "Tracked fires only" });

  await expect(sheet.getByText("3", { exact: true }).first()).toBeVisible();

  await checkbox.check();

  await expect(checkbox).toBeChecked();
  await expect(sheet.getByText("0", { exact: true }).first()).toBeVisible();

  await checkbox.uncheck();

  await expect(checkbox).not.toBeChecked();
  await expect(sheet.getByText("3", { exact: true }).first()).toBeVisible();
});

test("mobile user can expand sheet and filter Quebec", async ({ page }) => {
  const sheet = page.getByRole("region", { name: "Overview" });
  const filter = sheet.getByRole("button", { name: "Filter Quebec" });

  await sheet.dispatchEvent("wheel", { deltaY: 100 });
  await expect(filter).toBeVisible();

  await filter.click();

  await expect(filter).toHaveAttribute("aria-pressed", "true");
  await expect(sheet.getByText("1", { exact: true }).first()).toBeVisible();

  await sheet.getByRole("button", { name: "Clear filters" }).click();

  await expect(filter).toHaveAttribute("aria-pressed", "false");
  await expect(sheet.getByText("3", { exact: true }).first()).toBeVisible();
});

test("mobile map markers follow the tracked-only filter", async ({ page }) => {
  const sheet = page.getByRole("region", { name: "Overview" });
  const checkbox = sheet.getByRole("checkbox", { name: "Tracked fires only" });

  await expect(page.locator("[data-fire-id]")).toHaveCount(3);

  await checkbox.check();
  await expect(page.locator("[data-fire-id]")).toHaveCount(0);

  await checkbox.uncheck();
  await expect(page.locator(marker("FW-QC-001"))).toHaveCount(1);
  await expect(page.locator(marker("FW-ON-002"))).toHaveCount(1);
  await expect(page.locator(marker("FW-BC-003"))).toHaveCount(1);
});
