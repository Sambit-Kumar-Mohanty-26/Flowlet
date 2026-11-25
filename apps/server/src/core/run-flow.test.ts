import { expect, test } from "bun:test";
import type { Step } from "@flowlet/shared";
import { createTestApp } from "../test/app";
import { createTestFlowStore } from "../test/flow-store";
import { runFlow } from "./run-flow";

const app = createTestApp(createTestFlowStore());
const receiver = "http://localhost:4000/api/mock/receiver";
const steps: Step[] = [
  { type: "filter", field: "order.amount", operator: "gt", value: 1000 },
  { type: "transform", mapping: { orderId: "order.id", total: "order.amount", email: "order.customer.email" } },
  { type: "http_request", method: "POST", url: receiver },
];
const order = { id: "ORD-1042", amount: 4999, customer: { email: "asha@example.com" } };
const transformed = { orderId: "ORD-1042", total: 4999, email: "asha@example.com" };

test("the order example transforms data and sends it to the mock receiver", async () => {
  const result = await runFlow({ steps }, { order }, async (url, init) => app.request(url, init));

  expect(result.status).toBe("success");
  expect(result.steps.map(({ status }) => status)).toEqual(["success", "success", "success"]);
  expect(result.steps[2]?.input).toEqual(transformed);
  expect(result.steps[2]?.output).toEqual({ status: 200, body: JSON.stringify(transformed) });
});

test("a filtered order skips the rest of the steps", async () => {
  let requests = 0;
  const result = await runFlow({ steps }, { order: { ...order, amount: 500 } }, async () => {
    requests += 1;
    return new Response();
  });

  expect(result.status).toBe("filtered");
  expect(result.steps.map(({ status }) => status)).toEqual(["success", "skipped", "skipped"]);
  expect(result.steps[0]?.output).toBe(false);
  expect(result.steps[1]?.input).toBeNull();
  expect(requests).toBe(0);
});

test("a mock receiver failure records the response and skips later steps", async () => {
  const result = await runFlow({
    steps: [{ type: "http_request", method: "POST", url: receiver + "?fail=1" }, ...steps],
  }, { order }, async (url, init) => app.request(url, init));

  expect(result.status).toBe("failed");
  expect(result.error).toBe("HTTP request returned status 500");
  expect(result.steps.map(({ status }) => status)).toEqual(["failed", "skipped", "skipped", "skipped"]);
  expect(result.steps[0]?.output).toMatchObject({ status: 500 });
});

test("HTTP step output does not replace the current data", async () => {
  const result = await runFlow({
    steps: [{ type: "http_request", method: "POST", url: receiver }, ...steps.slice(0, 2)],
  }, { order }, async () => new Response('{"different":true}'));

  expect(result.status).toBe("success");
  expect(result.steps[2]?.output).toEqual(transformed);
});
