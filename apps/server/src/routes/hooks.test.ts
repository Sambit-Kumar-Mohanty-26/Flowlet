import { expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import type { Flow } from "@flowlet/shared";
import { createTestApp, createTestRunStore } from "../test/app";
import { createTestFlowStore, testFlow } from "../test/flow-store";

const hookPath = `/api/hooks/${testFlow.id}`;
const order = '{ "order": { "amount": 4999, "customer": "Aśa" } }';

function sign(body: string | Uint8Array) {
  return "sha256=" + createHmac("sha256", testFlow.webhookSecret).update(body).digest("hex");
}

function request(body: string | Uint8Array<ArrayBuffer>, signature?: string): RequestInit {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (signature) headers.set("X-Flowlet-Signature", signature);
  return { method: "POST", headers, body };
}

function setup(flow: Flow | null = testFlow, fetchRequest?: Parameters<typeof createTestApp>[2]) {
  const flows = createTestFlowStore();
  flows.get.mockResolvedValueOnce(flow);
  const runs = createTestRunStore();
  return { app: createTestApp(flows, runs, fetchRequest), save: runs.save };
}

test("unknown flow returns 404 before checking the signature", async () => {
  const { app, save } = setup(null);
  const response = await app.request(hookPath, request(order));
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  expect(save).not.toHaveBeenCalled();
});

test.each([undefined, "sha256=" + "0".repeat(64)])("missing or wrong signature returns 401", async (signature) => {
  const { app, save } = setup();
  const response = await app.request(hookPath, request(order, signature));
  expect(response.status).toBe(401);
  expect(await response.json()).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  expect(save).not.toHaveBeenCalled();
});

test.each(["{", new Uint8Array([34, 255, 34])])("signed malformed JSON or UTF-8 returns 400", async (body) => {
  const { app, save } = setup();
  const response = await app.request(hookPath, request(body, sign(body)));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: { code: "BAD_REQUEST" } });
  expect(save).not.toHaveBeenCalled();
});

test("disabled flow returns 409 after signature and JSON validation", async () => {
  const disabled = { ...testFlow, enabled: false };
  const { app, save } = setup(disabled);
  const response = await app.request(hookPath, request(order, sign(order)));
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ error: { code: "CONFLICT" } });
  expect(save).not.toHaveBeenCalled();

  const invalid = await setup(disabled).app.request(hookPath, request("{", sign("{")));
  expect(invalid.status).toBe(400);
});

test("signed raw JSON executes the flow and saves exactly one run", async () => {
  const { app, save } = setup();
  const response = await app.request(hookPath, request(order, sign(order)));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ runId: "42", status: "success" });
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith(testFlow.id, { order: { amount: 4999, customer: "Aśa" } }, {
    status: "success", startedAt: expect.any(String), finishedAt: expect.any(String),
    durationMs: expect.any(Number), error: null,
    steps: [{
      position: 0, type: "filter", status: "success", input: { order: { amount: 4999, customer: "Aśa" } },
      output: true, error: null, durationMs: expect.any(Number),
    }],
  });
});

test("a filtered event is accepted and saves skipped step records", async () => {
  const flow: Flow = { ...testFlow, steps: [...testFlow.steps, { type: "transform", mapping: {} }] };
  const { app, save } = setup(flow);
  const body = '{"order":{"amount":500}}';
  const response = await app.request(hookPath, request(body, sign(body)));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ runId: "42", status: "filtered" });
  expect(save).toHaveBeenCalledWith(testFlow.id, { order: { amount: 500 } }, expect.objectContaining({
    status: "filtered", steps: [expect.objectContaining({ output: false }), expect.objectContaining({ status: "skipped" })],
  }));
});

test("a failed HTTP step is saved as a failed run and still returns 200", async () => {
  const flow: Flow = {
    ...testFlow,
    steps: [{ type: "http_request", url: "http://localhost:4000/api/mock/receiver?fail=1", method: "POST" }],
  };
  const { app, save } = setup(flow, async () => new Response("failed", { status: 500 }));
  const response = await app.request(hookPath, request("null", sign("null")));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ runId: "42", status: "failed" });
  expect(save).toHaveBeenCalledWith(testFlow.id, null, expect.objectContaining({
    status: "failed", error: "HTTP request returned status 500",
    steps: [expect.objectContaining({ status: "failed", output: { status: 500, body: "failed" } })],
  }));
});

test("a persistence failure does not return an accepted run response", async () => {
  const { app, save } = setup();
  save.mockRejectedValueOnce(new Error("database unavailable"));
  const response = await app.request(hookPath, request(order, sign(order)));
  expect(response.status).toBe(500);
  expect(await response.json()).toMatchObject({ error: { code: "INTERNAL_ERROR" } });
});
