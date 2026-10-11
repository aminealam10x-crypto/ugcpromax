import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  database: { name: "test-database" },
  getDatabase: vi.fn(),
  getSession: vi.fn(),
  betterAuth: vi.fn(),
  drizzleAdapter: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@better-auth/drizzle-adapter", () => ({ drizzleAdapter: mocks.drizzleAdapter }));
vi.mock("better-auth", () => ({ betterAuth: mocks.betterAuth }));
vi.mock("better-auth/next-js", () => ({ nextCookies: () => ({ id: "next-cookies" }) }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_DRIVER", "pglite");
  vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-with-at-least-32-characters");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  mocks.getDatabase.mockResolvedValue(mocks.database);
  mocks.drizzleAdapter.mockReturnValue({ adapter: "drizzle" });
  mocks.getSession.mockResolvedValue(null);
  mocks.betterAuth.mockImplementation(() => ({ api: { getSession: mocks.getSession } }));
  mocks.headers.mockResolvedValue(new Headers());
  mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT_SIGN_IN"); });
});
afterEach(() => vi.unstubAllEnvs());

describe("server authentication", () => {
  it("initializes lazily and shares one instance across concurrent requests", async () => {
    const { getAuth } = await import("./server");
    expect(mocks.getDatabase).not.toHaveBeenCalled();
    const [first, second] = await Promise.all([getAuth(), getAuth()]);
    expect(first).toBe(second);
    expect(mocks.getDatabase).toHaveBeenCalledTimes(1);
    expect(mocks.betterAuth).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: "http://localhost:3000",
      emailAndPassword: expect.objectContaining({ enabled: true, minPasswordLength: 12 }),
      rateLimit: expect.objectContaining({ enabled: true, storage: "database" }),
      session: expect.objectContaining({ cookieCache: { enabled: false } }),
      advanced: expect.objectContaining({ database: { generateId: "uuid" } }),
      plugins: [{ id: "next-cookies" }],
    }));
  });

  it("does not permanently cache failed initialization", async () => {
    const { getAuth } = await import("./server");
    mocks.getDatabase.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(getAuth()).rejects.toThrow("Database unavailable");
    await expect(getAuth()).resolves.toBeDefined();
    expect(mocks.getDatabase).toHaveBeenCalledTimes(2);
  });

  it("validates the real session using supplied request headers", async () => {
    const { getSession } = await import("./server");
    const requestHeaders = new Headers({ cookie: "session-token" });
    const current = { user: { id: "user" }, session: { id: "session" } };
    mocks.getSession.mockResolvedValue(current);
    expect(await getSession(requestHeaders)).toEqual(current);
    expect(mocks.getSession).toHaveBeenCalledWith({ headers: requestHeaders, query: { disableCookieCache: true } });
    expect(mocks.headers).not.toHaveBeenCalled();
  });

  it("redirects a missing session and returns a valid page session", async () => {
    const { requireSession } = await import("./server");
    await expect(requireSession()).rejects.toThrow("REDIRECT_SIGN_IN");
    expect(mocks.redirect).toHaveBeenCalledWith("/sign-in");
    const current = { user: { id: "owner" }, session: { id: "session" } };
    mocks.getSession.mockResolvedValue(current);
    expect(await requireSession()).toEqual(current);
  });

  it("does not expose unimplemented email recovery or verification routes", async () => {
    const { getAuth } = await import("./server");
    await getAuth();
    expect(mocks.betterAuth).toHaveBeenCalledWith(expect.objectContaining({
      disabledPaths: expect.arrayContaining(["/request-password-reset", "/reset-password", "/send-verification-email", "/verify-email"]),
    }));
  });
});
