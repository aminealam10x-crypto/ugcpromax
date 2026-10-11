import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/modules/projects/errors";
import { GET as list, POST as create } from "./route";
import { DELETE as remove, GET as get, PATCH as update } from "./[id]/route";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  service: { create: vi.fn(), list: vi.fn(), get: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/modules/auth/server", () => ({ getSession: mocks.getSession }));
vi.mock("@/modules/projects/server", () => ({ createProjectsService: async () => mocks.service }));

const origin = "http://localhost:3000";
const context = { params: Promise.resolve({ id: "project-id" }) };
const project = { id: "project-id", ownerId: "server-owner", title: "Example" };
function request(method: string, body?: string, requestOrigin = origin) {
  return new Request(`${origin}/api/projects/project-id`, {
    method,
    headers: { origin: requestOrigin, "content-type": "application/json" },
    ...(body ? { body } : {}),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_DRIVER", "pglite");
  vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-with-at-least-32-characters");
  vi.stubEnv("BETTER_AUTH_URL", origin);
  mocks.getSession.mockResolvedValue({ user: { id: "server-owner" } });
  mocks.service.create.mockResolvedValue(project);
  mocks.service.get.mockResolvedValue(project);
  mocks.service.update.mockResolvedValue(project);
  mocks.service.list.mockResolvedValue({ items: [project], total: 1, page: 1, pageSize: 20 });
  mocks.service.delete.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("authenticated project route boundaries", () => {
  it("rejects every route when the database session is missing", async () => {
    mocks.getSession.mockResolvedValue(null);
    const results = await Promise.all([
      list(request("GET")), create(request("POST", "{}")), get(request("GET"), context), update(request("PATCH", "{}"), context), remove(request("DELETE"), context),
    ]);
    expect(results.map((result) => result.status)).toEqual([401, 401, 401, 401, 401]);
    for (const operation of Object.values(mocks.service)) expect(operation).not.toHaveBeenCalled();
  });

  it("passes the server session owner into every operation", async () => {
    await list(new Request(`${origin}/api/projects?page=2&pageSize=10`));
    await create(request("POST", '{"title":"New"}'));
    await get(request("GET"), context);
    await update(request("PATCH", '{"title":"Renamed"}'), context);
    await remove(request("DELETE"), context);
    expect(mocks.service.list).toHaveBeenCalledWith("server-owner", { page: "2", pageSize: "10" });
    expect(mocks.service.create).toHaveBeenCalledWith("server-owner", { title: "New" });
    expect(mocks.service.get).toHaveBeenCalledWith("server-owner", "project-id");
    expect(mocks.service.update).toHaveBeenCalledWith("server-owner", "project-id", { title: "Renamed" });
    expect(mocks.service.delete).toHaveBeenCalledWith("server-owner", "project-id");
  });

  it("returns project creation and deletion data envelopes", async () => {
    const created = await create(request("POST", "{}"));
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ data: project });
    expect(await (await remove(request("DELETE"), context)).json()).toEqual({ data: { id: "project-id" } });
  });

  it("rejects cross-origin mutations before reaching a service", async () => {
    const attacker = "https://attacker.example";
    const results = await Promise.all([create(request("POST", "{}", attacker)), update(request("PATCH", "{}", attacker), context), remove(request("DELETE", undefined, attacker), context)]);
    expect(results.map((result) => result.status)).toEqual([403, 403, 403]);
    expect(mocks.service.create).not.toHaveBeenCalled();
    expect(mocks.service.update).not.toHaveBeenCalled();
    expect(mocks.service.delete).not.toHaveBeenCalled();
  });

  it("does not pass malformed request data into the domain", async () => {
    const response = await create(request("POST", "{"));
    expect(response.status).toBe(400);
    expect(mocks.service.create).not.toHaveBeenCalled();
  });

  it("preserves indistinguishable missing and inaccessible results", async () => {
    mocks.service.get.mockRejectedValue(new DomainError("NOT_FOUND", "Project is missing or belongs to another user"));
    const response = await get(request("GET"), context);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "NOT_FOUND", message: "Project not found." } });
  });
});
