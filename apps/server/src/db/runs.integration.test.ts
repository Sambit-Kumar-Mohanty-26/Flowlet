import { expect, test } from "bun:test";
import type { RunStatus } from "@flowlet/shared";
import { createPostgresPool } from "./postgres";
import { decodeRunCursor } from "./run-cursor";
import { RunStore } from "./runs";

test.skipIf(process.env.FLOWLET_TEST_POSTGRES !== "1")(
  "PostgreSQL paginates tied timestamps without gaps and calculates stats",
  async () => {
    const flowId = crypto.randomUUID();
    const pool = createPostgresPool();
    const runs = new RunStore(pool);
    const timestamp = "2026-11-25T12:34:56.789Z";
    const statuses: RunStatus[] = ["success", "filtered", "failed"];
    const ids: string[] = [];
    try {
      for (let index = 0; index < 25; index++) {
        const status = statuses[index % statuses.length];
        ids.push(await runs.save(flowId, { index }, {
          status, startedAt: timestamp, finishedAt: timestamp,
          durationMs: index + 1, error: status === "failed" ? "Test error" : null,
          steps: [
            { position: 1, type: "transform", status: "skipped", input: null, output: null, error: null, durationMs: null },
            { position: 0, type: "filter", status: "success", input: { index }, output: false, error: null, durationMs: 1 },
          ],
        }));
      }

      const first = await runs.list(flowId, { limit: 20 });
      const boundary = decodeRunCursor(first.nextCursor ?? "");
      expect(first.items.map(({ id }) => id)).toEqual(ids.slice(5).reverse());
      expect(boundary).toEqual({ startedAt: timestamp, id: ids[5] });
      if (!boundary) throw new Error("Expected a second page");

      const second = await runs.list(flowId, { limit: 20, cursor: boundary });
      expect(second.items.map(({ id }) => id)).toEqual(ids.slice(0, 5).reverse());
      expect(second.nextCursor).toBeNull();

      const failed = await runs.list(flowId, { limit: 20, status: "failed" });
      expect(failed.items.map(({ id }) => id)).toEqual(ids.filter((_, index) => index % 3 === 2).reverse());
      expect(failed.nextCursor).toBeNull();

      const detail = await runs.get(ids[0]);
      expect(detail?.payload).toEqual({ index: 0 });
      expect(detail?.steps.map(({ position }) => position)).toEqual([0, 1]);

      expect(await runs.stats(flowId)).toEqual({
        total: 25, success: 9, failed: 8, filtered: 8, avgDurationMs: 13, lastRunAt: timestamp,
      });
      expect(await runs.stats(crypto.randomUUID())).toEqual({
        total: 0, success: 0, failed: 0, filtered: 0, avgDurationMs: 0, lastRunAt: null,
      });
    } finally {
      try {
        await pool.query("DELETE FROM runs WHERE flow_id = $1", [flowId]);
      } finally {
        await pool.end();
      }
    }
  },
);
