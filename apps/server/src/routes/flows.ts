import {
  createFlowSchema, errorResponse, runListQuerySchema, updateFlowSchema, validationErrorResponse,
} from "@flowlet/shared";
import { Hono } from "hono";
import { isFlowId, type FlowStore } from "../db/flows";
import { decodeRunCursor } from "../db/run-cursor";
import type { RunStore } from "../db/runs";
import { ApiError } from "./api-error";
import { parseJsonBody } from "./json-body";

type FlowRepository = Pick<FlowStore, "create" | "list" | "get" | "update" | "delete">;

function flowNotFound() {
  return new ApiError(errorResponse("NOT_FOUND", "Flow not found"));
}

export function createFlowRoutes(store: FlowRepository, runs: Pick<RunStore, "list" | "stats">) {
  async function getFlow(id: string) {
    const flow = isFlowId(id) ? await store.get(id) : null;
    if (!flow) throw flowNotFound();
    return flow;
  }

  const routes = new Hono();

  routes.use("*", async (context, next) => {
    context.header("Cache-Control", "no-store");
    await next();
  });

  routes.use("/:id", async (context, next) => {
    if (!isFlowId(context.req.param("id"))) throw flowNotFound();
    await next();
  });

  routes.post("/", async (context) => {
    const input = await parseJsonBody(context.req, createFlowSchema);
    return context.json(await store.create(input), 201);
  });

  routes.get("/", async (context) => context.json(await store.list()));

  routes.get("/:id", async (context) => {
    return context.json(await getFlow(context.req.param("id")));
  });

  routes.patch("/:id", async (context) => {
    const patch = await parseJsonBody(context.req, updateFlowSchema);
    const flow = await store.update(context.req.param("id"), patch);
    if (!flow) throw flowNotFound();
    return context.json(flow);
  });

  routes.delete("/:id", async (context) => {
    if (!await store.delete(context.req.param("id"))) throw flowNotFound();
    return context.body(null, 204);
  });

  routes.get("/:id/runs", async (context) => {
    const flow = await getFlow(context.req.param("id"));
    const parsed = runListQuerySchema.safeParse(context.req.query());
    if (!parsed.success) throw new ApiError(validationErrorResponse(parsed.error));

    const { status, limit, cursor: token } = parsed.data;
    const cursor = token === undefined ? undefined : decodeRunCursor(token);
    if (cursor === null) {
      const message = "Invalid run cursor";
      throw new ApiError(errorResponse("VALIDATION_ERROR", message, {
        issues: [{ path: ["cursor"], message }],
      }));
    }

    return context.json(await runs.list(flow.id, { status, limit, cursor }));
  });

  routes.get("/:id/stats", async (context) => {
    const flow = await getFlow(context.req.param("id"));
    return context.json(await runs.stats(flow.id));
  });

  return routes;
}
