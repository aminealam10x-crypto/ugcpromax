# Cost tracking and spending controls

Phase 0 performs authentication and project CRUD. It makes no paid model calls, creates no credit balance, records no fabricated spend, and starts no renderer. Database or hosting accounts may have their own service charges; these are separate from an implemented generation-cost ledger. No paid integration test is enabled.

## Required before generation

Each future project/job must have an estimated cost, maximum authorized spend, actual cost, step-level costs, retry count, and immutable model usage records. Use explicit currencies and integer minor units or precise database numeric types; never use binary floating point for financial balances.

Reserve available budget atomically before an expensive provider call. Give each chargeable attempt a stable idempotency key. Retries, duplicate webhooks, worker restarts, and ambiguous provider responses must not create duplicate work or charges. Reconcile provider-reported actual usage against the reservation, and keep uncertainty explicit until it can be resolved.

Credit and usage accounting belongs on the server and requires atomic database operations. Do not infer a balance from frontend state. Never purchase credits, upgrade a provider plan, or exceed a spending cap automatically.

## Retry and efficiency policy

Default to no more than two corrective regeneration attempts per failed clip. Include those attempts in the spending estimate and cap. Stop with a truthful budget-exceeded or approval-required state when necessary. Regenerate failed scenes independently, reuse approved character references and product assets, and avoid duplicate extraction or rendering.

Optimize total cost per accepted output rather than the lowest individual request price. Track submitted attempts, accepted clips, rejected clips, retry cost, human-review outcomes, latency, and final render cost. Automated quality scores are estimates; compare them with human judgments.

## Deferred persistence

Introduce model usage and generation-attempt records when generation starts. Introduce the credit ledger and payment integration in Phase 6. Do not add empty financial tables to Phase 0 or present placeholder values as real usage.

## Test policy

Ordinary unit, integration, and browser tests run without provider spending. Later paid tests must require an explicit flag, isolated credentials, a small enforced budget, and a report of actual cost. Mock results and live results must be labeled separately.
