import "server-only";

import { getDatabase } from "@/db/client";
import { DrizzleProjectsRepository } from "@/modules/projects/drizzle-repository";
import { DrizzleProductBriefsRepository } from "./drizzle-repository";
import { ProductIntelligenceService } from "./service";

export async function createProductIntelligenceService(): Promise<ProductIntelligenceService> {
  const db = await getDatabase();
  return new ProductIntelligenceService(
    new DrizzleProductBriefsRepository(db),
    new DrizzleProjectsRepository(db),
  );
}
