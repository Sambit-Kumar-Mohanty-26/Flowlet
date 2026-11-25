export interface RunCursor {
  startedAt: string;
  id: string;
}

export function isRunId(id: string): boolean {
  return /^[1-9][0-9]{0,18}$/.test(id) && BigInt(id) <= 9_223_372_036_854_775_807n;
}

export function encodeRunCursor({ startedAt, id }: RunCursor): string {
  return Buffer.from(`${startedAt}|${id}`).toString("base64");
}

export function decodeRunCursor(value: string): RunCursor | null {
  if (value.length > 60) return null;

  const decoded = Buffer.from(value, "base64").toString("utf8");
  const [startedAt, id, extra] = decoded.split("|");
  if (!startedAt || !id || extra !== undefined || !isRunId(id)) return null;
  if (!/^\d{4}-/.test(startedAt) || startedAt.startsWith("0000-")) return null;

  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== startedAt) return null;

  const cursor = { startedAt, id };
  return encodeRunCursor(cursor) === value ? cursor : null;
}
