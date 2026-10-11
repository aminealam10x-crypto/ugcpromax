import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./[...all]/route";

const mocks = vi.hoisted(() => ({ getAuth: vi.fn(), get: vi.fn(), post: vi.fn() }));
vi.mock("@/modules/auth/server", () => ({ getAuth: mocks.getAuth }));
vi.mock("better-auth/next-js", () => ({ toNextJsHandler: () => ({ GET: mocks.get, POST: mocks.post }) }));

const origin = "http://localhost:3000";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_DRIVER", "pglite");
  vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-with-at-least-32-characters");
  vi.stubEnv("BETTER_AUTH_URL", origin);
  mocks.getAuth.mockResolvedValue({});
  mocks.get.mockImplementation(async () => Response.json({ session: null }));
  mocks.post.mockImplementation(async () => Response.json({ success: true }));
});
afterEach(() => vi.unstubAllEnvs());

describe("auth HTTP mounting", () => {
  it("delegates GET session requests without changing Better Auth's contract", async () => {
    const request = new Request(`${origin}/api/auth/get-session`);
    const response = await GET(request);
    expect(mocks.get).toHaveBeenCalledWith(request);
    expect(await response.json()).toEqual({ session: null });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("supports Better Auth's bodyless sign-out POST", async () => {
    const response = await POST(new Request(`${origin}/api/auth/sign-out`, { method: "POST", headers: { origin } }));
    expect(response.status).toBe(200);
    expect(mocks.post).toHaveBeenCalledOnce();
  });

  it("preserves bounded JSON bodies when forwarding email sign-in", async () => {
    const body = JSON.stringify({ email: "test@example.com", password: "strong-password-for-test" });
    await POST(new Request(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { origin, "content-type": "application/json", "content-length": String(body.length) }, body }));
    const forwarded = mocks.post.mock.calls[0]?.[0] as Request;
    expect(await forwarded.text()).toBe(body);
    expect(forwarded.headers.get("content-length")).toBeNull();
  });

  it("blocks cross-origin auth requests before initializing auth", async () => {
    const response = await POST(new Request(`${origin}/api/auth/sign-up/email`, { method: "POST", headers: { origin: "https://attacker.example" } }));
    expect(response.status).toBe(403);
    expect(mocks.getAuth).not.toHaveBeenCalled();
  });

  it("rejects oversized auth bodies before invoking the password hasher", async () => {
    const response = await POST(new Request(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: "x".repeat(16_385) }));
    expect(response.status).toBe(413);
    expect(mocks.getAuth).not.toHaveBeenCalled();
  });
});
