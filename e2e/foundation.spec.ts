import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const password = "Local-test-password-42!";
const origin = `http://localhost:${process.env.PLAYWRIGHT_PORT || "3100"}`;

async function signUp(page: Page) {
  const email = `qa-${randomUUID()}@example.test`;
  await page.goto("/sign-up");
  await page.getByLabel("Full name", { exact: true }).fill("Studio QA");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
}

async function createProject(page: Page, name: string) {
  await page.goto("/projects/new");
  await page.getByLabel("Project name", { exact: true }).fill(name);
  await page.getByLabel("Product URL (optional)", { exact: true }).fill("https://example.com/product");
  await page.getByLabel("Marketing angle (optional)", { exact: true }).fill("A simple daily routine");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible();
  return page.url().split("/").at(-1)!;
}

test("protected pages and project APIs reject unauthenticated requests", async ({ page, request }) => {
  for (const path of ["/dashboard", "/projects/new", "/guide", "/settings", `/projects/${randomUUID()}`]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
  }

  const list = await request.get("/api/projects");
  expect(list.status()).toBe(401);
  expect(await list.json()).toMatchObject({ error: { code: "UNAUTHORIZED" } });

  const create = await request.post("/api/projects", {
    data: { name: "Unauthenticated project" },
    headers: { Origin: origin },
  });
  expect(create.status()).toBe(401);

  const id = randomUUID();
  expect((await request.get(`/api/projects/${id}`)).status()).toBe(401);
  expect(
    (await request.patch(`/api/projects/${id}`, { data: { name: "Unauthorized" }, headers: { Origin: origin } }))
      .status(),
  ).toBe(401);
  expect((await request.delete(`/api/projects/${id}`, { headers: { Origin: origin } })).status()).toBe(401);
});

test("a user can register, create and edit a persisted draft, sign in again, and delete it", async ({ page }) => {
  const email = await signUp(page);
  await page.screenshot({ path: "test-results/foundation-dashboard.png", fullPage: true });
  const originalName = `Darija launch ${randomUUID().slice(0, 8)}`;
  const updatedName = `${originalName} revised`;

  await page.getByRole("link", { name: "New project", exact: true }).first().click();
  await expect(page).toHaveURL(/\/projects\/new$/);
  const id = await createProject(page, originalName);

  await expect(page.getByLabel("Target market", { exact: true })).toHaveValue("MA");
  await expect(page.getByLabel("Language", { exact: true })).toHaveValue("ary-MA");
  await expect(page.getByLabel("Video duration", { exact: true })).toHaveValue("24");

  await page.getByLabel("Project name", { exact: true }).fill(updatedName);
  await page.getByLabel("Video duration", { exact: true }).selectOption("32");
  await page.getByLabel("Marketing angle (optional)", { exact: true }).fill("A careful product demonstration");
  const updateResponse = page.waitForResponse(
    (response) => response.url().endsWith(`/api/projects/${id}`) && response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await updateResponse).status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: updatedName, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(updatedName);
  await expect(page.getByLabel("Video duration", { exact: true })).toHaveValue("32");
  await expect(page.getByLabel("Marketing angle (optional)", { exact: true })).toHaveValue(
    "A careful product demonstration",
  );
  await page.screenshot({ path: "test-results/foundation-project.png", fullPage: true });

  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
  expect((await page.request.get("/api/projects")).status()).toBe(401);

  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Incorrect-password-42!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("link", { name: updatedName }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${id}$`));

  await page.getByRole("button", { name: "Delete project", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Delete this project?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await page.request.get(`/api/projects/${id}`)).status()).toBe(200);
  await page.getByRole("button", { name: "Delete project", exact: true }).click();
  await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: updatedName })).toHaveCount(0);
  expect((await page.request.get(`/api/projects/${id}`)).status()).toBe(404);
});

test("two users cannot list, read, update, or delete each other's projects", async ({ browser }) => {
  const ownerContext = await browser.newContext({ baseURL: origin });
  const otherContext = await browser.newContext({ baseURL: origin });

  try {
    const owner = await ownerContext.newPage();
    const other = await otherContext.newPage();
    await signUp(owner);
    const ownerName = `Private owner project ${randomUUID().slice(0, 8)}`;
    const ownerId = await createProject(owner, ownerName);
    await signUp(other);
    const otherName = `Private second project ${randomUUID().slice(0, 8)}`;
    const otherId = await createProject(other, otherName);

    const listed = await other.request.get("/api/projects");
    expect(listed.status()).toBe(200);
    const listBody = (await listed.json()) as { data: { items: { id: string; name: string }[]; total: number } };
    expect(listBody.data.total).toBe(1);
    expect(listBody.data.items.map((project) => project.id)).toEqual([otherId]);
    expect(JSON.stringify(listBody)).not.toContain(ownerName);

    const inaccessible = await other.request.get(`/api/projects/${ownerId}`);
    const missing = await other.request.get(`/api/projects/${randomUUID()}`);
    expect(inaccessible.status()).toBe(404);
    expect(await inaccessible.json()).toEqual(await missing.json());
    expect(
      (
        await other.request.patch(`/api/projects/${ownerId}`, {
          data: { name: "Attempted takeover" },
          headers: { Origin: origin },
        })
      ).status(),
    ).toBe(404);
    expect((await other.request.delete(`/api/projects/${ownerId}`, { headers: { Origin: origin } })).status()).toBe(
      404,
    );

    await other.goto(`/projects/${ownerId}`);
    await expect(other.getByRole("heading", { level: 1, name: ownerName, exact: true })).toHaveCount(0);
    const afterAttack = await owner.request.get(`/api/projects/${ownerId}`);
    expect(afterAttack.status()).toBe(200);
    expect(await afterAttack.json()).toMatchObject({ data: { id: ownerId, name: ownerName, status: "draft" } });

    const rejectedOwnership = await other.request.post("/api/projects", {
      data: { name: "Client-selected owner", ownerId: randomUUID() },
      headers: { Origin: origin },
    });
    expect(rejectedOwnership.status()).toBe(422);

    const rejectedOrigin = await other.request.patch(`/api/projects/${otherId}`, {
      data: { name: "Cross-origin mutation" },
      headers: { Origin: "https://untrusted.example" },
    });
    expect(rejectedOrigin.status()).toBe(403);

    const malformed = await other.request.post("/api/projects", {
      data: '{"name":',
      headers: { Origin: origin, "Content-Type": "application/json" },
    });
    expect(malformed.status()).toBe(400);

    const oversized = await other.request.post("/api/projects", {
      data: { name: "Too much data", marketingAngle: "x".repeat(20_000) },
      headers: { Origin: origin },
    });
    expect(oversized.status()).toBe(413);

    expect((await owner.request.delete(`/api/projects/${ownerId}`, { headers: { Origin: origin } })).status()).toBe(
      200,
    );
    expect((await other.request.delete(`/api/projects/${otherId}`, { headers: { Origin: origin } })).status()).toBe(
      200,
    );
  } finally {
    await ownerContext.close();
    await otherContext.close();
  }
});
