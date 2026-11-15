import { expect, test } from "./fixtures";

const LANGUAGE_KEY = "firewatch-language";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("aside").getByText("Reported fires")).toBeVisible();
});

test("changes language and persists French across reload", async ({ page }) => {
  const dashboard = page.locator("aside");
  const french = dashboard.getByRole("button", { name: "FR" });
  const english = dashboard.getByRole("button", { name: "EN" });

  await french.click();

  await expect(french).toHaveAttribute("aria-pressed", "true");
  await expect(english).toHaveAttribute("aria-pressed", "false");
  await expect(dashboard.getByText("Feux signalés")).toBeVisible();
  await expect(dashboard.getByText("Filtrer par région")).toBeVisible();
  await expect(dashboard.getByText("Reported fires")).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), LANGUAGE_KEY)).toBe("fr");

  await page.reload();

  await expect(french).toHaveAttribute("aria-pressed", "true");
  await expect(english).toHaveAttribute("aria-pressed", "false");
  await expect(dashboard.getByText("Feux signalés")).toBeVisible();
  await expect(dashboard.getByText("Filtrer par région")).toBeVisible();
  await expect(dashboard.getByText("Reported fires")).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), LANGUAGE_KEY)).toBe("fr");
});

test("switches from French back to English and persists after reload", async ({ page }) => {
  const dashboard = page.locator("aside");
  const french = dashboard.getByRole("button", { name: "FR" });
  const english = dashboard.getByRole("button", { name: "EN" });

  await french.click();
  await expect(dashboard.getByText("Feux signalés")).toBeVisible();

  await english.click();

  await expect(english).toHaveAttribute("aria-pressed", "true");
  await expect(french).toHaveAttribute("aria-pressed", "false");
  await expect(dashboard.getByText("Reported fires")).toBeVisible();
  await expect(dashboard.getByText("Filter by region")).toBeVisible();
  await expect(dashboard.getByText("Feux signalés")).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), LANGUAGE_KEY)).toBe("en");

  await page.reload();

  await expect(english).toHaveAttribute("aria-pressed", "true");
  await expect(french).toHaveAttribute("aria-pressed", "false");
  await expect(dashboard.getByText("Reported fires")).toBeVisible();
  await expect(dashboard.getByText("Filter by region")).toBeVisible();
  await expect(dashboard.getByText("Feux signalés")).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), LANGUAGE_KEY)).toBe("en");
});
