import { eq } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import * as schema from "@/db/schema";
import type { NewProductBrief, ProductBrief } from "./domain";
import type { ProductBriefsRepository } from "./repository";

export class DrizzleProductBriefsRepository implements ProductBriefsRepository {
  constructor(private readonly db: AppDatabase) {}

  async findByProjectId(projectId: string): Promise<ProductBrief | null> {
    const [row] = await this.db
      .select()
      .from(schema.productBriefs)
      .where(eq(schema.productBriefs.projectId, projectId))
      .limit(1);

    return (row as unknown as ProductBrief) ?? null;
  }

  async upsert(brief: NewProductBrief): Promise<ProductBrief> {
    const [saved] = await this.db
      .insert(schema.productBriefs)
      .values({
        projectId: brief.projectId,
        title: brief.title,
        description: brief.description,
        price: brief.price,
        currency: brief.currency ?? "MAD",
        brand: brief.brand,
        features: brief.features,
        imageUrls: brief.imageUrls,
        sourceUrl: brief.sourceUrl,
        status: brief.status ?? "extracted",
        rawEvidence: brief.rawEvidence,
      })
      .onConflictDoUpdate({
        target: schema.productBriefs.projectId,
        set: {
          title: brief.title,
          description: brief.description,
          price: brief.price,
          currency: brief.currency ?? "MAD",
          brand: brief.brand,
          features: brief.features,
          imageUrls: brief.imageUrls,
          sourceUrl: brief.sourceUrl,
          status: brief.status ?? "extracted",
          rawEvidence: brief.rawEvidence,
          updatedAt: new Date(),
        },
      })
      .returning();

    return saved as unknown as ProductBrief;
  }

  async update(projectId: string, patch: Partial<NewProductBrief>): Promise<ProductBrief | null> {
    const [updated] = await this.db
      .update(schema.productBriefs)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(eq(schema.productBriefs.projectId, projectId))
      .returning();

    return (updated as unknown as ProductBrief) ?? null;
  }
}
