import type { JsonValue, Run, RunDetails, RunPage, RunStats, RunStatus, RunStep } from "@flowlet/shared";
import type { Pool } from "pg";
import type { RunResult } from "../core/run-flow";
import { encodeRunCursor, type RunCursor } from "./run-cursor";

interface ListRunsOptions {
  status?: RunStatus;
  limit: number;
  cursor?: RunCursor;
}

type RunRow = Omit<Run, "startedAt" | "finishedAt"> & { startedAt: Date; finishedAt: Date };
type StatsRow = Omit<RunStats, "lastRunAt"> & { lastRunAt: Date | null };

const runColumns = `
  r.id::text AS id, r.flow_id AS "flowId", r.status, r.payload,
  r.started_at AS "startedAt", r.finished_at AS "finishedAt",
  r.duration_ms AS "durationMs", r.error
`;

function toRun(row: RunRow): Run {
  return { ...row, startedAt: row.startedAt.toISOString(), finishedAt: row.finishedAt.toISOString() };
}

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

  async list(flowId: string, options: ListRunsOptions): Promise<RunPage> {
    const values: (string | number)[] = [flowId];
    const conditions = ["r.flow_id = $1"];

    if (options.status !== undefined) {
      values.push(options.status);
      conditions.push(`r.status = $${values.length}`);
    }

    if (options.cursor) {
      const timestampParam = values.push(options.cursor.startedAt);
      const idParam = values.push(options.cursor.id);
      conditions.push(`(r.started_at, r.id) < ($${timestampParam}::timestamptz, $${idParam}::bigint)`);
    }

    const limitParam = values.push(options.limit + 1);
    const { rows } = await this.pool.query<RunRow>(
      `SELECT ${runColumns}
       FROM runs r
       WHERE ${conditions.join(" AND ")}
       ORDER BY r.started_at DESC, r.id DESC
       LIMIT $${limitParam}`,
      values,
    );
    const items = rows.slice(0, options.limit).map(toRun);
    const last = items.at(-1);
    return {
      items,
      nextCursor: last && rows.length > items.length ? encodeRunCursor(last) : null,
    };
  }

  async get(id: string): Promise<RunDetails | null> {
    const { rows: [run] } = await this.pool.query<RunRow>(
      `SELECT ${runColumns} FROM runs r WHERE r.id = $1`,
      [id],
    );
    if (!run) return null;

    const { rows: steps } = await this.pool.query<RunStep>(
      `SELECT position, type, status, input, output, error, duration_ms AS "durationMs"
       FROM run_steps WHERE run_id = $1 ORDER BY position`,
      [id],
    );

    return { ...toRun(run), steps };
  }

  async stats(flowId: string): Promise<RunStats> {
    const { rows: [stats] } = await this.pool.query<StatsRow>(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status = 'success')::int AS success,
              count(*) FILTER (WHERE status = 'failed')::int AS failed,
              count(*) FILTER (WHERE status = 'filtered')::int AS filtered,
              coalesce(round(avg(duration_ms))::int, 0) AS "avgDurationMs",
              max(started_at) AS "lastRunAt"
       FROM runs WHERE flow_id = $1`,
      [flowId],
    );

    return { ...stats, lastRunAt: stats.lastRunAt?.toISOString() ?? null };
  }
}
