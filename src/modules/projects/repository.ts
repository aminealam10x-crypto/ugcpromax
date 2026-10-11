import type {
  CreateProjectInput,
  ListProjectsInput,
  Project,
  ProjectListResult,
  UpdateProjectInput,
} from "./domain";

// Every persistence method requires the authenticated owner's ID, including mutations.
export interface ProjectsRepository {
  create(ownerId: string, input: CreateProjectInput): Promise<Project>;
  list(ownerId: string, input: ListProjectsInput): Promise<ProjectListResult>;
  findById(ownerId: string, projectId: string): Promise<Project | null>;
  update(ownerId: string, projectId: string, input: UpdateProjectInput): Promise<Project | null>;
  delete(ownerId: string, projectId: string): Promise<boolean>;
}
