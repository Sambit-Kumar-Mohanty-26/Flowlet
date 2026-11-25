import { errorResponse, validationErrorResponse, type ZodType } from "@flowlet/shared";
import type { HonoRequest } from "hono";
import { ApiError } from "./api-error";

export async function parseJsonBody<T>(request: HonoRequest, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json<unknown>();
  } catch {
    throw new ApiError(errorResponse("BAD_REQUEST", "Body must be valid JSON"));
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(validationErrorResponse(parsed.error));
  return parsed.data;
}
