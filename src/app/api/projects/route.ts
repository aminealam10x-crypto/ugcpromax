import { ApiError, assertSameOrigin, jsonData, readJsonBody, withApiError } from "@/lib/http";
import { getSession } from "@/modules/auth/server";
import { createProjectsService } from "@/modules/projects/server";

export const runtime = "nodejs";

export function GET(request: Request): Promise<Response> {
  return withApiError(async () => {
    const session = await getSession(request.headers);
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue.");
    const service = await createProjectsService();
    const query = Object.fromEntries(new URL(request.url).searchParams);
    return jsonData(await service.list(session.user.id, query));
  });
}

export function POST(request: Request): Promise<Response> {
  return withApiError(async () => {
    assertSameOrigin(request);
    const session = await getSession(request.headers);
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue.");
    const input = await readJsonBody(request);
    const service = await createProjectsService();
    return jsonData(await service.create(session.user.id, input), 201);
  });
}
