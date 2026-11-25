import { expect, test } from "bun:test";
import { createTestApp } from "./test/app";
import { createTestFlowStore } from "./test/flow-store";

const app = createTestApp(createTestFlowStore());

test("GET /api/health reports a healthy API", async () => {
  const response = await app.request("/api/health");

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});

test("unknown routes use the API error envelope", async () => {
  const response = await app.request("/api/unknown");

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({
    error: { code: "NOT_FOUND", message: "Route not found", details: {} },
  });
});

test("mock receiver rejects malformed JSON and echoes valid JSON", async () => {
  const invalid = await app.request("/api/mock/receiver", { method: "POST", body: "{" });
  expect(invalid.status).toBe(400);
  expect(await invalid.json()).toMatchObject({ error: { code: "BAD_REQUEST" } });

  const body = [null, "test", 42];
  const valid = await app.request("/api/mock/receiver", { method: "POST", body: JSON.stringify(body) });
  expect(valid.status).toBe(200);
  expect(await valid.json()).toEqual(body);
});
