import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvironmentError, getServerEnv, isDatabaseConfigured, parseServerEnv } from "./env";

const valid = {
  DATABASE_DRIVER: "pglite",
  BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
  BETTER_AUTH_URL: "http://localhost:3000",
};

afterEach(() => vi.unstubAllEnvs());

describe("server configuration", () => {
  it("requires explicit opt-in to local PostgreSQL", () => {
    expect(parseServerEnv(valid).LOCAL_DATABASE_PATH).toBe(".local/database");
    expect(() => parseServerEnv({ ...valid, DATABASE_DRIVER: undefined })).toThrow(EnvironmentError);
  });

  it("supports a PostgreSQL URL without returning it in invalid configuration errors", () => {
    const neon = { ...valid, DATABASE_DRIVER: "neon", DATABASE_URL: "postgresql://user:secret@db.example/studio?sslmode=require" };
    expect(parseServerEnv(neon).DATABASE_DRIVER).toBe("neon");
    expect(() => parseServerEnv({ ...neon, DATABASE_URL: "https://user:secret@db.example" })).toThrow("DATABASE_URL");
    expect(() => parseServerEnv({ ...neon, DATABASE_URL: "https://user:secret@db.example" })).not.toThrow("secret");
  });

  it("rejects production local storage and insecure public origins", () => {
    expect(() => parseServerEnv({ ...valid, NODE_ENV: "production" })).toThrow("DATABASE_DRIVER");
    expect(() => parseServerEnv({ ...valid, NODE_ENV: "production", DATABASE_DRIVER: "neon", DATABASE_URL: "postgres://db.example/studio" })).toThrow("BETTER_AUTH_URL");
  });

  it("accepts an explicit secure production configuration", () => {
    const env = parseServerEnv({ ...valid, NODE_ENV: "production", DATABASE_DRIVER: "neon", DATABASE_URL: "postgres://db.example/studio", BETTER_AUTH_URL: "https://studio.example/" });
    expect(env.BETTER_AUTH_URL).toBe("https://studio.example");
  });

  it.each(["not-a-url", "ftp://example.com", "https://user:secret@example.com", "https://example.com/api/auth", "https://example.com/?token=secret"])("rejects invalid public origins safely: %s", (url) => {
    expect(() => parseServerEnv({ ...valid, BETTER_AUTH_URL: url })).toThrow(EnvironmentError);
  });

  it("never fills in a missing or short authentication secret", () => {
    expect(() => parseServerEnv({ ...valid, BETTER_AUTH_SECRET: undefined })).toThrow("BETTER_AUTH_SECRET");
    expect(() => parseServerEnv({ ...valid, BETTER_AUTH_SECRET: "short" })).toThrow("BETTER_AUTH_SECRET");
  });

  it("checks readiness without connecting to external services", () => {
    for (const [key, value] of Object.entries(valid)) vi.stubEnv(key, value);
    vi.stubEnv("NODE_ENV", "development");
    expect(isDatabaseConfigured()).toBe(true);
    expect(getServerEnv().DATABASE_DRIVER).toBe("pglite");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    expect(isDatabaseConfigured()).toBe(false);
  });
});
