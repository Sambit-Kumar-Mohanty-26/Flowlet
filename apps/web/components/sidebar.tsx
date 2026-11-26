import Link from "next/link";
import { listFlows } from "../lib/api";
import { FlowNavigation } from "./flow-navigation";

export async function SidebarFlows() {
  try {
    return <FlowNavigation flows={await listFlows()} />;
  } catch {
    return <p className="sidebar-message feedback" role="status">Flows unavailable.</p>;
  }
}

export function SidebarHeader() {
  return (
    <div className="sidebar-heading">
      <Link href="/flows">All flows</Link>
      <Link href="/flows/new" className="button small primary">New flow</Link>
    </div>
  );
}
