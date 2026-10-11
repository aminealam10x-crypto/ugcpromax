"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/modules/auth/client";
import { Button } from "@/components/ui/button";

export function SignOut() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <div><Button aria-label="Sign out" variant="ghost" size="icon" disabled={pending} onClick={async () => {
    setPending(true); setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign out failed. Please try again.");
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/sign-in";
    } catch { setError("Could not sign out. Try again."); setPending(false); }
  }}><LogOut size={17} /></Button>{error && <p className="error-text" role="alert">{error}</p>}</div>;
}
