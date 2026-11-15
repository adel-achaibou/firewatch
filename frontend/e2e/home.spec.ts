import { expect, FIRES, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

test("FireWatch homepage loads with API data and dashboard statistics", async ({ page }) => {
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/v1/fires" && response.status() === 200
  );

  await page.goto("/");
  const response = await responsePromise;

  expect(await response.json()).toEqual(FIRES);
  await expect(page).toHaveTitle(/FireWatch/i);

  const dashboard = page.locator("aside");
  const overview = dashboard.getByRole("region", { name: "Overview" });

  await expect(dashboard).toBeVisible();
  await expect(overview.getByText("Reported fires")).toBeVisible();
  await expect(overview.getByText("3", { exact: true })).toBeVisible();
  await expect(overview.getByText("Out of control")).toBeVisible();
  await expect(overview.getByText("1", { exact: true })).toBeVisible();
  await expect(page.locator(".firewatch-map")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("FireWatch map renders one marker for each API fire", async ({ page }) => {
  await page.goto("/");

  const map = page.locator(".firewatch-map");
  await expect(map).toBeVisible();
  await expect(map.locator("canvas")).toHaveCount(1);
  await expect(page.locator("[data-fire-id]")).toHaveCount(FIRES.length);

  for (const fire of FIRES) {
    await expect(page.locator(`[data-fire-id="${fire.nationalFireId}"]`)).toHaveCount(1);
  }
});
