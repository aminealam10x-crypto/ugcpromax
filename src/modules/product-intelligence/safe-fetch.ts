import { assertSafeUrl, SsrfError } from "./ssrf";

export interface SafeFetchOptions {
  maxRedirects?: number;
  maxBytes?: number;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  userAgent?: string;
}

export interface SafeFetchResult {
  html: string;
  finalUrl: string;
  statusCode: number;
  contentType: string;
}

export class SafeFetchError extends Error {
  constructor(
    message: string,
    public readonly code: "FETCH_FAILED" | "RESPONSE_TOO_LARGE" | "UNSUPPORTED_CONTENT_TYPE" | "REDIRECT_LIMIT_EXCEEDED" | "SSRF_VIOLATION",
    public readonly status = 400,
  ) {
    super(message);
    this.name = "SafeFetchError";
  }
}

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 UGCPROMAX-Studio/1.0 (+https://ugcpromax.studio)";

export async function safeFetch(targetUrl: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const maxRedirects = options.maxRedirects ?? 5;
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024; // 2 MB cap
  const timeoutMs = options.timeoutMs ?? 10_000;
  const fetchImpl = options.fetchFn ?? fetch;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;

  let currentUrl = targetUrl;
  let redirectsCount = 0;

  while (true) {
    let validatedUrl: URL;
    try {
      validatedUrl = await assertSafeUrl(currentUrl);
    } catch (err) {
      if (err instanceof SsrfError) {
        throw new SafeFetchError(err.message, "SSRF_VIOLATION", 400);
      }
      throw err;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(validatedUrl.toString(), {
        method: "GET",
        headers: {
          "User-Agent": userAgent,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.1",
          "Accept-Language": "fr-FR,fr;q=0.9,ar-MA;q=0.8,ar;q=0.7,en;q=0.6",
        },
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        throw new SafeFetchError("Request timed out after 10 seconds.", "FETCH_FAILED", 504);
      }
      throw new SafeFetchError(
        `Failed to reach product URL: ${err instanceof Error ? err.message : "network error"}`,
        "FETCH_FAILED",
        502,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle HTTP Redirects manually to re-run SSRF validation on every hop
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      redirectsCount++;
      if (redirectsCount > maxRedirects) {
        throw new SafeFetchError(`Exceeded maximum redirect limit of ${maxRedirects} hops.`, "REDIRECT_LIMIT_EXCEEDED", 400);
      }
      const location = response.headers.get("location");
      if (!location) {
        throw new SafeFetchError("Redirect missing Location header.", "FETCH_FAILED", 502);
      }
      // Resolve relative redirect against current URL
      try {
        currentUrl = new URL(location, validatedUrl).toString();
      } catch {
        throw new SafeFetchError(`Invalid redirect target: '${location}'`, "FETCH_FAILED", 400);
      }
      continue;
    }

    if (!response.ok) {
      throw new SafeFetchError(
        `Product server responded with HTTP status ${response.status} (${response.statusText}).`,
        "FETCH_FAILED",
        response.status >= 500 ? 502 : 400,
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const isHtmlOrText =
      contentType.includes("text/html") ||
      contentType.includes("application/xhtml+xml") ||
      contentType.includes("text/plain");

    if (!isHtmlOrText) {
      throw new SafeFetchError(
        `Unsupported content type '${contentType}'. Only HTML product pages are supported.`,
        "UNSUPPORTED_CONTENT_TYPE",
        415,
      );
    }

    const contentLengthHeader = response.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = Number.parseInt(contentLengthHeader, 10);
      if (!Number.isNaN(contentLength) && contentLength > maxBytes) {
        throw new SafeFetchError(
          `Page size (${Math.round(contentLength / 1024)} KB) exceeds the maximum allowed limit of ${Math.round(maxBytes / 1024)} KB.`,
          "RESPONSE_TOO_LARGE",
          413,
        );
      }
    }

    // Stream and cap reading
    if (!response.body) {
      const text = await response.text();
      return { html: text, finalUrl: validatedUrl.toString(), statusCode: response.status, contentType };
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytesRead = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          bytesRead += value.length;
          if (bytesRead > maxBytes) {
            await reader.cancel("Response size exceeded maximum byte limit");
            throw new SafeFetchError(
              `Response exceeded maximum byte limit of ${Math.round(maxBytes / 1024)} KB.`,
              "RESPONSE_TOO_LARGE",
              413,
            );
          }
          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Concatenate chunks
    const totalBuffer = new Uint8Array(bytesRead);
    let offset = 0;
    for (const chunk of chunks) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder("utf-8");
    const html = decoder.decode(totalBuffer);

    return {
      html,
      finalUrl: validatedUrl.toString(),
      statusCode: response.status,
      contentType,
    };
  }
}
