"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <div className="standalone-message"><span className="eyebrow">SOMETHING NEEDS ATTENTION</span><h1>Your studio couldn’t load.</h1><p>Check the database connection and server configuration, then try again.</p><Button onClick={reset}>Try again</Button></div>; }
