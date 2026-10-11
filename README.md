# UGCPROMAX Studio

UGCPROMAX Studio is an AI UGC advertising platform being built in reviewed milestones. The initial market is Moroccan e-commerce and Moroccan Darija. **This repository implements Phase 0: real authentication, a protected dashboard, and owner-scoped project CRUD.** It does not generate ads yet.

Project setup defaults to Morocco, Moroccan Darija, 24 seconds, and a vertical 9:16 format. URLs and creative preferences are saved as draft metadata. Product pages are not fetched and no AI or rendering service is called.

## Requirements

- Node.js 22.16 or later, as declared in `package.json`.
- pnpm 11.25.0, pinned by `packageManager`.
- A current Chromium browser for automated browser tests.
- A Neon PostgreSQL database and server-only authentication secret for the Neon/production path. Local PGlite development needs no external account.

## Run locally without external credentials

```powershell
pnpm install
pnpm dev:local
```

Open [http://localhost:3000](http://localhost:3000), create an account, and create a project. The local runner explicitly selects PGlite and stores real local PostgreSQL-compatible data under `.local/database`. Database initialization applies the committed migrations before the first database operation. The runner creates a persistent random development authentication secret in the ignored `.local` directory. This is development infrastructure; it does not demonstrate a live Neon connection.

Use one local server process per PGlite data directory. Stop the server before running a separate migration process against the same directory. Keep `.local` private: it contains local account/session data. `LOCAL_DATABASE_PATH` can select a different development data directory, and `PORT` changes the local server port.

## Configure Neon

Create a Neon project/database, then copy the template:

```powershell
Copy-Item .env.example .env.local
```

Fill `.env.local` with your Neon connection string, a random server-only secret, and the actual application origin. Generate a secret locally with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_DRIVER` | `neon` for production and Neon development; `pglite` only for explicit local development/tests |
| `DATABASE_URL` | Neon PostgreSQL connection string; required for the Neon driver |
| `BETTER_AUTH_SECRET` | Random authentication secret, at least 32 characters; keep stable for existing sessions |
| `BETTER_AUTH_URL` | Full application origin, `http://localhost:3000` in standard local development and your HTTPS origin in production |
| `LOCAL_DATABASE_PATH` | Optional PGlite development data directory, default `.local/database` |

Then run:

```powershell
pnpm db:migrate
pnpm dev
```

Do not commit `.env.local`, database contents, or secrets. Production must use Neon. PGlite is rejected when `NODE_ENV=production`; it is not suitable for Vercel's ephemeral filesystem or multiple application instances. No AI, storage, workflow, payment, or email service credentials are required by Phase 0.

## What is available

- Email/password sign-up, sign-in, and sign-out through Better Auth.
- Server-protected dashboard, useful empty/error states, and responsive dark UI.
- Create, list, view, edit, and delete draft projects, with persistence and server-side ownership enforcement.
- Runtime validation of names, product URLs, supported market/language, duration, and creative preferences.
- Drizzle schema and committed SQL migrations for authentication and projects.
- Unit/integration tests and browser tests for authentication, CRUD, and tenant isolation.

Passwords require at least 12 characters. Email verification, password recovery, OAuth, MFA, team accounts, product extraction, uploads, jobs, generation, rendering, billing, and administration are not implemented. Future feature controls are visibly unavailable. This foundation requires further launch work before a public commercial release.

## Project API

All routes require a valid server session. Project ownership comes from that session, never from submitted JSON.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/projects?page=1&pageSize=12` | List the caller's projects and pagination metadata |
| POST | `/api/projects` | Create a draft project |
| GET | `/api/projects/:id` | Read the caller's project |
| PATCH | `/api/projects/:id` | Update one or more editable fields |
| DELETE | `/api/projects/:id` | Delete the caller's project |

Success uses `{ "data": ... }`; application errors use `{ "error": { "code": "...", "message": "..." } }`. Better Auth's `/api/auth/*` endpoints follow Better Auth's own response format. Missing projects and another user's projects return the same not-found response. Unsupported JSON fields such as `ownerId` and `status` are rejected with 422. Mutations require the configured application `Origin` and JSON bodies no larger than 16 KiB.

```json
{
  "name": "Summer skincare launch",
  "productUrl": "https://example.com/product",
  "country": "MA",
  "language": "ary-MA",
  "durationSeconds": 24,
  "marketingAngle": "A simple everyday routine"
}
```

## Validation

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

Stop any existing development server before running browser tests. Playwright starts its own server and uses a fresh ignored `.local/e2e-db-*` PGlite directory per run, with unique test accounts. It does not call paid providers. The exact execution results from the implementation session will be recorded after verification completes; the presence of tests is not evidence of a passing run. Live Neon migration/connectivity requires your credentials and is reported separately.

## Structure and decisions

```text
src/app/                 Next.js pages, layouts, and API handlers
src/components/          Shared presentation and UI primitives
src/lib/                 Environment and HTTP helpers
src/modules/auth/        Better Auth and server-session helpers
src/db/                  Drizzle schema, connections, and migration runner
src/modules/projects/    Validation, project service, and owner-scoped queries
drizzle/                 Committed SQL migrations
tests/                   Vitest unit and persistence integration tests
e2e/                     Playwright user journeys and isolation checks
docs/                    Architecture, decisions, roadmap, future AI/cost rules
```

See [architecture](docs/ARCHITECTURE.md), [decisions](docs/DECISIONS.md), [roadmap](docs/ROADMAP.md), [AI integration status](docs/AI_MODELS.md), and [cost tracking](docs/COST_TRACKING.md). The chosen stack remains Next.js, strict TypeScript, Tailwind/shadcn, Neon/Drizzle, Better Auth, and Zod. Exact resolved dependency versions are pinned in `pnpm-lock.yaml`.

Phase 1, pending owner review, adds secure product extraction, source-backed facts, original product images, and a ProductBrief review screen. Stop after Phase 0; do not enable generation as part of that review.
# ugcpromax
