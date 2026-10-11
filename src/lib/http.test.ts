import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvironmentError } from "./env";
import { ApiError, apiErrorResponse, assertSameOrigin, jsonData, readJsonBody, withApiError } from "./http";
import { DomainError } from "@/modules/projects/errors";

const origin = "http://localhost:3000";
function jsonRequest(body: string, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/projects`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
}
afterEach(() => vi.restoreAllMocks());

describe("HTTP request boundaries", () => {
  it("allows only mutations with the exact configured origin", () => {
    expect(() => assertSameOrigin(jsonRequest("{}", { origin }), origin)).not.toThrow();
    for (const attacker of ["https://attacker.example", `${origin}.attacker.example`, "null", ""]) {
      expect(() => assertSameOrigin(jsonRequest("{}", { origin: attacker }), origin)).toThrow(ApiError);
    }
    expect(() => assertSameOrigin(jsonRequest("{}", { origin, "sec-fetch-site": "cross-site" }), origin)).toThrow(ApiError);
    expect(() => assertSameOrigin(jsonRequest("{}"), origin)).toThrow(ApiError);
  });

  it("parses JSON with a charset but rejects non-JSON content types", async () => {
    expect(await readJsonBody(jsonRequest('{"name":"Studio"}', { "content-type": "application/json; charset=utf-8" }))).toEqual({ name: "Studio" });
    await expect(readJsonBody(jsonRequest("{}", { "content-type": "text/plain" }))).rejects.toMatchObject({ status: 415 });
  });

  it("returns a useful error for malformed JSON", async () => {
    await expect(readJsonBody(jsonRequest("{"))).rejects.toMatchObject({ code: "INVALID_JSON", status: 400 });
  });

  it("rejects an oversized declared or streamed body, counting UTF-8 bytes", async () => {
    await expect(readJsonBody(jsonRequest("{}", { "content-length": "100" }), 20)).rejects.toMatchObject({ status: 413 });
    await expect(readJsonBody(jsonRequest(JSON.stringify("é".repeat(20))), 30)).rejects.toMatchObject({ status: 413 });
    await expect(readJsonBody(jsonRequest("{}", { "content-length": "invalid" }))).rejects.toMatchObject({ status: 400 });
  });

  it("rejects invalid UTF-8 instead of silently replacing bytes", async () => {
    const request = new Request(`${origin}/api/projects`, { method: "POST", headers: { "content-type": "application/json" }, body: new Uint8Array([0xff]) });
    await expect(readJsonBody(request)).rejects.toMatchObject({ code: "INVALID_BODY" });
  });
});

describe("API response contracts", () => {
  it("uses data envelopes and disables caching of private responses", async () => {
    const response = jsonData({ id: "project" }, 201);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { id: "project" } });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("maps validation and missing ownership records without leaking detail", async () => {
    const invalid = apiErrorResponse(new DomainError("INVALID_INPUT", "Invalid title", { title: ["Required"] }));
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toMatchObject({ error: { code: "INVALID_INPUT", fieldErrors: { title: ["Required"] } } });
    const absent = apiErrorResponse(new DomainError("NOT_FOUND", "owned by another user"));
    expect(absent.status).toBe(404);
    expect(JSON.stringify(await absent.json())).not.toContain("another user");
  });

  it("redacts unexpected errors from both responses and logs", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = apiErrorResponse(new Error("postgres://user:password@host/private SQL"), "trace-id");
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("password");
    expect(JSON.stringify(log.mock.calls)).not.toContain("password");
    expect(response.headers.get("x-request-id")).toBe("trace-id");
  });

  it("returns service unavailable for missing credentials", () => {
    expect(apiErrorResponse(new EnvironmentError(["DATABASE_URL"])).status).toBe(503);
  });

  it("wraps rejected handlers and attaches a request ID", async () => {
    const response = await withApiError(async () => { throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue."); });
    expect(response.status).toBe(401);
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });
});
