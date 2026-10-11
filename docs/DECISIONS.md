# Architecture decisions

## ADR 001 — Start with a modular monolith

Date: 2026-10-11. Status: accepted for Phase 0.

Use one Next.js application with separate presentation, authentication, project domain, and database modules. Route handlers serve the project API. This keeps deployment and local operation simple while preserving boundaries for later workflows and provider adapters. No separate API service, agent framework, renderer, or worker is needed for Phase 0.

## ADR 002 — Neon in production; explicit PGlite locally

Date: 2026-10-11. Status: accepted local-development addition to the approved stack.

The production database remains Neon PostgreSQL through Drizzle. This environment has no supplied Neon connection string. Add an explicit `DATABASE_DRIVER=pglite` development/test mode to exercise actual PostgreSQL-compatible queries, migrations, password accounts, sessions, and ownership without external credentials. PGlite is local persistence, not a mock Neon response.

Use the same Drizzle table schema and SQL migrations for both drivers. Never select PGlite as a hidden fallback after a Neon error. Production requires `DATABASE_DRIVER=neon` and a valid `DATABASE_URL`. Local PGlite is single-process development infrastructure and must not be deployed on ephemeral serverless filesystems or shared by independent server processes. A local test pass does not establish live Neon connectivity, cloud latency, or production concurrency behavior. [Drizzle documents both Neon and PGlite drivers.](https://orm.drizzle.team/docs/connect-neon) [PGlite supports filesystem persistence in Node.](https://orm.drizzle.team/docs/connect-pglite)

## ADR 003 — Better Auth owns identity and sessions

Date: 2026-10-11. Status: accepted for Phase 0.

Use Better Auth's email/password flow, Drizzle adapter, and Next.js route handler integration. Store identity, account credentials, and sessions in its required tables; do not build a parallel password/session implementation. Protected server pages and project APIs resolve the session server-side. The client never selects an owner. Better Auth supplies the [Next.js handler integration](https://better-auth.com/docs/integrations/next) and [PostgreSQL Drizzle adapter](https://better-auth.com/docs/adapters/drizzle).

Email delivery, email verification, password reset, OAuth, MFA, and organization/team accounts are outside Phase 0. Public commercial launch requires a deliberate identity and account recovery milestone rather than implying these features exist.

The Neon HTTP driver does not provide interactive transactions. Better Auth's Drizzle adapter disables its transaction wrapper for that driver. Phase 0 has no financial ledger; future atomic accounting must deliberately choose a supported transaction strategy and verify failure behavior before charging money.

## ADR 004 — Project ownership is enforced in persistence queries

Date: 2026-10-11. Status: accepted for Phase 0.

Each project has one owning Better Auth user. List queries are scoped to that user. Reads, updates, and deletes use both project ID and owner ID in their database predicate. Return not found for another user's project so IDs do not disclose project existence. Foreign keys and indexes support the ownership relation. Tests must cover separate authenticated users and unauthenticated requests.

## ADR 005 — Store project setup without fetching or generating

Date: 2026-10-11. Status: accepted for Phase 0.

Project CRUD saves metadata and validated public product URLs. It does not fetch a URL, extract claims, upload assets, call a model, start a background job, or charge a user. Generation remains visibly unavailable. This prevents accidentally introducing SSRF or spending paths before the phases that implement their controls. Defaults reflect the initial Moroccan Darija market and 24-second vertical ad format.

## ADR 006 — Migrations and independent verification

Date: 2026-10-11. Status: accepted for Phase 0.

Keep committed SQL migrations. Production setup applies them deliberately; do not make destructive runtime schema synchronization part of request handling. Tests use a dedicated local database and real Drizzle queries. Playwright covers the complete authentication/CRUD/isolation flow; Vitest covers domain validation and database behavior. Paid integrations are never part of ordinary validation. [Playwright supports starting a dedicated local web server for browser tests.](https://playwright.dev/docs/test-webserver)

## ADR 007 — Anti-SSRF safe fetch and product brief persistence

Date: 2026-10-11. Status: accepted for Phase 1.

Product extraction fetches public store URLs to extract structured product facts (title, description, price, currency in MAD, brand, selling points, and original imagery). To protect against server-side request forgery (SSRF), DNS rebinding, and denial-of-service, all fetching enforces:
- Strict HTTP/HTTPS protocol validation and rejection of user credentials or non-standard ports.
- Comprehensive blocking of private and reserved IPv4/IPv6 CIDRs, including cloud metadata (169.254.169.254) and loopback addresses.
- Multi-address DNS resolution inspection across dual-stack records.
- Safe manual redirect following with SSRF re-evaluation per hop (up to 5 redirects).
- Bounded response stream reading (2 MB limit, 10s timeout).
- Dedicated product brief table (`product_briefs`) scoped to project ownership.
- Client review UI for fact approval before downstream creative generation.

## Documentation verification

Integration documentation was reviewed on 2026-10-11. Exact installed versions are locked in `pnpm-lock.yaml`; `package.json` is the version and script source of truth. Do not assume a documentation site's latest prerelease examples imply permission to upgrade this repository to prerelease dependencies. Reverify official APIs when updating dependencies or implementing a new integration.
