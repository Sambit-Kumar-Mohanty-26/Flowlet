import { expect, test } from "bun:test";
import { app } from "./app";

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
