import { readdir } from "node:fs/promises";
import type { Pool, PoolClient } from "pg";
import { createPostgresPool } from "./postgres";

const migrationsDirectory = new URL("../../../../migrations/", import.meta.url);
const startupErrors = new Set(["ECONNREFUSED", "ECONNRESET", "57P03"]);

async function connectWithRetry(pool: Pool): Promise<PoolClient> {
  const deadline = Date.now() + 30_000;
  let delay = 250;

  while (true) {
    try {
      return await pool.connect();
    } catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : undefined;
      if (typeof code !== "string" || !startupErrors.has(code) || Date.now() >= deadline) {
        throw error;
      }

      await Bun.sleep(delay);
      delay = Math.min(delay * 2, 2_000);
    }
  }
}

async function applyMigration(client: PoolClient, filename: string): Promise<void> {
  const sql = await Bun.file(new URL(filename, migrationsDirectory)).text();

  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }

  console.info(`Applied ${filename}`);
}

async function migrate(): Promise<void> {
  const filenames = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  const pool = createPostgresPool();
  try {
    const client = await connectWithRetry(pool);
    try {
      // Keep one session locked across the history check and every migration transaction.
      await client.query("SELECT pg_advisory_lock(hashtext('flowlet:migrations'))");
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          filename TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      const { rows } = await client.query<{ filename: string }>("SELECT filename FROM schema_migrations");
      const applied = new Set(rows.map(({ filename }) => filename));

      for (const filename of filenames) {
        if (!applied.has(filename)) await applyMigration(client, filename);
      }
    } finally {
      client.release(true);
    }
  } finally {
    await pool.end();
  }
}

await migrate();
