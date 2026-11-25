import type { RunDetails, RunPage, RunStats } from "@flowlet/shared";
import { mock } from "bun:test";
import { createApp } from "../app";
import { createTestFlowStore } from "./flow-store";

export function createTestRunStore() {
  return {
    save: mock(async () => "42"),
    list: mock(async (): Promise<RunPage> => ({ items: [], nextCursor: null })),
    get: mock(async (): Promise<RunDetails | null> => null),
    stats: mock(async (): Promise<RunStats> => ({
      total: 0, success: 0, failed: 0, filtered: 0, avgDurationMs: 0, lastRunAt: null,
    })),
  };
}

export function createTestApp(
  flows = createTestFlowStore(),
  runs = createTestRunStore(),
  fetchRequest?: Parameters<typeof createApp>[2],
) {
  return createApp(flows, runs, fetchRequest);
}
