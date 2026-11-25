import { expect, test } from "bun:test";
import { createApp } from "../app";
import { createTestFlowStore, testFlow } from "../test/flow-store";

const flowsPath = "/api/flows";
const detailPath = `${flowsPath}/${testFlow.id}`;

function jsonRequest(method: "POST" | "PATCH", body: unknown): RequestInit {
  return { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } };
}

test("create validates the body and returns the saved flow", async () => {
  const store = createTestFlowStore();
  const app = createApp(store);
  const response = await app.request(flowsPath, jsonRequest("POST", {
    name: "Order flow",
    steps: testFlow.steps,
  }));

  expect(response.status).toBe(201);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual(testFlow);
  expect(store.create).toHaveBeenCalledWith({ name: "Order flow", enabled: true, steps: testFlow.steps });
});

test("flow list includes summaries and detail includes steps and the secret", async () => {
  const store = createTestFlowStore();
  store.get.mockResolvedValueOnce(testFlow);
  const app = createApp(store);
  const list = await app.request(flowsPath);
  expect(list.status).toBe(200);
  expect(await list.json()).toEqual([{
    id: testFlow.id, name: testFlow.name, enabled: testFlow.enabled, createdAt: testFlow.createdAt,
  }]);

  const detail = await app.request(detailPath);
  expect(detail.status).toBe(200);
  expect(detail.headers.get("Cache-Control")).toBe("no-store");
  expect(await detail.json()).toEqual(testFlow);
  expect(store.get).toHaveBeenCalledWith(testFlow.id);
});

test("patch validates supplied fields and returns the updated flow", async () => {
  const store = createTestFlowStore();
  store.update.mockResolvedValueOnce({ ...testFlow, enabled: false });
  const app = createApp(store);
  const invalid = await app.request(detailPath, jsonRequest("PATCH", { steps: [] }));
  expect(invalid.status).toBe(400);
  expect(await invalid.json()).toEqual({
    error: {
      code: "VALIDATION_ERROR",
      message: "Add at least one step",
      details: { issues: [{ path: ["steps"], message: "Add at least one step" }] },
    },
  });
  expect(store.update).not.toHaveBeenCalled();

  const valid = await app.request(detailPath, jsonRequest("PATCH", { enabled: false }));
  expect(valid.status).toBe(200);
  expect(await valid.json()).toEqual({ ...testFlow, enabled: false });
  expect(store.update).toHaveBeenCalledWith(testFlow.id, { enabled: false });
});

test("delete returns 204 with an empty body", async () => {
  const store = createTestFlowStore();
  store.delete.mockResolvedValueOnce(true);
  const response = await createApp(store).request(detailPath, { method: "DELETE" });

  expect(response.status).toBe(204);
  expect(await response.text()).toBe("");
  expect(store.delete).toHaveBeenCalledWith(testFlow.id);
});

test("an invalid ID returns 404 before store access and a missing flow also returns 404", async () => {
  const store = createTestFlowStore();
  const app = createApp(store);
  const invalid = await app.request(`${flowsPath}/invalid`, { method: "PATCH", body: "{" });
  expect(invalid.status).toBe(404);
  expect(store.update).not.toHaveBeenCalled();

  const missing = await app.request(detailPath);
  expect(missing.status).toBe(404);
  expect(await missing.json()).toEqual({ error: { code: "NOT_FOUND", message: "Flow not found", details: {} } });
});

test("malformed JSON and attempts to set a secret fail before a write", async () => {
  const store = createTestFlowStore();
  const app = createApp(store);
  const malformed = await app.request(flowsPath, { method: "POST", body: "{" });
  expect(malformed.status).toBe(400);
  expect(await malformed.json()).toMatchObject({ error: { code: "BAD_REQUEST" } });

  const secret = await app.request(flowsPath, jsonRequest("POST", {
    name: "Order flow", steps: testFlow.steps, webhookSecret: "client value",
  }));
  expect(secret.status).toBe(400);
  expect(await secret.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  expect(store.create).not.toHaveBeenCalled();
});

test("unexpected repository failures use a generic API error", async () => {
  const store = createTestFlowStore();
  store.list.mockRejectedValueOnce(new Error("database details"));
  const response = await createApp(store).request(flowsPath);

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    error: { code: "INTERNAL_ERROR", message: "Internal server error", details: {} },
  });
});
