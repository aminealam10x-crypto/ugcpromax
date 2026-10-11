import "server-only";

import { z } from "zod";

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_DRIVER: z.enum(["neon", "pglite"]).default("neon"),
    DATABASE_URL: z.string().optional(),
    LOCAL_DATABASE_PATH: z.string().min(1).default(".local/database"),
    BETTER_AUTH_SECRET: z.string().min(32).max(4096),
    BETTER_AUTH_URL: z.url().refine((value) => {
      try {
        const url = new URL(value);
        return (
          ["http:", "https:"].includes(url.protocol) &&
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash &&
          ["", "/"].includes(url.pathname)
        );
      } catch {
        return false;
      }
    }, "Use the public HTTP(S) origin without credentials, a path, query, or fragment."),
  })
  .superRefine((env, context) => {
    if (env.DATABASE_DRIVER === "neon") {
      let valid = false;
      try {
        const databaseUrl = new URL(env.DATABASE_URL ?? "");
        valid = ["postgres:", "postgresql:"].includes(databaseUrl.protocol) && !!databaseUrl.hostname;
      } catch {
        // The error below reports only the field name, never a connection string.
      }
      if (!valid) {
        context.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "A PostgreSQL connection URL is required for Neon." });
      }
    }
    if (env.NODE_ENV === "production") {
      if (env.DATABASE_DRIVER !== "neon") {
        context.addIssue({ code: "custom", path: ["DATABASE_DRIVER"], message: "Production requires Neon PostgreSQL." });
      }
      if (!env.BETTER_AUTH_URL.startsWith("https://")) {
        context.addIssue({ code: "custom", path: ["BETTER_AUTH_URL"], message: "Production requires an HTTPS origin." });
      }
    }
  })
  .transform((env) => ({ ...env, BETTER_AUTH_URL: new URL(env.BETTER_AUTH_URL).origin }));

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvironmentError extends Error {
  readonly fields: string[];

  constructor(fields: string[]) {
    super(`Server configuration is incomplete or invalid: ${fields.join(", ")}.`);
    this.name = "EnvironmentError";
    this.fields = fields;
  }
}

/** Parse explicitly supplied values so configuration can be tested without changing process.env. */
export function parseServerEnv(input: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(input);
  if (!result.success) {
    throw new EnvironmentError([...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? "environment")))]);
  }
  return result.data;
}

/** Validation is lazy: importing a module or producing a build does not connect to a database. */
export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}

/** Used by setup screens. This checks configuration only, not database reachability or migrations. */
export function isDatabaseConfigured(): boolean {
  try {
    getServerEnv();
    return true;
  } catch (error) {
    if (error instanceof EnvironmentError) return false;
    throw error;
  }
}
