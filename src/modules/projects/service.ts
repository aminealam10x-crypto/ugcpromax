import { z } from "zod";
import {
  createProjectSchema,
  listProjectsSchema,
  ownerIdSchema,
  projectIdSchema,
  updateProjectSchema,
} from "./domain";
import { DomainError } from "./errors";
import type { ProjectsRepository } from "./repository";

function validate<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    throw new DomainError("INVALID_INPUT", "Check the project details and try again.", fieldErrors);
  }
  return parsed.data;
}

const notFound = () => new DomainError("NOT_FOUND", "Project not found.");

export class ProjectsService {
  constructor(private readonly repository: ProjectsRepository) {}

  async create(ownerId: string, input: unknown) {
    return this.repository.create(validate(ownerIdSchema, ownerId), validate(createProjectSchema, input));
  }

  async list(ownerId: string, input: unknown = {}) {
    return this.repository.list(validate(ownerIdSchema, ownerId), validate(listProjectsSchema, input));
  }

  async get(ownerId: string, projectId: string) {
    const project = await this.repository.findById(
      validate(ownerIdSchema, ownerId),
      validate(projectIdSchema, projectId),
    );
    if (!project) throw notFound();
    return project;
  }

  async update(ownerId: string, projectId: string, input: unknown) {
    const project = await this.repository.update(
      validate(ownerIdSchema, ownerId),
      validate(projectIdSchema, projectId),
      validate(updateProjectSchema, input),
    );
    if (!project) throw notFound();
    return project;
  }

  async delete(ownerId: string, projectId: string): Promise<void> {
    const deleted = await this.repository.delete(
      validate(ownerIdSchema, ownerId),
      validate(projectIdSchema, projectId),
    );
    if (!deleted) throw notFound();
  }
}
