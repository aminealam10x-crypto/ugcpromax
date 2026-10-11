import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  Reflect.deleteProperty(globalThis, "ugcpromaxDatabase");
});

describe("database configuration boundary", () => {
  it("rejects local PGlite in production before opening a database", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_DRIVER", "pglite");
    const { getDatabase } = await import("./client");
    await expect(getDatabase()).rejects.toThrow("development-only");
  });

  it("requires deliberate configuration instead of silently replacing Neon", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_DRIVER", "neon");
    vi.stubEnv("DATABASE_URL", "");
    const { getDatabase } = await import("./client");
    await expect(getDatabase()).rejects.toThrow("DATABASE_URL is required");
  });

  it("rejects an unknown database driver", async () => {
    vi.stubEnv("DATABASE_DRIVER", "typo");
    const { getDatabase } = await import("./client");
    await expect(getDatabase()).rejects.toThrow("DATABASE_DRIVER must be neon or pglite");
  });
});
