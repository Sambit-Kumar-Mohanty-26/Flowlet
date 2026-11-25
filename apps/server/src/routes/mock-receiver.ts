import { errorResponse, jsonValueSchema } from "@flowlet/shared";
import { Hono } from "hono";
import { parseJsonBody } from "./json-body";

export const mockReceiver = new Hono();

mockReceiver.post("/receiver", async (context) => {
  const body = await parseJsonBody(context.req, jsonValueSchema);
  if (context.req.query("fail") === "1") {
    return context.json(errorResponse("INTERNAL_ERROR", "Mock receiver failed"), 500);
  }

  return context.json(body);
});
