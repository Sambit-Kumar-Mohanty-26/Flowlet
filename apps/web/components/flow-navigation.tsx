"use client";

import type { FlowSummary } from "@flowlet/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function FlowNavigation({ flows }: { flows: FlowSummary[] }) {
  const path = usePathname();

  if (!flows.length) return <p className="sidebar-message muted">No flows yet.</p>;

  return (
    <ul className="flow-nav">
      {flows.map((flow) => {
        const href = `/flows/${flow.id}`;
        const active = path === href || path === `${href}/edit`;
        return (
          <li key={flow.id}>
            <Link href={href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
              <span>{flow.name}</span>
              {flow.enabled ? null : <small>Disabled</small>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
