"use client";

import type { FlowSummary, RunStatus } from "@flowlet/shared";
import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteFlow, saveFlow } from "../app/actions";
import { StatusBadge } from "./status";

type FlowRow = FlowSummary & { latest: RunStatus | "no runs" | "unavailable" };

export function FlowTable({ flows }: { flows: FlowRow[] }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");

  function mutate(flow: FlowRow, remove = false) {
    if (remove && !window.confirm(`Delete "${flow.name}"? Saved runs will be kept.`)) return;
    setFeedback("");
    startTransition(async () => {
      try {
        const result = remove ? await deleteFlow(flow.id) : await saveFlow(flow.id, { enabled: !flow.enabled });
        if (!result.ok) setFeedback(result.message);
      } catch {
        setFeedback("The flow could not be updated.");
      }
    });
  }

  return (
    <>
      {feedback && <p className="feedback" role="alert">{feedback}</p>}
      <div className="panel">
        <table className="console-table flow-table">
          <thead><tr><th scope="col">Name</th><th scope="col">State</th><th scope="col">Latest run</th><th scope="col">Actions</th></tr></thead>
          <tbody>
            {flows.map((flow) => (
              <tr key={flow.id}>
                <td><Link className="text-link" href={`/flows/${flow.id}`}>{flow.name}</Link></td>
                <td><StatusBadge status={flow.enabled ? "enabled" : "disabled"} /></td>
                <td><StatusBadge status={flow.latest} /></td>
                <td>
                  <div className="row-actions">
                    <button className="button small" disabled={pending} onClick={() => mutate(flow)}>
                      {flow.enabled ? "Disable" : "Enable"}
                    </button>
                    <button className="button small" disabled={pending} onClick={() => mutate(flow, true)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
