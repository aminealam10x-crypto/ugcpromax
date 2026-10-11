import { ApiError, assertSameOrigin, jsonData, readJsonBody, withApiError } from "@/lib/http";
import { getSession } from "@/modules/auth/server";
import { createProductIntelligenceService } from "@/modules/product-intelligence/server";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

export function GET(request: Request, context: RouteContext): Promise<Response> {
  return withApiError(async () => {
    const session = await getSession(request.headers);
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue.");
    const { id } = await context.params;
    const service = await createProductIntelligenceService();
    const brief = await service.getBrief(session.user.id, id);
    return jsonData(brief);
  });
}

export function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return withApiError(async () => {
    assertSameOrigin(request);
    const session = await getSession(request.headers);
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue.");
    const { id } = await context.params;
    const input = await readJsonBody(request);
    const service = await createProductIntelligenceService();
    const updated = await service.updateBrief(session.user.id, id, input);
    return jsonData(updated);
  });
}
