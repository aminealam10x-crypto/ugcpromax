import { z } from "zod";
import type { ProjectsRepository } from "@/modules/projects/repository";
import type { ProductBriefsRepository } from "./repository";
import { updateProductBriefInputSchema, type ProductBrief } from "./domain";
import { extractProductMetadata } from "./extractor";
import { safeFetch, SafeFetchError } from "./safe-fetch";
import { SsrfError } from "./ssrf";
import { DomainError } from "@/modules/projects/errors";

const ownerIdSchema = z.string().uuid("Invalid owner ID.");
const projectIdSchema = z.string().uuid("Invalid project ID.");

export class ProductIntelligenceService {
  constructor(
    private readonly briefsRepository: ProductBriefsRepository,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  async getBrief(ownerId: string, projectId: string): Promise<ProductBrief | null> {
    const validOwner = ownerIdSchema.parse(ownerId);
    const validProject = projectIdSchema.parse(projectId);
    const project = await this.projectsRepository.findById(validOwner, validProject);
    if (!project) throw new DomainError("NOT_FOUND", "Project not found.");
    return this.briefsRepository.findByProjectId(validProject);
  }

  async extract(ownerId: string, projectId: string, customUrl?: string): Promise<ProductBrief> {
    const validOwner = ownerIdSchema.parse(ownerId);
    const validProject = projectIdSchema.parse(projectId);
    const project = await this.projectsRepository.findById(validOwner, validProject);
    if (!project) throw new DomainError("NOT_FOUND", "Project not found.");

    const targetUrl = customUrl?.trim() || project.productUrl;
    if (!targetUrl) {
      throw new DomainError("INVALID_INPUT", "A product URL is required to extract product facts.", {
        productUrl: ["Enter a valid product URL first."],
      });
    }

    try {
      const { html, finalUrl } = await safeFetch(targetUrl);
      const extracted = extractProductMetadata(html, finalUrl);

      const brief = await this.briefsRepository.upsert({
        projectId: validProject,
        title: extracted.title,
        description: extracted.description,
        price: extracted.price,
        currency: extracted.currency || "MAD",
        brand: extracted.brand,
        features: extracted.features,
        imageUrls: extracted.imageUrls,
        sourceUrl: targetUrl,
        status: "extracted",
        rawEvidence: extracted.rawEvidence,
      });

      // Synchronize project productUrl if changed
      if (customUrl && customUrl !== project.productUrl) {
        await this.projectsRepository.update(validOwner, validProject, { productUrl: customUrl });
      }

      return brief;
    } catch (err: unknown) {
      if (err instanceof SsrfError || err instanceof SafeFetchError) {
        throw new DomainError("INVALID_INPUT", err.message, {
          productUrl: [err.message],
        });
      }
      throw err;
    }
  }

  async updateBrief(ownerId: string, projectId: string, input: unknown): Promise<ProductBrief> {
    const validOwner = ownerIdSchema.parse(ownerId);
    const validProject = projectIdSchema.parse(projectId);
    const project = await this.projectsRepository.findById(validOwner, validProject);
    if (!project) throw new DomainError("NOT_FOUND", "Project not found.");

    const parsed = updateProductBriefInputSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "brief";
        (fieldErrors[key] ??= []).push(issue.message);
      }
      throw new DomainError("INVALID_INPUT", "Check the product brief details and try again.", fieldErrors);
    }

    const updated = await this.briefsRepository.update(validProject, parsed.data);
    if (!updated) {
      return this.briefsRepository.upsert({
        projectId: validProject,
        ...parsed.data,
        sourceUrl: project.productUrl ?? "",
      });
    }
    return updated;
  }
}
