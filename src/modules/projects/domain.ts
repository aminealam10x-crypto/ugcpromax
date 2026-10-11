import { z } from "zod";
import type { projects } from "@/db/schema";

// Phase 0 stores a URL only. Fetching and network/redirect validation belong to Phase 1.
const productUrl = z
  .string()
  .trim()
  .max(2048, "Keep the product URL under 2,048 characters.")
  .url("Enter a valid product URL.")
  .refine((value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Use an HTTP or HTTPS URL without embedded credentials.")
  .nullable();

const projectFields = {
  name: z.string().trim().min(1, "Give your project a name.").max(100),
  productUrl,
  country: z.literal("MA"),
  language: z.literal("ary-MA"),
  durationSeconds: z.union([z.literal(16), z.literal(24), z.literal(32)]),
  marketingAngle: z.string().trim().max(1000).nullable(),
};

export const createProjectSchema = z
  .object({
    ...projectFields,
    productUrl: productUrl.optional().default(null),
    country: projectFields.country.optional().default("MA"),
    language: projectFields.language.optional().default("ary-MA"),
    durationSeconds: projectFields.durationSeconds.optional().default(24),
    marketingAngle: projectFields.marketingAngle.optional().default(null),
  })
  .strict();

export const updateProjectSchema = z
  .object(projectFields)
  .partial()
  .strict()
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Provide at least one field to update.",
  });

export const listProjectsSchema = z
  .object({
    page: z.number().int().min(1).max(10000).optional().default(1),
    pageSize: z.number().int().min(1).max(50).optional().default(12),
  })
  .strict();

export const projectIdSchema = z.string().uuid("Invalid project identifier.");
export const ownerIdSchema = z.string().uuid("Invalid authenticated user identifier.");

export type Project = typeof projects.$inferSelect;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsInput = z.infer<typeof listProjectsSchema>;

export interface ProjectListResult {
  items: Project[];
  total: number;
  page: number;
  pageSize: number;
}
