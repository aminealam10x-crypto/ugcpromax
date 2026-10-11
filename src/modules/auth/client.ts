"use client";

import { createAuthClient } from "better-auth/react";

// Same-origin requests keep the public URL out of the browser bundle and support local development.
export const authClient = createAuthClient();
