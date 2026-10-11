# Integration research for Phases 2–5

Researched on 2026-10-11. The owner explicitly authorized **no paid AI calls yet**. This document is research preparation, not evidence that a phase, provider integration, deployment, or generated advertisement works. No AI generation, transcription, account change, package installation, or remote workflow was performed for this research.

## Verified package metadata

The public npm registry `/<package>/latest` endpoints returned these versions and constraints. Pin and inspect the installed package's own docs/source when its phase begins; do not install future infrastructure merely because it appears here.

| Package | Version observed | Relevant compatibility |
| --- | --- | --- |
| `ai` | `7.0.137` | Node >=22; Zod 3.25.76 or 4.1.8+ |
| `@ai-sdk/gateway` | `4.0.110` | Node >=22 |
| `@trigger.dev/sdk` | `4.7.3` | Node >=18.20; peer support for AI SDK 7 and React 19 |
| `remotion`, `@remotion/renderer`, `@remotion/bundler`, `@remotion/player`, `@remotion/captions` | `4.0.534` each | Keep all Remotion package versions identical; React >=16.8 |
| `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | `3.1149.0` each | Node >=20 |

Sources: [npm AI SDK metadata](https://registry.npmjs.org/ai/latest), [Gateway metadata](https://registry.npmjs.org/@ai-sdk%2Fgateway/latest), [Trigger SDK metadata](https://registry.npmjs.org/@trigger.dev%2Fsdk/latest), [Remotion metadata](https://registry.npmjs.org/remotion/latest), [S3 client metadata](https://registry.npmjs.org/@aws-sdk%2Fclient-s3/latest).

## Structured planning, images, and audio

Use `generateText({ model, output: Output.object({ schema }), ... })` from `ai`, with a strict Zod schema and the parsed result in `result.output`. This is the current structured output surface. Runtime validation and domain rules must still reject unsupported claims or malformed storyboards. [AI SDK structured data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data).

Image API selection depends on the model: Gemini image-capable language models use `generateText` and `result.files`, filtered by `mediaType`; image-only models use `generateImage` and `result.images`. `google/gemini-3.1-flash-image-preview` is documented for the first path. Preserve original packaging/product images separately from generated creative references. [Gateway image APIs](https://vercel.com/docs/ai-gateway/modalities/image-generation/ai-sdk).

The current speech API is `generateSpeech({ model: gateway.speechModel(id), text, voice, outputFormat })`, with `result.audio.uint8Array`. Speech is beta and team access may differ. It does not establish talking-head lip sync or Moroccan Darija quality. [Gateway speech](https://vercel.com/docs/ai-gateway/modalities/text-to-speech).

The current transcription API is `transcribe({ model: gateway.transcriptionModel(id), audio })`. The documentation shows `openai/whisper-1` with `providerOptions.openai.timestampGranularities: ['word']`. Timings must come from actual audio, a reviewed alignment, or clearly labeled fixture timing; ordinary tests cannot call transcription providers. [Gateway transcription](https://vercel.com/docs/ai-gateway/modalities/speech-to-text).

## Video jobs and charging uncertainty

For durable submission, use `experimental_startVideo` and `experimental_getVideoStatus` from `ai`, available from AI SDK 7.0.76 / Gateway 4.0.61. Persist the JSON-serializable operation before polling. Status is `pending`, `completed`, or `error`; completed video entries may contain URLs, base64, or bytes. Status lookup neither downloads URL results nor imposes a timeout. Persist a stable application attempt key in the start request's `headers['idempotency-key']`; Gateway documents deduplicated starts. Async requests have a 300 KiB persisted payload ceiling and should use hosted media inputs. Result URLs expire and must be copied into private storage. Webhook starts expose a signing secret under `providerMetadata.gateway.asyncJob.webhookSigningSecret`; keep it server-only and verify raw signed payloads before processing. [Gateway video operations](https://vercel.com/docs/ai-gateway/modalities/video-generation).

The reviewed documentation does not establish a Gateway video cancellation API, refund semantics, or the lifetime of start-request deduplication. Application cancellation must therefore stop future work without claiming provider cancellation/refund. A timeout or network failure after submission means the charge may be uncertain: retain the reservation and reconcile the same attempt. Do not submit a replacement chargeable attempt just because the response was lost. This is an application design requirement inferred from the documented submission lifecycle, not a provider guarantee.

There is a material documentation mismatch to resolve before enabling reference generation: the async page requires hosted URLs, while the Veo reference page says HTTPS reference URLs are unsupported. The public catalog also advertises URL image inputs for Veo. Do not assume that this combination works without version-matched source inspection and a later authorized live probe. [Veo reference parameters](https://vercel.com/docs/ai-gateway/modalities/video-generation/reference-to-video).

Gateway budgets are soft caps: the request crossing the limit can finish. They cannot enforce the owner's strict per-job cap by themselves. Reserve a conservative maximum atomically in the application before each chargeable submission; keep ambiguous charges reserved until reconciled. [Gateway budget semantics](https://vercel.com/docs/ai-gateway/observability-and-spend/budgets).

For the current no-spend instruction, the application allowance is zero and every live AI adapter must reject before any network request, even if credentials happen to exist. Later live enablement needs a finite positive owner-approved cap plus an explicit server flag. Unknown pricing units, missing maximum output/token bounds, uncertain retry/fallback charges, or an uncomputable upper bound must fail closed. Seedance's catalog uses video-token pricing with minimum floors, so a cost-per-second guess is insufficient. Cost lookups are reconciliation, not advance authorization. Never report unknown actual cost as zero.

## Catalog candidates, all disabled

A read-only unauthenticated GET of the official `/v1/models` endpoint confirmed the IDs below. These are candidates, not enabled defaults, benchmark winners, team access checks, or live quality evidence. An eventual registry must store the source and verification date and default every record to `enabled: false` until explicit spending authorization and required capability validation exist.

| Task | Verified candidate ID | Metadata observed |
| --- | --- | --- |
| Structured text | `openai/gpt-5.4-mini` | Text output; text/image/PDF input; structured-output support |
| Creative image references | `google/gemini-3.1-flash-image-preview` | Text/image input and output |
| Video | `google/veo-3.1-generate-001` | 4/6/8 seconds, 9:16, native audio, references, 24 fps |
| Video | `google/veo-3.1-fast-generate-001` | 4/6/8 seconds, 9:16, native audio, references, 24 fps |
| Video | `bytedance/seedance-2.5` | 4–30 seconds, 9:16, native audio, hosted references, 24 fps |

The catalog's `video_capabilities` is more specific than the generic `modalities.input` field. Neither proves dialogue accuracy, consistent faces, accurate labels, supported rights, lip sync, or Darija pronunciation. Region/team availability and exact portrait resolution combinations require further verification. [Official live model catalog](https://ai-gateway.vercel.sh/v1/models), [text-to-video parameters](https://vercel.com/docs/ai-gateway/modalities/video-generation/text-to-video).

## Trigger.dev orchestration

Current imports use `@trigger.dev/sdk`. `task`/`schemaTask` define workers; `tasks.trigger(id, payload, options)` submits; `runs.retrieve(runId)` reads state; `runs.cancel(runId)` cancels Trigger execution and children. Cancellation does not establish cancellation of an already accepted external AI job. [Tasks](https://trigger.dev/docs/tasks/overview), [run APIs](https://trigger.dev/docs/runs).

Use `idempotencyKeys.create(attemptKey, { scope: 'global' })` for deduplication across parent runs. Since 4.3.1, raw keys inside tasks default to parent-run scope. Keys are isolated per task/environment and expire after 30 days by default, so a persistent unique application attempt record remains necessary. Do not confuse task-trigger idempotency with provider-request idempotency. [Idempotency](https://trigger.dev/docs/idempotency).

Poll persisted operations using `wait.for({ seconds })`, bounded by an application deadline. Trigger checkpoints waits; waits exceeding five seconds avoid compute charges, but waits shorter than 60 seconds retain concurrency slots. Begin chargeable submission tasks with `retry.maxAttempts: 1` until external side-effect deduplication/reconciliation is implemented and tested. Correction attempts require their own application attempt and budget reservation; set no more than two corrective regenerations. [Durable wait behavior](https://trigger.dev/docs/wait-for).

## Private R2 assets

Use `S3Client({ region: 'auto', endpoint: 'https://<account>.r2.cloudflarestorage.com', credentials })` on the server. `PutObjectCommand` stores bounded verified bytes; `GetObjectCommand` plus `getSignedUrl(client, command, { expiresIn })` grants temporary access after server-side ownership checks. Object keys must be derived from trusted user/project/asset records. Keep buckets private, never expose credentials, redact signed URLs from logs, and validate metadata/size before uploads. Presigned links are bearer access and expire between 1 second and 7 days. Scope browser CORS where needed. [Cloudflare S3 SDK examples](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/), [presigned URL semantics](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

## Real rendering without AI calls

Build a Remotion composition with `width={1080}`, `height={1920}`, `fps={24}`, and `durationInFrames={576}` for three eight-second scenes. The same component can run in `Player` with `compositionWidth`/`compositionHeight` and on a worker through `bundle`, `selectComposition`, and `renderMedia`. Use `codec: 'h264'`, `audioCodec: 'aac'`, `pixelFormat: 'yuv420p'`, and an `.mp4` output path. `makeCancelSignal` supplies render cancellation. Confirm actual duration, dimensions, audio presence, and codec through media inspection after rendering. [Composition](https://www.remotion.dev/docs/composition), [Player](https://www.remotion.dev/docs/player/player), [renderer](https://www.remotion.dev/docs/renderer/render-media).

Install/download the renderer's browser during setup rather than the first job using `ensureBrowser()`. Local rendering is real media processing and can be tested using deliberately labeled fixture clips/audio, without AI spending. Deployed Trigger rendering and R2 writes still need separate configured service verification. [Browser setup](https://www.remotion.dev/docs/miscellaneous/chrome-headless-shell).

Run production rendering on a dedicated long-lived Node worker with writable temporary disk, bounded CPU/memory/concurrency, installed browser dependencies, and the appropriate native binaries; submit work from the authenticated app instead of rendering inside a request handler. A self-hosted container is compatible with the documented SSR APIs and Docker setup. Keep job state in the database and final bytes in private R2, so worker-local disk is disposable. This is the proposed deployment design, not a deployed worker. [SSR APIs](https://www.remotion.dev/docs/ssr-node), [official Docker setup](https://www.remotion.dev/docs/docker).

Remotion's platform-specific `@remotion/compositor-*` package supplies FFmpeg, FFprobe, its Rust compositor, and associated libraries by default. Preserve native optional dependencies when packaging; inspect/probe using the matching binaries. A custom `binariesDirectory` must contain the required platform artifacts. Trigger's `ffmpeg()` build extension from `@trigger.dev/build/extensions/core` can provide separate system FFmpeg tooling for preprocessing, and its Puppeteer extension provides Chrome dependencies, but neither alone proves Remotion's full deployed runtime works. Verify a fixture render in the actual worker image. [Remotion binaries](https://www.remotion.dev/docs/options/binaries-directory), [Trigger FFmpeg extension](https://trigger.dev/docs/config/extensions/ffmpeg), [Trigger browser extension](https://trigger.dev/docs/config/extensions/puppeteer).

Load a bundled Arabic-capable font before rendering. Render logical Unicode text with `dir='rtl'` and isolate mixed-direction product names; never reverse strings. Phrase-level captions are a simpler initial way to preserve Arabic shaping. Word highlighting must preserve whitespace and connected text, then be visually inspected for ligatures, punctuation, clipping, and mixed Arabic/Latin text. Remotion caption utilities group supplied timings; they do not transcribe audio. [Font loading](https://www.remotion.dev/docs/fonts), [caption grouping](https://www.remotion.dev/docs/captions/create-tiktok-style-captions), [W3C text direction](https://www.w3.org/International/questions/qa-html-dir).

## Proposed phase gates

1. Finish Phase 0 checks and owner-scoped foundation verification.
2. Finish Phase 1 reviewed evidence and preserved original product assets.
3. Phase 2: typed, editable angles/script/storyboard; test providers remain fixtures and are labeled.
4. Phase 3: reviewed CharacterSpec and asset provenance/reuse; all paid reference generation disabled.
5. Phase 4: persist attempts/operations and budget reservations; test restart, duplicate, timeout, and isolation behavior using mocks. Keep production generation unavailable while spending is forbidden.
6. Phase 5: verify QC gates and render an explicitly labeled 24-second fixture MP4 with Arabic subtitles/CTA; implement private authorized downloads. A fixture render proves assembly only. The first complete generated advertisement, Darija dialogue fidelity, model QC, and live Neon/R2/Trigger evidence remain pending configured credentials and authorized live validation.
