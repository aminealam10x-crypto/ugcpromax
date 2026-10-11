import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LockKeyhole, Sparkles, FileText, Clapperboard, CheckCircle2, Clock } from "lucide-react";
import { requireSession } from "@/modules/auth/server";
import { createProjectsService } from "@/modules/projects/server";
import { createProductIntelligenceService } from "@/modules/product-intelligence/server";
import { DomainError } from "@/modules/projects/errors";
import { ProjectForm } from "@/components/project-form";
import { ProductBriefView } from "@/components/product-brief-view";
import { DeleteProject } from "@/components/delete-project";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Project workspace" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const project = await (async () => {
    try {
      return await (await createProjectsService()).get(session.user.id, id);
    } catch (error) {
      if (error instanceof DomainError && (error.code === "NOT_FOUND" || error.code === "INVALID_INPUT")) {
        notFound();
      }
      throw error;
    }
  })();

  const brief = await (async () => {
    try {
      return await (await createProductIntelligenceService()).getBrief(session.user.id, id);
    } catch {
      return null;
    }
  })();

  return (
    <>
      <Link href="/dashboard#projects" className="back-link">
        <ArrowLeft size={15} /> All projects
      </Link>

      <div className="page-heading">
        <div>
          <span className="eyebrow">PROJECT WORKSPACE</span>
          <h1 className="project-title">{project.name}</h1>
          <p>Morocco · Moroccan Darija · {project.durationSeconds} seconds · Vertical 9:16</p>
        </div>
        <div className="flex items-center gap-2">
          {brief?.status === "reviewed" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-700/60">
              <CheckCircle2 size={12} /> Brief Reviewed
            </span>
          ) : brief ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium bg-amber-950/40 text-amber-400 border border-amber-700/60">
              <Clock size={12} /> Needs Review
            </span>
          ) : null}
          <span className="draft-badge">Draft</span>
        </div>
      </div>

      <div className="workspace-tabs">
        <span className="current">
          <FileText size={15} /> Project brief
        </span>
        <span title="Coming in Phase 2 milestone">
          <LockKeyhole size={12} /> Marketing angles
        </span>
        <span title="Coming in Phase 2 milestone">
          <LockKeyhole size={12} /> Storyboard
        </span>
        <span title="Coming in Phase 4 milestone">
          <LockKeyhole size={12} /> Production
        </span>
      </div>

      <div className="editor-grid">
        <div className="space-y-8">
          {/* Phase 1: Product Intelligence & Fact Extraction */}
          <section className="panel p-6">
            <ProductBriefView
              projectId={project.id}
              productUrl={project.productUrl}
              initialBrief={brief}
            />
          </section>

          {/* Project Settings / Creative Direction */}
          <section className="panel">
            <ProjectForm project={project} />
          </section>
        </div>

        <aside className="editor-aside">
          <div className="format-preview">
            <Clapperboard size={28} strokeWidth={1.3} />
            <span>
              A story
              <br />
              in the making.
            </span>
            <small>YOUR VIDEO WILL LIVE HERE</small>
          </div>

          <h3>{brief ? "Product intelligence active" : "Your brief is ready to shape."}</h3>
          <p>
            {brief
              ? `Extracted ${brief.features.length} product facts and ${brief.imageUrls.length} images. Next milestone (Phase 2) will generate marketing angles.`
              : "Save your product URL and extract authentic product facts to prepare for marketing angles."}
          </p>

          <Button className="w-full" disabled>
            <Sparkles size={14} /> Generate video · Coming later
          </Button>
          <p className="field-help">Production is enabled in Phase 4.</p>

          <div className="project-meta">
            <span>
              Created
              <strong>
                {project.createdAt.toLocaleDateString("en-GB", { timeZone: "Africa/Casablanca" })}
              </strong>
            </span>
            <span>
              Last updated
              <strong>
                {project.updatedAt.toLocaleDateString("en-GB", { timeZone: "Africa/Casablanca" })}
              </strong>
            </span>
          </div>

          <DeleteProject id={project.id} />
        </aside>
      </div>
    </>
  );
}
