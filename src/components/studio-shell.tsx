import type { ReactNode } from "react";
import Link from "next/link";
import { LayoutDashboard, FolderOpen, UsersRound, Images, ChartNoAxesCombined, Settings2, BookOpen, ChevronRight, LockKeyhole } from "lucide-react";
import { Brand } from "@/components/brand";
import { SignOut } from "@/components/sign-out";

export function StudioShell({ children, user, local }: { children: ReactNode; user: { name: string; email: string }; local: boolean }) {
  return <div className="studio-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar">
      <Brand />
      <div className="workspace-tag"><span className="workspace-avatar">U</span><span>Your workspace<small>Personal studio</small></span><ChevronRight size={15} /></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Workspace" className="nav-stack">
        <Link className="nav-item" href="/dashboard"><LayoutDashboard />Overview</Link>
        <Link className="nav-item" href="/dashboard#projects"><FolderOpen />Projects</Link>
        <button className="nav-item" disabled><UsersRound />Characters<span className="soon">Soon</span></button>
        <button className="nav-item" disabled><Images />Asset library<span className="soon">Soon</span></button>
        <button className="nav-item" disabled><ChartNoAxesCombined />Analytics<span className="soon">Soon</span></button>
      </nav>
      <div className="sidebar-bottom">
        <div className="foundation-note"><span className="tiny-dot" />Foundation release<p>Your studio is ready for project planning. Video production is coming in a later milestone.</p><Link href="/guide">Explore the roadmap <ChevronRight size={13} /></Link></div>
        <nav aria-label="Resources" className="nav-stack"><Link className="nav-item" href="/guide"><BookOpen />Studio guide</Link><Link className="nav-item" href="/settings"><Settings2 />Settings</Link></nav>
        <div className="profile"><span className="profile-avatar">{user.name.slice(0, 2).toUpperCase()}</span><span className="profile-name">{user.name}<small>{user.email}</small></span><SignOut /></div>
      </div>
    </aside>
    <div className="studio-main">
      <header className="topbar"><span className="breadcrumb">Workspace <ChevronRight size={13} /><span>Studio</span></span><div className="environment-pill"><span className="tiny-dot" />{local ? "Local PostgreSQL" : "Neon connected"}</div></header>
      <main id="main" className="main-content">{children}</main>
      <footer className="studio-footer"><span>UGCPROMAX Studio <span className="muted">· Foundation / v0.1</span></span><span><LockKeyhole size={12} />Private workspace</span></footer>
    </div>
  </div>;
}
