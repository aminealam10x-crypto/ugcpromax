import { Database, ShieldCheck, Info } from "lucide-react";
import { requireSession } from "@/modules/auth/server";
export const metadata = { title: "Settings" };
export default async function Settings() {
  const session = await requireSession();
  const local = process.env.DATABASE_DRIVER === "pglite";
  return <><div className="page-heading"><div><span className="eyebrow">YOUR WORKSPACE</span><h1>Studio settings.</h1><p>Your account and the connections behind your studio.</p></div></div><div className="settings-grid"><section className="panel info-panel"><ShieldCheck /><h2>Your account</h2><dl><dt>Name</dt><dd>{session.user.name}</dd><dt>Email</dt><dd>{session.user.email}</dd><dt>Authentication</dt><dd>Email and password · Better Auth</dd></dl><p className="field-help">Email verification and password recovery require an email provider and are not yet available.</p></section><section className="panel info-panel"><Database /><h2>Database</h2><dl><dt>Active connection</dt><dd>{local ? "Local PostgreSQL (PGlite)" : "Neon PostgreSQL"}</dd><dt>Storage</dt><dd>{local ? "Persistent files on this computer" : "Private server connection"}</dd><dt>Media & AI</dt><dd>Not connected in Phase 0</dd></dl><p className="field-help">Connection secrets are managed through server environment variables.</p></section></div><div className="notice mt-6"><strong><Info size={14} />Foundation release</strong><p>Billing, credit allocation, and model configuration will be introduced in their own milestones. No credits are being purchased or spent.</p></div></>;
}
