import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() { return <main className="standalone-message"><span className="eyebrow">404 / NOT FOUND</span><h1>This page isn’t in your studio.</h1><p>The project may have been removed or belongs to another account.</p><Button asChild><Link href="/dashboard">Back to overview</Link></Button></main>; }
