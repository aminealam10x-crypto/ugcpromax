import { and, count, desc, eq } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { projects } from "@/db/schema";
import type { CreateProjectInput, ListProjectsInput, UpdateProjectInput } from "./domain";
import type { ProjectsRepository } from "./repository";

export class DrizzleProjectsRepository implements ProjectsRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(ownerId: string, input: CreateProjectInput) {
    const [project] = await this.database
      .insert(projects)
      .values({ ...input, ownerId, status: "draft" })
      .returning();
    if (!project) throw new Error("Project insert did not return a record.");
    return project;
  }

  async list(ownerId: string, input: ListProjectsInput) {
    const ownership = eq(projects.ownerId, ownerId);
    const [items, totals] = await Promise.all([
      this.database
        .select()
        .from(projects)
        .where(ownership)
        .orderBy(desc(projects.createdAt), desc(projects.id))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
      this.database.select({ total: count() }).from(projects).where(ownership),
    ]);
    return { items, total: totals[0]?.total ?? 0, page: input.page, pageSize: input.pageSize };
  }

  async findById(ownerId: string, projectId: string) {
    const [project] = await this.database
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
      .limit(1);
    return project ?? null;
  }

  async update(ownerId: string, projectId: string, input: UpdateProjectInput) {
    const [project] = await this.database
      .update(projects)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
      .returning();
    return project ?? null;
  }

  async delete(ownerId: string, projectId: string) {
    const deleted = await this.database
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
      .returning();
    return deleted.length > 0;
  }
}
