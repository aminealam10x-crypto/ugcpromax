import type { ReactNode } from "react";
import { requireSession } from "@/modules/auth/server";
import { StudioShell } from "@/components/studio-shell";
export const dynamic = "force-dynamic";
export default async function StudioLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  return <StudioShell user={session.user} local={process.env.DATABASE_DRIVER === "pglite"}>{children}</StudioShell>;
}
