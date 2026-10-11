import Link from "next/link";
import { ArrowLeft, Clapperboard, Check } from "lucide-react";
import { ProjectForm } from "@/components/project-form";
import { requireSession } from "@/modules/auth/server";
export const metadata = { title: "New project" };
export default async function NewProject() {
  await requireSession();
  return <><Link href="/dashboard" className="back-link"><ArrowLeft size={15} />Back to overview</Link><div className="page-heading"><div><span className="eyebrow">A NEW BEGINNING</span><h1>Start with your product.</h1><p>Set the foundation for a story your audience will connect with.</p></div><span className="draft-badge">New project</span></div><div className="editor-grid"><section className="panel"><ProjectForm /></section><aside className="editor-aside"><div className="format-preview"><Clapperboard size={28} strokeWidth={1.3} /><span>Your product.<br />Your next story.</span><small>VERTICAL / 9:16</small></div><h3>A little direction goes a long way.</h3><p>Your brief is the starting point. You can come back and edit every detail.</p><ul className="check-list"><li><Check />Private to your account</li><li><Check />Editable anytime</li><li><Check />No generation charges</li></ul><div className="notice"><strong>Foundation release</strong><p>This step saves your project. Extraction, scripts, and video generation arrive in later milestones.</p></div></aside></div></>;
}
