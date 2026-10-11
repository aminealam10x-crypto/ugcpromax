import "server-only";
import { getDatabase } from "@/db/client";
import { DrizzleProjectsRepository } from "./drizzle-repository";
import { ProjectsService } from "./service";

export async function createProjectsService(): Promise<ProjectsService> {
  return new ProjectsService(new DrizzleProjectsRepository(await getDatabase()));
}
