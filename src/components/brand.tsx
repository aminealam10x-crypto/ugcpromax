import { Clapperboard } from "lucide-react";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className="brand" href="/dashboard" aria-label="UGCPROMAX Studio dashboard">
    <span className="brand-icon"><Clapperboard size={21} strokeWidth={2.2} /></span>
    {!compact && <span>UGCPROMAX<span className="brand-subtitle">STUDIO</span></span>}
  </Link>;
}
