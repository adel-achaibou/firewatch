import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react(), tailwindcss()],

    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./src/test/setup.ts"],
        include: ["src/**/*.{test,spec}.{ts,tsx}"],
        exclude: ["node_modules/**", "e2e/**"],

        coverage: {
            provider: "v8",
            thresholds: {
                statements: 95,
                branches: 90,
                functions: 95,
                lines: 95
            }
        }
    }
});
