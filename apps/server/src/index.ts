import { app } from "./app";

const server = Bun.serve({ port: 4000, fetch: app.fetch });
console.info(`Flowlet API listening on ${server.url}`);
