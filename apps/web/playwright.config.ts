import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  timeout: 60_000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "UV_CACHE_DIR=/tmp/ripplelab-uv-cache uv run --project ../../services/economic-engine uvicorn ripplelab_engine.main:app --app-dir ../../services/economic-engine/src --host 127.0.0.1 --port 8000",
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        "RIPPLELAB_AUTH_TEST_MODE=1 RIPPLELAB_ENGINE_URL=http://127.0.0.1:8000 ./node_modules/.bin/next dev --webpack --port 3000",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], browserName: "chromium" },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
  ],
});
