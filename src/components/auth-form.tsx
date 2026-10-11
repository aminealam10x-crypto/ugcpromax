"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react";
import { authClient } from "@/modules/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode, configured }: { mode: "sign-in" | "sign-up"; configured: boolean }) {
  const signup = mode === "sign-up";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const credentials = { email: String(form.get("email")), password: String(form.get("password")) };
    try {
      const result = signup ? await authClient.signUp.email({ ...credentials, name: String(form.get("name")) }) : await authClient.signIn.email(credentials);
      if (result.error) { setError(result.error.message || "Unable to sign in. Please try again."); setPending(false); return; }
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/dashboard";
    } catch { setError("Unable to reach your studio. Please try again."); setPending(false); }
  }
  return <div className="auth-form-wrap">
    <span className="eyebrow">YOUR CREATIVE WORKSPACE</span>
    <h1>{signup ? "Create your studio." : "Welcome back."}</h1>
    <p className="muted">{signup ? "A home for your products, ideas, and next great ad." : "Pick up where your next great idea left off."}</p>
    {!configured && <div className="notice" role="status"><strong>Connect your studio first</strong><p>Set your Neon and Better Auth environment variables, or run <code>pnpm dev:local</code> to use local PostgreSQL. See the README for setup.</p></div>}
    <form onSubmit={submit} className="form-stack">
      {signup && <div className="form-field"><label htmlFor="name">Full name</label><Input id="name" name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Your name" disabled={!configured || pending} /></div>}
      <div className="form-field"><label htmlFor="email">Email address</label><Input id="email" name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@yourbrand.com" disabled={!configured || pending} /></div>
      <div className="form-field"><label htmlFor="password">Password</label><Input id="password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={12} maxLength={128} required placeholder={signup ? "At least 12 characters" : "Enter your password"} disabled={!configured || pending} /></div>
      {error && <p role="alert" className="error-text">{error}</p>}
      <Button className="w-full" type="submit" disabled={pending || !configured}>{pending ? <LoaderCircle className="animate-spin" /> : null}{signup ? "Create account" : "Sign in"}<ArrowRight /></Button>
    </form>
    <p className="auth-switch">{signup ? "Already have a studio?" : "New to UGCPROMAX?"} <Link href={signup ? "/sign-in" : "/sign-up"}>{signup ? "Sign in" : "Create an account"}</Link></p>
    <p className="privacy-note"><LockKeyhole size={13} />Your projects are private to your account.</p>
  </div>;
}
