"use client";

import { RUN_STATUSES, type RunPage, type RunStatus } from "@flowlet/shared";
import Link from "next/link";
import { useState, useTransition } from "react";
import { loadRunHistory, sendTestEvent } from "../app/actions";
import { StatusBadge, Timestamp } from "./status";

type RunReceipt = { runId: string; status: RunStatus };

export function FlowActivity({ flowId, enabled, initialPage }: {
  flowId: string;
  enabled: boolean;
  initialPage: RunPage;
}) {
  const [body, setBody] = useState("");
  const [receipt, setReceipt] = useState<RunReceipt | null>(null);
  const [eventError, setEventError] = useState("");
  const [status, setStatus] = useState<RunStatus | "">("");
  const [page, setPage] = useState(initialPage);
  const [historyError, setHistoryError] = useState("");
  const [sending, startSending] = useTransition();
  const [loading, startLoading] = useTransition();

  async function updateHistory(filter: RunStatus | "", cursor?: string) {
    setHistoryError("");
    try {
      const result = await loadRunHistory(flowId, filter || undefined, cursor);
      if (!result.ok) {
        setHistoryError(result.message);
        return;
      }

      setStatus(filter);
      setPage((current) => cursor
        ? { items: [...current.items, ...result.page.items], nextCursor: result.page.nextCursor }
        : result.page);
    } catch {
      setHistoryError("Run history could not be loaded.");
    }
  }

  function send() {
    if (!enabled || sending || loading) return;

    setEventError("");
    setReceipt(null);
    startSending(async () => {
      try {
        const result = await sendTestEvent(flowId, body);
        if (!result.ok) {
          setEventError(result.message);
          return;
        }

        setReceipt(result.run);
        await updateHistory(status);
      } catch {
        setEventError("The test event could not be sent.");
      }
    });
  }

  return (
    <>
      <section className="panel section">
        <h2>Send test event</h2>
        <form className="test-form" action={send}>
          <div className="field">
            <label htmlFor="event-body">Event body (JSON)</label>
            <textarea id="event-body" className="mono" rows={4} spellCheck={false} value={body}
              placeholder={'{ "order": { "amount": 4999 } }'} disabled={sending || !enabled}
              aria-invalid={Boolean(eventError)} aria-describedby={eventError ? "event-error" : undefined}
              onChange={(event) => setBody(event.target.value)} />
          </div>
          {eventError && <p className="field-error" id="event-error" role="alert">{eventError}</p>}
          {!enabled && <p className="muted">Enable this flow to send a test event.</p>}
          <div className="row-actions">
            <button type="submit" className="button primary" disabled={!enabled || sending || loading}>
              {sending ? "Sending…" : "Send test event"}
            </button>
            {receipt && <span className="run-receipt" role="status">
              <StatusBadge status={receipt.status} />
              <Link href={`/runs/${receipt.runId}`} className="text-link">View run <span className="mono">#{receipt.runId}</span></Link>
            </span>}
          </div>
        </form>
      </section>

      <section className="panel" aria-busy={loading}>
        <div className="section-heading history-heading">
          <h2>Run history</h2>
          <div className="inline-field">
            <label htmlFor="run-status">Status</label>
            <select id="run-status" value={status} disabled={loading || sending} onChange={(event) => {
              const filter = RUN_STATUSES.find((status) => status === event.target.value) ?? "";
              startLoading(() => updateHistory(filter));
            }}>
              <option value="">All statuses</option>
              {RUN_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>
        {historyError && <p className="feedback inset" role="alert">{historyError}</p>}
        {page.items.length ? (
          <>
            <div className="history-row history-labels" aria-hidden="true">
              <span>Run</span><span>Status</span><span>Started (UTC)</span><span>Duration</span>
            </div>
            <ol className="timeline history-timeline" aria-label="Run history, newest first">
              {page.items.map((run) => (
                <li className="history-row" key={run.id} data-status={run.status}>
                  <Link className="mono text-link" href={`/runs/${run.id}`} aria-label={`Run ${run.id}`}>#{run.id}</Link>
                  <span><StatusBadge status={run.status} /></span>
                  <Timestamp value={run.startedAt} />
                  <span className="mono" aria-label={`Duration ${run.durationMs} milliseconds`}>{run.durationMs} ms</span>
                </li>
              ))}
            </ol>
          </>
        ) : <p className="empty muted">{status ? `No ${status} runs.` : "No runs yet. Send an event to start the history."}</p>}
        {(page.nextCursor || loading) && (
          <div className="table-footer">
            {page.nextCursor && <button className="button small" type="button" disabled={loading || sending} onClick={() => {
              const cursor = page.nextCursor;
              if (cursor) startLoading(() => updateHistory(status, cursor));
            }}>Load more</button>}
            {loading && <span className="secondary" role="status">Loading runs…</span>}
          </div>
        )}
      </section>
    </>
  );
}
