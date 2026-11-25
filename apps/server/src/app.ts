import { errorResponse } from "@flowlet/shared";
import { Hono } from "hono";
import { ApiError } from "./routes/api-error";
import { createFlowRoutes } from "./routes/flows";
import { mockReceiver } from "./routes/mock-receiver";

export function createApp(flows: Parameters<typeof createFlowRoutes>[0]) {
  const app = new Hono();

  app.get("/api/health", (context) => context.json({ status: "ok" }));
  app.route("/api/mock", mockReceiver);
  app.route("/api/flows", createFlowRoutes(flows));

  app.notFound((context) =>
    context.json(errorResponse("NOT_FOUND", "Route not found"), 404),
  );

  app.onError((error, context) => {
    if (error instanceof ApiError) return context.json(error.body, error.status);
    return context.json(errorResponse("INTERNAL_ERROR", "Internal server error"), 500);
  });

  return app;
}
