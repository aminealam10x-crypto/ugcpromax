import { Check, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/modules/auth/server";
export const metadata = { title: "Studio guide" };
const milestones = [
  ["00", "Your foundation", "Private accounts, a polished dashboard, and project briefs you can create, edit, and delete.", "Available now"],
  ["01", "Know your product", "Secure URL extraction, original product images, sourced facts, and a product brief you can review.", "Next milestone"],
  ["02", "Find your story", "Three differentiated marketing angles and a concise Moroccan Darija storyboard.", "Planned"],
  ["03–05", "Bring it to life", "Consistent creative references, budget-controlled video generation, quality review, and a finished MP4.", "Planned"],
  ["06–07", "Build and improve", "Credits, commercial tools, and quality and cost analytics grounded in actual production data.", "Planned"],
];
export default async function Guide() {
  await requireSession();
  return <><div className="page-heading"><div><span className="eyebrow">BUILT ONE MILESTONE AT A TIME</span><h1>A clear path to your next ad.</h1><p>What your studio can do today, and what comes next.</p></div></div><section className="roadmap-list">{milestones.map(([number, name, description, state], index) => <article className={`panel roadmap-item ${index === 0 ? "active" : ""}`} key={number}><span className="roadmap-number">{index === 0 ? <Check size={20} /> : number}</span><div><h2>{name}</h2><p>{description}</p></div><span className="draft-badge">{state}</span></article>)}</section><Button asChild className="mt-6"><Link href="/projects/new">Start your project <ArrowUpRight /></Link></Button></>;
}
