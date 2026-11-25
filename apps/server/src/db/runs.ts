import type { JsonValue } from "@flowlet/shared";
import type { Pool } from "pg";
import type { RunResult } from "../core/run-flow";

export class RunStore {
  constructor(private readonly pool: Pool) {}

  async save(flowId: string, payload: JsonValue, run: RunResult): Promise<string> {
    const client = await this.pool.connect();
    let discardClient = false;

    try {
      await client.query("BEGIN");
      const { rows: [saved] } = await client.query<{ id: string }>(
        `INSERT INTO runs (flow_id, status, payload, started_at, finished_at, duration_ms, error)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
         RETURNING id::text AS id`,
        [flowId, run.status, JSON.stringify(payload), run.startedAt, run.finishedAt, run.durationMs, run.error],
      );

      for (const step of run.steps) {
        await client.query(
          `INSERT INTO run_steps (run_id, position, type, status, input, output, error, duration_ms)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)`,
          [saved.id, step.position, step.type, step.status, JSON.stringify(step.input),
            JSON.stringify(step.output), step.error, step.durationMs],
        );
      }

      await client.query("COMMIT");
      return saved.id;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        discardClient = true;
      }
      throw error;
    } finally {
      client.release(discardClient);
    }
  }
}
