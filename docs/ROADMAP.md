# Development roadmap

This roadmap follows the owner's master engineering directive. Work progresses in this order. Completion of a phase requires verified behavior and review before starting the next phase.

| Phase | Milestone | Scope | Status |
| --- | --- | --- | --- |
| 0 | Foundation | Approved web stack, Neon/Drizzle integration, Better Auth, dashboard, owner-scoped project CRUD, environment setup, tests | Completed |
| 1 | Product Intelligence | Secure product URL extraction, original images, evidence-backed ProductBrief, review UI, mock and live integration tests | Completed and verified |
| 2 | Marketing Intelligence | Three distinct angles, Moroccan Darija script, typed storyboard, script review | Not started |
| 3 | Creative References | CharacterSpec, consistent references, real product imagery, private asset storage and reuse | Not started |
| 4 | Video Generation | Capability registry/router, AI Gateway adapter, durable jobs, R2 persistence, first real eight-second clip, recorded cost and latency | Not started |
| 5 | Quality and Rendering | QC, capped corrective attempts, Remotion, Arabic subtitles, CTA, 24-second MP4 and downloads | Not started |
| 6 | Commercial SaaS | Atomic credit ledger, quotas, allocation, market-appropriate payments, admin operations | Not started |
| 7 | Optimization | Benchmarks, cost/quality analytics, tested fallbacks, caching, more dialects and variations | Not started |

## Phase 0 acceptance criteria

- A fresh clone has documented local setup and a credential-free environment template.
- Users can register, sign in, sign out, and return to a protected dashboard.
- Authenticated users can create, list, view, edit, and delete their own projects.
- Another user's ID does not grant read, edit, or delete access.
- Data persists in the explicitly selected database. Local PGlite and production Neon evidence are identified separately.
- Input validation and error states are useful, consistent, and server-enforced.
- Future generation controls are disabled and project status is truthful.
- TypeScript, lint, tests, browser verification, and production build have an exact recorded outcome.

## Phase 1 plan, pending review

Add a product-intelligence module with typed input and output. Fetch product pages only after introducing URL/DNS/IP checks, private-network rejection, safe redirect handling, request limits, and tests for malicious targets. Treat fetched text as untrusted evidence; never turn page instructions into agent instructions.

Extract structured metadata and source-backed product facts. Preserve original product images rather than generating replacement packaging. Add product/source/asset tables only as required, with project ownership enforced through each access path. Keep binary files out of PostgreSQL and use private R2 objects with bounded uploads and signed access.

Provide a review screen for missing or ambiguous facts. Begin with realistic fixtures and mock extraction tests, then deliberately enable a live integration check. Phase 1 does not authorize paid video or image generation.

## Review boundary

Phase 0 ends after reporting implemented behavior, actual checks, required credentials, run instructions, limitations, and the Phase 1 outline. The owner must review before Phase 1 implementation starts.
