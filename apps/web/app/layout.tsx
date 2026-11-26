import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { SidebarFlows, SidebarHeader } from "../components/sidebar";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Flowlet", template: "%s | Flowlet" } };
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/flows" className="wordmark">
            <span className="wordmark-icon" aria-hidden="true">[›]</span>
            Flowlet
          </Link>
          <a className="skip-link" href="#main">Skip to content</a>
        </header>
        <div className="shell">
          <aside className="sidebar">
            <nav aria-label="Flows">
              <SidebarHeader />
              <Suspense fallback={<p className="sidebar-message muted" role="status">Loading flows…</p>}>
                <SidebarFlows />
              </Suspense>
            </nav>
          </aside>
          <main id="main" className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
