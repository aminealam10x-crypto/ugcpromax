import { ApiError, assertSameOrigin, jsonData, readJsonBody, withApiError } from "@/lib/http";
import { getSession } from "@/modules/auth/server";
import { createProjectsService } from "@/modules/projects/server";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

export function GET(request: Request, context: RouteContext): Promise<Response> {
  return withApiError(async () => {
    const session = await getSession(request.headers);
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue.");
    const { id } = await context.params;
    const service = await createProjectsService();
    return jsonData(await service.get(session.user.id, id));
  });
}

export function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return withApiError(async () => {
    assertSameOrigin(request);
    const session = await getSession(request.headers);
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue.");
    const { id } = await context.params;
    const input = await readJsonBody(request);
    const service = await createProjectsService();
    return jsonData(await service.update(session.user.id, id, input));
  });
}

export function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return withApiError(async () => {
    assertSameOrigin(request);
    const session = await getSession(request.headers);
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue.");
    const { id } = await context.params;
    const service = await createProjectsService();
    await service.delete(session.user.id, id);
    return jsonData({ id });
  });
}
