import { expect, test } from "bun:test";
import { encodeRunCursor } from "../db/run-cursor";
import { createTestApp, createTestRunStore } from "../test/app";
import { createTestFlowStore, testFlow } from "../test/flow-store";

const flowPath = `/api/flows/${testFlow.id}`;
const startedAt = "2026-11-25T12:34:56.789Z";
const cursor = encodeRunCursor({ startedAt, id: "42" });

function setup() {
  const flows = createTestFlowStore();
  flows.get.mockResolvedValue(testFlow);
  const runs = createTestRunStore();
  return { app: createTestApp(flows, runs), flows, runs };
}

test("run list defaults to 20 and validates explicit pagination options", async () => {
  const { app, runs } = setup();
  const first = await app.request(`${flowPath}/runs`);
  expect(first.status).toBe(200);
  expect(await first.json()).toEqual({ items: [], nextCursor: null });
  expect(runs.list).toHaveBeenLastCalledWith(testFlow.id, { limit: 20 });

  const next = await app.request(`${flowPath}/runs?status=failed&limit=100&cursor=${encodeURIComponent(cursor)}`);
  expect(next.status).toBe(200);
  expect(runs.list).toHaveBeenLastCalledWith(testFlow.id, {
    status: "failed", limit: 100, cursor: { startedAt, id: "42" },
  });
});

test.each([
  "status=skipped",
  "limit=0",
  "limit=101",
  "limit=1.5",
  "cursor=invalid",
  `cursor=${encodeURIComponent(encodeRunCursor({ startedAt, id: "9223372036854775808" }))}`,
  `cursor=${encodeURIComponent(encodeRunCursor({ startedAt: "0000-01-01T00:00:00.000Z", id: "1" }))}`,
])("run list rejects %s before querying PostgreSQL", async (query) => {
  const { app, runs } = setup();
  const response = await app.request(`${flowPath}/runs?${query}`);
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  expect(runs.list).not.toHaveBeenCalled();
});

test("history for an unknown flow returns 404 and leaves run lookup available", async () => {
  const { app, flows, runs } = setup();
  flows.get.mockResolvedValue(null);
  runs.get.mockResolvedValue({
    id: "42", flowId: testFlow.id, status: "filtered", payload: null,
    startedAt, finishedAt: startedAt, durationMs: 0, error: null,
    steps: [
      { position: 0, type: "filter", status: "success", input: null, output: false, error: null, durationMs: 0 },
      { position: 1, type: "transform", status: "skipped", input: null, output: null, error: null, durationMs: null },
    ],
  });

  expect((await app.request(`${flowPath}/runs`)).status).toBe(404);
  expect((await app.request(`${flowPath}/stats`)).status).toBe(404);
  const detail = await app.request("/api/runs/42");
  expect(detail.status).toBe(200);
  expect(await detail.json()).toMatchObject({
    id: "42", flowId: testFlow.id, steps: [{ position: 0, status: "success" }, { position: 1, status: "skipped" }],
  });
  expect(runs.get).toHaveBeenCalledWith("42");
});

test("malformed, oversized, and missing run IDs return 404", async () => {
  const { app, runs } = setup();
  expect((await app.request("/api/runs/nope")).status).toBe(404);
  expect((await app.request("/api/runs/9223372036854775808")).status).toBe(404);
  expect(runs.get).not.toHaveBeenCalled();

  expect((await app.request("/api/runs/42")).status).toBe(404);
  expect(runs.get).toHaveBeenCalledWith("42");
});

test("an existing flow with no runs returns the zero stats shape", async () => {
  const { app, runs } = setup();
  const response = await app.request(`${flowPath}/stats`);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    total: 0, success: 0, failed: 0, filtered: 0, avgDurationMs: 0, lastRunAt: null,
  });
  expect(runs.stats).toHaveBeenCalledWith(testFlow.id);
});
