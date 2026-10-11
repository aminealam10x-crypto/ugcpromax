import { toNextJsHandler } from "better-auth/next-js";
import { assertJsonContentType, assertSameOrigin, readRequestBody, withApiError } from "@/lib/http";
import { getAuth } from "@/modules/auth/server";

export const runtime = "nodejs";

export function GET(request: Request): Promise<Response> {
  return withApiError(async () => {
    const handlers = toNextJsHandler(await getAuth());
    return handlers.GET(request);
  });
}

export function POST(request: Request): Promise<Response> {
  return withApiError(async () => {
    assertSameOrigin(request);
    // Better Auth's sign-out client sends a bodyless POST. Bound JSON when a body is present.
    let body: string | undefined;
    if (request.body) {
      assertJsonContentType(request);
      body = await readRequestBody(request);
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete("content-length");
    const boundedRequest = new Request(request.url, { method: "POST", headers: requestHeaders, body });
    const handlers = toNextJsHandler(await getAuth());
    return handlers.POST(boundedRequest);
  });
}
