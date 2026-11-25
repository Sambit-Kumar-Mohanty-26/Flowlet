import { mock } from "bun:test";
import { createApp } from "../app";
import { createTestFlowStore } from "./flow-store";

export function createTestRunStore() {
  return { save: mock(async () => "42") };
}

export function createTestApp(
  flows = createTestFlowStore(),
  runs = createTestRunStore(),
  fetchRequest?: Parameters<typeof createApp>[2],
) {
  return createApp(flows, runs, fetchRequest);
}
