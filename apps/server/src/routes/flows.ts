import { createFlowSchema, errorResponse, updateFlowSchema } from "@flowlet/shared";
import { Hono } from "hono";
import { isFlowId, type FlowStore } from "../db/flows";
import { ApiError } from "./api-error";
import { parseJsonBody } from "./json-body";

type FlowRepository = Pick<FlowStore, "create" | "list" | "get" | "update" | "delete">;

function flowNotFound() {
  return new ApiError(errorResponse("NOT_FOUND", "Flow not found"));
}

export function createFlowRoutes(store: FlowRepository) {
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
    const flow = await store.get(context.req.param("id"));
    if (!flow) throw flowNotFound();
    return context.json(flow);
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

  return routes;
}
