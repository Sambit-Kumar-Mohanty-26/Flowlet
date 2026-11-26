type Status = "success" | "failed" | "filtered" | "skipped" | "enabled" | "disabled" | "no runs" | "unavailable";

export function StatusBadge({ status }: { status: Status }) {
  return <span className="badge">{status}</span>;
}

export function Timestamp({ value }: { value: string | null }) {
  if (!value) return <span className="muted">None</span>;
  const display = value.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
  return <time dateTime={value} title={value} className="mono">{display}</time>;
}
