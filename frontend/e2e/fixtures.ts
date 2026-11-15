import { test as base, expect, type Page, type TestInfo } from "@playwright/test";

export const FIRES = [
  {
    nationalFireId: "FW-QC-001", agencyFireId: "QC-001", agencyCode: "QC", regionCode: "QC",
    latitude: 50, longitude: -72, stageOfControlStatus: "OC", fireSize: 120,
    nationalFireCause: "L", percentContained: 15, statusDate: "2026-10-31T12:00:00Z",
    recordStart: "2026-10-30T12:00:00Z", recordEnd: "2026-10-31T12:00:00Z"
  },
  {
    nationalFireId: "FW-ON-002", agencyFireId: "ON-002", agencyCode: "ON", regionCode: "ON",
    latitude: 49, longitude: -85, stageOfControlStatus: "UC", fireSize: 35,
    nationalFireCause: "H", percentContained: 100, statusDate: "2026-10-31T12:00:00Z",
    recordStart: "2026-10-30T12:00:00Z", recordEnd: "2026-10-31T12:00:00Z"
  },
  {
    nationalFireId: "FW-BC-003", agencyFireId: "BC-003", agencyCode: "BC", regionCode: "BC",
    latitude: 53, longitude: -122, stageOfControlStatus: "BH", fireSize: 64,
    nationalFireCause: "U", percentContained: null, statusDate: null,
    recordStart: "2026-10-30T12:00:00Z", recordEnd: "2026-10-31T12:00:00Z"
  }
];

type Options = { apiStatus: number };

async function collectDiagnostics(page: Page, testInfo: TestInfo, browserMessages: string[], requestFailures: string[]) {
  const state = await page.evaluate(() => {
    const map = document.querySelector(".firewatch-map");
    const canvas = map?.querySelector("canvas") ?? null;
    const markerIds = Array.from(document.querySelectorAll<HTMLElement>("[data-fire-id]"))
      .map((marker) => marker.dataset.fireId);

    let webglSupported = false;
    try {
      const probe = document.createElement("canvas");
      webglSupported = Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
    } catch {
      webglSupported = false;
    }

    return {
      url: window.location.href,
      title: document.title,
      webglSupported,
      mapPresent: Boolean(map),
      mapWidth: map?.clientWidth ?? null,
      mapHeight: map?.clientHeight ?? null,
      mapCanvasPresent: Boolean(canvas),
      markerCount: markerIds.length,
      markerIds,
      alerts: Array.from(document.querySelectorAll('[role="alert"]'))
        .map((alert) => alert.textContent?.trim())
    };
  }).catch((error: unknown) => ({ evaluationError: String(error) }));

  await testInfo.attach("firewatch-diagnostics.json", {
    body: JSON.stringify({ test: testInfo.title, browser: testInfo.project.name, state, browserMessages, requestFailures }, null, 2),
    contentType: "application/json"
  });
}

export const test = base.extend<Options>({
  apiStatus: [200, { option: true }],

  page: async ({ page, apiStatus }, use, testInfo) => {
    const browserMessages: string[] = [];
    const requestFailures: string[] = [];

    page.on("pageerror", (error) => {
      browserMessages.push(`[pageerror] ${error.message}`);
    });

    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        browserMessages.push(`[${message.type()}] ${message.text()}`);
      }
    });

    page.on("requestfailed", (request) => {
      requestFailures.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText ?? "unknown"}`);
    });

    // Mock CWFIS fire API.
    await page.route("**/api/v1/fires", async (route) => {
      await route.fulfill({
        status: apiStatus,
        contentType: "application/json",
        body: JSON.stringify(apiStatus === 200 ? FIRES : { error: "unavailable" })
      });
    });

    // Mock map style to avoid external tile dependencies.
    await page.route("https://tiles.openfreemap.org/styles/dark**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ version: 8, name: "FireWatch E2E", sources: {}, layers: [] })
      });
    });

    // Mock synchronization status.
    await page.route("**/api/v1/cwfis/sync/status", async (route) => {
      await route.fulfill({ status: 204, body: "" });
    });

    await use(page);

    // Collect diagnostics for failed tests and unexpected passes.
    if (testInfo.status !== testInfo.expectedStatus) {
      await collectDiagnostics(page, testInfo, browserMessages, requestFailures);
    }
  }
});

export { expect };

