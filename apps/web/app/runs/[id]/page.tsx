import type { JsonValue } from "@flowlet/shared";
import Link from "next/link";
import { StatusBadge, Timestamp } from "../../../components/status";
import { runForPage } from "../../../lib/api";

export const metadata = { title: "Run details" };

function JsonDetails({ label, value }: { label: string; value: JsonValue }) {
  return (
    <details className="disclosure">
      <summary>{label}</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await runForPage(id);

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <Link className="breadcrumb" href={`/flows/${run.flowId}`}>Flow details</Link>
          <div className="title-line"><h1>Run <span className="mono">#{run.id}</span></h1><StatusBadge status={run.status} /></div>
          <p className="secondary mono">{run.flowId}</p>
        </div>
      </div>
      <section className="panel section">
        <h2>Execution</h2>
        <dl className="stats run-stats">
          <div><dt>Started (UTC)</dt><dd className="last-run"><Timestamp value={run.startedAt} /></dd></div>
          <div><dt>Finished (UTC)</dt><dd className="last-run"><Timestamp value={run.finishedAt} /></dd></div>
          <div><dt>Duration</dt><dd>{run.durationMs} <small>ms</small></dd></div>
        </dl>
        {run.error && <p className="feedback">{run.error}</p>}
        <JsonDetails label="Incoming payload" value={run.payload} />
      </section>
      <section className="panel section">
        <h2>Step timeline</h2>
        {!run.steps.length ? <p className="muted">No step records for this run.</p> : (
          <ol className="timeline">
            {run.steps.map((step) => (
              <li key={step.position} data-status={step.status}>
                <div className="timeline-heading">
                  <h3><span className="mono">{step.position + 1}.</span> {step.type === "http_request" ? "HTTP request" : step.type === "filter" ? "Filter" : "Transform"}</h3>
                  <StatusBadge status={step.status} />
                  <span className="secondary mono">{step.durationMs === null ? "—" : `${step.durationMs} ms`}</span>
                </div>
                <div className="timeline-data">
                  <JsonDetails label="Input" value={step.input} />
                  <JsonDetails label="Output" value={step.output} />
                  {step.error && <details className="disclosure"><summary>Error</summary><pre>{step.error}</pre></details>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
