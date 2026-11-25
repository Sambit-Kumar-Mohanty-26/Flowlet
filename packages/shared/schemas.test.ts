import { expect, test } from "bun:test";
import {
  createFlowSchema,
  filterStepSchema,
  readDotPath,
  stepSchema,
  updateFlowSchema,
  validationErrorResponse,
} from "./index";

const filter = { type: "filter", field: "order.amount", operator: "gt", value: 1000 } as const;

test("create defaults enabled and patch leaves omitted fields alone", () => {
  expect(createFlowSchema.parse({ name: "  Order flow  ", steps: [filter] })).toEqual({
    name: "Order flow",
    enabled: true,
    steps: [filter],
  });
  expect(updateFlowSchema.parse({ enabled: false })).toEqual({ enabled: false });
  expect(updateFlowSchema.parse({ name: "New name" })).toEqual({ name: "New name" });
  expect(updateFlowSchema.safeParse({ steps: [] }).success).toBe(false);
  expect(updateFlowSchema.safeParse({ steps: Array.from({ length: 6 }, () => filter) }).success)
    .toBe(false);
  expect(updateFlowSchema.safeParse({ webhookSecret: "client secret" }).success).toBe(false);
});

test("validation errors carry the response envelope and field paths", () => {
  const result = createFlowSchema.safeParse({
    name: "X",
    steps: [{ ...filter, field: "order..amount" }],
  });

  if (result.success) throw new Error("Expected validation to fail");
  expect(validationErrorResponse(result.error)).toEqual({
    error: {
      code: "VALIDATION_ERROR",
      message: "Name must be at least 3 characters",
      details: {
        issues: [
          { path: ["name"], message: "Name must be at least 3 characters" },
          { path: ["steps", "0", "field"], message: "Enter a dot path without empty or reserved segments" },
        ],
      },
    },
  });
});

test("step validation enforces reserved keys, URL protocol and method", () => {
  expect(stepSchema.safeParse({ type: "transform", mapping: { id: "order.id" } }).success).toBe(true);
  expect(stepSchema.safeParse({
    type: "transform",
    mapping: JSON.parse('{"__proto__":"order.id"}'),
  }).success).toBe(false);
  expect(stepSchema.safeParse({ ...filter, field: "order.constructor.amount" }).success).toBe(false);
  expect(stepSchema.safeParse({ ...filter, value: undefined }).success).toBe(false);

  const http = { type: "http_request", url: "http://localhost:4000/api/mock/receiver", method: "PUT" };
  expect(stepSchema.safeParse(http).success).toBe(true);
  expect(stepSchema.safeParse({ ...http, url: "file:///tmp/test" }).success).toBe(false);
  expect(stepSchema.safeParse({ ...http, method: "GET" }).success).toBe(false);
});

test("filter literals preserve JSON object keys", () => {
  const json = '{"__proto__":7}';
  const parsed = filterStepSchema.parse({ ...filter, value: JSON.parse(json) });
  expect(JSON.stringify(parsed.value)).toBe(json);
});

test("dot paths read only own payload fields and support arrays", () => {
  const data = { orders: [{ amount: 1000 }], order: Object.create({ inherited: 1 }) };

  expect(readDotPath(data, "orders.0.amount")).toBe(1000);
  expect(readDotPath(data, "orders.1.amount")).toBeUndefined();
  expect(readDotPath(data, "order.inherited")).toBeUndefined();
  expect(readDotPath(data, "order.__proto__")).toBeUndefined();
  expect(readDotPath(data, "orders.length")).toBeUndefined();
});
