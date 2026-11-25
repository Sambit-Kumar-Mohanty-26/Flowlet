import { errorResponse, jsonValueSchema, type JsonValue } from "@flowlet/shared";
import { Hono } from "hono";
import type { FetchRequest } from "../core/http-request";
import { runFlow } from "../core/run-flow";
import { verifySignature } from "../core/signature";
import type { FlowStore } from "../db/flows";
import type { RunStore } from "../db/runs";
import { ApiError } from "./api-error";

function parseEvent(bytes: Uint8Array): JsonValue {
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes));
  } catch {
    throw new ApiError(errorResponse("BAD_REQUEST", "Body must be valid JSON"));
  }

  const parsed = jsonValueSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(errorResponse("BAD_REQUEST", "Body must be valid JSON"));
  return parsed.data;
}

export function createHookRoutes(
  flows: Pick<FlowStore, "get">,
  runs: Pick<RunStore, "save">,
  fetchRequest?: FetchRequest,
) {
  const routes = new Hono();

  routes.post("/:flowId", async (context) => {
    const flow = await flows.get(context.req.param("flowId"));
    if (!flow) throw new ApiError(errorResponse("NOT_FOUND", "Flow not found"));

    const signature = context.req.header("X-Flowlet-Signature");
    if (!signature) throw new ApiError(errorResponse("UNAUTHORIZED", "Invalid webhook signature"));

    const bytes = new Uint8Array(await context.req.arrayBuffer());
    if (!verifySignature(bytes, flow.webhookSecret, signature)) {
      throw new ApiError(errorResponse("UNAUTHORIZED", "Invalid webhook signature"));
    }

    const payload = parseEvent(bytes);
    if (!flow.enabled) throw new ApiError(errorResponse("CONFLICT", "Flow is disabled"));

    const run = await runFlow(flow, payload, fetchRequest);
    const runId = await runs.save(flow.id, payload, run);
    return context.json({ runId, status: run.status });
  });

  return routes;
}
