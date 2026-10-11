import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "server-only": fileURLToPath(new URL("./tests/server-only.ts", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.ts", "tests/**/*.test.ts"], maxWorkers: 1, testTimeout: 30_000, hookTimeout: 60_000 },
});
