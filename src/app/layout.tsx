import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = { title: { default: "UGCPROMAX Studio", template: "%s | UGCPROMAX Studio" }, description: "Your private creative workspace for authentic Moroccan product stories.", robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
