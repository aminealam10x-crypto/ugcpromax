"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Link2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ProjectFormValues { id: string; name: string; productUrl: string | null; country: string; language: string; durationSeconds: number; marketingAngle: string | null }

export function ProjectForm({ project }: { project?: ProjectFormValues }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = { name: String(form.get("name")).trim(), productUrl: String(form.get("productUrl")).trim() || null, country: "MA", language: "ary-MA", durationSeconds: Number(form.get("durationSeconds")), marketingAngle: String(form.get("marketingAngle")).trim() || null };
    try {
      const response = await fetch(project ? `/api/projects/${project.id}` : "/api/projects", { method: project ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Unable to save your project.");
      if (!project) router.push(`/projects/${result.data.id}`);
      else { setMessage("Changes saved."); router.refresh(); }
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save your project."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="project-form">
    <div className="form-section-heading"><span className="section-number">01</span><div><h2>The starting point</h2><p>Give your idea a name and a product to work with.</p></div></div>
    <div className="form-field"><label htmlFor="project-name">Project name</label><Input id="project-name" name="name" required minLength={1} maxLength={100} placeholder="e.g. Summer skincare launch" defaultValue={project?.name} disabled={pending} /></div>
    <div className="form-field"><label htmlFor="product-url">Product URL <span>(optional)</span></label><div className="input-icon"><Link2 size={16} /><Input id="product-url" name="productUrl" type="url" maxLength={2048} placeholder="https://your-store.com/products/your-product" defaultValue={project?.productUrl || ""} disabled={pending} /></div><p className="field-help">Product web link used to extract product specifications and imagery above.</p></div>
    <div className="form-divider" />
    <div className="form-section-heading"><span className="section-number">02</span><div><h2>Make it local</h2><p>A story that speaks your customer’s language.</p></div></div>
    <div className="form-grid"><div className="form-field"><label htmlFor="country">Target market</label><select className="field" id="country" name="country" defaultValue="MA" disabled={pending}><option value="MA">🇲🇦 Morocco</option></select></div><div className="form-field"><label htmlFor="language">Language</label><select className="field" id="language" name="language" defaultValue="ary-MA" disabled={pending}><option value="ary-MA">Moroccan Darija</option></select></div></div>
    <div className="form-field"><label htmlFor="duration">Video duration</label><select className="field" id="duration" name="durationSeconds" defaultValue={project?.durationSeconds || 24} disabled={pending}><option value={16}>16 seconds</option><option value={24}>24 seconds · recommended</option><option value={32}>32 seconds</option></select><p className="field-help">Vertical 9:16 · Planned export at 1080 × 1920</p></div>
    <div className="form-divider" />
    <div className="form-section-heading"><span className="section-number">03</span><div><h2>Your creative direction</h2><p>Have an angle in mind? Leave a note for later.</p></div></div>
    <div className="form-field"><label htmlFor="angle">Marketing angle <span>(optional)</span></label><textarea className="field" id="angle" name="marketingAngle" maxLength={1000} rows={4} placeholder="e.g. A straightforward product demonstration in a natural home setting…" defaultValue={project?.marketingAngle || ""} disabled={pending} /></div>
    {error && <p role="alert" className="error-text">{error}</p>}{message && <p role="status" className="success-text">{message}</p>}
    <div className="form-actions"><span>Saved securely to your workspace</span><Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : project ? <Save /> : null}{project ? "Save changes" : "Create project"}{!project && <ArrowRight />}</Button></div>
  </form>;
}
