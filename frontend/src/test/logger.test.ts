import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("frontend logger", () => {
  it("writes info, warn and error in development", async () => {
    vi.stubEnv("DEV", true);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { logger } = await import("../app/utils/logger");
    logger.info("hello", 1);
    logger.warn("warning", 2);
    logger.error("failure", new Error("oops"));
    expect(info).toHaveBeenCalledWith("hello", 1);
    expect(warn).toHaveBeenCalledWith("warning", 2);
    expect(error).toHaveBeenCalledWith("failure", expect.any(Error));
  });

  it("does not write application logs to the console in production", async () => {
    vi.stubEnv("DEV", false);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { logger } = await import("../app/utils/logger");
    logger.info("info");
    logger.warn("warn");
    logger.error("error");
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
