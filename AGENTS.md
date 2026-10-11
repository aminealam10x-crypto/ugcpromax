# UGCPROMAX Studio engineering instructions

## Scope and sequence

Build one phase at a time. Phase 0 is the current milestone: authentication, the dashboard, project CRUD, persistence, environment configuration, and tests. Stop for the owner's review before Phase 1. Do not add paid AI calls, media generation, credits, payments, extraction, uploads, background workers, or tables for later phases during Phase 0.

Read `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/ROADMAP.md` before changing the application. Keep these documents accurate when behavior changes. Never claim an unrun check or integration succeeded.

## Stack and organization

- Use pnpm, Next.js App Router, strict TypeScript, React, Tailwind CSS, shadcn/ui patterns, and Lucide.
- Use Neon PostgreSQL and Drizzle for production persistence, Better Auth for authentication, and Zod at runtime boundaries.
- PGlite is an explicit local development and test option. It must never silently replace Neon in production or be described as a verified live Neon connection.
- Keep route handlers and UI thin. Project validation and ownership rules belong in the domain layer; database access belongs in persistence modules.
- Verify current integration APIs against official documentation before implementing a new integration. Record consequential changes in `docs/DECISIONS.md`.
- Introduce new infrastructure and schemas when the current phase needs them. Do not build speculative provider abstractions or unrelated microservices.

## Security and correctness

- Derive project ownership from the server session. Never trust a client-supplied user or owner ID.
- Apply the owner predicate to project reads, writes, lists, and deletes. Return the same not-found response for missing projects and projects owned by someone else.
- Require server-side authentication for every protected route and API. UI visibility is not authorization.
- Keep credentials server-side, out of logs, fixtures, screenshots, and Git. Commit only credential-free environment templates.
- Validate project URLs as user input. Phase 0 stores URLs without fetching them. Any future URL fetching must add SSRF and redirect defenses first.
- Handle malformed bodies, validation errors, and unavailable infrastructure with structured responses. Do not expose database errors or session secrets to clients.
- Do not run destructive migrations or reset a user's database to make tests pass. Tests use a dedicated local database.

## Product honesty

- Every active control must perform a real supported action. Clearly disable future features and explain the milestone that enables them.
- Never simulate completed generation, invent media, show fabricated usage, or imply that saved URLs have been extracted.
- Default projects to Morocco, Moroccan Darija, vertical 9:16, and 24 seconds. Keep localization fields explicit so future markets do not require a schema redesign.
- Use accessible labels, keyboard focus, useful validation messages, empty states, and responsive layouts.

## Validation

Run the relevant checks after meaningful changes: TypeScript, lint, unit and integration tests, Playwright, and a production build. Browser tests must exercise real authentication and project persistence and include two-user isolation. Report exact pass/fail counts and unresolved limitations.

Ordinary tests must not spend money. Paid provider tests require deliberate opt-in and a spending cap when later phases introduce them. Start with mock providers for external integrations, and label mock and live evidence separately.

## Future integration requirements

The approved future stack is Vercel AI Gateway and AI SDK, typed provider-independent agents, Trigger.dev durable workflows, private Cloudflare R2 objects, and Remotion rendering. Preserve this direction; do not install or implement these systems in Phase 0. Consult `docs/AI_MODELS.md` and `docs/COST_TRACKING.md` before starting generation work.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
