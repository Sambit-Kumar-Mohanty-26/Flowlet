import { errorResponse } from "@flowlet/shared";
import { Hono } from "hono";
import { isRunId } from "../db/run-cursor";
import type { RunStore } from "../db/runs";
import { ApiError } from "./api-error";

export function createRunRoutes(runs: Pick<RunStore, "get">) {
  const routes = new Hono();

  routes.get("/:runId", async (context) => {
    context.header("Cache-Control", "no-store");

    const id = context.req.param("runId");
    const run = isRunId(id) ? await runs.get(id) : null;
    if (!run) throw new ApiError(errorResponse("NOT_FOUND", "Run not found"));

    return context.json(run);
  });

  return routes;
}
