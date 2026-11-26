import type { Step } from "@flowlet/shared";
import Link from "next/link";
import { CopyButton } from "../../../components/copy-button";
import { FlowActivity } from "../../../components/flow-activity";
import { StatusBadge, Timestamp } from "../../../components/status";
import { flowForPage, readHistory, readStats, webhookUrl } from "../../../lib/api";

export const metadata = { title: "Flow details" };

function stepConfig(step: Step) {
  switch (step.type) {
    case "filter":
      return `${step.field} ${step.operator} ${JSON.stringify(step.value)}`;
    case "transform":
      return Object.entries(step.mapping).map(([key, path]) => `${key} = ${path}`).join(", ") || "{}";
    case "http_request":
      return `${step.method} ${step.url}`;
  }
}

function shellArgument(value: string) {
  return "'" + value.replaceAll("'", "'\\''") + "'";
}

function curlCommand(url: string, secret: string) {
  return [
    "BODY='{\"order\":{\"amount\":4999}}'",
    `SECRET=${shellArgument(secret)}`,
    "SIG=$(printf '%s' \"$BODY\" | openssl dgst -sha256 -hmac \"$SECRET\" | awk '{print $NF}')",
    `curl -i -X POST ${shellArgument(url)} \\`,
    "  -H 'Content-Type: application/json' \\",
    '  -H "X-Flowlet-Signature: sha256=$SIG" \\',
    '  --data-binary "$BODY"',
  ].join("\n");
}

export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const flow = await flowForPage(id);
  const [stats, history] = await Promise.all([readStats(flow.id), readHistory(flow.id)]);
  const url = webhookUrl(flow.id);
  const curl = curlCommand(url, flow.webhookSecret);

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <Link className="breadcrumb" href="/flows">Flows</Link>
          <div className="title-line"><h1>{flow.name}</h1><StatusBadge status={flow.enabled ? "enabled" : "disabled"} /></div>
          {flow.description && <p className="description">{flow.description}</p>}
          <p className="secondary mono">{flow.id}</p>
        </div>
        <Link className="button" href={`/flows/${flow.id}/edit`}>Edit flow</Link>
      </div>

      <section className="panel section">
        <h2>Run summary</h2>
        <dl className="stats">
          <div><dt>Total</dt><dd>{stats.total}</dd></div>
          <div><dt>Success</dt><dd>{stats.success}</dd></div>
          <div><dt>Failed</dt><dd>{stats.failed}</dd></div>
          <div><dt>Filtered</dt><dd>{stats.filtered}</dd></div>
          <div><dt>Avg. duration</dt><dd>{stats.avgDurationMs} <small>ms</small></dd></div>
          <div><dt>Last run (UTC)</dt><dd className="last-run"><Timestamp value={stats.lastRunAt} /></dd></div>
        </dl>
      </section>

      <section className="panel section">
        <h2>Webhook</h2>
        <div className="endpoint">
          <code className="endpoint-method">POST</code><code>{url}</code>
          <CopyButton label="Copy URL" value={url} />
        </div>
        <details className="disclosure">
          <summary>cURL example</summary>
          <pre>{curl}</pre>
          <CopyButton value={curl} label="Copy cURL" />
        </details>
      </section>

      <section className="panel section">
        <h2>Steps</h2>
        <ol className="flow-steps">
          {flow.steps.map((step, index) => (
            <li key={index}>
              <span className="step-number mono">{index + 1}</span>
              <span>{step.type === "http_request" ? "HTTP request" : step.type === "filter" ? "Filter" : "Transform"}</span>
              <code>{stepConfig(step)}</code>
            </li>
          ))}
        </ol>
      </section>

      <FlowActivity key={flow.id} flowId={flow.id} enabled={flow.enabled} initialPage={history} />
    </div>
  );
}
