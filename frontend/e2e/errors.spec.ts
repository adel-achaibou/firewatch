import { expect, FIRES, test } from "./fixtures";

const SERVER_ERROR = "The server encountered an error. Please try again later.";
const FIRE_API_PATH = "/api/v1/fires";

test.describe("API failure", () => {
  test.use({ apiStatus: 503 });

  test("shows an API error message and retry action", async ({ page }) => {
    const initialResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === FIRE_API_PATH && response.status() === 503
    );

    await page.goto("/");
    await initialResponse;

    const apiAlert = page.getByRole("alert").filter({ hasText: SERVER_ERROR });
    await expect(apiAlert).toBeVisible();
    await expect(apiAlert.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});

test("recovers after retry when API becomes available", async ({ page }) => {
  let fail = true;
  let requestCount = 0;

  await page.route("**/api/v1/fires", async (route) => {
    requestCount++;
    await route.fulfill({
      status: fail ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(fail ? { error: "temporary" } : [FIRES[0]])
    });
  });

  const initialResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === FIRE_API_PATH && response.status() === 503
  );

  await page.goto("/");
  await initialResponse;

  const apiAlert = page.getByRole("alert").filter({ hasText: SERVER_ERROR });
  await expect(apiAlert).toBeVisible();
  expect(requestCount).toBe(1);

  fail = false;

  const retryResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === FIRE_API_PATH && response.status() === 200
  );

  await apiAlert.getByRole("button", { name: "Try again" }).click();
  const response = await retryResponse;

  expect(await response.json()).toEqual([FIRES[0]]);
  await expect(apiAlert).toHaveCount(0);

  const overview = page.getByRole("region", { name: "Overview" }).filter({ visible: true });
  await expect(overview).toBeVisible();
  await expect(overview.getByText("Reported fires")).toBeVisible();
  await expect(overview.getByText("1", { exact: true }).first()).toBeVisible();

  expect(requestCount).toBe(2);
});
