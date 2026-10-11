import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();

// Field properties follow Better Auth's core schema; SQL names use snake_case.
export const user = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_idx").on(table.providerId, table.accountId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const projectStatus = pgEnum("project_status", ["draft"]);

// Durable Better Auth throttling survives independent serverless invocations.
export const rateLimit = pgTable("rate_limit", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    productUrl: varchar("product_url", { length: 2048 }),
    country: varchar("country", { length: 2 }).default("MA").notNull(),
    language: varchar("language", { length: 16 }).default("ary-MA").notNull(),
    durationSeconds: integer("duration_seconds").default(24).notNull(),
    marketingAngle: varchar("marketing_angle", { length: 1000 }),
    status: projectStatus("status").default("draft").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("projects_owner_created_idx").on(table.ownerId, table.createdAt, table.id),
    check("projects_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("projects_country_supported", sql`${table.country} = 'MA'`),
    check("projects_language_supported", sql`length(${table.language}) >= 2`),
    check("projects_duration_supported", sql`${table.durationSeconds} IN (16, 24, 32)`),
  ],
);

export const briefStatus = pgEnum("brief_status", ["extracted", "reviewed"]);

export const productBriefs = pgTable(
  "product_briefs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .unique()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    price: varchar("price", { length: 50 }),
    currency: varchar("currency", { length: 10 }).default("MAD").notNull(),
    brand: varchar("brand", { length: 100 }),
    features: jsonb("features").$type<string[]>().default([]).notNull(),
    imageUrls: jsonb("image_urls").$type<string[]>().default([]).notNull(),
    sourceUrl: varchar("source_url", { length: 2048 }).notNull(),
    status: briefStatus("status").default("extracted").notNull(),
    rawEvidence: jsonb("raw_evidence").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("product_briefs_project_id_idx").on(table.projectId),
    check("product_briefs_title_not_blank", sql`length(trim(${table.title})) > 0`),
  ],
);

export const angleStatus = pgEnum("angle_status", ["draft", "selected", "approved"]);

export const marketingAngles = pgTable(
  "marketing_angles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 50 }).notNull(),
    description: text("description").notNull(),
    targetAudience: text("target_audience").notNull(),
    hookConcept: text("hook_concept").notNull(),
    language: varchar("language", { length: 16 }).default("ary-MA").notNull(),
    selected: boolean("selected").default(false).notNull(),
    status: angleStatus("status").default("draft").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("marketing_angles_project_id_idx").on(table.projectId),
  ],
);

export const storyboardStatus = pgEnum("storyboard_status", ["draft", "reviewed", "approved"]);

export interface StoryboardSceneData {
  sceneNumber: number;
  durationSeconds: number;
  role: "hook" | "body" | "cta";
  visualDescription: string;
  dialogue: string;
  dialogueTranslation?: string;
  onScreenText: string;
  audioNotes: string;
  cameraMovement: string;
}

export const storyboards = pgTable(
  "storyboards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .unique()
      .references(() => projects.id, { onDelete: "cascade" }),
    angleId: uuid("angle_id")
      .references(() => marketingAngles.id, { onDelete: "set null" }),
    title: varchar("title", { length: 200 }).notNull(),
    language: varchar("language", { length: 16 }).default("ary-MA").notNull(),
    durationSeconds: integer("duration_seconds").default(24).notNull(),
    scenes: jsonb("scenes").$type<StoryboardSceneData[]>().default([]).notNull(),
    status: storyboardStatus("status").default("draft").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("storyboards_project_id_idx").on(table.projectId),
  ],
);
