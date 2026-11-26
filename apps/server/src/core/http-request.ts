import type { JsonValue, Step } from "@flowlet/shared";

export type FetchRequest = (url: string, init: RequestInit) => Promise<Response>;
type HttpOutput = { status: number; body: string };
type HttpResult = { output: HttpOutput | null; error: string | null };

const MAX_RESPONSE_BYTES = 2_048;

async function readResponseBody(body: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!body) return "";

  const reader = body.getReader();
  const bytes = new Uint8Array(MAX_RESPONSE_BYTES);
  let length = 0;
  try {
    while (length < bytes.length) {
      const chunk = await reader.read();
      if (chunk.done) break;

      const remaining = bytes.length - length;
      bytes.set(chunk.value.subarray(0, remaining), length);
      length += Math.min(remaining, chunk.value.length);
    }

    const preview = new TextDecoder().decode(bytes.subarray(0, length), { stream: length === bytes.length });
    // PostgreSQL JSONB cannot store a NUL in the response preview.
    return preview.replaceAll("\0", "\uFFFD");
  } finally {
    if (length === bytes.length) {
      // The stream's cancellation can wait on the producer.
      void reader.cancel().catch(() => {});
    }
    reader.releaseLock();
  }
}

export async function executeHttpRequest(
  step: Extract<Step, { type: "http_request" }>,
  data: JsonValue,
  fetchRequest: FetchRequest = fetch,
  timeoutMs = 5_000,
): Promise<HttpResult> {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const response = await fetchRequest(step.url, {
      method: step.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal,
      redirect: "manual",
    });
    const output = { status: response.status, body: await readResponseBody(response.body) };
    return { output, error: response.ok ? null : `HTTP request returned status ${response.status}` };
  } catch {
    return {
      output: null,
      error: signal.aborted ? "HTTP request timed out" : "HTTP request failed",
    };
  }
}
