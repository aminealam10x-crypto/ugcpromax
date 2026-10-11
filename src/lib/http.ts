import { EnvironmentError, getServerEnv } from "@/lib/env";
import { DomainError } from "@/modules/projects/errors";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const responseHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export function jsonData<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status, headers: responseHeaders });
}

export function apiErrorResponse(error: unknown, requestId = crypto.randomUUID()): Response {
  let failure: ApiError;
  if (error instanceof ApiError) {
    failure = error;
  } else if (error instanceof DomainError) {
    failure = error.code === "NOT_FOUND"
      ? new ApiError(404, "NOT_FOUND", "Project not found.")
      : new ApiError(422, "INVALID_INPUT", "Check the project details and try again.", error.fieldErrors);
  } else if (error instanceof EnvironmentError) {
    failure = new ApiError(503, "SERVICE_UNAVAILABLE", "The studio needs server configuration. Contact the administrator.");
  } else {
    failure = new ApiError(500, "INTERNAL_ERROR", "The request could not be completed. Please try again.");
    // Logs deliberately omit messages, stacks, headers, and SQL; these can contain secrets or personal data.
    console.error(JSON.stringify({ event: "api_request_failed", requestId, errorType: error instanceof Error ? error.name : "UnknownError" }));
  }
  return Response.json(
    { error: { code: failure.code, message: failure.message, ...(failure.fieldErrors ? { fieldErrors: failure.fieldErrors } : {}) } },
    { status: failure.status, headers: { ...responseHeaders, "X-Request-Id": requestId } },
  );
}

/** Cookie-authenticated mutations must originate from the configured public origin. */
export function assertSameOrigin(request: Request, expectedOrigin = getServerEnv().BETTER_AUTH_URL): void {
  if (request.headers.get("origin") !== expectedOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError(403, "FORBIDDEN", "This request must come from the studio.");
  }
}

export function assertJsonContentType(request: Request): void {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Send the request as application/json.");
  }
}

/** Enforce the byte limit while reading, including chunked requests without Content-Length. */
export async function readRequestBody(request: Request, maxBytes = 16_384): Promise<string> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) throw new ApiError(400, "INVALID_BODY", "Invalid request body length.");
    if (Number(declaredLength) > maxBytes) throw new ApiError(413, "BODY_TOO_LARGE", "The request body is too large.");
  }
  if (!request.body) throw new ApiError(400, "INVALID_BODY", "A JSON request body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new ApiError(413, "BODY_TOO_LARGE", "The request body is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(combined);
  } catch {
    throw new ApiError(400, "INVALID_BODY", "The request body must contain valid UTF-8 JSON.");
  }
}

export async function readJsonBody(request: Request, maxBytes = 16_384): Promise<unknown> {
  assertJsonContentType(request);
  const text = await readRequestBody(request, maxBytes);
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new ApiError(400, "INVALID_JSON", "The request body must be a JSON object.");
    }
    return parsed;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "INVALID_JSON", "The request body is not valid JSON.");
  }
}


export async function withApiError(handler: () => Promise<Response>): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const response = await handler();
    response.headers.set("X-Request-Id", requestId);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
