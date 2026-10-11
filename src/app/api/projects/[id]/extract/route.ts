import { ApiError, assertSameOrigin, jsonData, readJsonBody, withApiError } from "@/lib/http";
import { getSession } from "@/modules/auth/server";
import { createProductIntelligenceService } from "@/modules/product-intelligence/server";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

export function POST(request: Request, context: RouteContext): Promise<Response> {
  return withApiError(async () => {
    assertSameOrigin(request);
    const session = await getSession(request.headers);
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue.");
    const { id } = await context.params;
    let url: string | undefined;
    try {
      const body = (await readJsonBody(request)) as { url?: string };
      if (body && typeof body.url === "string") {
        url = body.url;
      }
    } catch {
      // Body is optional if project already has a stored productUrl
    }
    const service = await createProductIntelligenceService();
    const brief = await service.extract(session.user.id, id, url);
    return jsonData(brief);
  });
}
