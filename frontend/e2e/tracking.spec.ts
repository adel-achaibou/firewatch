import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const STORAGE_KEY = "firewatch-tracked-fires";
const FIRE_ID = "FW-QC-001";

const marker = (id: string) => `[data-fire-id="${id}"]`;

async function seedTrackedFires(page: Page, ids: string[]) {
  await page.addInitScript(
    ({ key, fireIds }) => {
      const flag = "__firewatch_e2e_seeded";

      if (sessionStorage.getItem(flag) === "true") {
        return;
      }

      localStorage.setItem(key, JSON.stringify(fireIds));
      sessionStorage.setItem(flag, "true");
    },
    { key: STORAGE_KEY, fireIds: ids }
  );

  await page.goto("/");
}

async function getTrackedFires(page: Page): Promise<string[]> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "[]"),
    STORAGE_KEY
  );
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

test("restores tracked fires from localStorage after reload", async ({ page }) => {
  await seedTrackedFires(page, [FIRE_ID]);

  const tracked = page.getByRole("region", { name: "Tracked fires" });

  await expect(tracked.getByText(FIRE_ID)).toBeVisible();
  await expect.poll(() => getTrackedFires(page)).toEqual([FIRE_ID]);

  await page.reload();

  await expect(tracked.getByText(FIRE_ID)).toBeVisible();
  await expect.poll(() => getTrackedFires(page)).toEqual([FIRE_ID]);
});

test("removes a tracked fire and persists the removal", async ({ page }) => {
  await seedTrackedFires(page, [FIRE_ID]);

  const tracked = page.getByRole("region", { name: "Tracked fires" });

  await expect(tracked.getByText(FIRE_ID)).toBeVisible();

  await tracked
    .locator("article")
    .filter({ hasText: FIRE_ID })
    .locator("button[aria-label]")
    .click();

  await expect(tracked.getByText(FIRE_ID)).toHaveCount(0);
  await expect.poll(() => getTrackedFires(page)).toEqual([]);

  await page.reload();

  await expect(tracked.getByText(FIRE_ID)).toHaveCount(0);
  await expect.poll(() => getTrackedFires(page)).toEqual([]);
});

test("tracked-only mode filters actual map markers", async ({ page }) => {
  await page.goto("/");

  const dashboard = page.locator("aside");
  const checkbox = dashboard.getByRole("checkbox", {
    name: "Show tracked fires only"
  });

  const tracked = page.getByRole("region", { name: "Tracked fires" });

  await expect(page.locator("[data-fire-id]")).toHaveCount(3);

  await page.locator(marker(FIRE_ID)).click();

  await expect(tracked.getByText(FIRE_ID)).toBeVisible();
  await expect.poll(() => getTrackedFires(page)).toContain(FIRE_ID);

  await checkbox.check();

  await expect(checkbox).toBeChecked();
  await expect(page.locator(marker(FIRE_ID))).toHaveCount(1);
  await expect(page.locator(marker("FW-ON-002"))).toHaveCount(0);
  await expect(page.locator(marker("FW-BC-003"))).toHaveCount(0);

  await checkbox.uncheck();

  await expect(checkbox).not.toBeChecked();
  await expect(page.locator("[data-fire-id]")).toHaveCount(3);
});
