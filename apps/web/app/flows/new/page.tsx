import Link from "next/link";
import { FlowForm } from "../../../components/flow-form";

export const metadata = { title: "New flow" };

export default function NewFlowPage() {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><Link className="breadcrumb" href="/flows">Flows</Link><h1>New flow</h1></div>
      </div>
      <FlowForm />
    </div>
  );
}
