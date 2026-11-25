import type { Flow } from "@flowlet/shared";
import { mock } from "bun:test";

export const testFlow: Flow = {
  id: "507f1f77bcf86cd799439011",
  name: "Order flow",
  enabled: true,
  steps: [{ type: "filter", field: "order.amount", operator: "gt", value: 1000 }],
  webhookSecret: "a".repeat(64),
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export function createTestFlowStore() {
  return {
    create: mock(async () => testFlow),
    list: mock(async () => [{
      id: testFlow.id, name: testFlow.name, enabled: testFlow.enabled, createdAt: testFlow.createdAt,
    }]),
    get: mock(async () => null as Flow | null),
    update: mock(async () => null as Flow | null),
    delete: mock(async () => false),
  };
}
