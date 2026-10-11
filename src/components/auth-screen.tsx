import { Clapperboard, ArrowUpRight, Check, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";
import { isDatabaseConfigured } from "@/lib/env";

export function AuthScreen({ mode }: { mode: "sign-in" | "sign-up" }) {
  return <main className="auth-screen"><section className="auth-story"><Brand /><div className="auth-story-content"><span className="tag"><Sparkles size={13} />BUILT FOR YOUR NEXT BIG IDEA</span><h2>Small product.<br />Big possibilities.</h2><p>A thoughtful workspace for creating authentic product stories. Starting with Morocco. Built to go further.</p><div className="story-graphic" aria-hidden="true"><div className="story-orbit" /><div className="story-card back"><span>01 / THE PRODUCT</span><div className="abstract-product" /></div><div className="story-card front"><div className="graphic-top"><Clapperboard /><ArrowUpRight /></div><span className="graphic-title">Made for<br />your market.</span><div className="graphic-bottom"><span className="morocco-dot" />Morocco · Darija<Check size={14} /></div></div></div></div><div className="auth-story-footer"><span>UGCPROMAX STUDIO</span><span>CREATE WITH INTENTION.</span></div></section><section className="auth-form-side"><div className="mobile-brand"><Brand /></div><AuthForm mode={mode} configured={isDatabaseConfigured()} /><span className="auth-version">Foundation release · Phase 0</span></section></main>;
}
