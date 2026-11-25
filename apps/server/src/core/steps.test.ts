import { expect, test } from "bun:test";
import type { JsonValue, Step } from "@flowlet/shared";
import { executeFilter } from "./filter";
import { executeHttpRequest } from "./http-request";
import { executeTransform } from "./transform";

type Filter = Extract<Step, { type: "filter" }>;

const data = { order: { amount: 1000, label: "Gift order", tags: ["gift", { code: 7 }] } };

test.each([
  ["eq", "order.amount", 1000, true],
  ["eq", "order.amount", "1000", false],
  ["neq", "order.amount", 2000, true],
  ["neq", "order.unknown", null, false],
  ["gt", "order.amount", 999, true],
  ["gt", "order.amount", "999", false],
  ["lt", "order.amount", 1001, true],
  ["lt", "order.amount", 1000, false],
  ["contains", "order.label", "Gift", true],
  ["contains", "order.tags", { code: 7 }, true],
  ["contains", "order.tags", { code: "7" }, false],
] satisfies [Filter["operator"], string, JsonValue, boolean][])(
  "filter %s on %s against %j",
  (operator, field, value, expected) => {
    expect(executeFilter({ type: "filter", field, operator, value }, data)).toBe(expected);
  },
);

test("transform reads mappings and substitutes null for absent paths", () => {
  const transformed = executeTransform({
    type: "transform",
    mapping: { total: "order.amount", tag: "order.tags.0", email: "order.email" },
  }, data);

  expect(transformed).toEqual({ total: 1000, tag: "gift", email: null });
});

const httpStep = {
  type: "http_request",
  method: "PUT",
  url: "http://localhost:4000/api/mock/receiver",
} as const;

test("HTTP step sends JSON and cancels its response stream at the byte limit", async () => {
  let cancelled = false;
  const result = await executeHttpRequest(httpStep, { order: 1 }, async (url, init) => {
    expect(url).toBe(httpStep.url);
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(init.body).toBe('{"order":1}');
    expect(init.redirect).toBe("manual");

    return new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode("a".repeat(2047)));
        controller.enqueue(encoder.encode("€"));
      },
      cancel() {
        cancelled = true;
      },
    }), { status: 201 });
  });

  expect(result).toEqual({ output: { status: 201, body: "a".repeat(2047) }, error: null });
  expect(cancelled).toBe(true);
});

test.each([302, 500])("HTTP step preserves status %i and response body on failure", async (status) => {
  const result = await executeHttpRequest(httpStep, {}, async () => new Response("failure", { status }));
  expect(result).toEqual({
    output: { status, body: "failure" },
    error: `HTTP request returned status ${status}`,
  });
});

test("HTTP step reports a response body timeout", async () => {
  const result = await executeHttpRequest(httpStep, {}, async (_url, { signal }) => {
    return new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("partial body"));
        signal?.addEventListener("abort", () => controller.error(signal.reason), { once: true });
      },
    }));
  }, 20);

  expect(result).toEqual({ output: null, error: "HTTP request timed out" });
});

test("HTTP step reports a network failure without exposing fetch errors", async () => {
  const result = await executeHttpRequest(httpStep, {}, async () => { throw new Error("Connection reset"); });
  expect(result).toEqual({ output: null, error: "HTTP request failed" });
});
