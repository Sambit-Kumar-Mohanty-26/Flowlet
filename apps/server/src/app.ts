import { errorResponse } from "@flowlet/shared";
import { Hono } from "hono";
import type { FetchRequest } from "./core/http-request";
import type { RunStore } from "./db/runs";
import { ApiError } from "./routes/api-error";
import { createFlowRoutes } from "./routes/flows";
import { createHookRoutes } from "./routes/hooks";
import { mockReceiver } from "./routes/mock-receiver";
import { createRunRoutes } from "./routes/runs";

export function createApp(
  flows: Parameters<typeof createFlowRoutes>[0],
  runs: Pick<RunStore, "save" | "list" | "get" | "stats">,
  fetchRequest?: FetchRequest,
) {
  const app = new Hono();

  app.get("/api/health", (context) => context.json({ status: "ok" }));
  app.route("/api/mock", mockReceiver);
  app.route("/api/flows", createFlowRoutes(flows, runs));
  app.route("/api/hooks", createHookRoutes(flows, runs, fetchRequest));
  app.route("/api/runs", createRunRoutes(runs));

  app.notFound((context) =>
    context.json(errorResponse("NOT_FOUND", "Route not found"), 404),
  );

  app.onError((error, context) => {
    if (error instanceof ApiError) return context.json(error.body, error.status);
    return context.json(errorResponse("INTERNAL_ERROR", "Internal server error"), 500);
  });

  return app;
}
