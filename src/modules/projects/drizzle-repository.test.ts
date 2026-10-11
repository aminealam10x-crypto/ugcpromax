import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { DrizzleProjectsRepository } from "./drizzle-repository";
import { ProjectsService } from "./service";

const alice = "f2b8a34e-6aec-49bd-b92f-a4303fd07c09";
const bob = "ae7faec5-5dda-44df-aefa-ab1fb1f96060";
let client: PGlite;
let database: PgliteDatabase<typeof schema>;
let service: ProjectsService;

beforeAll(async () => {
  client = new PGlite();
  database = drizzle(client, { schema });
  await migrate(database, { migrationsFolder: "drizzle" });
  service = new ProjectsService(new DrizzleProjectsRepository(database));
}, 60000);

beforeEach(async () => {
  await database.delete(schema.user);
  await database.insert(schema.user).values([
    { id: alice, name: "Alice", email: "alice@example.test" },
    { id: bob, name: "Bob", email: "bob@example.test" },
  ]);
});

afterAll(async () => {
  await client?.close();
});

describe("project persistence against real local PostgreSQL", () => {
  it("applies migrations and persists the complete CRUD flow", async () => {
    const created = await service.create(alice, { name: "Argan oil", productUrl: "https://example.test/argan" });
    expect(created).toMatchObject({ ownerId: alice, name: "Argan oil", country: "MA", language: "ary-MA", durationSeconds: 24, status: "draft" });
    expect(created.createdAt).toBeInstanceOf(Date);
    expect((await service.get(alice, created.id)).productUrl).toBe("https://example.test/argan");
    const changed = await service.update(alice, created.id, { name: "Launch edit", durationSeconds: 16, productUrl: null });
    expect(changed).toMatchObject({ name: "Launch edit", durationSeconds: 16, productUrl: null });
    expect(changed.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    await service.delete(alice, created.id);
    await expect(service.get(alice, created.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("limits every read and list to the authenticated owner", async () => {
    const privateProject = await service.create(alice, { name: "Private campaign" });
    await service.create(bob, { name: "Bob campaign" });
    const bobProjects = await service.list(bob);
    expect(bobProjects.total).toBe(1);
    expect(bobProjects.items.map((project) => project.name)).toEqual(["Bob campaign"]);
    await expect(service.get(bob, privateProject.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await service.list(alice)).items[0]?.id).toBe(privateProject.id);
  });

  it("blocks cross-owner mutations in SQL and leaves the real record intact", async () => {
    const privateProject = await service.create(alice, { name: "Private campaign" });
    await expect(service.update(bob, privateProject.id, { name: "Stolen" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.delete(bob, privateProject.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await service.get(alice, privateProject.id)).name).toBe("Private campaign");
  });

  it("paginates deterministically even when creation timestamps tie", async () => {
    const sameTime = new Date("2026-01-01");
    await database.insert(schema.projects).values([
      { id: "00000000-0000-4000-8000-000000000001", ownerId: alice, name: "One", createdAt: sameTime },
      { id: "00000000-0000-4000-8000-000000000002", ownerId: alice, name: "Two", createdAt: sameTime },
      { id: "00000000-0000-4000-8000-000000000003", ownerId: alice, name: "Three", createdAt: sameTime },
    ]);
    await service.create(bob, { name: "Other tenant" });
    const first = await service.list(alice, { page: 1, pageSize: 2 });
    const second = await service.list(alice, { page: 2, pageSize: 2 });
    expect(first.total).toBe(3);
    expect(first.items.map((project) => project.name)).toEqual(["Three", "Two"]);
    expect(second.items.map((project) => project.name)).toEqual(["One"]);
  });

  it("enforces ownership foreign keys and market/duration constraints in PostgreSQL", async () => {
    await expect(database.insert(schema.projects).values({ ownerId: crypto.randomUUID(), name: "Missing user" })).rejects.toThrow();
    await expect(database.insert(schema.projects).values({ ownerId: alice, name: "Invalid market", country: "FR" })).rejects.toThrow();
    await expect(database.insert(schema.projects).values({ ownerId: alice, name: "Invalid duration", durationSeconds: 7 })).rejects.toThrow();
    await expect(database.insert(schema.projects).values({ ownerId: alice, name: "   " })).rejects.toThrow();
  });

  it("cascades user deletion through projects and authentication records", async () => {
    const project = await service.create(alice, { name: "Owned campaign" });
    await database.insert(schema.session).values({ userId: alice, token: "test-session-token", expiresAt: new Date("2026-12-01") });
    await database.insert(schema.account).values({ userId: alice, providerId: "credential", accountId: alice, password: "hashed-password-fixture" });
    await database.delete(schema.user).where(eq(schema.user.id, alice));
    expect(await database.select().from(schema.projects).where(eq(schema.projects.id, project.id))).toEqual([]);
    expect(await database.select().from(schema.session)).toEqual([]);
    expect(await database.select().from(schema.account)).toEqual([]);
  });

  it("rejects duplicate provider identities and stores durable auth throttling counters", async () => {
    await database.insert(schema.account).values({ userId: alice, providerId: "credential", accountId: alice });
    await expect(database.insert(schema.account).values({ userId: bob, providerId: "credential", accountId: alice })).rejects.toThrow();
    await database.insert(schema.rateLimit).values({ key: "auth-test", count: 2, lastRequest: Date.now() });
    const [entry] = await database.select().from(schema.rateLimit);
    expect(entry?.count).toBe(2);
    expect(typeof entry?.lastRequest).toBe("number");
  });
});
