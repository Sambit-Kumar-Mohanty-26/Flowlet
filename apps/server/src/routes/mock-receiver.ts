import { errorResponse, jsonValueSchema, validationErrorResponse } from "@flowlet/shared";
import { Hono } from "hono";

export const mockReceiver = new Hono();

mockReceiver.post("/receiver", async (context) => {
  let body: unknown;
  try {
    body = await context.req.json<unknown>();
  } catch {
    return context.json(errorResponse("BAD_REQUEST", "Body must be valid JSON"), 400);
  }

  const parsed = jsonValueSchema.safeParse(body);
  if (!parsed.success) return context.json(validationErrorResponse(parsed.error), 400);

  if (context.req.query("fail") === "1") {
    return context.json(errorResponse("INTERNAL_ERROR", "Mock receiver failed"), 500);
  }

  return context.json(parsed.data, 200);
});
