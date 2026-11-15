import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: isCI,

    retries: isCI ? 1 : 0,
    workers: isCI ? 1 : undefined,

    timeout: isCI ? 60000 : 30000,

    expect: {
        timeout: isCI ? 10000 : 5000
    },

    reporter: isCI
        ? [["list"], ["html", { open: "never" }]]
        : "html",

    use: {
        baseURL: "http://127.0.0.1:5173",
        trace: "retain-on-failure",
        screenshot: "only-on-failure"
    },

    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] }
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] }
        },
        {
            name: "webkit",
            use: { ...devices["Desktop Safari"] }
        },
        {
            name: "android",
            use: { ...devices["Pixel 7"] }
        },
        {
            name: "iphone",
            use: { ...devices["iPhone 15"] }
        },
        {
            name: "tablet",
            use: {
                ...devices["Desktop Chrome"],
                viewport: { width: 1024, height: 768 },
                hasTouch: true
            }
        }
    ],

    webServer: {
        command: "npm run dev -- --host 127.0.0.1",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: !isCI,
        timeout: 60000
    }
});
