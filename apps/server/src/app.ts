import { errorResponse } from "@flowlet/shared";
import { Hono } from "hono";

export const app = new Hono();

app.get("/api/health", (context) => context.json({ status: "ok" }));

app.notFound((context) =>
  context.json(errorResponse("NOT_FOUND", "Route not found"), 404),
);

app.onError((_error, context) =>
  context.json(errorResponse("INTERNAL_ERROR", "Internal server error"), 500),
);
