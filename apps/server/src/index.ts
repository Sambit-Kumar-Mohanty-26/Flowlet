import { createApp } from "./app";
import { FlowStore } from "./db/flows";
import { createMongoClient } from "./db/mongo";

const mongo = createMongoClient();
try {
  const flows = new FlowStore(mongo.db());
  await flows.ensureIndexes();

  const app = createApp(flows);
  const server = Bun.serve({ port: 4000, fetch: app.fetch });
  console.info(`Flowlet API listening on ${server.url}`);
} catch (error) {
  await mongo.close();
  throw error;
}
