import { createApp } from "./app";
import { FlowStore } from "./db/flows";
import { createMongoClient } from "./db/mongo";
import { createPostgresPool } from "./db/postgres";
import { RunStore } from "./db/runs";

const postgres = createPostgresPool();
const mongo = createMongoClient();
try {
  const flows = new FlowStore(mongo.db());
  await flows.ensureIndexes();

  const app = createApp(flows, new RunStore(postgres));
  const server = Bun.serve({ port: 4000, fetch: app.fetch });
  console.info(`Flowlet API listening on ${server.url}`);
} catch (error) {
  await Promise.all([mongo.close(), postgres.end()]);
  throw error;
}
