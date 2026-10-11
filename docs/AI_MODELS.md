# AI model integration status

Phase 0 has no AI integration, enabled model, model registry table, provider credential, generation adapter, paid test, or generated media. No model IDs or capabilities are assumed. The dashboard's generation controls remain unavailable.

## Direction for later phases

Use Vercel AI Gateway and Vercel AI SDK first. Keep application domain code independent of provider-specific APIs. Introduce typed provider interfaces only when their phase needs them: text, image, video, audio, and transcription.

Before enabling a model, verify its current official model ID, API, availability, region, input/output modalities, reference image support, portrait output, supported durations, native audio, resolution, pricing, and asynchronous operation behavior. Persist the verification date and source. An eight-second portrait talking-head clip with audio requires evidence of each required capability; a model being described as “video” is insufficient.

## Future registry record

The registry will contain provider, model ID, task, enabled status, verified capabilities and limits, pricing currency/unit/effective date, availability, historical QC acceptance, and latency. Hard capability requirements filter candidates before ranking by total cost, accepted-output quality, and availability.

Persist the selected model, exact configuration, prompt version, and provider operation ID for each attempt. Stable selection within a job and compatible fallbacks matter more than random model rotation. Failed scenes can be retried independently within the approved cap. Keep successful references for reuse.

## Validation required before live generation

Use mock provider implementations and realistic fixtures first. Live calls need deliberate opt-in, valid server-only credentials, a known spending cap, idempotency, durable operation tracking, and private result storage. Record measured cost, latency, product accuracy, character continuity, and dialogue fidelity; do not invent benchmark results.

Model routing and the first real clip belong to Phase 4. Earlier text/reference phases may introduce only the integrations needed for their specific approved milestone. Review current official [AI Gateway documentation](https://vercel.com/docs/ai-gateway) and [AI SDK documentation](https://ai-sdk.dev/docs/introduction) when beginning those phases; no later-phase API was implemented or verified by this foundation work.
