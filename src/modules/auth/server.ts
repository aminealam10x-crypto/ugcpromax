import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db/client";
import { account, rateLimit, session, user, verification } from "@/db/schema";
import { getServerEnv } from "@/lib/env";

async function createAuth() {
  const env = getServerEnv();
  const database = await getDatabase();

  return betterAuth({
    appName: "UGCPROMAX Studio",
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: drizzleAdapter(database, {
      provider: "pg",
      transaction: false,
      schema: { user, session, account, verification, rateLimit },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      // Phase 0 has no email delivery provider. Verification and recovery stay disabled.
      requireEmailVerification: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    advanced: {
      database: { generateId: "uuid" },
      useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://"),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
    disabledPaths: ["/request-password-reset", "/reset-password", "/send-verification-email", "/verify-email"],
    logger: {
      level: "warn",
      // Upstream errors can include SQL or credentials. Preserve event visibility without recording payloads.
      log: (level) => console.error(JSON.stringify({ event: "auth_log", level })),
    },
    plugins: [nextCookies()],
  });
}

type Auth = Awaited<ReturnType<typeof createAuth>>;
let authPromise: Promise<Auth> | undefined;

export function getAuth(): Promise<Auth> {
  authPromise ??= createAuth().catch((error: unknown) => {
    authPromise = undefined;
    throw error;
  });
  return authPromise;
}

/** Every authorization check reads the server session, including immediately revoked sessions. */
export async function getSession(requestHeaders?: Headers) {
  const auth = await getAuth();
  return auth.api.getSession({
    headers: requestHeaders ?? (await headers()),
    query: { disableCookieCache: true },
  });
}

export type AuthSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export async function requireSession(): Promise<AuthSession> {
  const currentSession = await getSession();
  if (!currentSession) redirect("/sign-in");
  return currentSession;
}
