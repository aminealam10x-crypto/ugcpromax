import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/modules/projects/errors";
import { ProductIntelligenceService } from "./service";
import type { ProductBrief } from "./domain";
import type { ProductBriefsRepository } from "./repository";
import type { ProjectsRepository } from "@/modules/projects/repository";

const ownerId = "bafc2921-388f-43a0-803e-655f89d24d72";
const projectId = "124997e4-cea4-4bc2-a552-7e535beebcd2";

const mockProject = {
  id: projectId,
  ownerId,
  name: "Dino-Roar",
  productUrl: "https://example.com/products/dino-roar",
  country: "MA",
  language: "ary-MA",
  durationSeconds: 24,
  marketingAngle: null,
  status: "draft" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockBrief: ProductBrief = {
  id: "23456789-abcd-ef01-2345-6789abcdef01",
  projectId,
  title: "Dino-Roar Stickers",
  description: "High quality wall decals",
  price: "199",
  currency: "MAD",
  brand: "Bequest",
  features: ["Waterproof", "Reusable"],
  imageUrls: ["https://example.com/dino.jpg"],
  sourceUrl: "https://example.com/products/dino-roar",
  status: "extracted",
  rawEvidence: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

function setup(projectExists = true, briefExists = true) {
  const briefsRepo: ProductBriefsRepository = {
    findByProjectId: vi.fn().mockResolvedValue(briefExists ? mockBrief : null),
    upsert: vi.fn().mockImplementation((brief) => Promise.resolve({ ...mockBrief, ...brief })),
    update: vi.fn().mockImplementation((_id, patch) => Promise.resolve({ ...mockBrief, ...patch })),
  };

  const projectsRepo: ProjectsRepository = {
    create: vi.fn(),
    list: vi.fn(),
    findById: vi.fn().mockResolvedValue(projectExists ? mockProject : null),
    update: vi.fn().mockResolvedValue(mockProject),
    delete: vi.fn().mockResolvedValue(true),
  };

  const service = new ProductIntelligenceService(briefsRepo, projectsRepo);
  return { service, briefsRepo, projectsRepo };
}

describe("ProductIntelligenceService", () => {
  it("retrieves a brief for the authenticated project owner", async () => {
    const { service, briefsRepo } = setup();
    const brief = await service.getBrief(ownerId, projectId);
    expect(brief).toEqual(mockBrief);
    expect(briefsRepo.findByProjectId).toHaveBeenCalledWith(projectId);
  });

  it("throws NOT_FOUND when the project does not exist or belongs to someone else", async () => {
    const { service } = setup(false);
    await expect(service.getBrief(ownerId, projectId)).rejects.toThrow(DomainError);
  });

  it("updates an existing brief and sets status to reviewed", async () => {
    const { service, briefsRepo } = setup();
    const updated = await service.updateBrief(ownerId, projectId, {
      title: "Updated Title",
      price: "249",
      currency: "MAD",
      features: ["Easy to apply"],
      imageUrls: ["https://example.com/image.jpg"],
      status: "reviewed",
    });

    expect(updated.title).toBe("Updated Title");
    expect(briefsRepo.update).toHaveBeenCalledWith(projectId, expect.objectContaining({
      title: "Updated Title",
      price: "249",
      status: "reviewed",
    }));
  });

  it("rejects blank title when updating brief", async () => {
    const { service } = setup();
    await expect(service.updateBrief(ownerId, projectId, {
      title: "   ",
      features: [],
      imageUrls: [],
    })).rejects.toThrow(DomainError);
  });
});
