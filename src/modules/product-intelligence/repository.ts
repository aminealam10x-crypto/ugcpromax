import type { NewProductBrief, ProductBrief } from "./domain";

export interface ProductBriefsRepository {
  findByProjectId(projectId: string): Promise<ProductBrief | null>;
  upsert(brief: NewProductBrief): Promise<ProductBrief>;
  update(projectId: string, patch: Partial<NewProductBrief>): Promise<ProductBrief | null>;
}
