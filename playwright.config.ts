import { defineConfig, devices } from "@playwright/test";
import { randomUUID } from "node:crypto";

// Never reuse an arbitrary developer server: its database may contain real local data.
const port = process.env.PLAYWRIGHT_PORT || "3100";
const baseURL = `http://localhost:${port}`;
const databasePath = `.local/e2e-db-${randomUUID()}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 180_000,
  expect: { timeout: 60_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev:local",
    url: `${baseURL}/sign-in`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_DRIVER: "pglite",
      LOCAL_DATABASE_PATH: databasePath,
      BETTER_AUTH_URL: baseURL,
      PORT: port,
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
