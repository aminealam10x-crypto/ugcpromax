import { describe, expect, it, vi } from "vitest";
import { DomainError } from "./errors";
import { ProjectsService } from "./service";
import type { Project } from "./domain";
import type { ProjectsRepository } from "./repository";

const ownerId = "bafc2921-388f-43a0-803e-655f89d24d72";
const projectId = "124997e4-cea4-4bc2-a552-7e535beebcd2";
const project: Project = {
  id: projectId,
  ownerId,
  name: "Argan launch",
  productUrl: null,
  country: "MA",
  language: "ary-MA",
  durationSeconds: 24,
  marketingAngle: null,
  status: "draft",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

function setup() {
  const repository: ProjectsRepository = {
    create: vi.fn().mockResolvedValue(project),
    list: vi.fn().mockResolvedValue({ items: [project], total: 1, page: 1, pageSize: 12 }),
    findById: vi.fn().mockResolvedValue(project),
    update: vi.fn().mockResolvedValue(project),
    delete: vi.fn().mockResolvedValue(true),
  };
  return { repository, service: new ProjectsService(repository) };
}

describe("ProjectsService", () => {
  it("normalizes names, supplies market defaults and passes trusted ownership separately", async () => {
    const { service, repository } = setup();
    await service.create(ownerId, { name: "  Argan launch  " });
    expect(repository.create).toHaveBeenCalledWith(ownerId, {
      name: "Argan launch",
      productUrl: null,
      country: "MA",
      language: "ary-MA",
      durationSeconds: 24,
      marketingAngle: null,
    });
  });

  it.each([
    { name: "" },
    { name: "   " },
    { name: "x".repeat(101) },
    { name: "Argan", ownerId: "someone-else" },
    { name: "Argan", status: "completed" },
    { name: "Argan", country: "FR" },
    { name: "Argan", language: "ar" },
    { name: "Argan", durationSeconds: 17 },
    { name: "Argan", marketingAngle: "x".repeat(1001) },
    { name: "Argan", productUrl: "file:///secrets" },
    { name: "Argan", productUrl: "not a URL" },
    { name: "Argan", productUrl: "" },
    { name: "Argan", productUrl: "javascript:alert(1)" },
    { name: "Argan", productUrl: "https://user:password@example.com/product" },
  ])("rejects invalid input before persistence: %j", async (input) => {
    const { service, repository } = setup();
    await expect(service.create(ownerId, input)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("stores a valid product URL without fetching it", async () => {
    const { service, repository } = setup();
    await service.create(ownerId, { name: "Argan", productUrl: " https://example.com/product " });
    expect(repository.create).toHaveBeenCalledWith(ownerId, expect.objectContaining({
      productUrl: "https://example.com/product",
    }));
  });

  it.each([{}, { name: undefined }, { ownerId }, { status: "draft" }, { name: " " }])(
    "rejects empty updates and server-owned fields: %j",
    async (input) => {
      const { service, repository } = setup();
      await expect(service.update(ownerId, projectId, input)).rejects.toMatchObject({ code: "INVALID_INPUT" });
      expect(repository.update).not.toHaveBeenCalled();
    },
  );

  it("supports clearing optional project fields", async () => {
    const { service, repository } = setup();
    await service.update(ownerId, projectId, { productUrl: null, marketingAngle: null });
    expect(repository.update).toHaveBeenCalledWith(ownerId, projectId, { productUrl: null, marketingAngle: null });
  });

  it.each([{ pageSize: 51 }, { page: 0 }, { page: 10001 }, { pageSize: 1.5 }, { ownerId }])(
    "bounds list requests and rejects extra filters: %j",
    async (input) => {
      const { service, repository } = setup();
      await expect(service.list(ownerId, input)).rejects.toBeInstanceOf(DomainError);
      expect(repository.list).not.toHaveBeenCalled();
    },
  );

  it("passes ownership and bounded pagination to the repository", async () => {
    const { service, repository } = setup();
    await service.list(ownerId);
    expect(repository.list).toHaveBeenCalledWith(ownerId, { page: 1, pageSize: 12 });
    await service.list(ownerId, { page: 2, pageSize: 20 });
    expect(repository.list).toHaveBeenLastCalledWith(ownerId, { page: 2, pageSize: 20 });
  });

  it("validates IDs before reaching persistence", async () => {
    const { service, repository } = setup();
    await expect(service.get(ownerId, "not-a-uuid")).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(service.create("untrusted", { name: "Argan" })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("returns the same not-found error for reads, edits, and deletes of missing or unowned rows", async () => {
    const { service, repository } = setup();
    vi.mocked(repository.findById).mockResolvedValue(null);
    vi.mocked(repository.update).mockResolvedValue(null);
    vi.mocked(repository.delete).mockResolvedValue(false);
    for (const operation of [
      () => service.get(ownerId, projectId),
      () => service.update(ownerId, projectId, { name: "New name" }),
      () => service.delete(ownerId, projectId),
    ]) {
      await expect(operation()).rejects.toMatchObject({ code: "NOT_FOUND", message: "Project not found." });
    }
    expect(repository.findById).toHaveBeenCalledWith(ownerId, projectId);
    expect(repository.update).toHaveBeenCalledWith(ownerId, projectId, { name: "New name" });
    expect(repository.delete).toHaveBeenCalledWith(ownerId, projectId);
  });
});
