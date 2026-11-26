import Link from "next/link";
import { FlowTable } from "../../components/flow-table";
import { listFlows, readHistory } from "../../lib/api";

export const metadata = { title: "Flows" };

export default async function FlowsPage() {
  const flows = await listFlows();
  const rows = await Promise.all(flows.map(async (flow) => {
    try {
      const history = await readHistory(flow.id, { limit: 1 });
      return { ...flow, latest: history.items[0]?.status ?? "no runs" as const };
    } catch {
      return { ...flow, latest: "unavailable" as const };
    }
  }));

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><h1>Flows</h1><p className="secondary">{flows.length} {flows.length === 1 ? "flow" : "flows"}</p></div>
        <Link href="/flows/new" className="button primary">New flow</Link>
      </div>
      {rows.length ? <FlowTable flows={rows} /> : (
        <div className="panel empty"><h2>No flows yet</h2><p className="muted">Create a flow to receive and process webhook events.</p></div>
      )}
    </div>
  );
}
