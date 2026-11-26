import Link from "next/link";
import { FlowForm } from "../../../../components/flow-form";
import { flowForPage } from "../../../../lib/api";

export const metadata = { title: "Edit flow" };

export default async function EditFlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, id: flowId, description, enabled, steps } = await flowForPage(id);

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><Link className="breadcrumb" href={`/flows/${flowId}`}>{name}</Link><h1>Edit flow</h1></div>
      </div>
      <FlowForm flow={{ id: flowId, name, description, enabled, steps }} />
    </div>
  );
}
